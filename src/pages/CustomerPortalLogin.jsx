// /src/pages/CustomerPortalLogin.jsx
// Standalone login page for the customer read-only portal.
// Route: /portal  (unauthenticated)

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerPortalUser } from "@/api/customerPortalUsers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function CustomerPortalLogin() {
  const navigate = useNavigate();
  const [loginId,  setLoginId]  = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

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
      // Store minimal session in sessionStorage (cleared on tab close)
      sessionStorage.setItem("portal_user", JSON.stringify(user));
      navigate("/portal/dashboard");
    } catch (err) {
      toast.error("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Customer Portal</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your credentials to view your purchase records
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login_id">Login ID</Label>
                <Input
                  id="login_id"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Contact your administrator if you don't have access.
        </p>
      </div>
    </div>
  );
}