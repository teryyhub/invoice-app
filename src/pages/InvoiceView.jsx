// src/pages/InvoiceView.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { Button } from "@/components/ui/button";
import {
  Printer,
  ArrowLeft,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Stamp,
  Loader2,
} from "lucide-react";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import html2canvas from "html2canvas";
import jspdf from "jspdf";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const INVOICE_NATURAL_WIDTH = 794;

export default function InvoiceView() {
  const { id: invoiceId } = useParams();
  const invoiceRef = useRef(null);
  const containerNodeRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stampScale, setStampScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);

  // Exact width measurement function
  const handleAutoFit = useCallback(() => {
    const el = containerNodeRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const containerWidth = rect.width || el.clientWidth || window.innerWidth;
    const availableWidth = containerWidth - 16;

    if (availableWidth > 0 && availableWidth < INVOICE_NATURAL_WIDTH) {
      const calculatedScale = Math.max(0.2, parseFloat((availableWidth / INVOICE_NATURAL_WIDTH).toFixed(3)));
      setZoom(calculatedScale);
    } else {
      setZoom(1);
    }
  }, []);

  const setContainerRef = useCallback((node) => {
    containerNodeRef.current = node;
    if (node) {
      handleAutoFit();
      requestAnimationFrame(() => handleAutoFit());
      setTimeout(() => handleAutoFit(), 60);
      setTimeout(() => handleAutoFit(), 200);
    }
  }, [handleAutoFit]);

  useEffect(() => {
    window.addEventListener("resize", handleAutoFit, { passive: true });
    return () => window.removeEventListener("resize", handleAutoFit);
  }, [handleAutoFit]);

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const list = await Invoice.filter({ id: invoiceId });
      return list[0] || null;
    },
    enabled: !!invoiceId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: vendorFromDB, isLoading: loadingVendor } = useQuery({
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
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!loadingInvoice && !loadingVendor && invoice) {
      requestAnimationFrame(() => handleAutoFit());
      const timer = setTimeout(handleAutoFit, 100);
      return () => clearTimeout(timer);
    }
  }, [loadingInvoice, loadingVendor, invoice, handleAutoFit]);

  const isCdapCode = (val) => /^CDAP\d+$/i.test((val || "").trim());

  const resolveVendorField = (invoiceVal, dbVal) => {
    if (invoiceVal && !isCdapCode(invoiceVal)) return invoiceVal;
    if (dbVal && !isCdapCode(dbVal)) return dbVal;
    return "";
  };

  const vendor = {
    ...(vendorFromDB || {}),
    vendor_name: resolveVendorField(invoice?.vendor_name, vendorFromDB?.vendor_name),
    address: resolveVendorField(invoice?.vendor_address, vendorFromDB?.vendor_address),
    gstin: invoice?.vendor_gstin || vendorFromDB?.gstin || "",
    stamp_url: invoice?.vendor_stamp_url || vendorFromDB?.stamp_url || "",
  };

  const handlePrint = () => window.print();

  const captureFullInvoice = async (options = {}) => {
    const el = invoiceRef.current;
    if (!el) return null;

    const prevZoom = el.style.zoom;
    const prevTransform = el.style.transform;

    el.style.zoom = "1";
    el.style.transform = "none";

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: INVOICE_NATURAL_WIDTH,
        height: el.scrollHeight,
        windowWidth: INVOICE_NATURAL_WIDTH,
        ...options,
      });
      return canvas;
    } finally {
      el.style.zoom = prevZoom;
      el.style.transform = prevTransform;
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsCapturing(true);
    try {
      const canvas = await captureFullInvoice();
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jspdf("p", "mm", "a4");
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
      if (!canvas) return;
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-invoices"] });
      toast.success("Invoice deleted");
      navigate("/invoices");
    },
  });

  const changeZoom = (delta) =>
    setZoom((z) => parseFloat(Math.min(2, Math.max(0.2, z + delta)).toFixed(2)));

  if (loadingInvoice || loadingVendor) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-muted-foreground">Invoice not found</p>
        <Link to="/invoices">
          <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">
            Back to Invoices
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Top Toolbar */}
      <div className="no-print flex items-center justify-between flex-wrap gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Link to="/invoices">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1.5 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          </Link>
          <span className="font-bold text-sm text-foreground font-mono truncate max-w-[140px] sm:max-w-none">
            {invoice.invoice_number || "Invoice"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Zoom Controller */}
          <div className="flex items-center border border-border bg-card rounded-lg px-1.5 py-0.5 h-8 shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded"
              onClick={() => changeZoom(-0.1)}
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-mono font-medium w-10 text-center select-none text-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded"
              onClick={() => changeZoom(0.1)}
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded border-l border-border/60 ml-1 pl-1"
              title="Auto-fit screen"
              onClick={handleAutoFit}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Stamp Scale */}
          <div className="flex items-center border border-border bg-card rounded-lg px-1.5 py-0.5 h-8 shadow-xs">
            <Stamp className="w-3.5 h-3.5 text-muted-foreground mr-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded"
              onClick={() =>
                setStampScale((s) => Math.max(0.3, parseFloat((s - 0.1).toFixed(1))))
              }
              title="Shrink stamp"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-mono font-medium w-10 text-center select-none text-foreground">
              {Math.round(stampScale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded"
              onClick={() =>
                setStampScale((s) => Math.min(3, parseFloat((s + 0.1).toFixed(1))))
              }
              title="Enlarge stamp"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isCapturing}
            className="h-8 px-2.5 text-xs gap-1.5 font-medium rounded-lg shadow-none"
          >
            {isCapturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJPG}
            disabled={isCapturing}
            className="h-8 px-2.5 text-xs gap-1.5 font-medium rounded-lg shadow-none"
          >
            {isCapturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>JPG</span>
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 px-3 text-xs gap-1.5 font-semibold rounded-lg shadow-none"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Print</span>
          </Button>

          {/* Delete Dialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1 font-medium rounded-lg shadow-none"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-xs p-4 gap-3">
              <AlertDialogHeader className="space-y-1">
                <AlertDialogTitle className="text-sm font-bold">Delete invoice?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Invoice <strong className="text-foreground">{invoice?.invoice_number}</strong> will be deleted permanently.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-1.5 pt-1">
                <AlertDialogCancel className="h-8 text-xs px-3">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="h-8 text-xs px-3.5 bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Viewport Frame with Callback Ref */}
      <div
        ref={setContainerRef}
        className="w-full flex justify-center overflow-x-hidden overflow-y-auto rounded-xl bg-muted/20 border border-border/60 py-3 px-1 print:p-0 print:m-0 print:border-none print:bg-transparent"
        style={{ minHeight: "calc(100vh - 115px)" }}
      >
        <div
          ref={invoiceRef}
          style={{
            zoom: zoom,
            transform: typeof CSS !== "undefined" && CSS.supports && CSS.supports("zoom: 1") ? undefined : `scale(${zoom})`,
            transformOrigin: "top center",
          }}
          className="shadow-sm rounded overflow-hidden print:!transform-none print:!zoom-100"
        >
          <InvoiceTemplate invoice={invoice} vendor={vendor} stampScale={stampScale} />
        </div>
      </div>
    </div>
  );
}