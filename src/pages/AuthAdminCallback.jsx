// src/pages/AuthAdminCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AuthAdminCallback() {
  const navigate = useNavigate();
  const [status, setStatus]     = useState("verifying");
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    let redirected = false;

    function doRedirect(session) {
      if (redirected) return;
      redirected = true;
      setUserEmail(session.user.email);
      setTimeout(() => navigate("/", { replace: true }), 800);
    }

    // Supabase auto-processes the #access_token hash and fires SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[AdminCallback] event:", event, session?.user?.email);
        if (event === "SIGNED_IN" && session) doRedirect(session);
      }
    );

    // Also check immediately in case already resolved
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[AdminCallback] getSession:", session?.user?.email);
      if (session) doRedirect(session);
    });

    const timeout = setTimeout(() => {
      if (!redirected) {
        console.log("[AdminCallback] timeout — no session");
        setStatus("error");
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-destructive font-medium">Session could not be established.</p>
          <p className="text-xs text-muted-foreground">The link may have expired. Ask the admin to generate a new one.</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {userEmail ? `Signing in as ${userEmail}…` : "Verifying session…"}
        </p>
      </div>
    </div>
  );
}