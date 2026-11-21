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

function parseSchemeCode(scheme) {
  const m = String(scheme || "").toUpperCase().match(/_(\d{2,4})$/);
  if (!m) return null;
  const total = parseInt(m[1].slice(0, -1), 10);
  const advance = parseInt(m[1].slice(-1), 10);
  const tenure = total - advance;
  return tenure > 0 && tenure <= 36 ? { total, advance, tenure } : null;
}

function extractSchemeAndTenure(d) {
  if (!d) return { scheme_name: "", tenure: "", advance_emi: null };

  const raw = String(d.raw_text || "");
  const strings = Object.values(d).filter(v => typeof v === "string");
  const haystacks = [raw, ...strings, JSON.stringify(d)];

  const candidates = [
    raw.match(/Scheme\s*Name\s*:?\s*([A-Z0-9]+_\d{2,4})/i)?.[1],
    d.scheme_name,
    d.scheme,
    ...haystacks.map(t => t.match(/\b([A-Z]+_\d{2,4})\b/i)?.[1]),
  ];

  for (const c of candidates) {
    const scheme = String(c || "").trim().toUpperCase();
    const parsed = parseSchemeCode(scheme);
    if (parsed) {
      return { scheme_name: scheme, tenure: parsed.tenure, advance_emi: parsed.advance };
    }
  }
  return { scheme_name: String(d.scheme_name || ""), tenure: "", advance_emi: null };
}

function calculateAckoPlan(price) {
  const p = parseFloat(price) || 0;
  if (p >= 10000 && p <= 15000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 999 };
  if (p > 15000 && p <= 20000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 1399 };
  if (p > 20000 && p <= 25000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 1799 };
  if (p > 25000 && p <= 30000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 2199 };
  if (p > 30000 && p <= 35000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 2499 };
  if (p > 35000 && p <= 50000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 3299 };
  if (p > 50000 && p <= 70000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 4699 };
  if (p > 70000 && p <= 100000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 6599 };
  if (p > 100000 && p <= 120000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 8499 };
  if (p > 120000 && p <= 140000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 9999 };
  if (p > 140000 && p <= 160000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 11599 };
  if (p > 160000 && p <= 180000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 13099 };
  if (p > 180000 && p <= 200000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 14599 };
  return null;
}

const AVAILABLE_ADDONS = [
  { id: "one_assist", name: "ONE ASSIST HOME ASSURE", amount: 1099 },
  { id: "anmol_xpress", name: "ANMOL XPRESS HEALTH", amount: 799 },
  { id: "hdfc_suraksha", name: "HDFC LIFE JEEVAN SURAKSHA", amount: 745 },
];

const isCdapCode = (val) => /^CDAP\d+$/i.test((val || "").trim());
const needsNameFill = (vendor) =>
  !vendor?.vendor_name || isCdapCode(vendor.vendor_name) || vendor.vendor_name.trim() === "";
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
    scheme_name: "",
    tenure: "",
    loan_amount: "",
    selected_addons: [],
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
      // Successfully navigates to InvoiceView page instead of EMI calculator
      navigate(`/invoice/${result.id}`, { replace: true });
    },
    onError: (err) => {
      console.error("Invoice insert failed:", err);
      toast.error(err?.message || "Could not save invoice");
    },
  });

  const basePrice = parseFloat(form.product_price) || 0;
  const calculatedAcko = calculateAckoPlan(basePrice);

  const toggleAddon = (addonId) => {
    setForm(prev => {
      const exists = prev.selected_addons.includes(addonId);
      return {
        ...prev,
        selected_addons: exists
          ? prev.selected_addons.filter(id => id !== addonId)
          : [...prev.selected_addons, addonId]
      };
    });
  };

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
      toast.success("Vendor auto-saved");
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
        let vendorList = vendors;
        if (!vendorList || vendorList.length === 0) {
          vendorList = await queryClient.ensureQueryData({
            queryKey: ["vendors", user?.id],
            queryFn: () => VendorProfile.list(100),
          });
        }

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
          setVendorError(`Code "${d.vendor_code || "N/A"}" not found in Settings.`);
        }

        if (d.imei_serial) {
          const duplicate = invoices.find(inv => inv.imei_serial?.trim() === d.imei_serial.trim());
          if (duplicate) {
            toast.error(`Duplicate: Invoice ${duplicate.invoice_number} exists for IMEI ${d.imei_serial}`);
            return;
          }
        }

        const { scheme_name: extractedScheme, tenure: computedTenure } = extractSchemeAndTenure(d);

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
          scheme_name: extractedScheme,
          tenure: computedTenure,
          loan_amount: d.loan_amount ? String(d.loan_amount) : "",
          selected_addons: [],
        }));

        setExtracted(true);
        toast.success("Details extracted successfully!");
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
    if (!Number(form.tenure)) {
      toast.error("Enter the tenure");
      return;
    }
    if (!Number(form.loan_amount)) {
      toast.error("Enter the Net Loan Amount from the delivery order");
      return;
    }

    const price = parseFloat(form.product_price);
    const rate = Math.round(price * 0.8475 * 100) / 100;
    const cgst = Math.round(price * 0.0763 * 100) / 100;
    const sgst = Math.round(price * 0.0763 * 100) / 100;
    const invoiceNumber = getNextInvoiceNumber(invoices, form.invoice_date);

    const selectedAddonsList = form.selected_addons.map(id => {
      if (id === "acko_mobile" && calculatedAcko) return calculatedAcko;
      return AVAILABLE_ADDONS.find(a => a.id === id);
    }).filter(Boolean);

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
      scheme_name: form.scheme_name,
      tenure: Number(form.tenure),
      loan_amount: Number(form.loan_amount),
      addons: selectedAddonsList,
    });
  };

  const rate = Math.round(basePrice * 0.8475 * 100) / 100;
  const cgst = Math.round(basePrice * 0.0763 * 100) / 100;
  const sgst = Math.round(basePrice * 0.0763 * 100) / 100;
  const noVendors = !loadingVendors && vendors.length === 0;

  return (
    <div className="space-y-3 max-w-5xl mx-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">Create Invoice</h1>
        </div>
        <Link to="/invoices">
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs text-primary gap-1">
            Ledger <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Warnings */}
      {noVendors && (
        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">No vendors found in profile settings.</span>
          </div>
          <Link to="/settings">
            <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px] font-semibold rounded">
              Add Vendor
            </Button>
          </Link>
        </div>
      )}

      {extracted && vendorError && (
        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-destructive min-w-0 pr-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium truncate">{vendorError}</span>
          </div>
          <Link to="/settings" className="shrink-0">
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-destructive text-destructive hover:bg-destructive hover:text-white rounded">
              Settings
            </Button>
          </Link>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* Left Column: DO Upload & Status (Span 4) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="rounded-xl border-border/80 shadow-none bg-card sticky top-3">
            <CardContent className="p-3.5 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivery Order</h2>

              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading || extracting}
                />
                <div className="border-2 border-dashed border-border/80 rounded-lg p-4 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                  {uploading || extracting ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <p className="text-xs text-muted-foreground font-medium">
                        {uploading ? "Uploading document..." : "Extracting DO data..."}
                      </p>
                    </div>
                  ) : extracted ? (
                    <div className="space-y-2 py-2">
                      <div className="flex items-center justify-center text-emerald-600 gap-1.5">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-bold">DO Extracted Successfully</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground underline">Click to upload a different file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Upload Delivery Order</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">PDF (Only Downloaded)</p>
                      </div>
                    </div>
                  )}
                </div>
              </label>

              {extracted && matchedVendor && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="font-bold text-xs font-mono uppercase">{(matchedVendor.address || "").toUpperCase()}</span>
                  </div>
                  {extractedVendorName && !isCdapCode(extractedVendorName) && (
                    <p className="text-[11px] pl-5 truncate">Vendor: {extractedVendorName}</p>
                  )}
                  <p className="text-[10px] font-mono text-muted-foreground pl-5">GSTIN: {matchedVendor.gstin}</p>
                  {vendorAutoUpdated && (
                    <span className="text-[9px] text-primary block pl-5">Auto-updated in Settings</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Form Editor & Add-ons (Span 8) */}
        <div className="lg:col-span-8">
          {extracted ? (
            <Card className="rounded-xl border-border/80 shadow-none bg-card">
              <CardContent className="p-4 space-y-3.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoice & Customer Details</h2>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Name *</label>
                      <input
                        value={form.customer_name}
                        onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mobile No.</label>
                      <input
                        value={form.customer_mobile}
                        onChange={e => setForm(p => ({ ...p, customer_mobile: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Address</label>
                    <input
                      value={form.customer_address}
                      onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))}
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mode</label>
                      <input
                        value={form.mode}
                        onChange={e => setForm(p => ({ ...p, mode: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary uppercase font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Invoice Date</label>
                      <input
                        type="date"
                        value={form.invoice_date}
                        onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price (₹) *</label>
                      <input
                        type="number"
                        value={form.product_price}
                        onChange={e => setForm(p => ({ ...p, product_price: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-bold outline-none focus:border-primary text-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product Category / Desc</label>
                      <input
                        value={form.product_description}
                        onChange={e => setForm(p => ({ ...p, product_description: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Model</label>
                      <input
                        value={form.product_model}
                        onChange={e => setForm(p => ({ ...p, product_model: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">IMEI / Serial</label>
                      <input
                        value={form.imei_serial}
                        onChange={e => setForm(p => ({ ...p, imei_serial: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">App ID / DO No.</label>
                      <input
                        value={form.delivery_order_number}
                        onChange={e => setForm(p => ({ ...p, delivery_order_number: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheme / Tenure</label>
                      <div className="flex gap-1.5">
                        <input
                          value={form.scheme_name}
                          onChange={e => {
                            const val = e.target.value.toUpperCase();
                            const parsed = parseSchemeCode(val);
                            setForm(p => ({
                              ...p,
                              scheme_name: val,
                              tenure: parsed ? parsed.tenure : p.tenure,
                            }));
                          }}
                          placeholder="e.g. VIVO_81"
                          className="w-2/3 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"
                        />
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={form.tenure}
                          onChange={e => setForm(p => ({ ...p, tenure: e.target.value }))}
                          title="Tenure (Months)"
                          className={`w-1/3 rounded-md border bg-background px-2 py-1.5 text-xs font-mono font-bold text-center outline-none focus:border-primary text-primary ${
                            !Number(form.tenure) ? "border-destructive" : "border-border"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Net Loan Amount (from the delivery order) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net Loan Amount (₹) *</label>
                    <input
                      type="number"
                      value={form.loan_amount}
                      onChange={e => setForm(p => ({ ...p, loan_amount: e.target.value }))}
                      className={`w-full rounded-md border bg-background px-2.5 py-1.5 text-xs font-mono outline-none focus:border-primary ${
                        !Number(form.loan_amount) ? "border-destructive" : "border-border"
                      }`}
                    />
                  </div>
                </div>

                {/* Add-ons & Insurance Selection Section */}
                <div className="pt-3 border-t border-border/60 space-y-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Add-ons & Insurance Selection (Unchecked by default)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Auto-detected Acko Insurance */}
                    <div
                      onClick={() => calculatedAcko && toggleAddon("acko_mobile")}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-all ${
                        form.selected_addons.includes("acko_mobile")
                          ? 'bg-primary/10 border-primary/50 text-foreground font-medium'
                          : 'bg-background border-border/80 text-muted-foreground hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={form.selected_addons.includes("acko_mobile")}
                          onChange={() => {}}
                          disabled={!calculatedAcko}
                          className="rounded border-border accent-primary cursor-pointer"
                        />
                        <div className="truncate">
                          <p className="font-semibold text-xs truncate">ACKO ADLD MOBILE INSURANCE</p>
                          <p className="text-[9px] text-muted-foreground">
                            {calculatedAcko ? `Auto bracket amount` : 'Out of range'}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-xs shrink-0">
                        {calculatedAcko ? `₹${calculatedAcko.amount.toLocaleString("en-IN")}` : '—'}
                      </span>
                    </div>

                    {/* Manual Add-ons */}
                    {AVAILABLE_ADDONS.map(addon => {
                      const isChecked = form.selected_addons.includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddon(addon.id)}
                          className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-primary/10 border-primary/50 text-foreground font-medium'
                              : 'bg-background border-border/80 text-muted-foreground hover:border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-border accent-primary cursor-pointer"
                            />
                            <span className="truncate text-xs">{addon.name}</span>
                          </div>
                          <span className="font-semibold text-xs shrink-0">₹{addon.amount.toLocaleString("en-IN")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calculations Preview */}
                {basePrice > 0 && (
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
                    <div className="grid grid-cols-4 gap-2 text-center">
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
                        <span className="font-black text-primary">₹{basePrice.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExtracted(false)}
                    className="h-8 px-3 text-xs"
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={createMutation.isPending}
                    size="sm"
                    className="h-8 px-4 text-xs font-semibold gap-1.5 rounded-lg shadow-none"
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
          ) : (
            <Card className="flex items-center justify-center p-8 border-dashed">
              <CardContent className="text-center space-y-2">
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Upload DO to fetch details. If the DO is not in the expected format, you can manually fill in the details below after uploading.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}