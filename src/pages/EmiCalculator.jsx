// src/pages/EmiCalculator.jsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Calculator, Settings, X, AlertCircle, Printer, ShieldAlert, Download, Palette, FileText, ArrowLeft, Check, Edit3, Maximize2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jspdf from "jspdf";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { toast } from "sonner";

const AVAILABLE_ADDONS = [
  { id: "one_assist", name: "ONE ASSIST HOME ASSURE", amount: 1099 },
  { id: "anmol_xpress", name: "ANMOL XPRESS HEALTH", amount: 799 },
  { id: "hdfc_suraksha", name: "HDFC LIFE JEEVAN SURAKSHA", amount: 745 },
];

const A4_WIDTH = 794;
const A4_HEIGHT = 1122;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

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

function getTouchDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
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

export default function EmiCalculator() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedState = location.state || {};

  const [netLoanAmount, setNetLoanAmount] = useState(() => {
    if (passedState.loanAmount !== undefined && passedState.loanAmount !== "") return String(passedState.loanAmount);
    if (passedState.totalPrincipal !== undefined && passedState.totalPrincipal !== "") {
      const addons = Number(passedState.addonsAmount) || 0;
      return String(Number(passedState.totalPrincipal) - addons);
    }
    return "";
  });

  const [productCost, setProductCost] = useState(() => {
    if (passedState.productCost !== undefined && passedState.productCost !== "") return String(passedState.productCost);
    if (passedState.product_price !== undefined && passedState.product_price !== "") return String(passedState.product_price);
    if (passedState.product_cost !== undefined && passedState.product_cost !== "") return String(passedState.product_cost);
    if (passedState.mrp !== undefined && passedState.mrp !== "") return String(passedState.mrp);
    return "";
  });

  const [tenureMonths, setTenureMonths] = useState(() => passedState.tenure !== undefined && passedState.tenure !== "" ? String(passedState.tenure) : "");
  const [loanNo, setLoanNo] = useState(() => passedState.loanNumber !== undefined && passedState.loanNumber !== "" ? String(passedState.loanNumber) : "");

  const [doDate, setDoDate] = useState(() => {
    if (passedState.doDate) return passedState.doDate;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [selectedAddons, setSelectedAddons] = useState(() => {
    if (passedState.selectedAddons && Array.isArray(passedState.selectedAddons)) {
      return passedState.selectedAddons.map(a => typeof a === 'object' ? (a.id || a.name) : a);
    }
    if (passedState.addons && Array.isArray(passedState.addons)) {
      return passedState.addons.map(a => typeof a === 'object' ? (a.id || a.name) : a);
    }
    const initial = [];
    if (passedState.hasAcko) initial.push("acko_mobile");
    return initial;
  });

  const [isColorTheme, setIsColorTheme] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [defaultDay, setDefaultDay] = useState("5");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const [isGenerated, setIsGenerated] = useState(false);

  const scheduleRef = useRef(null);
  const containerRef = useRef(null);
  const pinchStateRef = useRef({
    active: false,
    startDist: 0,
    startZoom: 1,
  });

  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [isPinching, setIsPinching] = useState(false);

  const effectiveScale = useMemo(() => {
    const combined = fitScale * userZoom;
    return Math.min(MAX_ZOOM, Math.max(0.2, Number(combined.toFixed(4))));
  }, [fitScale, userZoom]);

  const calculatedAcko = calculateAckoPlan(productCost !== "" ? productCost : netLoanAmount);
  const isDeviceInsurance = selectedAddons.includes("acko_mobile");

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const firstEmiDate = useMemo(() => {
    if (!doDate) return "";
    const parts = doDate.split("-");
    if (parts.length !== 3) return doDate;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return doDate;

    let targetYear = year;
    let targetMonth = month;

    if (day <= 20) {
      targetMonth += 1;
    } else {
      targetMonth += 2;
    }

    const dayNum = parseInt(defaultDay, 10) || 5;
    const finalDate = new Date(targetYear, targetMonth, dayNum);

    const yyyy = finalDate.getFullYear();
    const mm = String(finalDate.getMonth() + 1).padStart(2, '0');
    const dd = String(finalDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [doDate, defaultDay]);

  const computeAutoFit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const availableWidth = (rect.width || el.clientWidth || window.innerWidth) - 24;
    if (availableWidth > 0) {
      setFitScale(Math.min(1, availableWidth / A4_WIDTH));
    }
  }, []);

  useEffect(() => {
    if (!isGenerated) return;
    computeAutoFit();
    const raf = requestAnimationFrame(computeAutoFit);
    const timer = setTimeout(computeAutoFit, 80);
    window.addEventListener("resize", computeAutoFit, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", computeAutoFit);
    };
  }, [isGenerated, computeAutoFit]);

  const handleResetFit = () => {
    setUserZoom(1);
    computeAutoFit();
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      if (dist > 0) {
        pinchStateRef.current = {
          active: true,
          startDist: dist,
          startZoom: userZoom,
        };
        setIsPinching(true);
      }
    }
  };

  const handleTouchMove = (e) => {
    if (pinchStateRef.current.active && e.touches.length === 2) {
      e.preventDefault();
      const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
      if (currentDist > 0 && pinchStateRef.current.startDist > 0) {
        const ratio = currentDist / pinchStateRef.current.startDist;
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStateRef.current.startZoom * ratio));
        setUserZoom(Number(nextZoom.toFixed(3)));
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchStateRef.current.active = false;
      setIsPinching(false);
    }
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      setUserZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z + delta).toFixed(3)))));
    }
  };

  const handleSaveSettings = () => {
    setIsSettingsOpen(false);
  };

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [yyyy, mm, dd] = parts;
      return `${dd}/${mm}/${yyyy}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const { principal, totalPayment, regularEmiDisplay, schedule } = useMemo(() => {
    const loan = Number(netLoanAmount) || 0;
    const n = Math.min(24, Math.max(0, Number(tenureMonths) || 0));

    const selectedAddonsList = selectedAddons.map(id => {
      if (id === "acko_mobile" && calculatedAcko) return calculatedAcko;
      return AVAILABLE_ADDONS.find(a => a.id === id || a.name === id);
    }).filter(Boolean);

    const totalAddons = selectedAddonsList.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
    const baseTotalPrincipal = loan + totalAddons;

    if (baseTotalPrincipal <= 0 || n <= 0) {
      return { principal: 0, totalPayment: 0, regularEmiDisplay: 0, schedule: [] };
    }

    let currentPrincipal = baseTotalPrincipal;
    const rows = [];

    let baseDate = new Date(firstEmiDate || Date.now());
    if (isNaN(baseDate.getTime())) {
      baseDate = new Date();
    }

    const exactEmi = baseTotalPrincipal / n;
    const regularEmi = Math.ceil(exactEmi);

    let accumulatedPayments = 0;

    for (let month = 1; month <= n; month++) {
      const installmentDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + (month - 1), baseDate.getDate());
      const principalForMonth = currentPrincipal;

      let monthAmount = regularEmi;
      if (month === n) {
        monthAmount = Math.max(0, Number((baseTotalPrincipal - accumulatedPayments).toFixed(2)));
      }

      accumulatedPayments += monthAmount;
      currentPrincipal = Math.max(0, currentPrincipal - monthAmount);

      rows.push({
        installment: month,
        dueDate: !isNaN(installmentDate.getTime())
          ? installmentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : "—",
        principal: principalForMonth,
        amount: monthAmount,
      });

      if (currentPrincipal <= 0 && month < n) break;
    }

    return {
      principal: Math.round(baseTotalPrincipal),
      totalPayment: Math.round(accumulatedPayments),
      regularEmiDisplay: regularEmi,
      schedule: rows,
    };
  }, [netLoanAmount, tenureMonths, selectedAddons, calculatedAcko, firstEmiDate]);

  const handlePrint = () => {
    window.print();
  };

  const captureScheduleCanvas = async () => {
    const el = scheduleRef.current;
    if (!el) return null;

    const prevTransform = el.style.transform;
    const prevLeft = el.style.left;
    const prevPosition = el.style.position;

    el.style.position = "relative";
    el.style.left = "0px";
    el.style.transform = "scale(1)";

    try {
      return await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH,
        height: A4_HEIGHT,
        windowWidth: A4_WIDTH,
        windowHeight: A4_HEIGHT,
      });
    } finally {
      el.style.position = prevPosition;
      el.style.left = prevLeft;
      el.style.transform = prevTransform;
    }
  };

  const handleDownloadJpg = async () => {
    if (!scheduleRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await captureScheduleCanvas();
      if (!canvas) return;

      const fileName = `Repayment_Schedule_${loanNo ? loanNo : 'Chola'}.jpg`;
      const base64Data = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];

      if (Capacitor.isNativePlatform()) {
        await saveToDownloadsFolder(fileName, base64Data);
      } else {
        const link = document.createElement("a");
        link.href = `data:image/jpeg;base64,${base64Data}`;
        link.download = fileName;
        link.click();
        toast.success("JPG downloaded");
      }
    } catch (error) {
      console.error("Failed to generate JPG image:", error);
      toast.error("Failed to download JPG: " + (error?.message || error));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!scheduleRef.current) return;
    setIsPdfDownloading(true);
    try {
      const canvas = await captureScheduleCanvas();
      if (!canvas) return;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jspdf("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      const fileName = `Repayment_Schedule_${loanNo ? loanNo : 'Chola'}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output("datauristring").split(",")[1];
        await saveToDownloadsFolder(fileName, pdfBase64);
      } else {
        pdf.save(fileName);
        toast.success("PDF downloaded");
      }
    } catch (error) {
      console.error("Failed to generate PDF document:", error);
      toast.error("Failed to download PDF: " + (error?.message || error));
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const safeSchedule = Array.isArray(schedule) ? schedule : [];
  const totalItems = safeSchedule.length;

  let layoutMode = 1;
  if (totalItems > 12) {
    layoutMode = 2;
  }
  const chunkSize = Math.min(12, Math.ceil(totalItems / layoutMode)) || 1;
  const col1 = safeSchedule.slice(0, chunkSize);
  const col2 = layoutMode === 2 ? safeSchedule.slice(chunkSize, chunkSize * 2) : [];

  const scaledWidth = Math.round(A4_WIDTH * effectiveScale);
  const scaledHeight = Math.round(A4_HEIGHT * effectiveScale);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anek+Telugu:ital,wght@0,400;0,600;0,700;1,400&display=swap');

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        .telugu-text {
          font-family: 'Anek Telugu', sans-serif !important;
        }
        .fixed-a4-model {
          width: 794px !important;
          min-width: 794px !important;
          max-width: 794px !important;
          height: 1122px !important;
          max-height: 1122px !important;
          font-size: 13px !important;
          box-sizing: border-box !important;
          background-color: #ffffff !important;
          padding: 12px 20px !important;
          border: 2px solid ${isColorTheme ? '#153f74' : '#222222'} !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .fixed-a4-model .instructions-section,
        .fixed-a4-model .instructions-section p,
        .fixed-a4-model .instructions-section li,
        .fixed-a4-model .instructions-section span {
          font-size: 10.5px !important;
          line-height: 1.18 !important;
        }
        .fixed-a4-model .insurance-policy-box,
        .fixed-a4-model .insurance-policy-box p,
        .fixed-a4-model .insurance-policy-box li,
        .fixed-a4-model .insurance-policy-box span {
          font-size: 11px !important;
          line-height: 1.18 !important;
        }
        .fixed-a4-model .notice-footer .notice-content,
        .fixed-a4-model .notice-footer .notice-content p,
        .fixed-a4-model .notice-footer .notice-content span {
          font-size: 11px !important;
          line-height: 1.18 !important;
        }
        .fixed-a4-model table {
          font-family: 'Courier New', Courier, monospace !important;
          border-collapse: collapse !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .fixed-a4-model table th {
          font-size: 15px !important;
          letter-spacing: -0.5px;
          padding: 2px 4px !important;
          background-color: ${isColorTheme ? '#153f74' : '#ffffff'} !important;
          color: ${isColorTheme ? '#ffffff' : '#000000'} !important;
          border: 1px solid ${isColorTheme ? '#153f74' : '#333333'} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .fixed-a4-model table td {
          font-size: 15px !important;
          letter-spacing: -0.5px;
          padding: 2px 4px !important;
          border: 1px solid ${isColorTheme ? '#cccccc' : '#666666'} !important;
          background-color: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-schedule-wrapper, #printable-schedule-wrapper * {
            visibility: visible !important;
          }
          #printable-schedule-wrapper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 794px !important;
            height: 1122px !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            z-index: 9999 !important;
          }
          .fixed-a4-model {
            transform: none !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 794px !important;
            height: 1122px !important;
            padding: 12px 20px !important;
            border: 2px solid ${isColorTheme ? '#153f74' : '#222222'} !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
          }
        }
      `}</style>

      {/* Header with Parameters Form & Generate/Edit Button */}
      <div className="no-print bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center p-1.5 bg-secondary text-secondary-foreground rounded hover:bg-secondary/85 transition cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-primary" />
                Repayment Schedule Generator
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {isGenerated
                  ? "Pinch with two fingers to zoom in/out, or tap Fit to reset to screen width."
                  : "Fill in the loan parameters below and click Generate Schedule to create the repayment plan."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded hover:bg-secondary/85 transition cursor-pointer"
              title="EMI Settings"
            >
              <Settings className="w-3.5 h-3.5 text-primary" />
              Settings
            </button>
            {isGenerated && (
              <button
                onClick={handleResetFit}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded hover:bg-secondary/85 transition cursor-pointer"
                title="Auto-fit to screen"
              >
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span>Fit ({Math.round(effectiveScale * 100)}%)</span>
              </button>
            )}
            {isGenerated && (
              <button
                onClick={() => setIsGenerated(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 transition cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Schedule
              </button>
            )}
            {isGenerated && totalItems > 0 && (
              <>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isPdfDownloading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded hover:bg-secondary/85 transition disabled:opacity-50 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  {isPdfDownloading ? "Exporting PDF..." : "Download PDF"}
                </button>
                <button
                  onClick={handleDownloadJpg}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded hover:bg-secondary/85 transition disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  {isDownloading ? "Exporting JPG..." : "Download JPG"}
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:opacity-90 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print A4
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Parameters Header Form */}
        {!isGenerated && (
          <div className="space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
              <div className="space-y-0.5">
                <label className="font-medium text-muted-foreground">Loan Number</label>
                <input
                  type="text"
                  value={loanNo}
                  onChange={(e) => setLoanNo(e.target.value)}
                  placeholder=""
                  className="w-full px-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-0.5">
                <label className="font-medium text-muted-foreground">DO Date</label>
                <input
                  type="date"
                  value={doDate}
                  onChange={(e) => setDoDate(e.target.value)}
                  className="w-full px-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-0.5">
                <label className="font-medium text-muted-foreground">Product Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={productCost}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => setProductCost(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-0.5">
                <label className="font-medium text-muted-foreground">Net Loan Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={netLoanAmount}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => setNetLoanAmount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                  className="w-full px-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-0.5">
                <label className="font-medium text-muted-foreground">Tenure (Months)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  value={tenureMonths}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Math.min(24, Math.max(0, Number(e.target.value)));
                    setTenureMonths(val);
                  }}
                  className="w-full px-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    setUserZoom(1);
                    setIsGenerated(true);
                  }}
                  className="w-full h-7 bg-primary text-primary-foreground font-bold rounded text-xs hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Generate Schedule
                </button>
              </div>
            </div>

            {/* Add-ons and Theme controls row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Add-ons:</span>

                <div
                  onClick={() => calculatedAcko && toggleAddon("acko_mobile")}
                  className={`px-2 py-1 rounded border flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    selectedAddons.includes("acko_mobile") ? 'bg-primary/10 border-primary text-foreground font-medium' : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAddons.includes("acko_mobile")}
                    onChange={() => {}}
                    disabled={!calculatedAcko}
                    className="rounded border-border accent-primary cursor-pointer w-3 h-3"
                  />
                  <span>ACKO Mobile Insurance ({calculatedAcko ? `₹${calculatedAcko.amount}` : '—'})</span>
                </div>

                {AVAILABLE_ADDONS.map(addon => {
                  const isChecked = selectedAddons.includes(addon.id) || selectedAddons.includes(addon.name);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`px-2 py-1 rounded border flex items-center gap-1.5 cursor-pointer text-[11px] ${
                        isChecked ? 'bg-primary/10 border-primary text-foreground font-medium' : 'bg-background border-border text-muted-foreground'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-border accent-primary cursor-pointer w-3 h-3"
                      />
                      <span>{addon.name} (₹{addon.amount})</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="header-color-theme"
                  checked={isColorTheme}
                  onChange={(e) => setIsColorTheme(e.target.checked)}
                  className="w-3.5 h-3.5 text-primary accent-primary rounded border-border cursor-pointer"
                />
                <label htmlFor="header-color-theme" className="font-medium text-foreground cursor-pointer select-none flex items-center gap-1 text-[11px]">
                  <Palette className="w-3 h-3 text-primary" /> Use Color Theme
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opening / Un-generated state message */}
      {!isGenerated ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <Calculator className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h2 className="text-sm font-bold text-foreground">Configure Loan Parameters in Header</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Please enter the loan details, tenure, and add-ons above, then click <strong>Generate Schedule</strong> to preview and print the repayment schedule.
          </p>
          <button
            onClick={() => {
              setUserZoom(1);
              setIsGenerated(true);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:opacity-95 transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            Generate Schedule Now
          </button>
        </div>
      ) : totalItems > 0 ? (
        /* Auto-fit + Interactive Touch Pinch-to-Zoom Schedule Preview */
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            touchAction: isPinching || userZoom > 1.02 ? "none" : "pan-y pinch-zoom",
          }}
          className="w-full overflow-auto rounded-xl bg-muted/20 border border-border/60 py-3 px-2 flex justify-center items-start select-none"
        >
          <div
            id="printable-schedule-wrapper"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              minWidth: `${scaledWidth}px`,
              transition: isPinching ? "none" : "width 0.15s ease, height 0.15s ease",
            }}
            className="relative shrink-0 bg-white shadow-md"
          >
            <div
              ref={scheduleRef}
              style={{
                transform: `scale(${effectiveScale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
                transition: isPinching ? "none" : "transform 0.15s ease",
              }}
              className="fixed-a4-model bg-white text-gray-900 border p-3 space-y-2 flex flex-col justify-start"
            >
              <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Template Header Card */}
                  <div
                    className={`border relative ${isColorTheme ? 'bg-[#153f74] text-white border-[#153f74]' : 'bg-white text-black border-black'}`}
                    style={isColorTheme ? { backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}
                  >
                    <div className={`absolute right-1 top-1 bg-white p-1 rounded border flex flex-col items-center justify-center text-center ${isColorTheme ? 'border-blue-900' : 'border-black'}`} style={{ backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent("https://play.google.com/store/apps/details?id=io.ionic.d2c")}`}
                        alt="Chola One App QR"
                        crossOrigin="anonymous"
                        className="w-[72px] h-[72px] block"
                      />
                      <span className={`text-[8px] font-extrabold mt-0.5 leading-none ${isColorTheme ? 'text-[#153f74]' : 'text-black'}`}>Chola One</span>
                    </div>

                    <div className={`py-3 text-center border-b flex justify-between items-center px-3 pr-20 ${isColorTheme ? 'bg-[#153f74] border-blue-800' : 'bg-white border-black'}`} style={isColorTheme ? { backgroundColor: '#0d3c6c', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                      <h2 className={`text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 ${isColorTheme ? 'text-white' : 'text-black'}`}>
                        <u>Repayment Schedule</u> {loanNo ? <span className={`border px-2 py-0.5 rounded text-[11.5px] font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`}>Loan No: {loanNo}</span> : null}
                      </h2>
                      <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`}>
                        Insurance Eligibility: {selectedAddons.length > 0 ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className={`grid grid-cols-4 divide-x py-1 px-2 text-center pr-20 ${isColorTheme ? 'bg-[#153f74] divide-blue-800 border-b border-blue-800' : 'bg-white divide-black border-b border-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${isColorTheme ? 'text-white' : 'text-black'}`}>Principal Amount</p>
                        <p className={`text-[11px] font-bold mt-0.5 ${isColorTheme ? 'text-white' : 'text-black'}`}>₹ {principal.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${isColorTheme ? 'text-white' : 'text-black'}`}>Total EMIs</p>
                        <p className={`text-[11px] font-bold mt-0.5 ${isColorTheme ? 'text-white' : 'text-black'}`}>{tenureMonths}</p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${isColorTheme ? 'text-white' : 'text-black'}`}>EMI Amount</p>
                        <p className={`text-[11px] font-bold mt-0.5 ${isColorTheme ? 'text-white' : 'text-black'}`}>₹ {regularEmiDisplay.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${isColorTheme ? 'text-white' : 'text-black'}`}>Starting Date</p>
                        <p className={`text-[11px] font-bold mt-0.5 ${isColorTheme ? 'text-white' : 'text-black'}`}>{firstEmiDate ? formatDateToDDMMYYYY(firstEmiDate) : "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Column Tables */}
                  <div className="mt-1">
                    <div className={`grid ${layoutMode === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 mx-auto`}>
                      {/* Column 1 */}
                      <div className={`border ${isColorTheme ? 'border-[#153f74]' : 'border-black'} bg-white`}>
                        <table className="w-full text-left">
                          <thead>
                            <tr>
                              <th className={`py-0.5 px-1 text-center w-7 border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>S.No</th>
                              <th className={`py-0.5 px-1 text-center border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>Due Date</th>
                              <th className={`py-0.5 px-1 text-center border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>Principal</th>
                              <th className={`py-0.5 px-1 text-center font-bold ${isColorTheme ? 'text-white' : 'text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>EMI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {col1.map((item, idx) => (
                              <tr key={idx} className="bg-white border-b border-gray-300">
                                <td className="py-0.5 px-1 text-center font-bold text-black border-r border-gray-300">{item.installment}</td>
                                <td className="py-0.5 px-1 text-center font-semibold text-black border-r border-gray-300">{item.dueDate}</td>
                                <td className="py-0.5 px-1 text-center font-bold text-black border-r border-gray-300">₹ {Math.round(item.principal).toLocaleString('en-IN')}</td>
                                <td className="py-0.5 px-1 text-center font-bold text-black">₹ {Math.round(item.amount).toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Column 2 */}
                      {layoutMode === 2 && (
                        <div className={`border ${isColorTheme ? 'border-[#153f74]' : 'border-black'} bg-white`}>
                          <table className="w-full text-left">
                            <thead>
                              <tr>
                                <th className={`py-0.5 px-1 text-center w-7 border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>S.No</th>
                                <th className={`py-0.5 px-1 text-center border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>Due Date</th>
                                <th className={`py-0.5 px-1 text-center border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>Principal</th>
                                <th className={`py-0.5 px-1 text-center font-bold ${isColorTheme ? 'text-white' : 'text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>EMI</th>
                              </tr>
                            </thead>
                            <tbody>
                              {col2.map((item, idx) => (
                                <tr key={chunkSize + idx} className="bg-white border-b border-gray-300">
                                  <td className="py-0.5 px-1 text-center font-bold text-black border-r border-gray-300">{item.installment}</td>
                                  <td className="py-0.5 px-1 text-center font-semibold text-black border-r border-gray-300">{item.dueDate}</td>
                                  <td className="py-0.5 px-1 text-center font-bold text-black border-r border-gray-300">₹ {Math.round(item.principal).toLocaleString('en-IN')}</td>
                                  <td className="py-0.5 px-1 text-center font-bold text-black">₹ {Math.round(item.amount).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Summary Bar */}
                  <div
                    className={`border mt-1 py-1 px-3 flex justify-between items-center text-xs font-black ${isColorTheme ? 'bg-[#153f74] text-white border-[#153f74]' : 'bg-white text-black border-black'}`}
                    style={isColorTheme ? { backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}
                  >
                    <span><u>Total Payable</u></span>
                    <div className="flex gap-8">
                      <span>Principal: <strong>₹ {principal.toLocaleString('en-IN')}</strong></span>
                      <span>EMI: <strong>₹ {totalPayment.toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>

                  {/* Instructions & Guidelines in Lower Part */}
                  <div className={`instructions-section space-y-1 p-2 border text-black ${isColorTheme ? 'bg-gray-50 border-gray-300' : 'bg-white border-black'}`} style={isColorTheme ? { backgroundColor: '#f9fafb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                    <p className="font-black uppercase tracking-wider text-black underline">
                      Instructions &amp; Finance Guidelines / <span className="telugu-text font-bold">నిబంధనలు మరియు మార్గదర్శకాలు</span>
                    </p>
                    <ol className="list-decimal list-outside pl-4 space-y-2 font-medium leading-tight">
                      <div>
                        The device given in finance are only for consumer use and <u>only the customer is responsible</u> for loan amount, charges and emi&apos;s.<br />
                        <span className="telugu-text text-black font-semibold">ఫైనాన్స్‌లో ఇవ్వబడిన పరికరం కేవలం వినియోగదారుల వినియోగం కోసం మాత్రమే మరియు <u>లోన్ మొత్తం, ఛార్జీలు మరియు ఈఎంఐలకు కస్టమర్ మాత్రమే బాధ్యత వహిస్తారు.</u></span>
                      </div>
                      <div>
                        <strong><u>Keep amount in account before 4th of every month.</u></strong> Otherwise <strong className="underline">Rs.649/-</strong> charges should be paid extra to unlock the device. And bank may incur charges according to their own policies.<br />
                        <span className="telugu-text text-black font-semibold"><u>ప్రతి నెలా 4వ తేదీకి ముందే ఖాతాలో తగిన మొత్తం ఉంచండి.</u> లేదంటే పరికరాన్ని అన్‌లాక్ చేయడానికి <u>రూ. 649/-</u> అదనంగా చెల్లించాలి. మరియు బ్యాంక్ నిబంధనల ప్రకారం అదనపు ఛార్జీలు పడవచ్చు.</span>
                      </div>
                      <div>
                        Prevent double deductions by making payment online as an <i>advance EMI</i> before 7 days of the due date (which is by the 28th of the previous month).<br />
                        <span className="telugu-text text-black font-semibold">డబుల్ డిడక్షన్ (రెండుసార్లు కట్ కావడం) నివారించడానికి, గడువు తేదీకి 7 రోజుల ముందే (అంటే మునుపటి నెల 28వ తేదీ నాటికి) <i>ఆన్‌లైన్‌లో అడ్వాన్స్ EMI</i> చెల్లించండి.</span>
                      </div>
                      <div>
                        The device financed in Chola comes with a <u>locking mechanism</u>. If there is pending due; the functions in device will be locked and they are only retrieved only after clearing the pending dues.<br />
                        <span className="telugu-text text-black font-semibold">చోళాలో ఫైనాన్స్ చేయబడిన పరికరం <u>లాకింగ్ మెకానిజంతో</u> వస్తుంది. బకాయి ఉంటే పరికరంలోని ఫంక్షన్‌లు లాక్ చేయబడతాయి మరియు బకాయిలన్నీ చెల్లించిన తర్వాత మాత్రమే అన్‌లాక్ చేయబడతాయి.</span>
                      </div>
                      <div>
                        Chola is not responsible for any kind of theft and losing of product, and <i>the emis are not meant to be skipped</i>.<br />
                        <span className="telugu-text text-black font-semibold">ఉత్పత్తి దొంగతనానికి లేదా పోగొట్టుకోవడానికి చోళా బాధ్యత వహించదు, మరియు <i>ఈఎంఐలను ఎట్టి పరిస్థితుల్లోనూ ఆపివేయడానికి వీలులేదు.</i></span>
                      </div>
                    </ol>
                  </div>

                  {/* Conditional Device Insurance / Uninsured Policy Box */}
                  {isDeviceInsurance ? (
                    <div className={`insurance-policy-box p-2 border flex justify-between items-center gap-2 ${isColorTheme ? 'bg-blue-50 border-blue-300 text-blue-950' : 'bg-white border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#eff6ff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                      <div className="space-y-0.5 flex-1">
                        <p className={`font-black uppercase tracking-wider underline flex items-center gap-1 ${isColorTheme ? 'text-blue-950' : 'text-black'}`}>
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          Device Insurance Policy (ACKO Mobile Insurance) <span className="telugu-text font-bold">మొబైల్ ఇన్సూరెన్స్ సమాచారం</span>
                        </p>
                        <ul className="list-disc list-outside pl-4 space-y-0.5 font-medium leading-tight">
                          <li>
                            This device is secured by ACKO mobile insurance, which can be claimed for accidental damage and liquid damage.<br />
                            <span className="telugu-text font-semibold">ఈ పరికరం ACKO మొబైల్ ఇన్సూరెన్స్ ద్వారా రక్షించబడింది, దీనిని యాక్సిడెంటల్ డ్యామేజ్ మరియు లిక్విడ్ డ్యామేజ్ కోసం క్లెయిమ్ చేయవచ్చు.</span>
                          </li>
                          <li>
                            <strong><u>Strict Note:</u></strong> This plan <i>cannot be claimed for Theft cases</i> under any circumstances.<br />
                            <span className="telugu-text font-semibold"><u>గమనిక:</u> దొంగతనం (Theft) కేసులకు ఈ ప్లాన్ <i>వర్తించదు.</i></span>
                          </li>
                          <li>
                            Insurance coverage is valid for <strong>1 year</strong> and can be claimed for <strong>once</strong> only.<br />
                            <span className="telugu-text font-semibold">ఈ ఇన్సూరెన్స్ <strong>1 సంవత్సరం</strong> వరకు మరియు కేవలం <strong>ఒకసారి</strong> మాత్రమే క్లెయిమ్ చేయడానికి చెల్లుబాటు అవుతుంది.</span>
                          </li>
                          <li>
                            Insurance coverage gets completely void if the device is repaired at any service center other than an authorized service center.<br />
                            <span className="telugu-text font-semibold">అధికారిక సర్వీస్ సెంటర్ కాకుండా ఇతర సెంటర్లలో రిపేర్ చేస్తే ఇన్సూరెన్స్ వర్తించదు.</span>
                          </li>
                        </ul>
                      </div>
                      {/* ACKO App QR Code */}
                      <div className="bg-white p-1 rounded border border-black shrink-0 flex flex-col items-center justify-center text-center" style={{ backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://play.google.com/store/apps/details?id=com.acko.android")}`}
                          alt="ACKO App QR"
                          crossOrigin="anonymous"
                          className="w-[72px] h-[72px] block"
                        />
                        <span className="text-[9px] font-extrabold text-black mt-0.5 leading-none">ACKO App</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`insurance-policy-box p-2 border flex items-start gap-1.5 ${isColorTheme ? 'bg-red-50 border-red-300 text-red-950' : 'bg-white border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#fef2f2', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold uppercase tracking-wider underline">
                          Insurance Status: Not Insured / <span className="telugu-text font-bold">బీమా స్థితి: బీమా లేదు</span>
                        </p>
                        <p className="font-medium">
                          <i>The financed device is not insured and not covered by policy.</i><br />
                          <span className="telugu-text font-semibold"><i>ఫైనాన్స్ చేయబడిన పరికరానికి ఎలాంటి ఇన్సూరెన్స్ లేదా పాలసీ వర్తించదు.</i></span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notice Footer Only */}
                <div className="notice-footer space-y-1 pt-0.5 border-t border-black mt-auto">
                  <div className={`notice-content p-1 border flex items-start gap-1 ${isColorTheme ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-white border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#fffbeb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-[11px]">
                      <p>
                        <strong><u>Important Notice:</u></strong> Ensure funds are deposited before the <strong>4th of every month</strong> to prevent automatic device locking and <u>Rs. 649/-</u> unlock penalty charges.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white border border-gray-400 shadow-xl max-w-sm w-full p-4 space-y-3 overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-gray-300 pb-2">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#153f74]" />
                EMI Date Configuration
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-gray-800">
                Default EMI Day of Every Month (1 - 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={defaultDay}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => setDefaultDay(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-400 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#153f74]"
              />
            </div>

            <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-300">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 font-medium rounded hover:bg-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-3 py-1.5 bg-[#153f74] text-white font-medium rounded hover:bg-[#0d2a4e] cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}