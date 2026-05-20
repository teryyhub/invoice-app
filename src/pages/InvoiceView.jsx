import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import html2canvas from "html2canvas";
import jspdf from "jspdf";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function InvoiceView() {
  const { id: invoiceId } = useParams(); // uses react-router params instead of window.location
  const invoiceRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stampScale, setStampScale] = useState(1);

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

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jspdf("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${invoice?.invoice_number || "invoice"}.pdf`);
  };

  const handleDownloadJPG = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${invoice?.invoice_number || "invoice"}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  const deleteMutation = useMutation({
    mutationFn: () => Invoice.delete(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
      navigate("/invoices");
    },
  });

  if (loadingInvoice || loadingVendor) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!invoice) return <div className="text-center py-12"><p className="text-muted-foreground">Invoice not found</p><Link to="/invoices"><Button variant="outline" className="mt-4">Back to Invoices</Button></Link></div>;

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between flex-wrap gap-2">
        <Link to="/invoices"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button></Link>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1">
            <span className="text-xs text-muted-foreground mr-1">Stamp</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStampScale(s => Math.max(0.3, parseFloat((s - 0.1).toFixed(1))))}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-medium w-10 text-center">{Math.round(stampScale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStampScale(s => Math.min(3, parseFloat((s + 0.1).toFixed(1))))}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2"><Download className="w-4 h-4" />PDF</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadJPG} className="gap-2"><Download className="w-4 h-4" />JPG</Button>
          <Button size="sm" onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" />Print</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2"><Trash2 className="w-4 h-4" />Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                <AlertDialogDescription>Invoice <strong>{invoice?.invoice_number}</strong> will be permanently deleted.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div ref={invoiceRef} className="shadow-lg rounded-lg overflow-hidden">
        <InvoiceTemplate invoice={invoice} vendor={vendor} stampScale={stampScale} />
      </div>
    </div>
  );
}
