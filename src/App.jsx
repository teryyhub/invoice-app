// src/App.jsx
import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/api/supabaseClient";

import AppLayout           from "./components/layout/AppLayout";
import HomePage            from "./pages/HomePage";
import Dashboard           from "./pages/Dashboard";
import GenerateInvoice     from "./pages/GenerateInvoice";
import InvoiceList         from "./pages/InvoiceList";
import InvoiceView         from "./pages/InvoiceView";
import VendorSettings      from "./pages/VendorSettings";
import Reports             from "./pages/Reports";
import Statistics          from "./pages/Statistics";
import Customers           from "./pages/Customers";
import CustomerDetail      from "./pages/CustomerDetail";
import ProfileSettings     from "./pages/ProfileSettings";
import EmiCalculator       from "./pages/EmiCalculator";
import IncentiveCalculator from "./pages/IncentiveCalculator";
import Login               from "./pages/Login";
import VerifyOtp           from "./pages/VerifyOtp";
import ResetPassword       from "./pages/ResetPassword";
import AdminPanel          from "./pages/AdminPanel";
import AuthAdminCallback   from "./pages/AuthAdminCallback";
import CustomerPortalLogin from "./pages/CustomerPortalLogin";
import CustomerPortal      from "./pages/CustomerPortal";
import PrivacyPolicy       from "./pages/PrivacyNotice";
import TermsOfService      from "./pages/TermsOfService";

function useLoadingTimeout(isLoading, timeoutSeconds = 10) {
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        toast.error("Loading took too long. Force restarting app...", { duration: 10000 });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }, timeoutSeconds * 1000);
    }
    return () => clearTimeout(timer);
  }, [isLoading, timeoutSeconds]);
}

const handledUrls = new Set();
const exchangedCodes = new Set();

// Paths whose pages process their own auth links (one-time codes)
const SELF_HANDLED_AUTH_PATHS = ["/admin-callback", "/reset-password", "/verify"];

function NativeAppHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateRef = useRef(navigate);
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    navigateRef.current = navigate;
    pathRef.current = location.pathname;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = async (url) => {
      if (!url) return;
      if (!url.includes("auth-callback")) return;
      if (handledUrls.has(url)) return;
      handledUrls.add(url);

      try {
        await Browser.close();
      } catch {}

      try {
        const u = new URL(url);
        const hashParams = new URLSearchParams((u.hash || "").replace(/^#/, ""));

        const authError =
          u.searchParams.get("error_description") ||
          hashParams.get("error_description") ||
          u.searchParams.get("error") ||
          hashParams.get("error");

        if (authError) {
          toast.error("OAuth error: " + authError, { duration: 10000 });
          return;
        }

        const code = u.searchParams.get("code");
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        let authResult;
        if (code) {
          authResult = await supabase.auth.exchangeCodeForSession(code);
        } else if (access_token && refresh_token) {
          authResult = await supabase.auth.setSession({ access_token, refresh_token });
        } else {
          toast.error("Callback missing code or tokens", { duration: 10000 });
          return;
        }

        if (authResult.error) {
          toast.error("Session failed: " + authResult.error.message, { duration: 10000 });
          return;
        }

        navigateRef.current("/dashboard", { replace: true });
      } catch (err) {
        toast.error("Deep link error: " + (err?.message || String(err)), { duration: 10000 });
      }
    };

    const urlSub = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      handleDeepLink(url);
    });

    CapacitorApp.getLaunchUrl().then((res) => {
      if (res?.url) {
        handleDeepLink(res.url);
      }
    });

    const backSub = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      const p = pathRef.current;
      if (p === "/" || p === "/dashboard" || p === "/login") CapacitorApp.minimizeApp();
      else if (canGoBack) navigateRef.current(-1);
      else navigateRef.current("/dashboard");
    });

    return () => {
      urlSub.then((l) => l.remove());
      backSub.then((l) => l.remove());
    };
  }, []);

  return null;
}

function WebAuthCallbackHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    // Admin / reset / verify pages handle their own links; don't consume their code
    if (SELF_HANDLED_AUTH_PATHS.includes(location.pathname)) return;

    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (!code || exchangedCodes.has(code)) return;
    exchangedCodes.add(code);

    let cancelled = false;

    (async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          toast.error("Sign-in callback error: " + error.message, { duration: 6000 });
          navigate("/", { replace: true });
          return;
        }
        navigate("/dashboard", { replace: true });
      } catch (err) {
        if (!cancelled) {
          toast.error("Sign-in error: " + (err?.message || String(err)), { duration: 6000 });
          navigate("/", { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate]);

  return null;
}

// Logged in -> /dashboard | Logged out -> HomePage
const RootRoute = () => {
  const { isLoadingAuth, user } = useAuth();
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background space-y-3">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading session, please wait...</p>
      </div>
    );
  }
  return user ? <Navigate to="/dashboard" replace /> : <HomePage />;
};

// Protected routes + fallback: logged in -> /dashboard | logged out -> / (HomePage)
const AuthenticatedApp = () => {
  const { isLoadingAuth, user } = useAuth();

  useLoadingTimeout(isLoadingAuth, 10);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background space-y-3">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading session, please wait...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="dashboard"            element={<Dashboard />} />
        <Route path="generate"             element={<GenerateInvoice />} />
        <Route path="invoices"             element={<InvoiceList />} />
        <Route path="settings"             element={<VendorSettings />} />
        <Route path="reports"              element={<Reports />} />
        <Route path="customers"            element={<Customers />} />
        <Route path="customer/:mobile"     element={<CustomerDetail />} />
        <Route path="profile"              element={<ProfileSettings />} />
        <Route path="statistics"           element={<Statistics />} />
        <Route path="emi-calculator"       element={<EmiCalculator />} />
        <Route path="incentive-calculator" element={<IncentiveCalculator />} />
      </Route>
      <Route path="invoice/:id" element={<InvoiceView />} />
      <Route path="admin"       element={<AdminPanel />} />
      <Route path="*"           element={<Navigate to="/dashboard" replace />} />
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
            <WebAuthCallbackHandler />
            <Routes>
              {/* Public Landing, Legal & Auth routes */}
              <Route path="/"                 element={<RootRoute />} />
              <Route path="/login"            element={<Login />} />
              <Route path="/verify"           element={<VerifyOtp />} />
              <Route path="/reset-password"   element={<ResetPassword />} />
              <Route path="/admin-callback"   element={<AuthAdminCallback />} />
              <Route path="/privacypolicy"    element={<PrivacyPolicy />} />
              <Route path="/privacy-policy"   element={<PrivacyPolicy />} />
              <Route path="/termsofservice"   element={<TermsOfService />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />

              {/* Public Calculator routes framed inside AppLayout */}
              <Route element={<AppLayout />}>
                <Route path="/emi-calculator"       element={<EmiCalculator />} />
                <Route path="/incentive-calculator" element={<IncentiveCalculator />} />
              </Route>

              {/* Customer portal */}
              <Route path="/portal"           element={<CustomerPortalLogin />} />
              <Route path="/portal/dashboard" element={<CustomerPortal />} />

              {/* Authenticated routes + fallback */}
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