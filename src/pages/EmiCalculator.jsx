import React, { useState, useMemo, useRef, useEffect } from "react";
import { Calculator, Share2, Info, Calendar, Percent, Settings, X, CreditCard, AlertCircle, Printer, Sliders, CheckCircle, ShieldAlert, Download } from "lucide-react";

export default function EmiCalculator() {
  const [emi, setEmi] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [loanNo, setLoanNo] = useState("");
  const [firstEmiDate, setFirstEmiDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-05`;
  });
  const [isDeviceInsurance, setIsDeviceInsurance] = useState(false);

  const [isGenerated, setIsGenerated] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [defaultDay, setDefaultDay] = useState("5");
  const [isDownloading, setIsDownloading] = useState(false);
  
  const scheduleRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

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
    const dayNum = parseInt(defaultDay, 10);
    if (dayNum >= 1 && dayNum <= 31) {
      const parts = firstEmiDate.split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const paddedDay = String(dayNum).padStart(2, '0');
        setFirstEmiDate(`${year}-${month}-${paddedDay}`);
      }
    }
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

      // Temporarily reset transform scale for highest possible crisp rendering
      const originalTransform = scheduleRef.current.style.transform;
      scheduleRef.current.style.transform = "scale(1)";

      const canvas = await window.html2canvas(scheduleRef.current, {
        scale: 4, // Increased multiplier for ultra-sharp clarity
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: 1120,
      });

      // Restore UI transform scale
      scheduleRef.current.style.transform = originalTransform;

      const image = canvas.toDataURL("image/jpeg", 1.0); // Maximum quality
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anek+Telugu:wght@400;600;700;800&display=swap');

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
          font-size: 14px !important;
          box-sizing: border-box !important;
          background-color: #ffffff !important;
          border: 1px solid #cccccc !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .fixed-a4-model .instructions-section, 
        .fixed-a4-model .instructions-section p, 
        .fixed-a4-model .instructions-section li, 
        .fixed-a4-model .instructions-section span,
        .fixed-a4-model .insurance-policy-box,
        .fixed-a4-model .insurance-policy-box p,
        .fixed-a4-model .insurance-policy-box li,
        .fixed-a4-model .insurance-policy-box span,
        .fixed-a4-model .notice-footer .notice-content,
        .fixed-a4-model .notice-footer .notice-content p,
        .fixed-a4-model .notice-footer .notice-content span {
          font-size: 12.5px !important;
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
          background-color: #153f74 !important;
          color: #ffffff !important;
          border: 1px solid #153f74 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .fixed-a4-model table td {
          font-size: 15px !important;
          letter-spacing: -0.5px;
          padding-top: 1px !important;
          padding-bottom: 1px !important;
          border: 1px solid #cccccc !important;
          background-color: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            width: 794px !important;
            height: 1122px !important;
            overflow: hidden !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
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
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 794px !important;
            height: 1122px !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            overflow: hidden !important;
          }
          .fixed-a4-model {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 794px !important;
            height: 1120px !important;
            max-height: 1120px !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 8px 14px !important;
            transform: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            background-color: #ffffff !important;
            overflow: hidden !important;
          }
          .bg-\[\#153f74\] {
            background-color: #153f74 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-gray-100 {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-amber-50 {
            background-color: #fffbeb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-blue-50 {
            background-color: #eff6ff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-red-50 {
            background-color: #fef2f2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Repayment Schedule & Template Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Single-page A4 layout with complete bilingual payment instructions.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/85 transition shadow-sm cursor-pointer"
            title="EMI Settings"
          >
            <Settings className="w-4 h-4 text-primary" />
            Settings
          </button>
          {isGenerated && (
            <>
              <button
                onClick={handleDownloadJpg}
                disabled={totalItems === 0 || isDownloading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/85 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-primary" />
                {isDownloading ? "Exporting..." : "Download JPG"}
              </button>
              <button
                onClick={handlePrint}
                disabled={totalItems === 0}
                className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print A4
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floating Trigger Button for Options (Visible when generated) */}
      {isGenerated && (
        <button
          onClick={() => setIsOptionsOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-bold rounded-full shadow-2xl hover:opacity-95 transition cursor-pointer animate-in fade-in zoom-in-95"
        >
          <Sliders className="w-5 h-5" />
          Options / Parameters
        </button>
      )}

      {/* Initial Setup View */}
      {!isGenerated ? (
        <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-6 shadow-md space-y-4 overflow-hidden">
          <h2 className="text-lg font-bold text-foreground border-b border-border pb-2.5 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            Enter Loan Parameters
          </h2>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex justify-between">
                <span>Loan Number</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CHOLA12345678"
                value={loanNo}
                onChange={(e) => setLoanNo(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex justify-between">
                <span>Monthly EMI Amount</span>
                <span className="font-bold text-primary">₹{Number(emi || 0).toLocaleString('en-IN')}</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-muted-foreground text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="e.g. 4014"
                  value={emi}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => setEmi(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                  className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex justify-between">
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
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex justify-between">
                <span>Starting EMI Date</span>
              </label>
              <input
                type="date"
                value={firstEmiDate}
                onChange={(e) => setFirstEmiDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Device Insurance Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="initial-insurance"
                checked={isDeviceInsurance}
                onChange={(e) => setIsDeviceInsurance(e.target.checked)}
                className="w-4 h-4 text-primary accent-primary rounded border-border cursor-pointer"
              />
              <label htmlFor="initial-insurance" className="text-xs font-medium text-foreground cursor-pointer select-none">
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
            className="w-full py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Generate Schedule
          </button>
        </div>
      ) : (
        /* A4 Printable Modal View with Auto-fit Screen Scaling */
        <div 
          ref={containerRef} 
          className="w-full overflow-hidden flex justify-center py-4"
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
              className="fixed-a4-model bg-white text-gray-900 border border-gray-400 p-2.5 space-y-1 flex flex-col justify-start"
            >
              <div className="space-y-1">
                {/* Template Header Card with Loan Number & QR Code */}
                <div className="bg-[#153f74] text-white border border-[#153f74] relative" style={{ backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <div className="absolute right-2 top-1 bg-white p-1 rounded border border-blue-900 flex flex-col items-center justify-center text-center shadow-xs" style={{ backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent("https://play.google.com/store/apps/details?id=io.ionic.d2c")}`} 
                      alt="Chola One App QR" 
                      className="w-[56px] h-[56px] block"
                    />
                    <span className="text-[7.5px] font-extrabold text-[#153f74] mt-0.5 leading-none">Chola One</span>
                  </div>

                  <div className="py-0.5 text-center bg-[#153f74] border-b border-blue-800 flex justify-between items-center px-3 pr-20" style={{ backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
                      Repayment Schedule {loanNo ? <span className="bg-blue-900/80 px-2 py-0.5 rounded text-[11px] text-blue-100">Loan No: {loanNo}</span> : null}
                    </h2>
                    <span className="text-[10px] font-medium bg-blue-900/60 px-2 py-0.2 rounded text-blue-100">
                      Insurance: {isDeviceInsurance ? "Available (Yes)" : "Not Available (No)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-blue-800 py-1 px-2 text-center bg-[#153f74] pr-20" style={{ backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <div>
                      <p className="text-[10px] font-semibold text-white uppercase tracking-wide">Principal Amount</p>
                      <p className="text-[12px] font-bold text-white mt-0.5">₹ {principal.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white uppercase tracking-wide">Total EMIs</p>
                      <p className="text-[12px] font-bold text-white mt-0.5">{tenureMonths}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white uppercase tracking-wide">EMI Amount</p>
                      <p className="text-[12px] font-bold text-white mt-0.5">₹ {Number(emi || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white uppercase tracking-wide">Starting Date</p>
                      <p className="text-[12px] font-bold text-white mt-0.5">{firstEmiDate ? formatDateToDDMMYYYY(firstEmiDate) : "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Multi-Column Tables (Max 2 Columns, Max 12 Rows Each) */}
                <div>
                  {totalItems === 0 ? (
                    <div className="p-6 text-center text-gray-400 font-medium text-xs">
                      Please enter EMI amount and tenure months above to generate the schedule.
                    </div>
                  ) : (
                    <div className={`grid ${layoutMode === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mx-auto`}>
                      {/* Column 1 */}
                      <div className="border border-[#153f74] bg-white">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-[#153f74] text-white font-bold uppercase" style={{ backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              <th className="py-0.5 px-1 text-center w-7 border border-[#153f74]" style={{ backgroundColor: '#153f74', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>S.No</th>
                              <th className="py-0.5 px-1 text-center border border-[#153f74]" style={{ backgroundColor: '#153f74', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Due Date</th>
                              <th className="py-0.5 px-1 text-right border border-[#153f74]" style={{ backgroundColor: '#153f74', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Principal</th>
                              <th className="py-0.5 px-1 text-right border border-[#153f74]" style={{ backgroundColor: '#153f74', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>EMI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {col1.map((item, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="py-0.2 px-1 text-center font-bold text-gray-800 border border-gray-300">{item.installment}</td>
                                <td className="py-0.2 px-1 text-center font-semibold text-gray-800 border border-gray-300">{item.dueDate}</td>
                                <td className="py-0.2 px-1 text-right font-bold text-gray-900 border border-gray-300">₹ {Math.round(item.principal).toLocaleString('en-IN')}</td>
                                <td className="py-0.2 px-1 text-right font-bold text-gray-900 border border-gray-300">₹ {Math.round(item.amount).toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Column 2 */}
                      {layoutMode === 2 && (
                        <div className="border border-[#153f74] bg-white">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-[#153f74] text-white font-bold uppercase" style={{ backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                <th className="py-0.5 px-1 text-center w-7 border border-[#153f74]" style={{ backgroundColor: '#153f74', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>S.No</th>
                                <th className="py-0.5 px-1 text-center border border-[#153f74]" style={{ backgroundColor: '#153f74', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Due Date</th>
                                <th className="py-0.5 px-1 text-right border border-[#153f74]" style={{ backgroundColor: '#153f74', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Principal</th>
                                <th className="py-0.5 px-1 text-right border border-[#153f74]" style={{ backgroundColor: '#153f74', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>EMI</th>
                              </tr>
                            </thead>
                            <tbody>
                              {col2.map((item, idx) => (
                                <tr key={chunkSize + idx} className="bg-white">
                                  <td className="py-0.2 px-1 text-center font-bold text-gray-800 border border-gray-300">{item.installment}</td>
                                  <td className="py-0.2 px-1 text-center font-semibold text-gray-800 border border-gray-300">{item.dueDate}</td>
                                  <td className="py-0.2 px-1 text-right font-bold text-gray-900 border border-gray-300">₹ {Math.round(item.principal).toLocaleString('en-IN')}</td>
                                  <td className="py-0.2 px-1 text-right font-bold text-gray-900 border border-gray-300">₹ {Math.round(item.amount).toLocaleString('en-IN')}</td>
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
                  <div className="bg-[#153f74] text-white py-1 px-4 flex justify-between items-center text-xs font-black" style={{ backgroundColor: '#153f74', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <span>Total Payable</span>
                    <div className="flex gap-12">
                      <span>Principal: ₹ {principal.toLocaleString('en-IN')}</span>
                      <span>EMI: ₹ {totalPayment.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}

                {/* Instructions & Guidelines in Lower Part */}
                <div className="instructions-section space-y-0.1 bg-gray-100 p-1.5 border border-gray-400 text-gray-900" style={{ backgroundColor: '#f3f4f6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <p className="font-black uppercase tracking-wider text-black underline">
                    Instructions & Finance Guidelines / <span className="telugu-text font-bold">నిబంధనలు మరియు మార్గదర్శకాలు</span>
                  </p>
                  <ol className="list-decimal list-outside pl-4 space-y-0.1 font-medium leading-tight">
                    <li>
                      The device given in finance are only for consumer use and only the customer is responsible for loan amount, charges and emi's.<br />
                      <span className="telugu-text text-gray-700 font-semibold">ఫైనాన్స్‌లో ఇవ్వబడిన పరికరం కేవలం వినియోగదారుల వినియోగం కోసం మాత్రమే మరియు లోన్ మొత్తం, ఛార్జీలు మరియు ఈఎంఐలకు కస్టమర్ మాత్రమే బాధ్యత వహిస్తారు.</span>
                    </li>
                    <li>
                      <strong className="text-red-600">Keep amount in account before 4th of every month.</strong> Otherwise <strong className="underline">Rs.649/-</strong> charges should be paid extra to unlock the device. And bank may incur charges according to their own policies.<br />
                      <span className="telugu-text text-gray-700 font-semibold">ప్రతి నెలా 4వ తేదీకి ముందే ఖాతాలో తగిన మొత్తం ఉంచండి. లేదంటే పరికరాన్ని అన్‌లాక్ చేయడానికి రూ. 649/- అదనంగా చెల్లించాలి. మరియు బ్యాంక్ నిబంధనల ప్రకారం అదనపు ఛార్జీలు పడవచ్చు.</span>
                    </li>
                    <li>
                      Prevent double deductions by making payment online as an advance EMI before 7 days of the due date (which is by the 28th of the previous month).<br />
                      <span className="telugu-text text-gray-700 font-semibold">డబుల్ డిడక్షన్ (రెండుసార్లు కట్ కావడం) నివారించడానికి, గడువు తేదీకి 7 రోజుల ముందే (అంటే మునుపటి నెల 28వ తేదీ నాటికి) ఆన్‌లైన్‌లో అడ్వాన్స్ EMI చెల్లించండి.</span>
                    </li>
                    <li>
                      The device financed in Chola comes with a locking mechanism. If there is pending due; the functions in device will be locked and they are only retrieved only after clearing the pending dues.<br />
                      <span className="telugu-text text-gray-700 font-semibold">చోళాలో ఫైనాన్స్ చేయబడిన పరికరం లాకింగ్ మెకానిజంతో వస్తుంది. బకాయి ఉంటే పరికరంలోని ఫంక్షన్‌లు లాక్ చేయబడతాయి మరియు బకాయిలన్నీ చెల్లించిన తర్వాత మాత్రమే అన్‌లాక్ చేయబడతాయి.</span>
                    </li>
                    <li>
                      Chola is not responsible for any kind of theft and losing of product, and the emis are not meant to be skipped.<br />
                      <span className="telugu-text text-gray-700 font-semibold">ఉత్పత్తి దొంగతనానికి లేదా పోగొట్టుకోవడానికి చోళా బాధ్యత వహించదు, మరియు ఈఎంఐలను ఎట్టి పరిస్థితుల్లోనూ ఆపివేయడానికి వీలులేదు.</span>
                    </li>
                  </ol>
                </div>

                {/* Conditional Device Insurance / Uninsured Policy Box */}
                {isDeviceInsurance ? (
                  <div className="insurance-policy-box bg-blue-50 p-1.5 border border-blue-300 text-blue-950 flex justify-between items-center gap-2" style={{ backgroundColor: '#eff6ff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <div className="space-y-0.2 flex-1">
                      <p className="font-black uppercase tracking-wider text-blue-900 underline flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        Device Insurance Policy (ACKO Mobile Insurance) <span className="telugu-text font-bold">మొబైల్ ఇన్సూరెన్స్ సమాచారం</span>
                      </p>
                      <ul className="list-disc list-outside pl-4 space-y-0.1 font-medium leading-tight">
                        <li>
                          This device is secured by ACKO mobile insurance, which can be claimed for accidental damage and liquid damage.<br />
                          <span className="telugu-text text-blue-900 font-semibold">ఈ పరికరం ACKO మొబైల్ ఇన్సూరెన్స్ ద్వారా రక్షించబడింది, దీనిని యాక్సిడెంటల్ డ్యామేజ్ మరియు లిక్విడ్ డ్యామేజ్ కోసం క్లెయిమ్ చేయవచ్చు.</span>
                        </li>
                        <li>
                          <strong className="text-red-700 font-bold">Strict Note:</strong> This plan cannot be claimed for Theft cases under any circumstances.<br />
                          <span className="telugu-text text-red-800 font-semibold">గమనిక: దొంగతనం (Theft) కేసులకు ఈ ప్లాన్ వర్తించదు.</span>
                        </li>
                        <li>
                          Insurance coverage is valid for <strong className="font-bold">1 year</strong> and can be claimed for <strong className="font-bold">once</strong> only.<br />
                          <span className="telugu-text text-blue-900 font-semibold">ఈ ఇన్సూరెన్స్ 1 సంవత్సరం వరకు మరియు కేవలం ఒకసారి మాత్రమే క్లెయిమ్ చేయడానికి చెల్లుబాటు అవుతుంది.</span>
                        </li>
                        <li>
                          Insurance coverage gets completely void if the device is repaired at any service center other than an authorized service center.<br />
                          <span className="telugu-text text-blue-900 font-semibold">అధికారిక సర్వీస్ సెంటర్ కాకుండా ఇతర సెంటర్లలో రిపేర్ చేస్తే ఇన్సూరెన్స్ వర్తించదు.</span>
                        </li>
                      </ul>
                    </div>
                    {/* ACKO App QR Code */}
                    <div className="bg-white p-1 rounded border border-blue-300 shrink-0 flex flex-col items-center justify-center text-center shadow-xs" style={{ backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent("https://play.google.com/store/apps/details?id=com.acko.android")}`} 
                        alt="ACKO App QR" 
                        className="w-[56px] h-[56px] block"
                      />
                      <span className="text-[7.5px] font-extrabold text-blue-900 mt-0.5 leading-none">ACKO App</span>
                    </div>
                  </div>
                ) : (
                  <div className="insurance-policy-box bg-red-50 p-1.5 border border-red-300 text-red-950 flex items-start gap-1" style={{ backgroundColor: '#fef2f2', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.1">
                      <p className="font-bold text-red-900 uppercase tracking-wider">
                        Insurance Status: Not Insured / <span className="telugu-text font-bold">బీమా స్థితి: బీమా లేదు</span>
                      </p>
                      <p className="font-medium text-red-800">
                        The financed device is not insured and not covered by policy.<br />
                        <span className="telugu-text font-semibold">ఫైనాన్స్ చేయబడిన పరికరానికి ఎలాంటి ఇన్సూరెన్స్ లేదా పాలసీ వర్తించదు.</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notice Footer Only */}
              <div className="notice-footer space-y-0.5 pt-0.5 border-t border-gray-400">
                {totalItems > 0 && (
                  <div className="notice-content p-1 bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-1" style={{ backgroundColor: '#fffbeb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                    <div className="space-y-0.1">
                      <p>
                        <strong>Important Notice:</strong> Ensure funds are deposited before the 4th of every month to prevent automatic device locking and Rs. 649/- unlock penalty charges.
                      </p>
                      <p className="telugu-text font-semibold italic text-amber-950">
                        గమనిక: పరికరం ఆటోమేటిక్ లాక్ కాకుండా మరియు రూ. 649/- జరిమానా పడకుండా ఉండాలంటే ప్రతి నెలా 4వ తేదీకి ముందే నిధులను జమ చేయండి.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Floating Dialog Modal for Options / Parameters */}
      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white border border-gray-400 shadow-2xl max-w-sm w-full p-5 space-y-4 overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-300 pb-2.5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#153f74]" />
                Loan Parameters
              </h3>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="p-1 rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-800 flex justify-between">
                  <span>Loan Number</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHOLA12345678"
                  value={loanNo}
                  onChange={(e) => setLoanNo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-400 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#153f74]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-800 flex justify-between">
                  <span>Monthly EMI Amount</span>
                  <span className="font-bold text-[#153f74]">₹{Number(emi || 0).toLocaleString('en-IN')}</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-500 text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="e.g. 4014"
                    value={emi}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => setEmi(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-gray-400 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#153f74]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-800 flex justify-between">
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
                  className="w-full px-3 py-1.5 bg-white border border-gray-400 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#153f74]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-800 flex justify-between">
                  <span>Starting EMI Date</span>
                </label>
                <input
                  type="date"
                  value={firstEmiDate}
                  onChange={(e) => setFirstEmiDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-400 rounded text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#153f74]"
                />
              </div>

              {/* Device Insurance Checkbox in Options Modal */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="options-insurance"
                  checked={isDeviceInsurance}
                  onChange={(e) => setIsDeviceInsurance(e.target.checked)}
                  className="w-4 h-4 text-[#153f74] accent-[#153f74] rounded border-gray-400 cursor-pointer"
                />
                <label htmlFor="options-insurance" className="text-xs font-medium text-gray-800 cursor-pointer select-none">
                  Is Device Insurance Available
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-300 flex gap-2">
              <button
                onClick={handleDownloadJpg}
                disabled={isDownloading}
                className="flex-1 py-2 bg-secondary text-secondary-foreground font-bold text-xs rounded hover:bg-secondary/85 cursor-pointer flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-[#153f74]" />
                {isDownloading ? "Exporting..." : "Download JPG"}
              </button>
              <button
                onClick={() => setIsOptionsOpen(false)}
                className="flex-1 py-2 bg-[#153f74] text-white font-bold text-xs rounded hover:bg-[#0d2a4e] cursor-pointer"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-gray-400 shadow-xl max-w-sm w-full p-6 space-y-4 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-300 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#153f74]" />
                EMI Date Configuration
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">
                Default EMI Day of Every Month (1 - 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={defaultDay}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => setDefaultDay(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-400 rounded text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-[#153f74]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-300">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-medium rounded hover:bg-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-[#153f74] text-white text-xs font-medium rounded hover:bg-[#0d2a4e] cursor-pointer"
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