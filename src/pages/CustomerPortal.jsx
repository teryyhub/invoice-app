// /src/pages/CustomerPortal.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, LogOut, Loader2, ShieldCheck, X, Sun, Moon } from "lucide-react";
import { format } from "date-fns";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function toPortalRow(inv) {
  return {
    id:            inv.id,
    customerName:  inv.customer_name        || "—",
    mobile:        inv.customer_mobile      || "—",
    applicationId: inv.delivery_order_number || "—",
    asset:         [inv.product_description, inv.product_model].filter(Boolean).join(" · ") || "—",
    imei:          inv.imei_serial          || "—",
    vendorName:    inv.vendor_name          || "—",
    date:          inv.invoice_date
                     ? format(new Date(inv.invoice_date), "dd/MMM/yyyy")
                     : "—",
    cost:          inv.grand_total != null
                     ? `₹${Number(inv.grand_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                     : "—",
    invoiceNo:     inv.invoice_number       || "—",
  };
}

export default function CustomerPortal() {
  const navigate = useNavigate();
  const [portalUser, setPortalUser] = useState(null);
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [submitted,  setSubmitted]  = useState(false); // true only after user hits Search
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  // Guard: redirect to login if no session
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

  // Fetch all records once on mount (kept in memory, not shown until search)
  useEffect(() => {
    if (portalUser) fetchRecords();
  }, [portalUser, fetchRecords]);

  // Realtime — update in-memory records silently
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

  // Apply dark mode class to root
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else      document.documentElement.classList.remove("dark");
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
      r.mobile.includes(q)                      ||
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
    <div className="min-h-screen bg-background">

      {/* Top bar */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold leading-tight">Customer Portal</p>
              <p className="text-xs text-muted-foreground leading-tight">
                {portalUser.label || portalUser.login_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(v => !v)}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-background hover:bg-accent transition-colors"
              title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {dark ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
            </button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

        {/* Search section — centered, prominent */}
        <div className="max-w-xl mx-auto space-y-3">
          <h2 className="text-xl font-bold text-foreground text-center">Search Purchase Records</h2>
          <p className="text-sm text-muted-foreground text-center">
            Search by customer name, mobile, IMEI, application ID or invoice number
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Enter name, mobile, IMEI…"
                value={search}
                onChange={e => { setSearch(e.target.value); if (submitted) setSubmitted(false); }}
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button type="submit" disabled={!search.trim() || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </form>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        )}

        {submitted && !loading && (
          <>
            <p className="text-sm text-muted-foreground text-center">
              {filtered.length === 0
                ? `No records found for "${search}"`
                : `${filtered.length} record${filtered.length !== 1 ? "s" : ""} found`}
            </p>

            {filtered.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Card>
                    <CardContent className="p-0">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="px-4 py-3 font-medium">Customer Name</th>
                            <th className="px-4 py-3 font-medium">Mobile</th>
                            <th className="px-4 py-3 font-medium">Application ID</th>
                            <th className="px-4 py-3 font-medium">Asset</th>
                            <th className="px-4 py-3 font-medium">IMEI</th>
                            <th className="px-4 py-3 font-medium">Vendor</th>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium text-right">Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filtered.map(r => (
                            <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                              <td className="px-4 py-3 font-medium">{r.customerName}</td>
                              <td className="px-4 py-3">{r.mobile}</td>
                              <td className="px-4 py-3 font-bold font-mono text-base tracking-wide">{r.applicationId}</td>
                              <td className="px-4 py-3 max-w-[180px]">
                                <p className="truncate">{r.asset}</p>
                              </td>
                              <td className="px-4 py-3 font-bold font-mono text-base tracking-wide">{r.imei}</td>
                              <td className="px-4 py-3 text-muted-foreground text-sm">{r.vendorName}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
                              <td className="px-4 py-3 text-right font-semibold">{r.cost}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile cards */}
                <div className="flex flex-col gap-3 md:hidden">
                  {filtered.map(r => (
                    <Card key={r.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-base leading-tight">{r.customerName}</p>
                          <span className="text-sm font-bold text-primary whitespace-nowrap">{r.cost}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.mobile}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground font-medium">App ID:</span>
                            <span className="font-bold font-mono text-base tracking-wide">{r.applicationId}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground font-medium">IMEI:</span>
                            <span className="font-bold font-mono text-base tracking-wide">{r.imei}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Vendor:</span> {r.vendorName}
                          </p>
                        </div>
                        <p className="text-sm">{r.asset}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-xs text-muted-foreground">Invoice: {r.invoiceNo}</span>
                          <span className="text-xs text-muted-foreground">{r.date}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Empty state before any search */}
        {!submitted && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter a search term above to find records</p>
          </div>
        )}

      </div>
    </div>
  );
}