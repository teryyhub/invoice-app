// src/pages/IncentiveCalculator.jsx
import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Award,
  Smartphone,
  Tv,
  ShieldCheck,
  Calculator,
  ArrowLeftRight,
} from "lucide-react";

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

export default function IncentiveCalculator() {
  const slabConfig = DEFAULT_SLAB_CONFIG;

  // Manual Input States (Blank initially)
  const [mobileCases, setMobileCases] = useState("");
  const [cdCases, setCdCases] = useState("");
  
  // Switch modes: 'rev' or 'rpc'
  const [mobileInputMode, setMobileInputMode] = useState("rev"); // 'rev' | 'rpc'
  const [mobileAddonSum, setMobileAddonSum] = useState("");
  const [mobileRpcVal, setMobileRpcVal] = useState("");

  const [cdInputMode, setCdInputMode] = useState("rev"); // 'rev' | 'rpc'
  const [cdAddonSum, setCdAddonSum] = useState("");
  const [cdRpcVal, setCdRpcVal] = useState("");

  // Switch modes for Cross-Sell: 'count' or 'pct'
  const [csInputMode, setCsInputMode] = useState("count"); // 'count' | 'pct'
  const [crossSellCount, setCrossSellCount] = useState("");
  const [crossSellPct, setCrossSellPct] = useState("");

  // Comprehensive Live Incentive Computation
  const metrics = useMemo(() => {
    const mobCases = Number(mobileCases) || 0;
    const appliancesCases = Number(cdCases) || 0;

    // Resolve Mobile Add-on Revenue
    let mobAddons = 0;
    if (mobileInputMode === "rev") {
      mobAddons = Number(mobileAddonSum) || 0;
    } else {
      mobAddons = (Number(mobileRpcVal) || 0) * mobCases;
    }

    // Resolve CD Add-on Revenue
    let applianceAddons = 0;
    if (cdInputMode === "rev") {
      applianceAddons = Number(cdAddonSum) || 0;
    } else {
      applianceAddons = (Number(cdRpcVal) || 0) * appliancesCases;
    }

    const totalDisbursed = mobCases + appliancesCases;
    const disbMatch = matchSlab(totalDisbursed, slabConfig.disbSlabs);

    const mobDisbIncentive = mobCases * (Number(disbMatch.mobileRate) || 0);
    const cdDisbIncentive = appliancesCases * (Number(disbMatch.cdRate) || 0);
    const totalDisbIncentive = mobDisbIncentive + cdDisbIncentive;

    const mobileRpc = mobCases > 0 ? mobAddons / mobCases : 0;
    const cdRpc = appliancesCases > 0 ? applianceAddons / appliancesCases : 0;

    const mobRpcMatch = matchSlab(mobileRpc, slabConfig.mobileRpcSlabs);
    const cdRpcMatch = matchSlab(cdRpc, slabConfig.cdRpcSlabs);

    const mobCsBaseIncentive = mobAddons * ((Number(mobRpcMatch.pct) || 0) / 100);
    const cdCsBaseIncentive = applianceAddons * ((Number(cdRpcMatch.pct) || 0) / 100);
    const totalCsBaseIncentive = mobCsBaseIncentive + cdCsBaseIncentive;

    // Resolve Cross-Sell Percentage
    let totalCrossSellPct = 0;
    if (csInputMode === "count") {
      const csCount = Number(crossSellCount) || 0;
      totalCrossSellPct = totalDisbursed > 0 ? (csCount / totalDisbursed) * 100 : 0;
    } else {
      totalCrossSellPct = Number(crossSellPct) || 0;
    }

    const addlCsMatch = matchSlab(totalCrossSellPct, slabConfig.addlCsSlabs);
    const addlCsIncentive = totalCsBaseIncentive * ((Number(addlCsMatch.pct) || 0) / 100);
    const totalCrossSellIncentive = totalCsBaseIncentive + addlCsIncentive;

    const netTotalIncentive = totalDisbIncentive + totalCrossSellIncentive;
    const resolvedCsCount = csInputMode === "count" ? (Number(crossSellCount) || 0) : Math.round((totalCrossSellPct * totalDisbursed) / 100);

    return {
      mobileCases: mobCases,
      cdCases: appliancesCases,
      totalDisbursed,
      disbMatch,
      mobDisbIncentive,
      cdDisbIncentive,
      totalDisbIncentive,
      mobileAddonSum: mobAddons,
      cdAddonSum: applianceAddons,
      mobileRpc,
      cdRpc,
      mobRpcMatch,
      cdRpcMatch,
      crossSellCount: resolvedCsCount,
      totalCrossSellPct,
      addlCsMatch,
      mobCsBaseIncentive,
      cdCsBaseIncentive,
      totalCsBaseIncentive,
      addlCsIncentive,
      totalCrossSellIncentive,
      netTotalIncentive,
    };
  }, [mobileCases, cdCases, mobileInputMode, mobileAddonSum, mobileRpcVal, cdInputMode, cdAddonSum, cdRpcVal, csInputMode, crossSellCount, crossSellPct, slabConfig]);

  const fmtINR = (val) =>
    "₹" + Math.round(Number(val) || 0).toLocaleString("en-IN");

  return (
    <div className="space-y-3 max-w-5xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gradient-to-r from-emerald-600/15 via-card to-teal-500/15 border-2 border-emerald-500/40 rounded-full px-5 py-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-foreground">Incentive Calculator</h1>
          </div>
        </div>
      </div>

      {/* Manual Input Parameters Panel with Switchers */}
      <Card className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Enter Calculation Values (Live)</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Mobile Cases */}
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Mobile Cases</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={mobileCases}
              onChange={(e) => setMobileCases(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
              className="w-full h-8 px-2.5 rounded border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Consumer Durable Cases */}
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">CD Cases</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={cdCases}
              onChange={(e) => setCdCases(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
              className="w-full h-8 px-2.5 rounded border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Mobile Add-on Rev vs RPC Switcher */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-muted-foreground">
                {mobileInputMode === "rev" ? "Mobile Add-on Rev (₹)" : "Mobile RPC (₹)"}
              </label>
              <button
                type="button"
                onClick={() => setMobileInputMode(prev => prev === "rev" ? "rpc" : "rev")}
                className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                title="Switch between Total Revenue and RPC value"
              >
                <ArrowLeftRight className="w-3 h-3" /> Switch to {mobileInputMode === "rev" ? "RPC" : "Rev"}
              </button>
            </div>
            {mobileInputMode === "rev" ? (
              <input
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={mobileAddonSum}
                onChange={(e) => setMobileAddonSum(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                className="w-full h-8 px-2.5 rounded border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <input
                type="number"
                min="0"
                step="50"
                placeholder="0"
                value={mobileRpcVal}
                onChange={(e) => setMobileRpcVal(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                className="w-full h-8 px-2.5 rounded border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </div>

          {/* CD Add-on Rev vs RPC Switcher */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-muted-foreground">
                {cdInputMode === "rev" ? "CD Add-on Rev (₹)" : "CD RPC (₹)"}
              </label>
              <button
                type="button"
                onClick={() => setCdInputMode(prev => prev === "rev" ? "rpc" : "rev")}
                className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                title="Switch between Total Revenue and RPC value"
              >
                <ArrowLeftRight className="w-3 h-3" /> Switch to {cdInputMode === "rev" ? "RPC" : "Rev"}
              </button>
            </div>
            {cdInputMode === "rev" ? (
              <input
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={cdAddonSum}
                onChange={(e) => setCdAddonSum(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                className="w-full h-8 px-2.5 rounded border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <input
                type="number"
                min="0"
                step="50"
                placeholder="0"
                value={cdRpcVal}
                onChange={(e) => setCdRpcVal(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                className="w-full h-8 px-2.5 rounded border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </div>

          {/* Cross-Sell Count vs Percentage Switcher */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-muted-foreground">
                {csInputMode === "count" ? "Cross-Sell Count" : "Cross-Sell %"}
              </label>
              <button
                type="button"
                onClick={() => setCsInputMode(prev => prev === "count" ? "pct" : "count")}
                className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                title="Switch between Total Count and Percentage"
              >
                <ArrowLeftRight className="w-3 h-3" /> Switch to {csInputMode === "count" ? "%" : "Count"}
              </button>
            </div>
            {csInputMode === "count" ? (
              <input
                type="number"
                min="0"
                placeholder="0"
                value={crossSellCount}
                onChange={(e) => setCrossSellCount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                className="w-full h-8 px-2.5 rounded border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <input
                type="number"
                min="0"
                max="500"
                step="0.1"
                placeholder="0.0"
                value={crossSellPct}
                onChange={(e) => setCrossSellPct(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                className="w-full h-8 px-2.5 rounded border border-border bg-background font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </div>
        </div>
      </Card>

      {/* Main Incentive Dashboard Card */}
      <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/25 via-card to-teal-950/25 p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Live Calculated Payout
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  Disbursement Slab: {metrics.disbMatch.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
                  {fmtINR(metrics.netTotalIncentive)}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">
                  ({metrics.totalDisbursed} Total Cases • {metrics.crossSellCount} Add-ons)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-2">
              <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 block">Disbursed Inc</span>
              <span className="text-sm font-black font-mono text-foreground">
                {fmtINR(metrics.totalDisbIncentive)}
              </span>
              <span className="text-[9px] text-muted-foreground block">
                Mobile: ₹{metrics.disbMatch.mobileRate}/c • CD: ₹{metrics.disbMatch.cdRate}/c
              </span>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2">
              <span className="text-[10px] uppercase font-bold text-amber-500 dark:text-amber-400 block">Cross-Sell Inc</span>
              <span className="text-sm font-black font-mono text-foreground">
                {fmtINR(metrics.totalCrossSellIncentive)}
              </span>
              <span className="text-[9px] text-muted-foreground block">
                Cross-Sell: {metrics.totalCrossSellPct.toFixed(1)}% (+{metrics.addlCsMatch.pct}%)
              </span>
            </div>

            <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 px-3.5 py-2 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-blue-500 dark:text-blue-400 block">Mobile RPC</span>
              <span className="text-sm font-black font-mono text-foreground">
                ₹{Math.round(metrics.mobileRpc).toLocaleString("en-IN")}
              </span>
              <span className="text-[9px] text-muted-foreground block">
                Slab Payout: {Number(metrics.mobRpcMatch.pct).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Disbursement Breakdown */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Disbursement Payouts
              </span>
              <span className="font-mono font-bold text-emerald-600">{fmtINR(metrics.totalDisbIncentive)}</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mobile Cases ({metrics.mobileCases} × ₹{metrics.disbMatch.mobileRate}):</span>
                <span className="font-mono font-semibold text-foreground">{fmtINR(metrics.mobDisbIncentive)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumer Durable Cases ({metrics.cdCases} × ₹{metrics.disbMatch.cdRate}):</span>
                <span className="font-mono font-semibold text-foreground">{fmtINR(metrics.cdDisbIncentive)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/50 font-bold">
                <span>Total Disbursed Volume:</span>
                <span className="font-mono">{metrics.totalDisbursed} Cases (Slab: {metrics.disbMatch.label})</span>
              </div>
            </div>
          </div>

          {/* Cross-Sell & RPC Breakdown */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Cross-Sell &amp; RPC Payouts
              </span>
              <span className="font-mono font-bold text-amber-600">{fmtINR(metrics.totalCrossSellIncentive)}</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mobile Add-on Rev (₹{Math.round(metrics.mobileAddonSum)}):</span>
                <span className="font-mono font-semibold text-foreground">
                  {fmtINR(metrics.mobCsBaseIncentive)} ({metrics.mobRpcMatch.pct}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CS Penetration Booster ({metrics.totalCrossSellPct.toFixed(1)}%):</span>
                <span className="font-mono font-semibold text-emerald-600">
                  +{fmtINR(metrics.addlCsIncentive)} ({metrics.addlCsMatch.label})
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/50 font-bold">
                <span>Total Attached Add-ons:</span>
                <span className="font-mono">{metrics.crossSellCount} Attachments</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}