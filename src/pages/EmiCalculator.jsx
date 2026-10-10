import React, { useState, useMemo, useRef, useEffect } from "react";
import { Calculator, Share2, Info, Calendar, Percent, Settings, X, CreditCard, AlertCircle, Printer, Sliders, CheckCircle, ShieldAlert, Download, Palette, FileText } from "lucide-react";

export default function EmiCalculator() {
  const [emi, setEmi] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [loanNo, setLoanNo] = useState("");
  
  // DO Date defaults to today in YYYY-MM-DD format
  const [doDate, setDoDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [isDeviceInsurance, setIsDeviceInsurance] = useState(false);
  const [isColorTheme, setIsColorTheme] = useState(true); // Toggle for color vs grey
  const [isGenerated, setIsGenerated] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [defaultDay, setDefaultDay] = useState("5");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  
  const scheduleRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Automatically calculate First EMI Date based on DO Date rule
  const firstEmiDate = useMemo(() => {
    if (!doDate) return "";
    const parts = doDate.split("-");
    if (parts.length !== 3) return doDate;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
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

  // Auto-fit screen calculation for the preview modal
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.offsetWidth - 32;
        const a4Width = 794;
        if (parentWidth < a4Width) {
          setScale(parentWidth / a4Width);
        } else {
          setScale(1);
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isGenerated]);

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
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const { principal, totalPayment, schedule } = useMemo(() => {
    const E = Number(emi) || 0;
    const n = Math.min(24, Math.max(0, Number(tenureMonths) || 0));

    if (E <= 0 || n <= 0) {
      return { principal: 0, totalPayment: 0, schedule: [] };
    }

    const initialPrincipal = E * n;
    const tPayment = E * n;

    let currentPrincipal = initialPrincipal;
    const rows = [];
    
    let baseDate = new Date(firstEmiDate || Date.now());
    if (isNaN(baseDate.getTime())) {
      baseDate = new Date();
    }

    for (let month = 1; month <= n; month++) {
      const installmentDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + (month - 1), baseDate.getDate());
      const principalForMonth = currentPrincipal;
      currentPrincipal = Math.max(0, currentPrincipal - E);

      rows.push({
        installment: month,
        dueDate: !isNaN(installmentDate.getTime()) 
          ? installmentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
          : "—",
        principal: principalForMonth,
        amount: E,
      });

      if (currentPrincipal <= 0 && month < n) break;
    }

    return {
      principal: Math.round(initialPrincipal),
      totalPayment: Math.round(tPayment),
      schedule: rows,
    };
  }, [emi, tenureMonths, firstEmiDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJpg = async () => {
    if (!scheduleRef.current) return;
    setIsDownloading(true);
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const originalTransform = scheduleRef.current.style.transform;
      scheduleRef.current.style.transform = "scale(1)";

      const mobileScale = Math.max(window.devicePixelRatio || 1, 3);

      const canvas = await window.html2canvas(scheduleRef.current, {
        scale: mobileScale,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: 1120,
      });

      scheduleRef.current.style.transform = originalTransform;

      const image = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement("a");
      link.href = image;
      link.download = `Repayment_Schedule_${loanNo ? loanNo : 'Chola'}.jpg`;
      link.click();
    } catch (error) {
      console.error("Failed to generate JPG image:", error);
      alert("Failed to download JPG. Please try printing or use another browser.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!scheduleRef.current) return;
    setIsPdfDownloading(true);
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const originalTransform = scheduleRef.current.style.transform;
      scheduleRef.current.style.transform = "scale(1)";

      const canvas = await window.html2canvas(scheduleRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: 1120,
      });

      scheduleRef.current.style.transform = originalTransform;

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Repayment_Schedule_${loanNo ? loanNo : 'Chola'}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF document:", error);
      alert("Failed to download PDF. Please try again.");
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
          height: 1120px !important;
          max-height: 1120px !important;
          font-size: 13.5px !important;
          box-sizing: border-box !important;
          background-color: #ffffff !important;
          border: 1px solid ${isColorTheme ? '#153f74' : '#333333'} !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .fixed-a4-model .instructions-section, 
        .fixed-a4-model .instructions-section p, 
        .fixed-a4-model .instructions-section li, 
        .fixed-a4-model .instructions-section span {
          font-size: 11px !important;
          line-height: 1.2 !important;
        }
        .fixed-a4-model .insurance-policy-box,
        .fixed-a4-model .insurance-policy-box p,
        .fixed-a4-model .insurance-policy-box li,
        .fixed-a4-model .insurance-policy-box span,
        .fixed-a4-model .notice-footer .notice-content,
        .fixed-a4-model .notice-footer .notice-content p,
        .fixed-a4-model .notice-footer .notice-content span {
          font-size: 12.5px !important;
          line-height: 1.25 !important;
        }
        .fixed-a4-model table {
          font-family: 'Courier New', Courier, monospace !important;
          border-collapse: collapse !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .fixed-a4-model table th {
          font-size: 13.5px !important;
          letter-spacing: -0.5px;
          padding: 2px 6px !important;
          background-color: ${isColorTheme ? '#153f74' : '#ffffff'} !important;
          color: ${isColorTheme ? '#ffffff' : '#000000'} !important;
          border: 1px solid ${isColorTheme ? '#153f74' : '#333333'} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .fixed-a4-model table td {
          font-size: 13.5px !important;
          letter-spacing: -0.5px;
          padding: 2px 6px !important;
          border: 1px solid ${isColorTheme ? '#cccccc' : '#666666'} !important;
          background-color: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* PRINT STYLES: Hide everything except the printable A4 model */
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-schedule-wrapper, #printable-schedule-wrapper * {
            visibility: visible !important;
          }
          #printable-schedule-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .fixed-a4-model {
            transform: none !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-primary" />
            Repayment Schedule & Template Generator
          </h1>
          <p className="text-xs text-muted-foreground">
            Single-page A4 layout & bilingual guidelines.
          </p>
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
            <>
              <button
                onClick={handleDownloadPdf}
                disabled={totalItems === 0 || isPdfDownloading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded hover:bg-secondary/85 transition disabled:opacity-50 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                {isPdfDownloading ? "Exporting PDF..." : "Download PDF"}
              </button>
              <button
                onClick={handleDownloadJpg}
                disabled={totalItems === 0 || isDownloading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded hover:bg-secondary/85 transition disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                {isDownloading ? "Exporting JPG..." : "Download JPG"}
              </button>
              <button
                onClick={handlePrint}
                disabled={totalItems === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print A4
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floating Trigger Button for Options */}
      {isGenerated && (
        <button
          onClick={() => setIsOptionsOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-full shadow-xl hover:opacity-95 transition cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          Options / Parameters
        </button>
      )}

      {/* Minimal Initial Setup View */}
      {!isGenerated ? (
        <div className="max-w-sm mx-auto bg-card border border-border rounded-lg p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-foreground border-b border-border pb-2 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-primary" />
            Enter Loan Parameters
          </h2>

          <div className="space-y-2.5 text-xs">
            <div className="space-y-0.5">
              <label className="font-medium text-foreground">Loan Number</label>
              <input
                type="text"
                placeholder="e.g. CHOLA12345678"
                value={loanNo}
                onChange={(e) => setLoanNo(e.target.value)}
                className="w-full px-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-0.5">
              <label className="font-medium text-foreground">DO Date (Delivery / Purchase Date)</label>
              <input
                type="date"
                value={doDate}
                onChange={(e) => setDoDate(e.target.value)}
                className="w-full px-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-0.5">
              <label className="font-medium text-foreground flex justify-between">
                <span>Monthly EMI Amount</span>
                <span className="font-bold text-primary">₹{Number(emi || 0).toLocaleString('en-IN')}</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-muted-foreground text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="e.g. 4014"
                  value={emi}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => setEmi(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                  className="w-full pl-6 pr-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="font-medium text-foreground flex justify-between">
                <span>Tenure (Months, Max 24)</span>
                <span className="font-bold text-primary">{tenureMonths ? `${tenureMonths} Months` : 'Enter months'}</span>
              </label>
              <input
                type="number"
                min="1"
                max="24"
                step="1"
                placeholder="e.g. 7"
                value={tenureMonths}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Math.min(24, Math.max(0, Number(e.target.value)));
                  setTenureMonths(val);
                }}
                className="w-full px-2.5 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Theme Toggle Checkbox */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <input
                type="checkbox"
                id="initial-color-theme"
                checked={isColorTheme}
                onChange={(e) => setIsColorTheme(e.target.checked)}
                className="w-3.5 h-3.5 text-primary accent-primary rounded border-border cursor-pointer"
              />
              <label htmlFor="initial-color-theme" className="font-medium text-foreground cursor-pointer select-none flex items-center gap-1">
                <Palette className="w-3 h-3 text-primary" /> Use Color Theme (Uncheck for Monochrome Grey)
              </label>
            </div>

            {/* Device Insurance Checkbox */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <input
                type="checkbox"
                id="initial-insurance"
                checked={isDeviceInsurance}
                onChange={(e) => setIsDeviceInsurance(e.target.checked)}
                className="w-3.5 h-3.5 text-primary accent-primary rounded border-border cursor-pointer"
              />
              <label htmlFor="initial-insurance" className="font-medium text-foreground cursor-pointer select-none">
                Is Device Insurance Available
              </label>
            </div>
          </div>

          <button
            onClick={() => {
              if (Number(emi) > 0 && Number(tenureMonths) > 0) {
                setIsGenerated(true);
              } else {
                alert("Please enter a valid EMI amount and tenure months.");
              }
            }}
            className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs rounded hover:opacity-90 transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Generate Schedule
          </button>
        </div>
      ) : (
        /* A4 Printable Modal View with Auto-fit Screen Scaling */
        <div 
          ref={containerRef} 
          className="w-full overflow-hidden flex justify-center py-2"
        >
          <div 
            id="printable-schedule-wrapper"
            style={{ 
              width: `${794 / scale}px`, 
              height: `${1122 / scale}px`,
              transition: 'width 0.2s ease, height 0.2s ease'
            }}
            className="relative shrink-0 flex items-start justify-center"
          >
            <div 
              ref={scheduleRef} 
              style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: 'top center',
                position: 'absolute',
                top: 0,
                left: `calc(50% - 397px)`
              }}
              className="fixed-a4-model bg-white text-gray-900 border p-2 space-y-1 flex flex-col justify-start"
            >
              <div className="space-y-1">
                {/* Template Header Card */}
                <div 
                  className={`border relative ${isColorTheme ? 'bg-[#153f74] text-white border-[#153f74]' : 'bg-white text-black border-black'}`}
                  style={isColorTheme ? { backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}
                >
                  <div className={`absolute right-2 top-1 bg-white p-1 rounded border flex flex-col items-center justify-center text-center ${isColorTheme ? 'border-blue-900' : 'border-black'}`} style={{ backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent("https://play.google.com/store/apps/details?id=io.ionic.d2c")}`} 
                      alt="Chola One App QR" 
                      className="w-[64px] h-[64px] block"
                    />
                    <span className={`text-[8.5px] font-extrabold mt-0.5 leading-none ${isColorTheme ? 'text-[#153f74]' : 'text-black'}`}>Chola One</span>
                  </div>

                  <div className={`py-0.5 text-center border-b flex justify-between items-center px-3 pr-24 ${isColorTheme ? 'bg-[#153f74] border-blue-800' : 'bg-white border-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                    <h2 className={`text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 ${isColorTheme ? 'text-white' : 'text-black'}`}>
                      <u>Repayment Schedule</u> {loanNo ? <span className={`border px-1.5 py-0.5 rounded text-[10.5px] font-bold ${isColorTheme ? 'bg-blue-900/80 border-blue-900 text-blue-100' : 'border-black text-black'}`}>Loan No: {loanNo}</span> : null}
                    </h2>
                    <span className={`text-[9.5px] font-bold border px-1.5 py-0.2 rounded ${isColorTheme ? 'bg-blue-900/60 border-blue-900 text-blue-100' : 'border-black text-black'}`}>
                      Insurance: {isDeviceInsurance ? <span className="underline">Available (Yes)</span> : "Not Available (No)"}
                    </span>
                  </div>
                  <div className={`grid grid-cols-4 divide-x py-1 px-2 text-center pr-24 ${isColorTheme ? 'bg-[#153f74] divide-blue-800 border-b border-blue-800' : 'bg-white divide-black border-b border-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                    <div>
                      <p className={`text-[9.5px] font-bold uppercase tracking-wide ${isColorTheme ? 'text-white' : 'text-black'}`}>Principal Amount</p>
                      <p className={`text-[11.5px] font-bold mt-0.5 ${isColorTheme ? 'text-white' : 'text-black'}`}>₹ {principal.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className={`text-[9.5px] font-bold uppercase tracking-wide ${isColorTheme ? 'text-white' : 'text-black'}`}>Total EMIs</p>
                      <p className={`text-[11.5px] font-bold mt-0.5 ${isColorTheme ? 'text-white' : 'text-black'}`}>{tenureMonths}</p>
                    </div>
                    <div>
                      <p className={`text-[9.5px] font-bold uppercase tracking-wide ${isColorTheme ? 'text-white' : 'text-black'}`}>EMI Amount</p>
                      <p className={`text-[11.5px] font-bold mt-0.5 ${isColorTheme ? 'text-white' : 'text-black'}`}>₹ {Number(emi || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className={`text-[9.5px] font-bold uppercase tracking-wide ${isColorTheme ? 'text-white' : 'text-black'}`}>Starting Date</p>
                      <p className={`text-[11.5px] font-bold mt-0.5 ${isColorTheme ? 'text-white' : 'text-black'}`}>{firstEmiDate ? formatDateToDDMMYYYY(firstEmiDate) : "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Multi-Column Tables */}
                <div>
                  {totalItems === 0 ? (
                    <div className="p-6 text-center text-gray-500 font-medium text-xs">
                      Please enter EMI amount and tenure months above to generate the schedule.
                    </div>
                  ) : (
                    <div className={`grid ${layoutMode === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 mx-auto`}>
                      {/* Column 1 */}
                      <div className={`border ${isColorTheme ? 'border-[#153f74]' : 'border-black'} bg-white`}>
                        <table className="w-full text-left">
                          <thead>
                            <tr>
                              <th className={`py-0.5 px-1.5 text-center w-7 border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>S.No</th>
                              <th className={`py-0.5 px-1.5 text-center border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>Due Date</th>
                              <th className={`py-0.5 px-1.5 text-right border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>Principal</th>
                              <th className={`py-0.5 px-1.5 text-right font-bold ${isColorTheme ? 'text-white' : 'text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>EMI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {col1.map((item, idx) => (
                              <tr key={idx} className="bg-white border-b border-gray-300">
                                <td className="py-0.5 px-1.5 text-center font-bold text-black border-r border-gray-300">{item.installment}</td>
                                <td className="py-0.5 px-1.5 text-center font-semibold text-black border-r border-gray-300">{item.dueDate}</td>
                                <td className="py-0.5 px-1.5 text-right font-bold text-black border-r border-gray-300">₹ {Math.round(item.principal).toLocaleString('en-IN')}</td>
                                <td className="py-0.5 px-1.5 text-right font-bold text-black">₹ {Math.round(item.amount).toLocaleString('en-IN')}</td>
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
                                <th className={`py-0.5 px-1.5 text-center w-7 border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>S.No</th>
                                <th className={`py-0.5 px-1.5 text-center border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>Due Date</th>
                                <th className={`py-0.5 px-1.5 text-right border-r font-bold ${isColorTheme ? 'border-blue-900 text-white' : 'border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>Principal</th>
                                <th className={`py-0.5 px-1.5 text-right font-bold ${isColorTheme ? 'text-white' : 'text-black'}`} style={isColorTheme ? { backgroundColor: '#153f74', color: '#ffffff' } : {}}>EMI</th>
                              </tr>
                            </thead>
                            <tbody>
                              {col2.map((item, idx) => (
                                <tr key={chunkSize + idx} className="bg-white border-b border-gray-300">
                                  <td className="py-0.5 px-1.5 text-center font-bold text-black border-r border-gray-300">{item.installment}</td>
                                  <td className="py-0.5 px-1.5 text-center font-semibold text-black border-r border-gray-300">{item.dueDate}</td>
                                  <td className="py-0.5 px-1.5 text-right font-bold text-black border-r border-gray-300">₹ {Math.round(item.principal).toLocaleString('en-IN')}</td>
                                  <td className="py-0.5 px-1.5 text-right font-bold text-black">₹ {Math.round(item.amount).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Total Summary Bar */}
                {totalItems > 0 && (
                  <div 
                    className={`border py-1 px-3 flex justify-between items-center text-xs font-black ${isColorTheme ? 'bg-[#153f74] text-white border-[#153f74]' : 'bg-white text-black border-black'}`}
                    style={isColorTheme ? { backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}
                  >
                    <span><u>Total Payable</u></span>
                    <div className="flex gap-12">
                      <span>Principal: <strong>₹ {principal.toLocaleString('en-IN')}</strong></span>
                      <span>EMI: <strong>₹ {totalPayment.toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>
                )}

                {/* Instructions & Guidelines in Lower Part */}
                <div className={`instructions-section space-y-0.5 p-1.5 border text-black ${isColorTheme ? 'bg-gray-50 border-gray-300' : 'bg-white border-black'}`} style={isColorTheme ? { backgroundColor: '#f9fafb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                  <p className="font-black uppercase tracking-wider text-black underline">
                    Instructions & Finance Guidelines / <span className="telugu-text font-bold">నిబంధనలు మరియు మార్గదర్శకాలు</span>
                  </p>
                  <ol className="list-decimal list-outside pl-4 space-y-0.5 font-medium leading-tight">
                    <div>
                      The device given in finance are only for consumer use and <u>only the customer is responsible</u> for loan amount, charges and emi's.<br />
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
                  <div className={`insurance-policy-box p-1.5 border flex justify-between items-center gap-2 ${isColorTheme ? 'bg-blue-50 border-blue-300 text-blue-950' : 'bg-white border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#eff6ff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                    <div className="space-y-0.2 flex-1">
                      <p className={`font-black uppercase tracking-wider underline flex items-center gap-1 ${isColorTheme ? 'text-blue-950' : 'text-black'}`}>
                        <ShieldAlert className="w-3 h-3 shrink-0" />
                        Device Insurance Policy (ACKO Mobile Insurance) <span className="telugu-text font-bold">మొబైల్ ఇన్సూరెన్స్ సమాచారం</span>
                      </p>
                      <ul className="list-disc list-outside pl-4 space-y-0.2 font-medium leading-tight">
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
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent("https://play.google.com/store/apps/details?id=com.acko.android")}`} 
                        alt="ACKO App QR" 
                        className="w-[64px] h-[64px] block"
                      />
                      <span className="text-[8.5px] font-extrabold text-black mt-0.5 leading-none">ACKO App</span>
                    </div>
                  </div>
                ) : (
                  <div className={`insurance-policy-box p-1.5 border flex items-start gap-1 ${isColorTheme ? 'bg-red-50 border-red-300 text-red-950' : 'bg-white border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#fef2f2', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                    <ShieldAlert className="w-3 h-3 shrink-0 mt-0.5" />
                    <div className="space-y-0.1">
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
              <div className="notice-footer space-y-0.5 pt-0.5 border-t border-black">
                {totalItems > 0 && (
                  <div className={`notice-content p-1 border flex items-start gap-1 ${isColorTheme ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-white border-black text-black'}`} style={isColorTheme ? { backgroundColor: '#fffbeb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : {}}>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div className="space-y-0.1">
                      <p>
                        <strong><u>Important Notice:</u></strong> Ensure funds are deposited before the <strong>4th of every month</strong> to prevent automatic device locking and <u>Rs. 649/-</u> unlock penalty charges.
                      </p>
                      <p className="telugu-text font-semibold italic">
                        గమనిక: పరికరం ఆటోమేటిక్ లాక్ కాకుండా మరియు <u>రూ. 649/- జరిమానా</u> పడకుండా ఉండాలంటే ప్రతి నెలా <strong>4వ తేదీకి ముందే</strong> నిధులను జమ చేయండి.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Floating Dialog Modal for Options / Parameters */}
      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white border border-gray-400 shadow-2xl max-w-sm w-full p-4 space-y-3 overflow-hidden animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-gray-300 pb-2">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#153f74]" />
                Loan Parameters
              </h3>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="p-1 rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-0.5">
                <label className="font-medium text-gray-800">Loan Number</label>
                <input
                  type="text"
                  placeholder="e.g. CHOLA12345678"
                  value={loanNo}
                  onChange={(e) => setLoanNo(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white border border-gray-400 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#153f74]"
                />
              </div>

              <div className="space-y-0.5">
                <label className="font-medium text-gray-800">DO Date</label>
                <input
                  type="date"
                  value={doDate}
                  onChange={(e) => setDoDate(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white border border-gray-400 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#153f74]"
                />
              </div>

              <div className="space-y-0.5">
                <label className="font-medium text-gray-800 flex justify-between">
                  <span>Monthly EMI Amount</span>
                  <span className="font-bold text-[#153f74]">₹{Number(emi || 0).toLocaleString('en-IN')}</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="e.g. 4014"
                    value={emi}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => setEmi(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                    className="w-full pl-6 pr-2.5 py-1 bg-white border border-gray-400 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#153f74]"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="font-medium text-gray-800 flex justify-between">
                  <span>Tenure (Months, Max 24)</span>
                  <span className="font-bold text-[#153f74]">{tenureMonths ? `${tenureMonths} Months` : 'Enter months'}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  placeholder="e.g. 7"
                  value={tenureMonths}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Math.min(24, Math.max(0, Number(e.target.value)));
                    setTenureMonths(val);
                  }}
                  className="w-full px-2.5 py-1 bg-white border border-gray-400 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#153f74]"
                />
              </div>

              {/* Theme Toggle in Options */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <input
                  type="checkbox"
                  id="options-color-theme"
                  checked={isColorTheme}
                  onChange={(e) => setIsColorTheme(e.target.checked)}
                  className="w-3.5 h-3.5 text-[#153f74] accent-[#153f74] rounded border-gray-400 cursor-pointer"
                />
                <label htmlFor="options-color-theme" className="font-medium text-gray-800 cursor-pointer select-none flex items-center gap-1">
                  <Palette className="w-3 h-3 text-[#153f74]" /> Use Color Theme (Uncheck for Grey)
                </label>
              </div>

              {/* Device Insurance Checkbox */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <input
                  type="checkbox"
                  id="options-insurance"
                  checked={isDeviceInsurance}
                  onChange={(e) => setIsDeviceInsurance(e.target.checked)}
                  className="w-3.5 h-3.5 text-[#153f74] accent-[#153f74] rounded border-gray-400 cursor-pointer"
                />
                <label htmlFor="options-insurance" className="font-medium text-gray-800 cursor-pointer select-none">
                  Is Device Insurance Available
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-300 flex gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isPdfDownloading}
                className="flex-1 py-1.5 bg-secondary text-secondary-foreground font-bold rounded hover:bg-secondary/85 cursor-pointer flex items-center justify-center gap-1 text-[11px]"
              >
                <FileText className="w-3.5 h-3.5 text-[#153f74]" />
                {isPdfDownloading ? "PDF..." : "PDF"}
              </button>
              <button
                onClick={handleDownloadJpg}
                disabled={isDownloading}
                className="flex-1 py-1.5 bg-secondary text-secondary-foreground font-bold rounded hover:bg-secondary/85 cursor-pointer flex items-center justify-center gap-1 text-[11px]"
              >
                <Download className="w-3.5 h-3.5 text-[#153f74]" />
                {isDownloading ? "JPG..." : "JPG"}
              </button>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="flex-1 py-1.5 bg-[#153f74] text-white font-bold rounded hover:bg-[#0d2a4e] cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-gray-400 shadow-xl max-w-sm w-full p-4 space-y-3 overflow-hidden animate-in fade-in zoom-in-95 text-xs">
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