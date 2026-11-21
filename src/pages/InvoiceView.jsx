// src/pages/InvoiceView.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Stamp,
  Loader2,
  AlertCircle,
  Share2,
  Edit3,
  Calculator,
  Printer,
} from "lucide-react";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import html2canvas from "html2canvas";
import jspdf from "jspdf";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const INVOICE_NATURAL_WIDTH = 794;

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

function parseSchemeCode(scheme) {
  const m = String(scheme || "").toUpperCase().match(/_(\d{2,4})$/);
  if (!m) return null;
  const total = parseInt(m[1].slice(0, -1), 10);
  const advance = parseInt(m[1].slice(-1), 10);
  const tenure = total - advance;
  return tenure > 0 && tenure <= 36 ? { total, advance, tenure } : null;
}

function resolveTenure(invoice) {
  const saved = Number(invoice?.tenure);
  if (saved > 0) return saved;
  const parsed = parseSchemeCode(invoice?.scheme_name);
  return parsed ? parsed.tenure : 0;
}

async function saveToDownloadsFolder(fileName, base64Data) {
  try {
    if (Capacitor.getPlatform() === "android") {
      const perm = await Filesystem.requestPermissions();
      if (perm.publicStorage !== "granted") {
        toast.error("Storage permission is required to save to Download/CM Invoice/.", {
          duration: 8000,
        });
        return;
      }
    }

    const relativePath = `Download/CM Invoice/${fileName}`;
    await Filesystem.writeFile({
      path: relativePath,
      data: base64Data,
      directory: Directory.ExternalStorage,
      recursive: true,
    });

    toast.success(`Saved to ${relativePath}`, { duration: 5000 });
  } catch (err) {
    const msg = String(err?.message || err);
    toast.error("Save failed: " + msg, { duration: 10000 });
    throw err;
  }
}

export default function InvoiceView() {
  const { id: invoiceId } = useParams();
  const invoiceRef = useRef(null);
  const containerNodeRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stampScale, setStampScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // EMI & Tenure prompt modal states
  const [isEmiModalOpen, setIsEmiModalOpen] = useState(false);
  const [inputTenure, setInputTenure] = useState("");
  const [inputNetLoan, setInputNetLoan] = useState("");

  const [selectedAddons, setSelectedAddons] = useState([]);
  const [insuranceEligible, setInsuranceEligible] = useState("Yes");

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

  const {
    data: invoice,
    isLoading: loadingInvoice,
    refetch: refetchInvoice,
  } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId || invoiceId === "undefined" || invoiceId === "null") return null;
      const list = await Invoice.filter({ id: invoiceId });
      return list[0] || null;
    },
    enabled: !!invoiceId && invoiceId !== "undefined" && invoiceId !== "null",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (invoice) {
      let initialList = [];
      if (invoice.addons && Array.isArray(invoice.addons) && invoice.addons.length > 0) {
        initialList = invoice.addons.map(a => a.id || a.name);
      } else {
        const hasAckoField = invoice.acko || invoice.has_acko || invoice.insurance_marked || invoice.product_price > 0;
        if (hasAckoField) {
          initialList.push("acko_mobile");
        }
      }
      setSelectedAddons(initialList);
      setInsuranceEligible(invoice.insurance_eligible !== undefined ? (invoice.insurance_eligible ? "Yes" : "No") : "Yes");
    }
  }, [invoice]);

  const {
    data: vendorFromDB,
    isLoading: loadingVendor,
    refetch: refetchVendor,
  } = useQuery({
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

  const isLoadingData = loadingInvoice || loadingVendor;

  useEffect(() => {
    let timer;
    if (isLoadingData) {
      timer = setTimeout(() => {
        setLoadTimedOut(true);
      }, 8000);
    } else {
      setLoadTimedOut(false);
    }
    return () => clearTimeout(timer);
  }, [isLoadingData]);

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

  const productCost = Number(invoice?.product_price || invoice?.product_cost || invoice?.mrp || invoice?.loan_amount) || 0;
  const calculatedAcko = calculateAckoPlan(productCost);
  const loanNumber = invoice?.delivery_order_number || "";
  const tenureMonths = resolveTenure(invoice);

  const resolvedLoanAmount = Number(
    invoice?.net_loan_amount ||
    invoice?.loan_amount ||
    invoice?.net_amount ||
    invoice?.principal_amount ||
    invoice?.product_price ||
    invoice?.grand_total
  ) || 0;

  const selectedAddonsList = selectedAddons.map(id => {
    if (id === "acko_mobile" && calculatedAcko && insuranceEligible === "Yes") return calculatedAcko;
    if (id !== "acko_mobile") return AVAILABLE_ADDONS.find(a => a.id === id || a.name === id);
    return null;
  }).filter(Boolean);

  const totalAddonsAmount = selectedAddonsList.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  const totalLoanWithAddons = resolvedLoanAmount + totalAddonsAmount;

  const handleOpenEmiCalculator = () => {
    setInputTenure(tenureMonths ? String(tenureMonths) : "");
    setInputNetLoan(totalLoanWithAddons ? String(totalLoanWithAddons) : "");
    setIsEmiModalOpen(true);
  };

  const handleTenureChange = (value) => {
    setInputTenure(value);
  };

  const handleConfirmEmiCalc = () => {
    const t = Number(inputTenure);
    const netLoan = Number(inputNetLoan);
    if (!t || t <= 0) {
      toast.error("Please enter a valid tenure in months.");
      return;
    }
    if (!netLoan || netLoan <= 0) {
      toast.error("Please enter a valid net loan amount.");
      return;
    }

    setIsEmiModalOpen(false);

    const resolvedAddonsList = selectedAddons.map(id => {
      if (id === "acko_mobile" && calculatedAcko && insuranceEligible === "Yes") return calculatedAcko;
      if (id !== "acko_mobile") return AVAILABLE_ADDONS.find(a => a.id === id || a.name === id);
      return null;
    }).filter(Boolean);

    const computedEmi = Math.ceil(netLoan / t);

    navigate("/emi-calculator", {
      state: {
        loanNumber: loanNumber,
        tenure: t,
        loanAmount: resolvedLoanAmount,
        productCost: productCost,
        addonsAmount: totalAddonsAmount,
        totalPrincipal: netLoan,
        emi: computedEmi,
        selectedAddons: insuranceEligible === "Yes" ? selectedAddons : selectedAddons.filter(id => id !== "acko_mobile"),
        addons: resolvedAddonsList,
        hasAcko: insuranceEligible === "Yes" && selectedAddons.includes("acko_mobile"),
        doDate: invoice?.invoice_date || invoice?.created_date || "",
      },
    });
  };

  const toggleAddonSelection = (addonId) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const updateAddonsMutation = useMutation({
    mutationFn: async (updatedAddonsList) => {
      return Invoice.update(invoiceId, {
        addons: updatedAddonsList,
        insurance_eligible: insuranceEligible === "Yes"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Add-ons & Insurance Eligibility updated successfully!");
      setIsEditDialogOpen(false);
    },
    onError: (err) => {
      toast.error("Failed to update add-ons: " + err.message);
    },
  });

  const handleSaveAddons = () => {
    const finalAddonsList = selectedAddons.map(id => {
      if (id === "acko_mobile" && calculatedAcko && insuranceEligible === "Yes") return calculatedAcko;
      if (id !== "acko_mobile") return AVAILABLE_ADDONS.find(a => a.id === id || a.name === id);
      return null;
    }).filter(Boolean);

    updateAddonsMutation.mutate(finalAddonsList);
  };

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

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
      toast.error("Unable to trigger print");
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
      const fileName = `${invoice?.invoice_number || "invoice"}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output("datauristring").split(",")[1];
        await saveToDownloadsFolder(fileName, pdfBase64);
      } else {
        pdf.save(fileName);
        toast.success("PDF downloaded");
      }
    } catch (err) {
      toast.error("Failed to save PDF: " + err.message, { duration: 10000 });
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
      const fileName = `${invoice?.invoice_number || "invoice"}.jpg`;
      const base64Data = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];

      if (Capacitor.isNativePlatform()) {
        await saveToDownloadsFolder(fileName, base64Data);
      } else {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = `data:image/jpeg;base64,${base64Data}`;
        link.click();
        toast.success("JPG downloaded");
      }
    } catch (err) {
      toast.error("Failed to save JPG: " + err.message, { duration: 10000 });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleNativeShare = async () => {
    if (!invoiceRef.current) return;
    setIsCapturing(true);
    const toastId = toast.loading("Preparing invoice for sharing...");
    try {
      const canvas = await captureFullInvoice({ backgroundColor: "#ffffff" });
      if (!canvas) return;
      const base64Data = canvas.toDataURL("image/jpeg", 0.95);
      const fileName = `Invoice_${invoice?.invoice_number || "share"}.jpg`;

      if (Capacitor.isNativePlatform()) {
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data.split(",")[1],
          directory: Directory.Cache,
        });
        await Share.share({
          title: `Invoice #${invoice?.invoice_number || ""}`,
          text: `Invoice #${invoice?.invoice_number} from ${vendor?.vendor_name || 'Store'}`,
          url: savedFile.uri,
          dialogTitle: "Share Invoice",
        });
      } else if (navigator.canShare && navigator.share) {
        const blob = await (await fetch(base64Data)).blob();
        const file = new File([blob], fileName, { type: "image/jpeg" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice #${invoice?.invoice_number || ""}`,
            text: `Invoice #${invoice?.invoice_number} total ₹${invoice?.grand_total}`,
            files: [file],
          });
        } else {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = base64Data;
          link.click();
        }
      } else {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = base64Data;
        link.click();
      }
      toast.dismiss(toastId);
      toast.success("Invoice shared successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      if (err.name !== "AbortError") {
        toast.error("Sharing failed: " + err.message);
      }
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

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        {loadTimedOut ? (
          <div className="text-center space-y-2.5 bg-destructive/10 border border-destructive/20 p-4 rounded-lg max-w-sm">
            <div className="flex items-center justify-center gap-1.5 text-destructive font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Loading took longer than expected.</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              The database query or network timed out. Click below to retry or return to the ledger.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLoadTimedOut(false);
                  refetchInvoice();
                  refetchVendor();
                }}
                className="h-7 text-xs border-destructive text-destructive hover:bg-destructive hover:text-white"
              >
                Retry
              </Button>
              <Link to="/invoices">
                <Button size="sm" variant="secondary" className="h-7 text-xs">
                  Back to Invoices
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading invoice details...</p>
          </>
        )}
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
    <div
      className="flex flex-col gap-2.5 max-w-5xl mx-auto"
      style={{ minHeight: "calc(100dvh - 2rem)" }}
    >
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

          {/* Open EMI Calculator Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenEmiCalculator}
            className="h-8 px-2.5 text-xs gap-1.5 font-semibold rounded-lg shadow-xs bg-[#004C8F] text-white hover:bg-[#003B70]"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Generate EMI</span>
          </Button>

          {/* Edit Add-ons Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="h-8 px-2.5 text-xs gap-1.5 font-medium rounded-lg shadow-none"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Add-ons</span>
          </Button>

          {/* Print Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 px-2.5 text-xs gap-1.5 font-medium rounded-lg shadow-none"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </Button>

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
            onClick={handleNativeShare}
            disabled={isCapturing}
            className="h-8 px-3 text-xs gap-1.5 font-semibold rounded-lg shadow-none bg-[#004C8F] text-white hover:bg-[#003B70]"
          >
            {isCapturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />}
            <span>Share</span>
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

      {/* EMI & Tenure Prompt Modal */}
      <Dialog open={isEmiModalOpen} onOpenChange={setIsEmiModalOpen}>
        <DialogContent className="max-w-sm p-4 space-y-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#004C8F]" />
              Tenure &amp; Net Loan Amount
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 text-xs">
            <p className="text-muted-foreground text-[11px]">
              Review or adjust tenure and total net loan amount before generating schedule.
            </p>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Tenure (Months)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={inputTenure}
                onChange={(e) => handleTenureChange(e.target.value)}
                placeholder="e.g. 12"
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Net Loan Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={inputNetLoan}
                onChange={(e) => setInputNetLoan(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEmiModalOpen(false)}
              className="h-8 text-xs px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmEmiCalc}
              className="h-8 text-xs px-4 bg-[#004C8F] text-white hover:bg-[#003B70]"
            >
              Open Calculator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Add-ons Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Add-ons & Insurance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              Select or deselect add-ons for invoice <span className="font-mono font-bold text-foreground">{invoice?.invoice_number}</span>:
            </p>
            <div className="space-y-2">
              <div className="p-2.5 rounded-md border border-border/80 bg-background flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Insurance Eligible</span>
                <div className="flex bg-muted/60 p-0.5 rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setInsuranceEligible("Yes")}
                    className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                      insuranceEligible === "Yes" ? 'bg-[#004C8F] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsuranceEligible("No")}
                    className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                      insuranceEligible === "No" ? 'bg-destructive text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div
                onClick={() => calculatedAcko && insuranceEligible === "Yes" && toggleAddonSelection("acko_mobile")}
                className={`p-2.5 rounded-md border flex items-center justify-between text-xs cursor-pointer transition-all ${
                  insuranceEligible === "No"
                    ? 'opacity-50 bg-muted/20 border-border/40 cursor-not-allowed'
                    : selectedAddons.includes("acko_mobile")
                    ? 'bg-primary/10 border-primary/50 text-foreground font-medium'
                    : 'bg-background border-border/80 text-muted-foreground hover:border-border'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={insuranceEligible === "Yes" && selectedAddons.includes("acko_mobile")}
                    onChange={() => {}}
                    disabled={!calculatedAcko || insuranceEligible === "No"}
                    className="rounded border-border accent-primary cursor-pointer"
                  />
                  <div className="truncate">
                    <p className="font-semibold text-xs truncate">ACKO ADLD MOBILE INSURANCE</p>
                    <p className="text-[10px] text-muted-foreground">
                      {insuranceEligible === "No" ? 'Disabled (Insurance Eligible: No)' : calculatedAcko ? 'Auto bracket amount' : 'Out of range'}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-xs shrink-0">
                  {insuranceEligible === "Yes" && calculatedAcko ? `₹${calculatedAcko.amount.toLocaleString("en-IN")}` : '—'}
                </span>
              </div>

              {AVAILABLE_ADDONS.map(addon => {
                const isChecked = selectedAddons.includes(addon.id) || selectedAddons.includes(addon.name);
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddonSelection(addon.id)}
                    className={`p-2.5 rounded-md border flex items-center justify-between text-xs cursor-pointer transition-all ${
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
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(false)}
              className="h-8 text-xs px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAddons}
              disabled={updateAddonsMutation.isPending}
              className="h-8 text-xs px-4"
            >
              {updateAddonsMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewport Frame with printable container ID */}
      <div
        ref={setContainerRef}
        className="flex-1 w-full flex justify-center items-start overflow-x-hidden overflow-y-auto rounded-xl bg-muted/20 border border-border/60 py-3 px-1 print:p-0 print:m-0 print:border-none print:bg-transparent"
      >
        <div
          id="printable-invoice-container"
          ref={invoiceRef}
          style={{
            zoom: zoom,
            transform: typeof CSS !== "undefined" && CSS.supports && CSS.supports("zoom: 1") ? undefined : `scale(${zoom})`,
            transformOrigin: "top center",
          }}
          className="shadow-sm rounded overflow-hidden print:overflow-visible print:shadow-none print:rounded-none"
        >
          <InvoiceTemplate invoice={invoice} vendor={vendor} stampScale={stampScale} />
        </div>
      </div>
    </div>
  );
}