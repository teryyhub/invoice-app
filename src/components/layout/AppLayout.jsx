// src/components/layout/AppLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Settings,
  Plus,
  LayoutDashboard,
  LogOut,
  BarChart2,
  UserCircle,
  Grid,
  X,
  ChevronRight,
  ShieldCheck,
  Users,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/layout/ThemeToggle";
import TfaVerifyModal from "@/components/TfaVerifyModal";

const serviceGroups = [
  {
    category: "Transactions & Records",
    items: [
      { path: "/", label: "Dashboard", sublabel: "Overview", icon: LayoutDashboard },
      { path: "/invoices", label: "Invoices", sublabel: "Past Bills", icon: FileText },
      { path: "/customers", label: "Customers", sublabel: "Directory & Spend", icon: Users },
    ],
  },
  {
    category: "Portals & Search",
    items: [
      { path: "/portal", label: "Customer Portal", sublabel: "Public Lookup", icon: Search },
      { path: "/reports", label: "Reports", sublabel: "Tax & GST", icon: BarChart2 },
    ],
  },
  {
    category: "Vendor & Security",
    items: [
      { path: "/settings", label: "Vendor Setup", sublabel: "GSTIN & Bank", icon: Settings },
      { path: "/profile", label: "Profile", sublabel: "Security & PIN", icon: UserCircle },
      { path: "/admin", label: "Admin Panel", sublabel: "System & Users", icon: ShieldAlert },
    ],
  },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isCurrentActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const bottomTabs = [
    { path: "/", label: "Home", icon: LayoutDashboard },
    { path: "/invoices", label: "Invoices", icon: FileText },
    { path: "/generate", label: "Create", icon: Plus, isFab: true },
    { path: "/customers", label: "Clients", icon: Users },
    { id: "services", label: "Services", icon: Grid, isAction: true },
  ];

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "S";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased font-sans selection:bg-primary/20">
      <TfaVerifyModal />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-card/95 backdrop-blur-md border-r border-border fixed inset-y-0 z-30 transition-all">
        {/* Brand Header */}
        <div className="px-3.5 py-3 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-1">
                  <h1 className="text-xs font-bold tracking-tight text-foreground truncate">
                    Siva's Chola
                  </h1>
                  <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-primary/10 text-primary">
                    Pro
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Billing & Operations</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
          {serviceGroups.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <span className="px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {group.category}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {group.items.map((item) => {
                  const active = isCurrentActive(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", active && "stroke-[2.5]")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Account Footer */}
        <div className="p-2 border-t border-border/70 space-y-1">
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-secondary/40 border border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                {userInitial}
              </div>
              <p className="text-[11px] font-semibold truncate text-foreground">
                {user?.email?.split("@")[0] || "Merchant"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-40 transition-colors duration-150",
          isScrolled
            ? "bg-card/95 backdrop-blur-md border-b border-border shadow-xs"
            : "bg-card/90 backdrop-blur-xs border-b border-border/50"
        )}
      >
        <div className="flex items-center justify-between px-3 py-1.5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 text-left focus:outline-none"
            aria-label="Account details"
          >
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
                {userInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-card" />
            </div>
            <div className="leading-none">
              <div className="flex items-center gap-0.5">
                <span className="text-xs font-bold tracking-tight text-foreground">
                  Siva's Chola
                </span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                Verified Merchant
              </span>
            </div>
          </button>

          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile Services Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setDrawerOpen(false)} />

          <div className="relative bg-card rounded-t-2xl border-t border-border shadow-xl p-3.5 max-h-[82vh] overflow-y-auto space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="w-8 h-1 bg-muted-foreground/30 rounded-full mx-auto" />

            {/* Profile Row */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 leading-tight">
                  <h2 className="text-xs font-bold text-foreground truncate">
                    {user?.email || "Siva's Chola"}
                  </h2>
                  <p className="text-[10px] text-muted-foreground">GST & Operations Suite</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* All Services */}
            <div className="space-y-2.5">
              {serviceGroups.map((group) => (
                <div key={group.category} className="space-y-1">
                  <h3 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 px-0.5">
                    {group.category}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isCurrentActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setDrawerOpen(false)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border transition-all active:scale-98",
                            active
                              ? "bg-primary/10 border-primary/40 text-primary"
                              : "bg-secondary/30 border-border/50 text-foreground hover:bg-secondary"
                          )}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                              active ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 leading-none">
                            <span className="text-[11px] font-semibold truncate block">
                              {item.label}
                            </span>
                            <span className="text-[8px] text-muted-foreground truncate block mt-0.5">
                              {item.sublabel}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1.5 border-t border-border/60">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-destructive bg-destructive/10 active:scale-98 transition-transform"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 md:ml-60 pt-11 pb-16 md:pt-0 md:pb-4 min-h-screen transition-all">
        <div className="p-2.5 sm:p-4 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/70 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-12 px-1">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;

            if (tab.isFab) {
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="flex flex-col items-center -mt-4 group focus:outline-none"
                  aria-label="Create Invoice"
                >
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center justify-center border-2 border-card active:scale-90 transition-transform">
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[9px] font-bold text-primary -mt-0.5">
                    {tab.label}
                  </span>
                </Link>
              );
            }

            if (tab.isAction) {
              return (
                <button
                  key={tab.id}
                  onClick={() => setDrawerOpen(true)}
                  className="flex flex-col items-center justify-center flex-1 py-0.5 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-medium leading-none mt-0.5">
                    {tab.label}
                  </span>
                </button>
              );
            }

            const active = isCurrentActive(tab.path);

            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-0.5 transition-all active:scale-95",
                  active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4", active && "stroke-[2.2px]")} />
                <span className="text-[9px] font-medium leading-none mt-0.5">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}