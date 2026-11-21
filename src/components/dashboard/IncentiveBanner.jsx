// src/components/dashboard/IncentiveBanner.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Award, ChevronDown, ChevronUp, TrendingUp, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "sfe_incentive_custom_slabs_v2";

const DEFAULT_SLAB_CONFIG = {
  disbSlabs: [
    { label: "45 & below", cond: "below", val1: 45, val2: 0, mobileRate: 0, cdRate: 0 },
    { label: "46 to 65", cond: "range", val1: 46, val2: 65, mobileRate: 20, cdRate: 30 },
    { label: "66 to 85", cond: "range", val1: 66, val2: 85, mobileRate: 30, cdRate: 40 },
    { label: "85 to 100", cond: "range", val1: 85, val2: 100, mobileRate: 40, cdRate: 50 },
    { label: "101 to 130", cond: "range", val1: 101, val2: 130, mobileRate: 65, cdRate: 75 },
    { label: "131 & Above", cond: "above", val1: 131, val2: 0, mobileRate: 80, cdRate: 90 },
  ],
  mobileRpcSlabs: [
    { label: "900 & below", cond: "below", val1: 900, val2: 0, pct: 0.0 },
    { label: "901 to 1100", cond: "range", val1: 901, val2: 1100, pct: 1.0 },
    { label: "1101 to 1300", cond: "range", val1: 1101, val2: 1300, pct: 1.5 },
    { label: "1301 to 1450", cond: "range", val1: 1301, val2: 1450, pct: 2.5 },
    { label: "1451 to 1600", cond: "range", val1: 1451, val2: 1600, pct: 4.5 },
    { label: "1601 to 1700", cond: "range", val1: 1601, val2: 1700, pct: 6.0 },
    { label: "1701 & above", cond: "above", val1: 1701, val2: 0, pct: 8.0 },
  ],
  cdRpcSlabs: [
    { label: "700 & below", cond: "below", val1: 700, val2: 0, pct: 0.0 },
    { label: "701 to 900", cond: "range", val1: 701, val2: 900, pct: 1.0 },
    { label: "901 to 1000", cond: "range", val1: 901, val2: 1000, pct: 2.0 },
    { label: "1001 to 1100", cond: "range", val1: 1001, val2: 1100, pct: 3.0 },
    { label: "1101 to 1200", cond: "range", val1: 1101, val2: 1200, pct: 4.5 },
    { label: "1201 to 1300", cond: "range", val1: 1201, val2: 1300, pct: 6.0 },
    { label: "1301 & above", cond: "above", val1: 1301, val2: 0, pct: 8.0 },
  ],
  addlCsSlabs: [
    { label: "120% & below", cond: "below", val1: 120, val2: 0, pct: 0.0 },
    { label: "120.01% - 130%", cond: "range", val1: 120.01, val2: 130, pct: 5.0 },
    { label: "130.01% - 140%", cond: "range", val1: 130.01, val2: 140, pct: 10.0 },
    { label: "140.01% - 150%", cond: "range", val1: 140.01, val2: 150, pct: 15.0 },
    { label: "150.01% - 160%", cond: "range", val1: 150.01, val2: 160, pct: 20.0 },
    { label: "160.01% & above", cond: "above", val1: 160.01, val2: 0, pct: 30.0 },
  ],
};

function matchSlab(value, slabs = []) {
  if (!Array.isArray(slabs) || slabs.length === 0) return { index: 0, label: "—", mobileRate: 0, cdRate: 0, pct: 0 };
  for (let i = 0; i < slabs.length; i++) {
    const s = slabs[i];
    if (s.cond === "below" && value <= Number(s.val1)) return { index: i, ...s };
    if (s.cond === "above" && value >= Number(s.val1)) return { index: i, ...s };
    if (s.cond === "range" && value >= Number(s.val1) && value <= Number(s.val2)) return { index: i, ...s };
  }
  return { index: 0, ...slabs[0] };
}

function isCdProduct(inv) {
  const cat = String(inv?.category || inv?.product_category || inv?.asset_category || "").toUpperCase();
  if (cat === "CD" || cat.includes("CONSUMER DURABLE") || cat.includes("APPLIANCE")) return true;
  const desc = `${inv?.product_description || ""} ${inv?.product_model || ""}`.toUpperCase();
  return /\b(TV|TELEVISION|AC|AIR CONDITIONER|FRIDGE|REFRIGERATOR|WASHING MACHINE|WM|COOLER|LAPTOP|INVERTER)\b/.test(desc);
}

export default function IncentiveBanner({ invoices = [], periodLabel = "Current Period" }) {
  const [showDetails, setShowDetails] = useState(false);
  const [slabConfig, setSlabConfig] = useState(DEFAULT_SLAB_CONFIG);

  // Load slabs from localStorage (and listen for changes if Admin updates them)
  useEffect(() => {
    const loadSlabs = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.disbSlabs) {
            setSlabConfig(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to read incentive slabs:", e);
      }
    };
    loadSlabs();
    window.addEventListener("storage", loadSlabs);
    return () => window.removeEventListener("storage", loadSlabs);
  }, []);

  const metrics = useMemo(() => {
    let mobileCases = 0;
    let cdCases = 0;
    let mobileAddonSum = 0;
    let cdAddonSum = 0;
    let crossSellCount = 0;

    invoices.forEach((inv) => {
      const addons = Array.isArray(inv?.addons) ? inv.addons : [];
      const addonRev = addons.reduce((s, a) => s + (Number(a?.amount) || 0), 0);
      crossSellCount += addons.length;

      if (isCdProduct(inv)) {
        cdCases += 1;
        cdAddonSum += addonRev;
      } else {
        mobileCases += 1;
        mobileAddonSum += addonRev;
      }
    });

    const totalDisbursed = mobileCases + cdCases;
    const disbMatch = matchSlab(totalDisbursed, slabConfig.disbSlabs);

    const mobDisbIncentive = mobileCases * (Number(disbMatch.mobileRate) || 0);
    const cdDisbIncentive = cdCases * (Number(disbMatch.cdRate) || 0);
    const totalDisbIncentive = mobDisbIncentive + cdDisbIncentive;

    const mobileRpc = mobileCases > 0 ? mobileAddonSum / mobileCases : 0;
    const cdRpc = cdCases > 0 ? cdAddonSum / cdCases : 0;
    const totalRpcValue = mobileAddonSum + cdAddonSum;

    const mobRpcMatch = matchSlab(mobileRpc, slabConfig.mobileRpcSlabs);
    const cdRpcMatch = matchSlab(cdRpc, slabConfig.cdRpcSlabs);

    const mobCsBaseIncentive = mobileAddonSum * ((Number(mobRpcMatch.pct) || 0) / 100);
    const cdCsBaseIncentive = cdAddonSum * ((Number(cdRpcMatch.pct) || 0) / 100);
    const totalCsBaseIncentive = mobCsBaseIncentive + cdCsBaseIncentive;

    const totalCrossSellPct = totalDisbursed > 0 ? (crossSellCount / totalDisbursed) * 100 : 0;
    const addlCsMatch = matchSlab(totalCrossSellPct, slabConfig.addlCsSlabs);

    const addlCsIncentive = totalCsBaseIncentive * ((Number(addlCsMatch.pct) || 0) / 100);
    const totalCrossSellIncentive = totalCsBaseIncentive + addlCsIncentive;

    const netTotalIncentive = totalDisbIncentive + totalCrossSellIncentive;

    return {
      mobileCases,
      cdCases,
      totalDisbursed,
      disbMatch,
      mobDisbIncentive,
      cdDisbIncentive,
      totalDisbIncentive,
      mobileRpc,
      cdRpc,
      totalRpcValue,
      mobRpcMatch,
      cdRpcMatch,
      crossSellCount,
      totalCrossSellPct,
      addlCsMatch,
      totalCsBaseIncentive,
      addlCsIncentive,
      totalCrossSellIncentive,
      netTotalIncentive,
    };
  }, [invoices, slabConfig]);

  const fmtINR = (val) =>
    "₹" +
    Math.round(Number(val) || 0).toLocaleString("en-IN");

  return (
    <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-card to-teal-950/20 p-3.5 shadow-lg space-y-3">
      {/* Top Row: Hero Earned Incentive & Breakdown Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                Incentive Earned ({periodLabel})
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                Disb Slab: {metrics.disbMatch.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-foreground tracking-tight">
                {fmtINR(metrics.netTotalIncentive)}
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold">
                ({metrics.totalDisbursed} Cases • {metrics.crossSellCount} Add-ons)
              </span>
            </div>
          </div>
        </div>

        {/* 3 Breakdown Pills (Disbursed, Cross-Sell, Mobile RPC) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
          <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5">
            <span className="text-[9px] uppercase font-bold text-indigo-400 block">Disb Incentive</span>
            <span className="text-xs sm:text-sm font-black font-mono text-foreground">
              {fmtINR(metrics.totalDisbIncentive)}
            </span>
            <span className="text-[9px] text-muted-foreground block">
              MOBILE: ₹{metrics.disbMatch.mobileRate}/c • CD: ₹{metrics.disbMatch.cdRate}/c
            </span>
          </div>

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1.5">
            <span className="text-[9px] uppercase font-bold text-amber-400 block">Cross-Sale Incentive</span>
            <span className="text-xs sm:text-sm font-black font-mono text-foreground">
              {fmtINR(metrics.totalCrossSellIncentive)}
            </span>
            <span className="text-[9px] text-muted-foreground block">
              CROSSSELL: {metrics.totalCrossSellPct.toFixed(1)}% (+{metrics.addlCsMatch.pct}%)
            </span>
          </div>

          <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 px-3 py-1.5">
            <span className="text-[9px] uppercase font-bold text-blue-400 block">RPC Incentive</span>
            <span className="text-xs sm:text-sm font-black font-mono text-foreground">
              ₹{Math.round(metrics.mobileRpc).toLocaleString("en-IN")}
            </span>
            <span className="text-[9px] text-muted-foreground block">
              Slab: {Number(metrics.mobRpcMatch.pct).toFixed(1)}% ({fmtINR(metrics.totalRpcValue)})
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Slab Breakdown Toggle */}
      <div className="pt-1 border-t border-border/60 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
          <span>
            Mobiles: <strong className="text-foreground">{metrics.mobileCases}</strong>
          </span>
          <span>•</span>
          <span>
            CD: <strong className="text-foreground">{metrics.cdCases}</strong>
          </span>
          <span>•</span>
          <span>
            Base CS: <strong className="text-foreground">{fmtINR(metrics.totalCsBaseIncentive)}</strong>
          </span>
          <span>•</span>
          <span>
            Booster: <strong className="text-emerald-500">+{fmtINR(metrics.addlCsIncentive)}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
        >
          <span>{showDetails ? "Hide Active Slab Details" : "Active Slab Details"}</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {showDetails && (
        <div className="pt-2 border-t border-border/60 text-xs">
          {/* Active Slab Breakdown */}
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">
              Active Slab Breakdown
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disbursement Slab ({metrics.totalDisbursed} cases):</span>
                <span className="font-semibold text-foreground">
                  {metrics.disbMatch.label} (M: ₹{metrics.disbMatch.mobileRate} | CD: ₹{metrics.disbMatch.cdRate})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mobile RPC Slab (₹{Math.round(metrics.mobileRpc)}):</span>
                <span className="font-semibold text-foreground">
                  {metrics.mobRpcMatch.label} ({metrics.mobRpcMatch.pct}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CD RPC Slab (₹{Math.round(metrics.cdRpc)}):</span>
                <span className="font-semibold text-foreground">
                  {metrics.cdRpcMatch.label} ({metrics.cdRpcMatch.pct}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CS Booster ({metrics.totalCrossSellPct.toFixed(1)}%):</span>
                <span className="font-semibold text-emerald-500">
                  {metrics.addlCsMatch.label} (+{metrics.addlCsMatch.pct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}