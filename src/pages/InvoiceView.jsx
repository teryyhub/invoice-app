import React, { useRef, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download, Trash2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import html2canvas from "html2canvas";
import jspdf from "jspdf";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

// The natural pixel width InvoiceTemplate was designed for (A4 @ 96dpi)
const INVOICE_NATURAL_WIDTH = 794;

export default function InvoiceView() {
  const { id: invoiceId } = useParams();
  const invoiceRef    = useRef(null); // unscaled — used for download capture
  const scaleWrapRef  = useRef(null); // the element we apply CSS transform to
  const viewportRef   = useRef(null); // outer scrollable container
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();

  const [stampScale, setStampScale]   = useState(1);
  const [zoom, setZoom]               = useState(1);
  const [invoiceHeight, setInvoiceHeight] = useState(0); // natural height of rendered invoice
  const [isCapturing, setIsCapturing] = useState(false);

  // Measure the natural invoice height after render so we can size the layout wrapper
  useEffect(() => {
    if (!invoiceRef.current) return;
    const ro = new ResizeObserver(() => {
      setInvoiceHeight(invoiceRef.current?.scrollHeight ?? 0);
    });
    ro.observe(invoiceRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute zoom that fits the invoice within the viewport width
  const computeFitZoom = useCallback(() => {
    if (!viewportRef.current) return;
    const available = viewportRef.current.clientWidth - 32; // 16px padding × 2
    const fit = Math.min(1, parseFloat((available / INVOICE_NATURAL_WIDTH).toFixed(2)));
    setZoom(fit);
  }, []);

  // Auto-fit on mount + viewport resize
  useEffect(() => {
    computeFitZoom();
    const ro = new ResizeObserver(computeFitZoom);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, [computeFitZoom]);

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const list = await Invoice.filter({ id: invoiceId });
      return list[0] || null;
    },
    enabled: !!invoiceId,
  });

  const { data: vendor, isLoading: loadingVendor } = useQuery({
    queryKey: ["vendor", invoice?.vendor_id],
    queryFn: async () => {
      if (!invoice?.vendor_id) {
        const list = await VendorProfile.list(1);
        return list[0] || null;
      }
      const list = await VendorProfile.filter({ id: invoice.vendor_id });
      return list[0] || null;
    },
    enabled: !!invoice,
  });

  const handlePrint = () => window.print();

  // Capture the unscaled invoice at its true natural size for downloads
  const captureFullInvoice = async (options = {}) => {
    const el = invoiceRef.current;
    if (!el) return null;

    // Temporarily un-clip any overflow ancestors so html2canvas sees everything
    const saved = [];
    let node = el.parentElement;
    while (node && node !== document.body) {
      const cs = window.getComputedStyle(node);
      if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        saved.push({
          node,
          overflow: node.style.overflow,
          overflowX: node.style.overflowX,
          overflowY: node.style.overflowY,
        });
        node.style.overflow  = "visible";
        node.style.overflowX = "visible";
        node.style.overflowY = "visible";
      }
      node = node.parentElement;
    }

    // Also temporarily reset the CSS transform so capture is at 1:1
    const scaleEl = scaleWrapRef.current;
    const prevTransform = scaleEl?.style.transform ?? "";
    if (scaleEl) scaleEl.style.transform = "none";

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      width:        el.scrollWidth,
      height:       el.scrollHeight,
      windowWidth:  el.scrollWidth,
      windowHeight: el.scrollHeight,
      ...options,
    });

    // Restore transform + overflow
    if (scaleEl) scaleEl.style.transform = prevTransform;
    saved.forEach(({ node, overflow, overflowX, overflowY }) => {
      node.style.overflow  = overflow;
      node.style.overflowX = overflowX;
      node.style.overflowY = overflowY;
    });

    return canvas;
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsCapturing(true);
    try {
      const canvas   = await captureFullInvoice();
      const imgData  = canvas.toDataURL("image/png");
      const pdf      = new jspdf("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice?.invoice_number || "invoice"}.pdf`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadJPG = async () => {
    if (!invoiceRef.current) return;
    setIsCapturing(true);
    try {
      const canvas = await captureFullInvoice({ backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${invoice?.invoice_number || "invoice"}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally {
      setIsCapturing(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => Invoice.delete(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
      navigate("/invoices");
    },
  });

  const changeZoom = (delta) =>
    setZoom(z => parseFloat(Math.min(2, Math.max(0.25, z + delta)).toFixed(2)));

  if (loadingInvoice || loadingVendor)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  if (!invoice)
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
        <Link to="/invoices">
          <Button variant="outline" className="mt-4">Back to Invoices</Button>
        </Link>
      </div>
    );

  // Scaled dimensions used for the layout placeholder
  const scaledWidth  = INVOICE_NATURAL_WIDTH * zoom;
  const scaledHeight = invoiceHeight * zoom;

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="no-print flex items-center justify-between flex-wrap gap-2">
        <Link to="/invoices">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
        </Link>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Invoice zoom */}
          <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1">
            <span className="text-xs text-muted-foreground mr-1">Zoom</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeZoom(-0.1)}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeZoom(0.1)}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Fit to screen" onClick={computeFitZoom}>
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Stamp scale */}
          <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1">
            <span className="text-xs text-muted-foreground mr-1">Stamp</span>
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setStampScale(s => Math.max(0.3, parseFloat((s - 0.1).toFixed(1))))}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-medium w-10 text-center">{Math.round(stampScale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setStampScale(s => Math.min(3, parseFloat((s + 0.1).toFixed(1))))}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isCapturing} className="gap-2">
            <Download className="w-4 h-4" />{isCapturing ? "Generating..." : "PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadJPG} disabled={isCapturing} className="gap-2">
            <Download className="w-4 h-4" />{isCapturing ? "Generating..." : "JPG"}
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />Print
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" />Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  Invoice <strong>{invoice?.invoice_number}</strong> will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()}
                  className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/*
        ── Viewport ──
        Scrollable only when zoom makes the invoice larger than the screen.
        Centers the invoice horizontally when there is surplus space.
      */}
      <div
        ref={viewportRef}
        className="w-full overflow-auto rounded-lg"
        style={{ padding: "16px 16px 24px" }}
      >
        {/*
          Layout placeholder — occupies the scaled dimensions so the page
          scrolls correctly. The actual invoice is transformed inside it.
        */}
        <div
          style={{
            width:   scaledWidth,
            height:  scaledHeight || "auto",
            margin:  "0 auto",        // centers horizontally on wide screens
            position: "relative",
          }}
        >
          {/*
            Scale wrapper: CSS transform scales the invoice visually.
            transform-origin: top left keeps math predictable.
            The invoiceRef element inside is always at natural 1:1 size —
            html2canvas resets this transform before capture.
          */}
          <div
            ref={scaleWrapRef}
            style={{
              position:        "absolute",
              top:             0,
              left:            0,
              width:           INVOICE_NATURAL_WIDTH,
              transformOrigin: "top left",
              transform:       `scale(${zoom})`,
            }}
          >
            <div ref={invoiceRef} className="shadow-lg rounded-lg overflow-hidden">
              <InvoiceTemplate invoice={invoice} vendor={vendor} stampScale={stampScale} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}