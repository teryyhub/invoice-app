// src/components/layout/AppLayout.jsx
import React, { useState, useEffect, useMemo } from "react";
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
  Users,
  Search,
  ShieldAlert,
  Calculator,
  TrendingUp,
  Award,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/layout/ThemeToggle";
import TfaVerifyModal from "@/components/TfaVerifyModal";

const baseServiceGroups = [
  {
    category: "Transactions & Records",
    items: [
      { path: "/dashboard", label: "Dashboard", sublabel: "Overview", icon: LayoutDashboard },
      { path: "/generate", label: "Create Invoice", sublabel: "New Bill & GST", icon: Plus },
      { path: "/invoices", label: "Invoices", sublabel: "Past Bills", icon: FileText },
      { path: "/customers", label: "Customers", sublabel: "Directory & Spend", icon: Users },
    ],
  },
  {
    category: "Calculators & Portals",
    items: [
      { path: "/emi-calculator", label: "EMI Calculator", sublabel: "Schedule & Principal", icon: Calculator },
      { path: "/incentive-calculator", label: "Incentive Calculator", sublabel: "Slabs & Payouts", icon: Award },
      { path: "/statistics", label: "Statistics", sublabel: "Analytics & Trends", icon: TrendingUp },
      { path: "/portal", label: "Customer Portal", sublabel: "Public Lookup", icon: Search },
      { path: "/reports", label: "Reports", sublabel: "Tax & GST", icon: BarChart2 },
    ],
  },
  {
    category: "Vendor & Security",
    items: [
      { path: "/settings", label: "Vendor Setup", sublabel: "GSTIN & Bank", icon: Settings },
      { path: "/profile", label: "Profile", sublabel: "Security & PIN", icon: UserCircle },
      { path: "/admin", label: "Admin Panel", sublabel: "System & Users", icon: ShieldAlert, adminOnly: true },
    ],
  },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Check if current user is an admin
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (data && data.is_admin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(!!user?.user_metadata?.is_admin);
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
        setIsAdmin(!!user?.user_metadata?.is_admin);
      }
    }
    checkAdminStatus();
  }, [user]);

  const serviceGroups = useMemo(() => {
    return baseServiceGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || isAdmin),
    }));
  }, [isAdmin]);

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const isCurrentActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const bottomTabs = [
    { path: "/dashboard", label: "Home", icon: LayoutDashboard },
    { path: "/invoices", label: "Invoices", icon: FileText },
    { path: "/generate", label: "Create", icon: Plus, isFab: true },
    { path: "/customers", label: "Clients", icon: Users },
    { id: "services", label: "Services", icon: Grid, isAction: true },
  ];

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "S";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased font-sans selection:bg-[#004C8F]/20">
      <TfaVerifyModal />

      {/* Desktop Web Sidebar */}
      <aside className="hidden md:flex w-52 flex-col bg-card/95 backdrop-blur-md border-r border-border fixed inset-y-0 z-30 transition-all">
        {/* Brand Header */}
        <div className="px-2.5 py-2 border-b border-border/75 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded bg-[#004C8F] text-white flex items-center justify-center font-bold text-[13px] shadow-2xs shrink-0">
                C
              </div>
              <div className="min-w-0 leading-tight">
                <div className="flex-wrap items-center gap-1">
                  <h1 className="text-[14px] flex-wrap font-bold tracking-tight text-foreground truncate">
                    CM Invoice
                  </h1>
                  <span className="text-[12px] font-extrabold uppercase px-1 py-0.2 rounded bg-[#004C8F]/15 text-[#004C8F]">
                    Only for Internal Use
                  </span>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 p-1.5 space-y-2 overflow-y-auto">
          {serviceGroups.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <span className="px-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60">
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
                        "flex items-center gap-2 px-2 py-1 rounded text-[12px] font-medium transition-colors",
                        active
                          ? "bg-[#004C8F] text-white font-semibold shadow-2xs"
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
        <div className="p-1.5 border-t border-border/75 bg-card">
          <div className="flex items-center justify-between p-1 rounded bg-secondary/50 border border-border/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-[#004C8F]/15 text-[#004C8F] flex items-center justify-center font-bold text-[15px] shrink-0">
                {userInitial}
              </div>
              <p className="text-[12px] font-semibold truncate text-foreground">
                {user?.email?.split("@")[0] || "Merchant"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* Android / Mobile Top Bar */}
      <header
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-40 transition-colors duration-150 pt-[env(safe-area-inset-top)]",
          isScrolled
            ? "bg-card/95 backdrop-blur-md border-b border-border shadow-2xs"
            : "bg-card/90 backdrop-blur-xs border-b border-border/50"
        )}
      >
        <div className="flex items-center justify-between px-3 py-1.5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 text-left focus:outline-none cursor-pointer"
            aria-label="Account details"
          >
            <div className="relative shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#004C8F] text-white flex items-center justify-center text-[14px] font-bold shadow-2xs">
                {userInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-card" />
            </div>
            <div className="leading-none">
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-bold tracking-tight text-foreground">
                  CM Invoice
                </span>
                <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />
              </div>
              <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                Internal Use Only
              </span>
            </div>
          </button>

          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Android / Mobile Services Bottom Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setDrawerOpen(false)} />

          <div className="relative bg-card rounded-t-xl border-t border-border shadow-xl p-3 max-h-[82vh] overflow-y-auto space-y-2.5 animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom)]">
            <div className="w-6 h-1 bg-muted-foreground/30 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded bg-[#004C8F]/15 text-[#004C8F] flex items-center justify-center font-bold text-xs shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 leading-tight">
                  <h2 className="text-xs font-bold text-foreground truncate">
                    {user?.email || "CM Invoice"}
                  </h2>
                  <p className="text-[12px] text-muted-foreground">Operations</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {serviceGroups.map((group) => (
                <div key={group.category} className="space-y-1">
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/70 px-0.5">
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
                            "flex items-center gap-2 p-1.5 rounded border transition-all active:scale-98",
                            active
                              ? "bg-[#004C8F]/10 border-[#004C8F]/40 text-[#004C8F]"
                              : "bg-secondary/30 border-border/50 text-foreground hover:bg-secondary"
                          )}
                        >
                          <div
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center shrink-0",
                              active ? "bg-[#004C8F] text-white" : "bg-card text-foreground"
                            )}
                          >
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="min-w-0 leading-none">
                            <span className="text-[14px] font-semibold truncate block">
                              {item.label}
                            </span>
                            <span className="text-[13px] text-muted-foreground truncate block mt-0.5">
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

            <div className="pt-1 border-t border-border/60">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-[15px] font-semibold text-destructive bg-destructive/10 active:scale-98 transition-transform cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 md:ml-52 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] md:pt-2 md:pb-2 min-h-screen transition-all">
        <div className="p-2 sm:p-3 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Android / Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/75 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-11 px-1">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;

            if (tab.isFab) {
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="flex flex-col items-center -mt-3.5 group focus:outline-none"
                  aria-label="Create Invoice"
                >
                  <div className="w-12 h-12 rounded-full bg-[#004C8F] text-white shadow-xs flex items-center justify-center border-2 border-card active:scale-90 transition-transform">
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-[12px] font-bold text-[#004C8F] -mt-0.5">
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
                  className="flex flex-col items-center justify-center flex-1 py-0.5 text-muted-foreground hover:text-foreground active:scale-95 transition-transform cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-medium leading-none mt-0.5">
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
                  active ? "text-[#004C8F] font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", active && "stroke-[2.2px]")} />
                <span className="text-[12px] font-medium leading-none mt-0.5">
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