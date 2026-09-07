// /src/pages/CustomerPortal.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, LogOut, Loader2, ShieldCheck, X, Sun, Moon } from "lucide-react";
import { format } from "date-fns";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function toPortalRow(inv) {
  return {
    id: inv.id,
    customerName: inv.customer_name || "—",
    mobile: inv.customer_mobile || "—",
    applicationId: inv.delivery_order_number || "—",
    asset: [inv.product_description, inv.product_model].filter(Boolean).join(" · ") || "—",
    imei: inv.imei_serial || "—",
    vendorName: inv.vendor_name || "—",
    date: inv.invoice_date
      ? format(new Date(inv.invoice_date), "dd/MMM/yy")
      : "—",
    cost: inv.grand_total != null
      ? `₹${Number(inv.grand_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      : "—",
    invoiceNo: inv.invoice_number || "—",
  };
}

export default function CustomerPortal() {
  const navigate = useNavigate();
  const [portalUser, setPortalUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const stored = sessionStorage.getItem("portal_user");
    if (!stored) { navigate("/portal"); return; }
    setPortalUser(JSON.parse(stored));
  }, [navigate]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select([
          "id", "customer_name", "customer_mobile",
          "delivery_order_number", "product_description",
          "product_model", "imei_serial", "invoice_date",
          "grand_total", "invoice_number", "vendor_name",
        ].join(", "))
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      setRecords((data || []).map(toPortalRow));
    } catch (err) {
      console.error("Portal fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (portalUser) fetchRecords();
  }, [portalUser, fetchRecords]);

  useEffect(() => {
    if (!portalUser) return;
    const channel = supabase
      .channel("portal-invoices")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        (payload) => {
          setRecords(prev => {
            if (payload.eventType === "INSERT")
              return [toPortalRow(payload.new), ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map(r => r.id === payload.new.id ? toPortalRow(payload.new) : r);
            if (payload.eventType === "DELETE")
              return prev.filter(r => r.id !== payload.old.id);
            return prev;
          });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [portalUser]);

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!search.trim()) return;
    setSubmitted(true);
  };

  const handleClear = () => {
    setSearch("");
    setSubmitted(false);
  };

  const filtered = useMemo(() => {
    if (!submitted || !search.trim()) return [];
    const q = search.trim().toLowerCase();
    return records.filter(r =>
      r.customerName.toLowerCase().includes(q) ||
      r.mobile.includes(q)                     ||
      r.applicationId.toLowerCase().includes(q) ||
      r.asset.toLowerCase().includes(q)         ||
      r.imei.toLowerCase().includes(q)          ||
      r.invoiceNo.toLowerCase().includes(q)     ||
      r.vendorName.toLowerCase().includes(q)
    );
  }, [records, search, submitted]);

  const handleLogout = () => {
    sessionStorage.removeItem("portal_user");
    navigate("/portal");
  };

  if (!portalUser) return null;

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border px-3 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-bold text-foreground truncate">Customer Portal</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {portalUser.label || portalUser.login_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setDark(v => !v)}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors"
            title={dark ? "Light Mode" : "Dark Mode"}
          >
            {dark ? <Sun className="w-3.5 h-3.5 text-yellow-500" /> : <Moon className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="h-7 px-2 text-[11px] gap-1 font-medium rounded-md">
            <LogOut className="w-3 h-3" />
            <span>Exit</span>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-3 space-y-2.5">
        {/* Compact Search Card */}
        <div className="p-2.5 rounded-lg border border-border bg-card shadow-none space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Record Search</span>
            <span className="text-[10px] text-muted-foreground">Search by Name, Mobile, IMEI, App ID</span>
          </div>

          <form onSubmit={handleSearch} className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Enter customer name, mobile, IMEI or App ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); if (submitted) setSubmitted(false); }}
                className="w-full rounded-md border border-border bg-background pl-8 pr-7 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" disabled={!search.trim() || loading} className="h-7 px-3 text-[11px] font-semibold rounded-md shadow-none">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
            </Button>
          </form>
        </div>

        {/* Results Area */}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {submitted && !loading && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-foreground">
                {filtered.length === 0 ? "No records found" : `${filtered.length} Results`}
              </span>
              <span className="text-[10px] text-muted-foreground">Query: "{search}"</span>
            </div>

            {filtered.length > 0 && (
              <>
                {/* Desktop View */}
                <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden shadow-none">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                      <tr>
                        <th className="px-3 py-1.5">Customer</th>
                        <th className="px-3 py-1.5">Mobile</th>
                        <th className="px-3 py-1.5">App ID</th>
                        <th className="px-3 py-1.5">Asset</th>
                        <th className="px-3 py-1.5">IMEI</th>
                        <th className="px-3 py-1.5">Vendor</th>
                        <th className="px-3 py-1.5">Date</th>
                        <th className="px-3 py-1.5 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filtered.map(r => (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors leading-tight">
                          <td className="px-3 py-2 font-semibold text-foreground">{r.customerName}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">{r.mobile}</td>
                          <td className="px-3 py-2 font-bold font-mono text-xs tracking-tight text-primary">{r.applicationId}</td>
                          <td className="px-3 py-2 max-w-[140px] truncate text-muted-foreground">{r.asset}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">{r.imei}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{r.vendorName}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.date}</td>
                          <td className="px-3 py-2 text-right font-bold text-foreground whitespace-nowrap">{r.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="grid grid-cols-1 gap-1.5 md:hidden">
                  {filtered.map(r => (
                    <Card key={r.id} className="rounded-lg border-border/80 shadow-none">
                      <CardContent className="p-2.5 space-y-1.5 leading-tight">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-foreground truncate">{r.customerName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{r.mobile}</p>
                          </div>
                          <span className="text-xs font-black text-primary shrink-0">{r.cost}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-muted/30 border border-border/40 text-[11px]">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">App ID</span>
                            <span className="font-bold font-mono text-primary text-xs">{r.applicationId}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">IMEI</span>
                            <span className="font-mono text-[10px] break-all">{r.imei}</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate">{r.asset}</p>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[160px]">Vendor: {r.vendorName}</span>
                          <span className="whitespace-nowrap">{r.date}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {!submitted && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">Search using any customer or transaction identifier</p>
          </div>
        )}
      </main>
    </div>
  );
}