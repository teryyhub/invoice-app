// /src/pages/CustomerPortal.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, LogOut, Loader2, ShieldCheck, X, Sun, Moon, Copy, Check, Lock, User, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const { user, isLoadingAuth } = useAuth();

  const [portalUser, setPortalUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveAccess() {
      if (isLoadingAuth) return;

      // 1. Check AuthContext user first
      if (user) {
        if (!cancelled) {
          setPortalUser({
            label: user.email || "Authenticated User",
            login_id: user.email || user.id,
            viaAuth: true,
          });
          setAuthError("");
          setCheckingSession(false);
        }
        return;
      }

      // 2. Fallback: check active Supabase session directly
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user;
        if (sessionUser && !cancelled) {
          setPortalUser({
            label: sessionUser.email || "Authenticated User",
            login_id: sessionUser.email || sessionUser.id,
            viaAuth: true,
          });
          setAuthError("");
          setCheckingSession(false);
          return;
        }
      } catch (err) {
        console.error("Session check error:", err);
      }

      // 3. Otherwise check standalone portal session in sessionStorage
      const stored = sessionStorage.getItem("portal_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && !cancelled) {
            setPortalUser(parsed);
            setCheckingSession(false);
            return;
          }
        } catch {
          sessionStorage.removeItem("portal_user");
        }
      }

      if (!cancelled) {
        setPortalUser(null);
        setCheckingSession(false);
      }
    }

    resolveAccess();
    return () => {
      cancelled = true;
    };
  }, [user, isLoadingAuth]);

  const handlePortalLogin = async (e) => {
    e.preventDefault();
    setAuthError("");

    const trimmedId = loginId.trim();
    if (!trimmedId || !password) {
      setAuthError("Please enter both User ID and Password.");
      return;
    }

    setAuthSubmitting(true);
    try {
      let portalAccount = null;
      const { data: rpcData, error: rpcError } = await supabase.rpc("verify_portal_login", {
        p_login_id: trimmedId,
        p_password: password,
      });

      if (!rpcError && rpcData) {
        portalAccount = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      } else {
        const { data: profiles, error: queryError } = await supabase
          .from("vendor_profiles")
          .select("id, vendor_name, portal_login_id, portal_password")
          .eq("portal_login_id", trimmedId)
          .limit(1);

        if (queryError) throw queryError;
        const match = profiles?.[0];
        if (match && match.portal_password === password) {
          portalAccount = {
            id: match.id,
            login_id: match.portal_login_id,
            label: match.vendor_name || match.portal_login_id,
          };
        }
      }

      if (!portalAccount) {
        setAuthError("Invalid User ID or Password.");
        return;
      }

      const sessionObj = {
        id: portalAccount.id,
        login_id: portalAccount.login_id || trimmedId,
        label: portalAccount.label || portalAccount.vendor_name || trimmedId,
      };
      sessionStorage.setItem("portal_user", JSON.stringify(sessionObj));
      setPortalUser(sessionObj);
      setPassword("");
      toast.success("Portal access granted");
    } catch (err) {
      console.error("Portal login error:", err);
      setAuthError(err.message || "Unable to verify portal credentials.");
    } finally {
      setAuthSubmitting(false);
    }
  };

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

  const handleCopyField = (text, key) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyFullRecord = (r) => {
    const text = [
      `Customer: ${r.customerName}`,
      `Mobile: ${r.mobile}`,
      `App ID: ${r.applicationId}`,
      `Asset: ${r.asset}`,
      `IMEI: ${r.imei}`,
      `Vendor: ${r.vendorName}`,
      `Date: ${r.date}`,
      `Cost: ${r.cost}`,
      `Invoice No: ${r.invoiceNo}`
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedKey(`full-${r.id}`);
    toast.success("All record details copied!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filtered = useMemo(() => {
    if (!submitted || !search.trim()) return [];
    const q = search.trim().toLowerCase();
    return records.filter(r =>
      r.customerName.toLowerCase().includes(q) ||
      r.mobile.includes(q)                  ||
      r.applicationId.toLowerCase().includes(q) ||
      r.asset.toLowerCase().includes(q)          ||
      r.imei.toLowerCase().includes(q)          ||
      r.invoiceNo.toLowerCase().includes(q)     ||
      r.vendorName.toLowerCase().includes(q)
    );
  }, [records, search, submitted]);

  const handleLogout = () => {
    sessionStorage.removeItem("portal_user");
    if (user || portalUser?.viaAuth) {
      navigate("/dashboard", { replace: true });
    } else {
      setPortalUser(null);
    }
  };

  if (isLoadingAuth || checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!portalUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#004C8F]/10 text-[#004C8F] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <h1 className="text-sm font-bold text-foreground">Customer Portal</h1>
                <p className="text-[11px] text-muted-foreground">
                  Enter User ID &amp; Password to access
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDark(v => !v)}
              className="h-7 w-7 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors"
              title={dark ? "Light Mode" : "Dark Mode"}
            >
              {dark ? <Sun className="w-3.5 h-3.5 text-yellow-500" /> : <Moon className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>

          <form onSubmit={handlePortalLogin} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">User ID</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter Portal User ID"
                  className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Portal Password"
                  className="w-full rounded-md border border-border bg-background pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5">
                {authError}
              </p>
            )}

            <Button
              type="submit"
              disabled={authSubmitting}
              className="w-full h-8 text-xs font-semibold bg-[#004C8F] text-white hover:bg-[#003B70]"
            >
              {authSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {authSubmitting ? "Verifying..." : "Access Portal"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

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
              <span className="text-[10px] text-muted-foreground">Query: &quot;{search}&quot;</span>
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
                        <th className="px-3 py-1.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filtered.map(r => (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors leading-tight">
                          <td className="px-3 py-2 font-semibold text-foreground">{r.customerName}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">
                            <div className="inline-flex items-center gap-1.5 group">
                              <span>{r.mobile}</span>
                              {r.mobile !== "—" && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyField(r.mobile, `mob-${r.id}`)}
                                  className="opacity-60 group-hover:opacity-100 transition-opacity text-primary"
                                  title="Copy Mobile"
                                >
                                  {copiedKey === `mob-${r.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-bold font-mono text-xs tracking-tight text-primary">
                            <div className="inline-flex items-center gap-1.5 group">
                              <span>{r.applicationId}</span>
                              {r.applicationId !== "—" && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyField(r.applicationId, `appid-${r.id}`)}
                                  className="opacity-60 group-hover:opacity-100 transition-opacity text-primary"
                                  title="Copy App ID"
                                >
                                  {copiedKey === `appid-${r.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 max-w-[140px] truncate text-muted-foreground">{r.asset}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">
                            <div className="inline-flex items-center gap-1.5 group">
                              <span>{r.imei}</span>
                              {r.imei !== "—" && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyField(r.imei, `imei-${r.id}`)}
                                  className="opacity-60 group-hover:opacity-100 transition-opacity text-primary"
                                  title="Copy IMEI"
                                >
                                  {copiedKey === `imei-${r.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{r.vendorName}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.date}</td>
                          <td className="px-3 py-2 text-right font-bold text-foreground whitespace-nowrap">{r.cost}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyFullRecord(r)}
                              className="h-6 px-2 text-[10px] gap-1 rounded font-semibold"
                              title="Copy all record details"
                            >
                              {copiedKey === `full-${r.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy All</span>
                                </>
                              )}
                            </Button>
                          </td>
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
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                              <span>{r.mobile}</span>
                              {r.mobile !== "—" && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyField(r.mobile, `mob-m-${r.id}`)}
                                  className="text-primary hover:opacity-80"
                                >
                                  {copiedKey === `mob-m-${r.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-black text-primary shrink-0">{r.cost}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-muted/30 border border-border/40 text-[11px]">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">App ID</span>
                            <div className="flex items-center gap-1">
                              <span className="font-bold font-mono text-primary text-xs">{r.applicationId}</span>
                              {r.applicationId !== "—" && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyField(r.applicationId, `appid-m-${r.id}`)}
                                  className="text-primary hover:opacity-80"
                                >
                                  {copiedKey === `appid-m-${r.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">IMEI</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] break-all">{r.imei}</span>
                              {r.imei !== "—" && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyField(r.imei, `imei-m-${r.id}`)}
                                  className="text-primary hover:opacity-80 shrink-0"
                                >
                                  {copiedKey === `imei-m-${r.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate">{r.asset}</p>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[140px]">Vendor: {r.vendorName}</span>
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">{r.date}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyFullRecord(r)}
                              className="h-5 px-1.5 text-[9px] gap-1 rounded font-semibold"
                            >
                              {copiedKey === `full-${r.id}` ? (
                                <span className="text-emerald-500">Copied</span>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy All</span>
                                </>
                              )}
                            </Button>
                          </div>
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