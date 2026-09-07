// src/pages/GenerateInvoice.jsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { uploadFile } from "@/api/storage";
import { extractDataFromFile } from "@/api/extractor";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { format, parse } from "date-fns";

function getNextInvoiceNumber(invoices, invoiceDateStr) {
  const dateObj = invoiceDateStr ? new Date(invoiceDateStr) : new Date();
  const monthShort = format(dateObj, "MMM");
  const monthInvoices = invoices.filter(inv =>
    inv.invoice_number?.toLowerCase().startsWith(monthShort.toLowerCase())
  );
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

const isCdapCode = (val) => /^CDAP\d+$/i.test((val || "").trim());
const needsNameFill = (vendor) =>
  !vendor?.vendor_name || isCdapCode(vendor.vendor_name) || vendor.vendor_name.trim() === "";

// Normalizes codes by removing whitespace, hyphens, and underscores for reliable matching
const cleanCode = (str) => (str || "").toString().trim().toUpperCase().replace(/[\s\-_]/g, "");

export default function GenerateInvoice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [matchedVendor, setMatchedVendor] = useState(null);
  const [vendorError, setVendorError] = useState("");
  const [extractedVendorName, setExtractedVendorName] = useState("");
  const [extractedVendorAddress, setExtractedVendorAddress] = useState("");
  const [vendorAutoUpdated, setVendorAutoUpdated] = useState(false);

  const [form, setForm] = useState({
    customer_name: "", customer_mobile: "", customer_address: "",
    mode: "CHOLA", product_description: "", product_model: "",
    imei_serial: "", product_price: "",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    delivery_order_number: "",
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: () => Invoice.list(500),
    enabled: !!user?.id,
  });

  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["vendors", user?.id],
    queryFn: () => VendorProfile.list(100),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => Invoice.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", user?.id] });
      toast.success("Invoice generated successfully!");
      navigate(`/invoice/${result.id}`);
    },
  });

  const patchVendorNameIfNeeded = async (vendor, nameFromPdf, addressFromPdf) => {
    if (!vendor?.id) return;

    const trimmedName = (nameFromPdf || "").trim();
    const trimmedAddress = (addressFromPdf || "").trim();

    const shouldUpdateName = needsNameFill(vendor) && trimmedName && !isCdapCode(trimmedName);
    const shouldUpdateAddress = (!vendor.vendor_address || vendor.vendor_address.trim() === "") && trimmedAddress;

    if (!shouldUpdateName && !shouldUpdateAddress) return;

    const patch = {};
    if (shouldUpdateName) patch.vendor_name = trimmedName;
    if (shouldUpdateAddress) patch.vendor_address = trimmedAddress;

    try {
      await VendorProfile.update(vendor.id, patch);
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendors", user?.id] });
      setVendorAutoUpdated(true);

      const what = [
        shouldUpdateName && "name",
        shouldUpdateAddress && "address",
      ].filter(Boolean).join(" & ");
      toast.success(`Vendor ${what} auto-saved`);
    } catch (err) {
      console.warn("Could not auto-update vendor record:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVendorError("");
    setMatchedVendor(null);
    setExtracted(false);
    setExtractedVendorName("");
    setExtractedVendorAddress("");
    setVendorAutoUpdated(false);

    try {
      setExtracting(true);
      const result = await extractDataFromFile(file);
      setExtracting(false);

      setUploading(true);
      const { file_url } = await uploadFile(file);
      setFileUrl(file_url);
      setUploading(false);

      if (result.status === "success" && result.output) {
        const d = result.output;

        // 1. Guaranteed Vendor Load: Ensures vendors are loaded even if the page just mounted
        let vendorList = vendors;
        if (!vendorList || vendorList.length === 0) {
          vendorList = await queryClient.ensureQueryData({
            queryKey: ["vendors", user?.id],
            queryFn: () => VendorProfile.list(100),
          });
        }

        // 2. Normalized vendor code matching (checks both v.address and v.vendor_name)
        const targetCode = cleanCode(d.vendor_code);
        let foundVendor = null;

        if (targetCode && vendorList?.length > 0) {
          foundVendor = vendorList.find(v => {
            const addrCode = cleanCode(v.address);
            const nameCode = cleanCode(v.vendor_name);
            return addrCode === targetCode || nameCode === targetCode;
          });
        }

        const pdfVendorName = d.vendor_name || "";
        const pdfVendorAddress = d.vendor_address || "";
        setExtractedVendorName(pdfVendorName);
        setExtractedVendorAddress(pdfVendorAddress);

        if (foundVendor) {
          setMatchedVendor(foundVendor);
          setVendorError("");
          await patchVendorNameIfNeeded(foundVendor, pdfVendorName, pdfVendorAddress);
        } else {
          setMatchedVendor(null);
          setVendorError(
            `Code "${d.vendor_code || "N/A"}" not found in Settings.`
          );
        }

        if (d.imei_serial) {
          const duplicate = invoices.find(inv =>
            inv.imei_serial?.trim() === d.imei_serial.trim()
          );
          if (duplicate) {
            toast.error(
              `Duplicate: Invoice ${duplicate.invoice_number} exists for IMEI ${d.imei_serial}`
            );
            return;
          }
        }

        setForm(prev => ({
          ...prev,
          customer_name: d.customer_name || prev.customer_name,
          customer_mobile: d.customer_mobile || prev.customer_mobile,
          customer_address: d.customer_address || prev.customer_address,
          product_description: d.manufacturer || d.category || prev.product_description,
          product_model: d.model || prev.product_model,
          imei_serial: d.imei_serial || prev.imei_serial,
          product_price: d.product_price ? String(d.product_price) : prev.product_price,
          invoice_date: parseDeliveryDate(d.delivery_date),
          delivery_order_number: d.delivery_order_number || prev.delivery_order_number,
        }));

        setExtracted(true);
        toast.success("Details extracted");
      } else {
        toast.error("Extraction failed");
      }
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    }
    setExtracting(false);
    setUploading(false);
  };

  const handleGenerate = () => {
    if (!matchedVendor) { toast.error("Match vendor in Settings first"); return; }
    if (!form.customer_name || !form.product_price) {
      toast.error("Customer name and price are required");
      return;
    }

    const price = parseFloat(form.product_price);
    const rate = Math.round(price * 0.8475 * 100) / 100;
    const cgst = Math.round(price * 0.0763 * 100) / 100;
    const sgst = Math.round(price * 0.0763 * 100) / 100;
    const invoiceNumber = getNextInvoiceNumber(invoices, form.invoice_date);

    createMutation.mutate({
      invoice_number: invoiceNumber,
      invoice_date: form.invoice_date,
      vendor_id: matchedVendor.id,
      vendor_name: extractedVendorName,
      vendor_address: extractedVendorAddress,
      vendor_gstin: matchedVendor.gstin,
      vendor_stamp_url: matchedVendor.stamp_url || "",
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
    <div className="space-y-2.5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">Create Invoice</h1>
          <p className="text-[10px] text-muted-foreground leading-none">DO upload & automatic extraction</p>
        </div>
        <Link to="/invoices">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary gap-0.5">
            Ledger <ArrowRight className="w-2.5 h-2.5" />
          </Button>
        </Link>
      </div>

      {/* Missing Vendor Warning */}
      {noVendors && (
        <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-medium">No vendors found in profile settings.</span>
          </div>
          <Link to="/settings">
            <Button size="sm" variant="destructive" className="h-5 px-1.5 text-[9px] font-semibold rounded">
              Add Vendor
            </Button>
          </Link>
        </div>
      )}

      {/* Unmatched Vendor Alert */}
      {extracted && vendorError && (
        <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-destructive min-w-0 pr-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] font-medium truncate">{vendorError}</span>
          </div>
          <Link to="/settings" className="shrink-0">
            <Button size="sm" variant="outline" className="h-5 px-1.5 text-[9px] border-destructive text-destructive hover:bg-destructive hover:text-white rounded">
              Settings
            </Button>
          </Link>
        </div>
      )}

      {/* Upload Box */}
      <Card className="rounded-lg border-border/80 shadow-none bg-card">
        <CardContent className="p-2.5">
          <label className="cursor-pointer block">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading || extracting}
            />
            <div className="border border-dashed border-border/80 rounded-md p-3.5 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
              {uploading || extracting ? (
                <div className="flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {uploading ? "Uploading..." : "Reading Document..."}
                  </p>
                </div>
              ) : extracted ? (
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 min-w-0 text-left">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="leading-tight truncate">
                      <p className="text-xs text-emerald-600 font-bold truncate">
                        {matchedVendor ? `Matched: ${(matchedVendor.address || "").toUpperCase()}` : "Vendor Unmatched"}
                      </p>
                      {vendorAutoUpdated && (
                        <span className="text-[9px] text-primary block leading-none">Auto-updated in Settings</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground underline shrink-0 pl-2">Re-upload</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left leading-none">
                    <p className="text-xs font-semibold text-foreground">Upload Delivery Order</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">PDF or scanned picture</p>
                  </div>
                </div>
              )}
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Extracted Form Editor */}
      {extracted && (
        <Card className="rounded-lg border-border/80 shadow-none bg-card">
          <CardContent className="p-3 space-y-2.5">
            {matchedVendor && (
              <div className="flex items-center justify-between p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
                <div className="flex items-center gap-1 min-w-0 truncate">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="font-bold text-[11px] font-mono uppercase">{(matchedVendor.address || "").toUpperCase()}</span>
                  {extractedVendorName && !isCdapCode(extractedVendorName) && (
                    <span className="truncate text-[11px]">· {extractedVendorName}</span>
                  )}
                </div>
                <span className="text-[9px] font-mono text-muted-foreground shrink-0 pl-1">GSTIN: {matchedVendor.gstin}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Customer Name *</label>
                  <input
                    value={form.customer_name}
                    onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Mobile No.</label>
                  <input
                    value={form.customer_mobile}
                    onChange={e => setForm(p => ({ ...p, customer_mobile: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Customer Address</label>
                <input
                  value={form.customer_address}
                  onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Mode</label>
                  <input
                    value={form.mode}
                    onChange={e => setForm(p => ({ ...p, mode: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary uppercase font-medium"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Invoice Date</label>
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Price (₹) *</label>
                  <input
                    type="number"
                    value={form.product_price}
                    onChange={e => setForm(p => ({ ...p, product_price: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-bold outline-none focus:border-primary text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Product Category / Desc</label>
                  <input
                    value={form.product_description}
                    onChange={e => setForm(p => ({ ...p, product_description: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Model</label>
                  <input
                    value={form.product_model}
                    onChange={e => setForm(p => ({ ...p, product_model: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">IMEI / Serial</label>
                  <input
                    value={form.imei_serial}
                    onChange={e => setForm(p => ({ ...p, imei_serial: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono outline-none focus:border-primary text-[11px]"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">App ID / DO No.</label>
                  <input
                    value={form.delivery_order_number}
                    onChange={e => setForm(p => ({ ...p, delivery_order_number: e.target.value }))}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono outline-none focus:border-primary text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Preview */}
            {price > 0 && (
              <div className="p-2 rounded bg-muted/30 border border-border/50 text-[11px] leading-tight">
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Rate</span>
                    <span className="font-semibold text-foreground">₹{rate.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">CGST</span>
                    <span className="font-semibold text-foreground">₹{cgst.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">SGST</span>
                    <span className="font-semibold text-foreground">₹{sgst.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Total</span>
                    <span className="font-black text-primary">₹{price.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-1 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExtracted(false)}
                className="h-7 px-2 text-[11px]"
              >
                Reset
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={createMutation.isPending}
                size="sm"
                className="h-7 px-3 text-[11px] font-semibold gap-1 rounded-md shadow-none"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>Generate Invoice</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}