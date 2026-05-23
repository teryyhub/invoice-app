// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { FileText, Chrome, ShieldCheck } from "lucide-react";

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp]           = useState(false);
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [adminCode, setAdminCode]         = useState("");
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [message, setMessage]             = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        setMessage("Confirmation email sent! Please click the link in your inbox to activate your account.");
        setTimeout(() => { setIsSignUp(false); setMessage(""); }, 6000);
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;

        // If admin code field is visible and filled, verify it
        if (showAdminCode && adminCode.trim()) {
          try {
            // Lazy import so a missing file never breaks the login page
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <FileText className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Siva's Chola Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">Email</label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">Password</label>
              <input
                id="password" type="password" required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            {/* Admin code — only shown when toggled on sign-in */}
            {!isSignUp && showAdminCode && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5" htmlFor="adminCode">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Admin Code
                </label>
                <input
                  id="adminCode" type="password" autoComplete="off"
                  value={adminCode} onChange={e => setAdminCode(e.target.value)}
                  placeholder="Enter secret admin code"
                  className="w-full rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            )}

            {error   && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
            {message && <p className="text-sm text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{message}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 mt-2"
            >
              {loading ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* Google */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-all shadow-sm"
          >
            <Chrome className="w-4 h-4" />
            Sign in with Google
          </button>

          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(""); setMessage("");
                  setShowAdminCode(false); setAdminCode("");
                }}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>

            {/* Discreet admin toggle — only on sign-in */}
            {!isSignUp && (
              <button
                type="button"
                onClick={() => { setShowAdminCode(v => !v); setAdminCode(""); }}
                className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
                title="Admin access"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}