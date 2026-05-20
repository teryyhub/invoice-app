import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { uploadFile } from "@/api/storage";
import { extractDataFromFile } from "@/api/extractor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { format, parse } from "date-fns";

function getNextInvoiceNumber(invoices, invoiceDateStr) {
  const dateObj = invoiceDateStr ? new Date(invoiceDateStr) : new Date();
  const monthShort = format(dateObj, "MMM");
  const monthInvoices = invoices.filter(inv => inv.invoice_number?.toLowerCase().startsWith(monthShort.toLowerCase()));
  const maxNum = monthInvoices.reduce((max, inv) => {
    const parts = inv.invoice_number.split(" ");
    const num = parseInt(parts[1], 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${monthShort} ${String(maxNum + 1).padStart(3, "0")}`;
}

function parseDeliveryDate(rawDate) {
  if (!rawDate) return format(new Date(), "yyyy-MM-dd");
  const formats = ["dd-MM-yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "dd-MMM-yyyy", "MM/dd/yyyy"];
  for (const fmt of formats) {
    try {
      const d = parse(rawDate.trim(), fmt, new Date());
      if (!isNaN(d)) return format(d, "yyyy-MM-dd");
    } catch {}
  }
  const d = new Date(rawDate);
  if (!isNaN(d)) return format(d, "yyyy-MM-dd");
  return format(new Date(), "yyyy-MM-dd");
}

function normalizeName(name) {
  return (name || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export default function GenerateInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [matchedVendor, setMatchedVendor] = useState(null);
  const [vendorError, setVendorError] = useState("");

  const [form, setForm] = useState({
    customer_name: "", customer_mobile: "", customer_address: "",
    mode: "CHOLA", product_description: "", product_model: "",
    imei_serial: "", product_price: "",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    delivery_order_number: "",
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => Invoice.list(500),
  });

  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => VendorProfile.list(100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => Invoice.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice generated successfully!");
      navigate(`/invoice/${result.id}`);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVendorError("");
    setMatchedVendor(null);

    try {
      // Extract text FIRST before uploading (file stream gets consumed after upload)
      setExtracting(true);
      const result = await extractDataFromFile(file);
      setExtracting(false);

      // Upload file to storage
      setUploading(true);
      const { file_url } = await uploadFile(file);
      setFileUrl(file_url);
      setUploading(false);
      toast.success("File uploaded, extracting data...");

      if (result.status === "success" && result.output) {
        const d = result.output;

        const extractedVendorName = normalizeName(d.vendor_name);
        let foundVendor = null;
        if (extractedVendorName) {
          foundVendor = vendors.find(v => {
            const savedName = normalizeName(v.vendor_name);
            return savedName === extractedVendorName || savedName.includes(extractedVendorName) || extractedVendorName.includes(savedName);
          });
          if (!foundVendor) {
            setVendorError(`Vendor "${d.vendor_name}" from the delivery order is not saved. Please add this vendor in Vendor Settings.`);
            setExtracting(false);
            toast.error("Vendor not found in saved profiles");
            return;
          }
        }

        if (d.imei_serial) {
          const duplicate = invoices.find(inv => inv.imei_serial?.trim() === d.imei_serial.trim());
          if (duplicate) {
            toast.error(`Duplicate: Invoice ${duplicate.invoice_number} already exists for IMEI ${d.imei_serial}`);
            setExtracting(false);
            return;
          }
        }

        setMatchedVendor(foundVendor);
        setForm(prev => ({
          ...prev,
          customer_name: d.customer_name || prev.customer_name,
          customer_mobile: d.customer_mobile || prev.customer_mobile,
          customer_address: d.customer_address || prev.customer_address,
          product_description: `${d.manufacturer || ""} ${d.category || ""}`.trim() || prev.product_description,
          product_model: d.model || prev.product_model,
          imei_serial: d.imei_serial || prev.imei_serial,
          product_price: d.product_price ? String(d.product_price) : prev.product_price,
          invoice_date: parseDeliveryDate(d.delivery_date),
          delivery_order_number: d.delivery_order_number || prev.delivery_order_number,
        }));
        setExtracted(true);
        toast.success("Data extracted successfully!");
      } else {
        toast.error("Failed to extract data. Please fill in manually.");
      }
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    }
    setExtracting(false);
    setUploading(false);
  };

  const handleGenerate = () => {
    if (!matchedVendor) { toast.error("No matched vendor. Please upload a delivery order first."); return; }
    if (!form.customer_name || !form.product_price) { toast.error("Customer name and product price are required"); return; }

    const price = parseFloat(form.product_price);
    const rate = Math.round(price * 0.8475 * 100) / 100;
    const cgst = Math.round(price * 0.0763 * 100) / 100;
    const sgst = Math.round(price * 0.0763 * 100) / 100;
    const invoiceNumber = getNextInvoiceNumber(invoices, form.invoice_date);

    if (form.imei_serial) {
      const dup = invoices.find(inv => inv.imei_serial?.trim() === form.imei_serial.trim());
      if (dup) { toast.error(`Duplicate: Invoice ${dup.invoice_number} already exists for this IMEI`); return; }
    }

    createMutation.mutate({
      invoice_number: invoiceNumber,
      invoice_date: form.invoice_date,
      vendor_id: matchedVendor.id,
      customer_name: form.customer_name,
      customer_mobile: form.customer_mobile,
      customer_address: form.customer_address,
      mode: form.mode,
      product_description: form.product_description,
      product_model: form.product_model,
      imei_serial: form.imei_serial,
      quantity: 1,
      product_price: price,
      rate, cgst, sgst,
      grand_total: price,
      delivery_order_url: fileUrl,
      delivery_order_number: form.delivery_order_number,
    });
  };

  const price = parseFloat(form.product_price) || 0;
  const rate = Math.round(price * 0.8475 * 100) / 100;
  const cgst = Math.round(price * 0.0763 * 100) / 100;
  const sgst = Math.round(price * 0.0763 * 100) / 100;
  const noVendors = !loadingVendors && vendors.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Generate Invoice</h1>
        <p className="text-muted-foreground mt-1">Upload a delivery order to auto-fill invoice details</p>
      </div>

      {noVendors && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive font-medium">No vendors saved. Please add a vendor in Settings first.</p>
            </div>
            <Link to="/settings"><Button size="sm" variant="destructive">Go to Settings</Button></Link>
          </CardContent>
        </Card>
      )}

      {vendorError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive font-semibold">Vendor Not Found</p>
              <p className="text-sm text-destructive mt-0.5">{vendorError}</p>
              <Link to="/settings">
                <Button size="sm" variant="outline" className="mt-2 border-destructive text-destructive hover:bg-destructive hover:text-white">
                  Add Vendor in Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Upload className="w-5 h-5" />Upload Delivery Order</CardTitle>
          <CardDescription>Upload a PDF or image of the delivery order to auto-extract all details</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="cursor-pointer block">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleFileUpload} disabled={uploading || extracting} />
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
              {uploading || extracting ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">{uploading ? "Uploading file..." : "Extracting data with AI..."}</p>
                </div>
              ) : extracted && matchedVendor ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">Data extracted — Vendor: <span className="font-bold">{matchedVendor.vendor_name}</span></p>
                  <p className="text-xs text-muted-foreground">Click to upload a different file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload delivery order</p>
                  <p className="text-xs text-muted-foreground">PDF, PNG, or JPG</p>
                </div>
              )}
            </div>
          </label>
        </CardContent>
      </Card>

      {extracted && matchedVendor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Details</CardTitle>
            <CardDescription>Review and edit extracted information if needed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <div className="text-sm">
                <span className="text-green-700 font-medium">Vendor matched: </span>
                <span className="text-green-800 font-bold">{matchedVendor.vendor_name}</span>
                <span className="text-green-600 ml-2 text-xs">GSTIN: {matchedVendor.gstin}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Mobile No.</Label><Input value={form.customer_mobile} onChange={e => setForm(p => ({ ...p, customer_mobile: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Customer Address</Label><Input value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Mode</Label><Input value={form.mode} onChange={e => setForm(p => ({ ...p, mode: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Product Price (₹) *</Label><Input type="number" value={form.product_price} onChange={e => setForm(p => ({ ...p, product_price: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Product Description</Label><Input value={form.product_description} onChange={e => setForm(p => ({ ...p, product_description: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Model</Label><Input value={form.product_model} onChange={e => setForm(p => ({ ...p, product_model: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>IMEI / Serial Number</Label><Input value={form.imei_serial} onChange={e => setForm(p => ({ ...p, imei_serial: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Application ID</Label><Input value={form.delivery_order_number} onChange={e => setForm(p => ({ ...p, delivery_order_number: e.target.value }))} placeholder="e.g. CDAP1234567X12345678" /></div>

            {price > 0 && (
              <div className="bg-accent/50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Calculation Preview</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Rate (84.75%)</p><p className="font-semibold">₹{rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-muted-foreground text-xs">CGST (7.63%)</p><p className="font-semibold">₹{cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-muted-foreground text-xs">SGST (7.63%)</p><p className="font-semibold">₹{sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-muted-foreground text-xs">Grand Total</p><p className="font-bold text-primary">₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>
                </div>
              </div>
            )}

            <Button onClick={handleGenerate} disabled={createMutation.isPending} className="gap-2 w-full md:w-auto">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generate Invoice
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}