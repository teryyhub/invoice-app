// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { FileText, Chrome, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        setMessage("Confirmation email sent! Click the link in your inbox.");
        setTimeout(() => {
          setIsSignUp(false);
          setMessage("");
        }, 6000);
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;

        if (showAdminCode && adminCode.trim()) {
          try {
            const { supabase } = await import("@/api/supabaseClient");
            const { data, error: rpcError } = await supabase.rpc("verify_admin_code", {
              input_code: adminCode.trim(),
            });
            if (rpcError) throw new Error(rpcError.message);
            if (data !== true) {
              setError("Invalid admin code.");
              setLoading(false);
              return;
            }
            navigate("/admin", { replace: true });
            return;
          } catch (adminErr) {
            setError(adminErr.message || "Admin verification failed.");
            setLoading(false);
            return;
          }
        }

        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-3 py-6">
      <div className="w-full max-w-[320px] space-y-3">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-9 h-9 mx-auto rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <FileText className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">
            Siva's Chola
          </h1>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {isSignUp ? "Create merchant account" : "Sign in to your ledger"}
          </p>
        </div>

        {/* Compact Form Card */}
        <Card className="rounded-xl border-border/80 shadow-none bg-card">
          <CardContent className="p-3.5 space-y-2.5">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="space-y-0.5">
                <label
                  htmlFor="email"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>

              <div className="space-y-0.5">
                <label
                  htmlFor="password"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>

              {/* Secret Admin Pin Field */}
              {!isSignUp && showAdminCode && (
                <div className="space-y-0.5 animate-in fade-in duration-150">
                  <label
                    htmlFor="adminCode"
                    className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1 block"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Admin Code
                  </label>
                  <input
                    id="adminCode"
                    type="password"
                    autoComplete="off"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Enter security code"
                    disabled={loading}
                    className="w-full rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}

              {error && (
                <p className="text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1 leading-snug">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded px-2 py-1 leading-snug">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg shadow-none mt-1 active:scale-98 transition-transform"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}</span>
              </Button>
            </form>

            {/* SSO Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-wider">
                <span className="bg-card px-1.5 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithGoogle()}
              className="w-full h-8 px-2.5 text-xs gap-1.5 font-medium rounded-lg shadow-none"
            >
              <Chrome className="w-3.5 h-3.5" />
              <span>Google Account</span>
            </Button>

            {/* Footer switcher & subtle admin trigger */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
              <p className="text-muted-foreground">
                {isSignUp ? "Registered?" : "New merchant?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                    setMessage("");
                    setShowAdminCode(false);
                    setAdminCode("");
                  }}
                  className="text-primary font-semibold hover:underline ml-0.5"
                >
                  {isSignUp ? "Sign In" : "Register"}
                </button>
              </p>

              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminCode((v) => !v);
                    setAdminCode("");
                  }}
                  className="text-muted-foreground/30 hover:text-primary transition-colors p-1"
                  title="Admin authorization"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}