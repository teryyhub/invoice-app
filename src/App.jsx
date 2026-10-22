// src/App.jsx
import { useEffect } from "react";
import { Toaster } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/api/supabaseClient";

import AppLayout           from "./components/layout/AppLayout";
import Dashboard           from "./pages/Dashboard";
import GenerateInvoice     from "./pages/GenerateInvoice";
import InvoiceList         from "./pages/InvoiceList";
import InvoiceView         from "./pages/InvoiceView";
import VendorSettings      from "./pages/VendorSettings";
import Reports             from "./pages/Reports";
import Customers           from "./pages/Customers";
import ProfileSettings     from "./pages/ProfileSettings";
import Statistics          from "./pages/Statistics";
import EmiCalculator       from "./pages/EmiCalculator";
import Login               from "./pages/Login";
import VerifyOtp           from "./pages/VerifyOtp";
import ResetPassword       from "./pages/ResetPassword";
import AdminPanel          from "./pages/AdminPanel";
import AuthAdminCallback   from "./pages/AuthAdminCallback";
import CustomerPortalLogin from "./pages/CustomerPortalLogin";
import CustomerPortal      from "./pages/CustomerPortal";

function NativeAppHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Handle Google OAuth Deep Link Redirects inside Capacitor APK
    const handleDeepLink = async (url) => {
      if (url && (url.includes("auth-callback") || url.includes("access_token") || url.includes("refresh_token"))) {
        const hashIdx = url.indexOf("#");
        const queryIdx = url.indexOf("?");
        const paramStr = hashIdx !== -1 ? url.substring(hashIdx + 1) : queryIdx !== -1 ? url.substring(queryIdx + 1) : "";
        
        if (paramStr) {
          const params = new URLSearchParams(paramStr);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            navigate("/", { replace: true });
          }
        }
      }
    };

    const sub = CapacitorApp.addListener("appUrlOpen", (data) => {
      handleDeepLink(data.url);
    });

    // 2. Handle Hardware Back Button / Gestures on Android
    const backSub = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (location.pathname === "/" || location.pathname === "/login") {
        CapacitorApp.minimizeApp();
      } else if (canGoBack) {
        navigate(-1);
      } else {
        navigate("/");
      }
    });

    return () => {
      sub.then((listener) => listener.remove());
      backSub.then((listener) => listener.remove());
    };
  }, [navigate, location.pathname]);

  return null;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, user } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/generate"    element={<GenerateInvoice />} />
        <Route path="/invoices"    element={<InvoiceList />} />
        <Route path="/settings"    element={<VendorSettings />} />
        <Route path="/reports"     element={<Reports />} />
        <Route path="/customers"   element={<Customers />} />
        <Route path="/profile"     element={<ProfileSettings />} />
        <Route path="/statistics"  element={<Statistics />} />
        <Route path="/emi-calc"    element={<EmiCalculator />} />
      </Route>
      <Route path="/invoice/:id" element={<InvoiceView />} />
      <Route path="/admin"       element={<AdminPanel />} />
      <Route path="*"            element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NativeAppHandler />
            <Routes>
              {/* Public routes */}
              <Route path="/login"          element={<Login />} />
              <Route path="/verify"         element={<VerifyOtp />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin-callback" element={<AuthAdminCallback />} />

              {/* Public EMI Calculator route */}
              <Route path="/emi-calculator" element={<EmiCalculator />} />

              {/* Customer portal */}
              <Route path="/portal"         element={<CustomerPortalLogin />} />
              <Route path="/portal/dashboard" element={<CustomerPortal />} />

              {/* Authenticated admin/staff routes */}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster
            position="top-center"
            closeButton
            duration={1000}
            richColors
            toastOptions={{
              className: "text-xs font-medium shadow-md border border-border",
            }}
          />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;