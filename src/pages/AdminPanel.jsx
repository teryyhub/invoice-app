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
    day: "2-digit", month: "short", year: "numeric",
  });
}

function initials(email) {
  if (!email) return "?";
  return email.slice(0, 2).toUpperCase();
}

function Chip({ children, green }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const color = green ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground";
  return <span className={`${base} ${color}`}>{children}</span>;
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  const border = accent ? "border-primary/30 bg-primary/5" : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <div className={`mb-2 ${accent ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ── Impersonate button ─────────────────────────────────────────────────────

function LoginAsButton({ userId, email }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [link, setLink]       = useState(null);
  const [copied, setCopied]   = useState(false);

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
      if (!res.ok) throw new Error(json.error || "Failed to generate link");
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
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="flex flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        {link && (
          <button
            onClick={copyLink}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground text-xs font-medium transition-all"
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5" />
            }
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
        <button
          onClick={generateLink}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <LogIn className="w-3.5 h-3.5" />
          }
          {loading ? "Generating…" : link ? "Regenerate" : "Login as User"}
        </button>
      </div>

      {link && !copied && (
        <p className="text-xs text-amber-500 text-right max-w-[220px] leading-tight">
          Copy → paste in incognito window to login as {email}
        </p>
      )}
      {copied && (
        <p className="text-xs text-emerald-500 text-right leading-tight">
          Paste in an incognito window!
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive max-w-[200px] text-right">{error}</p>
      )}
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

  const invoices       = data?.invoices        ?? [];
  const vendorProfiles = data?.vendor_profiles ?? [];
  const profile        = data?.profile         ?? {};

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto flex flex-col shadow-2xl">

        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
              {initials(email)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground truncate max-w-[160px]">{email}</p>
              <p className="text-xs text-muted-foreground">User profile</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LoginAsButton userId={userId} email={email} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="p-6 m-4 rounded-lg text-sm text-destructive bg-destructive/10">
            {error.message}
          </div>
        )}

        {data && (
          <div className="p-6 space-y-6 flex-1">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Account</h3>
              <div className="rounded-xl border border-border divide-y divide-border">
                <Row label="User ID"  value={<span className="font-mono text-xs">{profile.id}</span>} />
                <Row label="Email"    value={profile.email} />
                <Row label="Joined"   value={fmt(profile.created_at)} />
                <Row label="Admin"    value={profile.is_admin ? <Chip green>Yes</Chip> : <Chip>No</Chip>} />
                <Row label="2FA"      value={profile.tfa_enabled ? <Chip green>Enabled</Chip> : <Chip>Disabled</Chip>} />
                {profile.tfa_enabled && (
                  <Row label="Last verified" value={fmt(profile.last_tfa_verified)} />
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Store className="w-3.5 h-3.5" /> Vendor Profiles ({vendorProfiles.length})
              </h3>
              {vendorProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No vendor profiles</p>
              ) : (
                <div className="space-y-2">
                  {vendorProfiles.map((v) => (
                    <div key={v.id} className="rounded-xl border border-border p-4 bg-muted/30">
                      <p className="font-semibold text-sm text-foreground">{v.business_name || "Unnamed"}</p>
                      {v.email      && <p className="text-xs text-muted-foreground mt-0.5">{v.email}</p>}
                      {v.phone      && <p className="text-xs text-muted-foreground">{v.phone}</p>}
                      {v.address    && <p className="text-xs text-muted-foreground">{v.address}</p>}
                      {v.gst_number && <p className="text-xs font-mono mt-1 text-primary/80">GST: {v.gst_number}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5" /> Invoices ({invoices.length})
              </h3>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No invoices</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="rounded-xl border border-border p-3 bg-muted/30 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{inv.invoice_number || inv.id}</p>
                        <p className="text-xs text-muted-foreground">{fmt(inv.created_at)}</p>
                        {inv.customer_name && <p className="text-xs text-muted-foreground truncate">To: {inv.customer_name}</p>}
                      </div>
                      {inv.total != null && (
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
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
  const [search, setSearch]             = useState("");
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
    total:  allProfiles.length,
    admins: allProfiles.filter((p) => p.is_admin).length,
    tfa:    allProfiles.filter((p) => p.tfa_enabled).length,
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <ShieldOff className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <button onClick={() => navigate("/", { replace: true })}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/", { replace: true })}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm sm:text-base">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[160px]">{user?.email}</span>
          <button onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Users className="w-4 h-4" />}       label="Total Users" value={stats.total} />
          <StatCard icon={<ShieldCheck className="w-4 h-4" />} label="Admins"      value={stats.admins} accent />
          <StatCard icon={<ShieldCheck className="w-4 h-4" />} label="2FA Active"  value={stats.tfa} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by email…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {search ? `Results — ${filtered.length}` : "All Users"}
            </h2>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              {search ? "No users match your search." : "No users found."}
            </p>
          )}

          <ul className="divide-y divide-border">
            {filtered.map((profile) => (
              <li key={profile.id}>
                <div className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors">
                  <button
                    onClick={() => setSelectedUser({ id: profile.id, email: profile.email })}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {initials(profile.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{profile.email}</p>
                        {profile.is_admin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" /> {fmt(profile.created_at)}
                        </span>
                        {profile.tfa_enabled && (
                          <span className="text-xs text-emerald-500 font-medium">2FA on</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </button>
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