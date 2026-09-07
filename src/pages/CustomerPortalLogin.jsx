// /src/pages/CustomerPortalLogin.jsx
// Standalone login page for the customer read-only portal.
// Route: /portal  (unauthenticated)

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { CustomerPortalUser } from "@/api/customerPortalUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CustomerPortalLogin() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already authenticated as merchant/admin, return to dashboard; otherwise return to main login
  const handleBack = () => {
    if (authUser?.id) {
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      toast.error("Enter your Login ID and Password");
      return;
    }
    setLoading(true);
    try {
      const user = await CustomerPortalUser.login(loginId.trim(), password.trim());
      if (!user) {
        toast.error("Invalid credentials or account not active");
        return;
      }
      sessionStorage.setItem("portal_user", JSON.stringify(user));
      navigate("/portal/dashboard");
    } catch (err) {
      toast.error("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-3 py-6 relative">
      {/* Dynamic Back Navigation */}
      <div className="absolute top-4 left-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{authUser?.id ? "Dashboard" : "Login"}</span>
        </Button>
      </div>

      <div className="w-full max-w-[320px] space-y-3">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-9 h-9 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">
            Customer Portal
          </h1>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Sign in to view verified billing and order history
          </p>
        </div>

        {/* Compact Form Card */}
        <Card className="rounded-xl border-border/80 shadow-none bg-card">
          <CardContent className="p-3.5">
            <form onSubmit={handleLogin} className="space-y-2.5">
              <div className="space-y-1">
                <label
                  htmlFor="login_id"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block"
                >
                  Login ID
                </label>
                <input
                  id="login_id"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                  placeholder="Enter your user ID"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    placeholder="Enter account password"
                    className="w-full rounded-md border border-border bg-background pl-2.5 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg shadow-none mt-1 active:scale-98 transition-transform"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{loading ? "Signing in..." : "Sign In"}</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[10px] text-muted-foreground leading-tight">
          Restricted access. Contact merchant if you lack credentials.
        </p>
      </div>
    </div>
  );
}