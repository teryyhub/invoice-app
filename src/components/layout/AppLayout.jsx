import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { FileText, Settings, Upload, LayoutDashboard, LogOut, BarChart2, Users, UserCircle, TrendingUp, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/layout/ThemeToggle"; // FIXED: Using @ alias for absolute path

const navItems = [
  { path: "/",          label: "Dashboard",         icon: LayoutDashboard },
  { path: "/generate",  label: "Generate Invoice",   icon: Upload },
  { path: "/invoices",  label: "Invoices",           icon: FileText },
  { path: "/reports",   label: "Reports",            icon: BarChart2 },
  { path: "/customers", label: "Customers",          icon: Users },
  { path: "/statistics",label: "Statistics",         icon: TrendingUp },
  { path: "/settings",  label: "Vendor Settings",    icon: Settings },
  { path: "/profile",   label: "Profile & Settings", icon: UserCircle },
];

export default function AppLayout() {
  const location = useLocation();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const NavLink = ({ item }) => (
    <Link
      key={item.path}
      to={item.path}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        location.pathname === item.path
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {item.label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border fixed inset-y-0 z-30">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">Siva's Chola</h1>
              <p className="text-xs text-muted-foreground">Invoice Generator</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground font-medium">
            <span className="opacity-70">Appearance</span>
            <ThemeToggle />
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <h1 className="text-sm font-bold text-foreground">Siva's Chola Invoices</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setMobileOpen(o => !o)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-card shadow-xl">
            <nav className="p-3 space-y-0.5">
              {navItems.map(item => <NavLink key={item.path} item={item} />)}
              <div className="border-t border-border mt-2 pt-2">
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full">
                  <LogOut className="w-4 h-4" />Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 mt-14 md:mt-0 min-h-screen">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
