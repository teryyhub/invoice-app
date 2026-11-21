// src/pages/AdminPanel.jsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { toast } from "sonner";
import {
  Users, ShieldCheck, ShieldOff, ArrowLeft, ChevronRight,
  Search, LogOut, Calendar, Receipt, Store, X, Loader2, LogIn as LoginIcon, Copy, Check,
  Sliders, Plus, Trash2, RotateCcw, Save,
} from "lucide-react";

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
  collectionRules: {
    FEMI: { emiTarget: 99.75, emiRate: 50, bounceEffTarget: 70.0, bounceRate: 100, qualifier: 99.0, deductionPct: 30.0 },
    SEMI: { emiTarget: 99.5, emiRate: 50, bounceEffTarget: 65.0, bounceRate: 75, qualifier: 99.0, deductionPct: 20.0 },
    TEMI: { emiTarget: 99.25, emiRate: 50, bounceEffTarget: 60.0, bounceRate: 50, qualifier: 98.75, deductionPct: 10.0 },
  },
};

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit",
  });
}

function initials(email) {
  if (!email) return "?";
  return email.slice(0, 2).toUpperCase();
}

function Chip({ children, green }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${
      green ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
    }`}>
      {children}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-medium">{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`rounded-lg border p-2.5 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</span>
        <div className={accent ? "text-primary" : "text-muted-foreground"}>{icon}</div>
      </div>
      <p className="text-lg font-black tracking-tight text-foreground leading-tight mt-1">{value}</p>
    </div>
  );
}

// ── Incentive Slabs Modal ──────────────────────────────────────────────────

function IncentiveSlabsModal({ onClose }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.disbSlabs && parsed.collectionRules) return parsed;
      }
    } catch (e) {
      console.error("Failed to load slabs:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SLAB_CONFIG));
  });

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const updateSlabRow = (sectionKey, index, field, value) => {
    setConfig((prev) => {
      const updated = [...prev[sectionKey]];
      updated[index] = {
        ...updated[index],
        [field]: field === "label" || field === "cond" ? value : parseFloat(value) || 0,
      };
      return { ...prev, [sectionKey]: updated };
    });
  };

  const addSlabRow = (sectionKey) => {
    setConfig((prev) => {
      const newRow =
        sectionKey === "disbSlabs"
          ? { label: "New Slab", cond: "range", val1: 0, val2: 0, mobileRate: 0, cdRate: 0 }
          : { label: "New Slab", cond: "range", val1: 0, val2: 0, pct: 0 };
      return { ...prev, [sectionKey]: [...prev[sectionKey], newRow] };
    });
  };

  const removeSlabRow = (sectionKey, index) => {
    setConfig((prev) => {
      if (prev[sectionKey].length <= 1) {
        toast.error("At least 1 slab row is required!");
        return prev;
      }
      return {
        ...prev,
        [sectionKey]: prev[sectionKey].filter((_, idx) => idx !== index),
      };
    });
  };

  const updateCollectionRule = (bucket, field, value) => {
    setConfig((prev) => ({
      ...prev,
      collectionRules: {
        ...prev.collectionRules,
        [bucket]: {
          ...prev.collectionRules[bucket],
          [field]: parseFloat(value) || 0,
        },
      },
    }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast.success("Incentive slabs saved successfully!");
      onClose();
    } catch (e) {
      toast.error("Failed to save slabs: " + e.message);
    }
  };

  const handleRestoreDefaults = () => {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_SLAB_CONFIG));
    setConfig(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
      toast.success("Default incentive slabs restored!");
    } catch (e) {
      console.error(e);
    }
  };

  const renderSlabTable = (sectionKey, isDisb = false) => {
    const rows = config[sectionKey] || [];
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[480px] text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-bold text-[10px] uppercase">
              <th className="py-1.5 px-2">Label</th>
              <th className="py-1.5 px-2">Condition</th>
              <th className="py-1.5 px-2">Col 1</th>
              <th className="py-1.5 px-2">Col 2</th>
              {isDisb ? (
                <>
                  <th className="py-1.5 px-2">Mobile Rate (₹)</th>
                  <th className="py-1.5 px-2">CD Rate (₹)</th>
                </>
              ) : (
                <th className="py-1.5 px-2">{sectionKey === "addlCsSlabs" ? "Additional %" : "Inc %"}</th>
              )}
              <th className="py-1.5 px-2 text-center w-10">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="p-1">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => updateSlabRow(sectionKey, idx, "label", e.target.value)}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-semibold text-foreground min-w-[90px]"
                  />
                </td>
                <td className="p-1">
                  <select
                    value={row.cond}
                    onChange={(e) => updateSlabRow(sectionKey, idx, "cond", e.target.value)}
                    className="w-full bg-background border border-border rounded px-1.5 py-1 text-xs font-bold text-primary"
                  >
                    <option value="below">Below (≤)</option>
                    <option value="range">Range</option>
                    <option value="above">Above (≥)</option>
                  </select>
                </td>
                <td className="p-1">
                  <input
                    type="number"
                    step="any"
                    value={row.val1}
                    onChange={(e) => updateSlabRow(sectionKey, idx, "val1", e.target.value)}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground min-w-[60px]"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="number"
                    step="any"
                    value={row.val2}
                    disabled={row.cond !== "range"}
                    onChange={(e) => updateSlabRow(sectionKey, idx, "val2", e.target.value)}
                    className={`w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground min-w-[60px] ${
                      row.cond !== "range" ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                  />
                </td>
                {isDisb ? (
                  <>
                    <td className="p-1">
                      <input
                        type="number"
                        step="any"
                        value={row.mobileRate}
                        onChange={(e) => updateSlabRow(sectionKey, idx, "mobileRate", e.target.value)}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground min-w-[60px]"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="any"
                        value={row.cdRate}
                        onChange={(e) => updateSlabRow(sectionKey, idx, "cdRate", e.target.value)}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground min-w-[60px]"
                      />
                    </td>
                  </>
                ) : (
                  <td className="p-1">
                    <input
                      type="number"
                      step="any"
                      value={row.pct}
                      onChange={(e) => updateSlabRow(sectionKey, idx, "pct", e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground min-w-[60px]"
                    />
                  </td>
                )}
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeSlabRow(sectionKey, idx)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            <div>
              <h2 className="text-sm font-bold leading-tight">Set Incentive Slabs</h2>
              <p className="text-[10px] opacity-80">
                Configure Disbursement, RPC, Cross-Sell Booster, and Collection slabs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* 1. Disbursement Slabs */}
          <div className="bg-muted/20 p-3.5 rounded-lg border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" /> 1. Disbursement Slabs
              </h3>
              <button
                type="button"
                onClick={() => addSlabRow("disbSlabs")}
                className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded text-[11px] flex items-center gap-1 hover:opacity-90"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
            {renderSlabTable("disbSlabs", true)}
          </div>

          {/* 2 & 3. Mobile & CD RPC Slabs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-muted/20 p-3.5 rounded-lg border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> 2. Mobiles RPC Slabs
                </h3>
                <button
                  type="button"
                  onClick={() => addSlabRow("mobileRpcSlabs")}
                  className="px-2 py-1 bg-primary text-primary-foreground font-semibold rounded text-[11px] flex items-center gap-1 hover:opacity-90"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {renderSlabTable("mobileRpcSlabs", false)}
            </div>

            <div className="bg-muted/20 p-3.5 rounded-lg border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> 3. CD RPC Slabs
                </h3>
                <button
                  type="button"
                  onClick={() => addSlabRow("cdRpcSlabs")}
                  className="px-2 py-1 bg-primary text-primary-foreground font-semibold rounded text-[11px] flex items-center gap-1 hover:opacity-90"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {renderSlabTable("cdRpcSlabs", false)}
            </div>
          </div>

          {/* 4. Cross-Sell Booster Slabs */}
          <div className="bg-muted/20 p-3.5 rounded-lg border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> 4. Cross-Sell Booster Slabs
              </h3>
              <button
                type="button"
                onClick={() => addSlabRow("addlCsSlabs")}
                className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded text-[11px] flex items-center gap-1 hover:opacity-90"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
            {renderSlabTable("addlCsSlabs", false)}
          </div>

          {/* 5. Collection Parameter Slabs */}
          <div className="bg-muted/20 p-3.5 rounded-lg border border-border space-y-2.5">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" /> 5. Collection Parameter Slabs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px] text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold text-[10px] uppercase">
                    <th className="py-1.5 px-2">Bucket</th>
                    <th className="py-1.5 px-2">EMI Bounce Res %</th>
                    <th className="py-1.5 px-2">EMI Rate (₹)</th>
                    <th className="py-1.5 px-2">Charges Eff %</th>
                    <th className="py-1.5 px-2">Charges Rate (₹)</th>
                    <th className="py-1.5 px-2">Qualifier %</th>
                    <th className="py-1.5 px-2">Deduction %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {["FEMI", "SEMI", "TEMI"].map((bucket) => {
                    const rule = config.collectionRules[bucket];
                    return (
                      <tr key={bucket}>
                        <td className="p-1.5 font-extrabold text-foreground">{bucket}</td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="any"
                            value={rule.emiTarget}
                            onChange={(e) => updateCollectionRule(bucket, "emiTarget", e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="any"
                            value={rule.emiRate}
                            onChange={(e) => updateCollectionRule(bucket, "emiRate", e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="any"
                            value={rule.bounceEffTarget}
                            onChange={(e) => updateCollectionRule(bucket, "bounceEffTarget", e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="any"
                            value={rule.bounceRate}
                            onChange={(e) => updateCollectionRule(bucket, "bounceRate", e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="any"
                            value={rule.qualifier}
                            onChange={(e) => updateCollectionRule(bucket, "qualifier", e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="any"
                            value={rule.deductionPct}
                            onChange={(e) => updateCollectionRule(bucket, "deductionPct", e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-destructive font-bold"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-muted/40 px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-destructive/10 hover:text-destructive text-muted-foreground font-semibold text-xs transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Slabs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Impersonate button ─────────────────────────────────────────────────────

function LoginAsButton({ userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "https://sivacholainvoices.vercel.app";

  async function postImpersonate(url, payload) {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url,
        headers: { "Content-Type": "application/json" },
        data: payload,
      });
      const body =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data ?? {});
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        text: body,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      text,
    };
  }

  async function generateLink(e) {
    e.stopPropagation();
    setLoading(true);
    setError(null);
    setLink(null);
    setCopied(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const endpoint = Capacitor.isNativePlatform()
        ? `${apiBase}/api/admin-impersonate`
        : "/api/admin-impersonate";

      const { ok, status, text } = await postImpersonate(endpoint, {
        target_user_id: userId,
        admin_token: session.access_token,
      });

      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Non-JSON response (${status}): ${text.slice(0, 80)}`);
      }

      if (!ok) throw new Error(json.error || `Request failed (${status})`);
      if (!json.link) throw new Error("Missing impersonation link");

      setLink(json.link);
    } catch (err) {
      setError(err.message || "Impersonation failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(e) {
    e.stopPropagation();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard access blocked");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        {link && (
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/70 text-muted-foreground text-[10px] font-medium"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
        <button
          type="button"
          onClick={generateLink}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-semibold disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LoginIcon className="w-3 h-3" />}
          {loading ? "..." : link ? "Regen" : "Impersonate"}
        </button>
      </div>
      {link && (
        <p className={`text-[9px] leading-tight ${copied ? "text-emerald-500" : "text-amber-500"}`}>
          {copied ? "Paste in Incognito" : "Copy for Incognito"}
        </p>
      )}
      {error && <p className="text-[9px] text-destructive max-w-[180px] break-words text-right">{error}</p>}
    </div>
  );
}

// ── User detail drawer ─────────────────────────────────────────────────────

function UserDrawer({ userId, email, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-user-data", userId],
    queryFn: async () => {
      const { data: result, error: rpcError } = await supabase.rpc("admin_get_user_data", {
        target_user_id: userId,
      });
      if (rpcError) throw new Error(rpcError.message);
      return result;
    },
    enabled: !!userId,
  });

  const invoices = data?.invoices ?? [];
  const vendorProfiles = data?.vendor_profiles ?? [];
  const profile = data?.profile ?? {};

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-card border-l border-border h-full overflow-y-auto flex flex-col shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border/80 px-3.5 py-2.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {initials(email)}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-bold text-foreground truncate max-w-[170px]">{email}</p>
              <p className="text-[10px] text-muted-foreground">Account profile</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <LoginAsButton userId={userId} />
            <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="p-3 m-3 rounded-md text-xs text-destructive bg-destructive/10">
            {error.message}
          </div>
        )}

        {data && (
          <div className="p-3 space-y-3.5 flex-1">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">Account</h3>
              <div className="rounded-lg border border-border divide-y divide-border/60 bg-muted/10">
                <Row label="User ID" value={<span className="font-mono text-[10px]">{profile.id}</span>} />
                <Row label="Email" value={profile.email} />
                <Row label="Joined" value={fmt(profile.created_at)} />
                <Row label="Role" value={profile.is_admin ? <Chip green>Admin</Chip> : <Chip>User</Chip>} />
                <Row label="2FA" value={profile.tfa_enabled ? <Chip green>On</Chip> : <Chip>Off</Chip>} />
                {profile.tfa_enabled && (
                  <Row label="Verified" value={fmt(profile.last_tfa_verified)} />
                )}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5 flex items-center gap-1">
                <Store className="w-3 h-3" /> Vendor Profiles ({vendorProfiles.length})
              </h3>
              {vendorProfiles.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1">None registered</p>
              ) : (
                <div className="space-y-1.5">
                  {vendorProfiles.map((v) => (
                    <div key={v.id} className="rounded-lg border border-border p-2.5 bg-muted/20 leading-tight">
                      <p className="font-bold text-xs text-foreground">{v.business_name || "Unnamed"}</p>
                      {v.email && <p className="text-[10px] text-muted-foreground mt-0.5">{v.email}</p>}
                      {v.phone && <p className="text-[10px] text-muted-foreground">{v.phone}</p>}
                      {v.address && <p className="text-[10px] text-muted-foreground truncate">{v.address}</p>}
                      {v.gst_number && <p className="text-[10px] font-mono mt-0.5 text-primary">GST: {v.gst_number}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5 flex items-center gap-1">
                <Receipt className="w-3 h-3" /> Invoices ({invoices.length})
              </h3>
              {invoices.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1">No invoices found</p>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="rounded-md border border-border p-2 bg-muted/20 flex items-center justify-between gap-2">
                      <div className="min-w-0 leading-tight">
                        <p className="font-semibold text-xs text-foreground truncate">{inv.invoice_number || inv.id}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(inv.created_at)}</p>
                        {inv.customer_name && <p className="text-[9px] text-muted-foreground truncate">{inv.customer_name}</p>}
                      </div>
                      {inv.total != null && (
                        <span className="text-xs font-bold text-foreground whitespace-nowrap">
                          ₹{Number(inv.total).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

function AdminPanel() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSlabsModalOpen, setIsSlabsModalOpen] = useState(false);

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data: result, error: rpcError } = await supabase.rpc("admin_get_all_profiles");
      if (rpcError) throw new Error(rpcError.message);
      return result || [];
    },
  });

  const allProfiles = profiles || [];
  const filtered = allProfiles.filter((p) =>
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: allProfiles.length,
    admins: allProfiles.filter((p) => p.is_admin).length,
    tfa: allProfiles.filter((p) => p.tfa_enabled).length,
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-xs">
          <ShieldOff className="w-8 h-8 text-destructive mx-auto" />
          <h1 className="text-base font-bold text-foreground">Access Denied</h1>
          <p className="text-xs text-muted-foreground">{error.message}</p>
          <button
            onClick={() => navigate("/dashboard", { replace: true })}
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard", { replace: true })}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-foreground text-xs sm:text-sm">Admin Control</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSlabsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-semibold transition"
          >
            <Sliders className="w-3 h-3" />
            <span>Set Incentive Slabs</span>
          </button>

          <span className="text-[11px] text-muted-foreground hidden sm:block truncate max-w-[140px]">
            {user?.email}
          </span>
          <button
            onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
            className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <LogOut className="w-3 h-3" /> Exit
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-3 space-y-2.5">
        {/* Metric Bar */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={<Users className="w-3.5 h-3.5" />} label="Users" value={stats.total} />
          <StatCard icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Admins" value={stats.admins} accent />
          <StatCard icon={<ShieldCheck className="w-3.5 h-3.5" />} label="2FA" value={stats.tfa} />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email..."
            className="w-full rounded-lg border border-border bg-card pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-all"
          />
        </div>

        {/* User Listing */}
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-none">
          <div className="px-3 py-2 border-b border-border/70 flex items-center justify-between text-xs font-bold text-foreground">
            <span>{search ? `Results (${filtered.length})` : "All Accounts"}</span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>

          {!isLoading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              {search ? "No matches." : "No users found."}
            </p>
          )}

          <ul className="divide-y divide-border/60">
            {filtered.map((profile) => (
              <li key={profile.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                <button
                  onClick={() => setSelectedUser({ id: profile.id, email: profile.email })}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {initials(profile.email)}
                  </div>
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {profile.email}
                      </p>
                      {profile.is_admin && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 text-primary px-1 py-0.2 text-[9px] font-bold">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" /> {fmt(profile.created_at)}
                      </span>
                      {profile.tfa_enabled && (
                        <span className="text-emerald-500 font-semibold">2FA</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground shrink-0" />
                </button>
                <div className="shrink-0 pl-1 border-l border-border/40">
                  <LoginAsButton userId={profile.id} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {selectedUser && (
        <UserDrawer
          userId={selectedUser.id}
          email={selectedUser.email}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {isSlabsModalOpen && (
        <IncentiveSlabsModal onClose={() => setIsSlabsModalOpen(false)} />
      )}
    </div>
  );
}

export default AdminPanel;