// src/App.jsx
import { Toaster } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeProvider";

import AppLayout              from "./components/layout/AppLayout";
import Dashboard              from "./pages/Dashboard";
import GenerateInvoice        from "./pages/GenerateInvoice";
import InvoiceList            from "./pages/InvoiceList";
import InvoiceView            from "./pages/InvoiceView";
import VendorSettings         from "./pages/VendorSettings";
import Reports                from "./pages/Reports";
import Customers              from "./pages/Customers";
import ProfileSettings        from "./pages/ProfileSettings";
import Statistics             from "./pages/Statistics";
import Login                  from "./pages/Login";
import VerifyOtp              from "./pages/VerifyOtp";
import ResetPassword          from "./pages/ResetPassword";
import AdminPanel             from "./pages/AdminPanel";
import AuthAdminCallback      from "./pages/AuthAdminCallback";
import CustomerPortalLogin    from "./pages/CustomerPortalLogin";
import CustomerPortal         from "./pages/CustomerPortal";

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
        <Route path="/"           element={<Dashboard />} />
        <Route path="/generate"   element={<GenerateInvoice />} />
        <Route path="/invoices"   element={<InvoiceList />} />
        <Route path="/settings"   element={<VendorSettings />} />
        <Route path="/reports"    element={<Reports />} />
        <Route path="/customers"  element={<Customers />} />
        <Route path="/profile"    element={<ProfileSettings />} />
        <Route path="/statistics" element={<Statistics />} />
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
            <Routes>
              {/* Public routes — no auth check */}
              <Route path="/login"          element={<Login />} />
              <Route path="/verify"         element={<VerifyOtp />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin-callback" element={<AuthAdminCallback />} />

              {/* Customer portal — separate auth, no admin login needed */}
              <Route path="/portal"           element={<CustomerPortalLogin />} />
              <Route path="/portal/dashboard" element={<CustomerPortal />} />

              {/* Authenticated admin/staff routes */}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster richColors />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;