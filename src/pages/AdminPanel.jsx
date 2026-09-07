// src/pages/AdminPanel.jsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import {
  Users, ShieldCheck, ShieldOff, ArrowLeft, ChevronRight,
  Search, LogOut, Calendar, Receipt, Store, X, Loader2, LogIn, Copy, Check,
} from "lucide-react";

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

// ── Impersonate button ─────────────────────────────────────────────────────

function LoginAsButton({ userId, email }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);

  async function generateLink(e) {
    e.stopPropagation();
    setLoading(true);
    setError(null);
    setLink(null);
    setCopied(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch("/api/admin-impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: userId,
          admin_token: session.access_token,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setLink(json.link);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(e) {
    e.stopPropagation();
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        {link && (
          <button
            onClick={copyLink}
            className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/70 text-muted-foreground text-[10px] font-medium"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
        <button
          onClick={generateLink}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-semibold disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
          {loading ? "..." : link ? "Regen" : "Impersonate"}
        </button>
      </div>
      {link && (
        <p className={`text-[9px] leading-tight ${copied ? "text-emerald-500" : "text-amber-500"}`}>
          {copied ? "Paste in Incognito" : "Copy for Incognito"}
        </p>
      )}
      {error && <p className="text-[9px] text-destructive max-w-[150px] truncate">{error}</p>}
    </div>
  );
}

// ── User detail drawer ─────────────────────────────────────────────────────

function UserDrawer({ userId, email, onClose }) {
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
      <div className="flex-1 bg-black/60 backdrop-blur-xs" onClick={onClose} />
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
            <LoginAsButton userId={userId} email={email} />
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
            onClick={() => navigate("/", { replace: true })}
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
            onClick={() => navigate("/", { replace: true })}
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
          <span className="text-[11px] text-muted-foreground hidden sm:block truncate max-w-[140px]">
            {user?.email}
          </span>
          <button
            onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}
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
                  <LoginAsButton userId={profile.id} email={profile.email} />
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
    </div>
  );
}

export default AdminPanel;