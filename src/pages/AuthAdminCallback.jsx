// src/pages/AuthAdminCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AuthAdminCallback() {
  const navigate = useNavigate();
  const { isLoadingAuth } = useAuth();
  const [status, setStatus] = useState("verifying"); // verifying | ready | error
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    let redirected = false;

    function doRedirect(session) {
      if (redirected) return;
      redirected = true;
      setSessionUser(session.user);
      setStatus("ready");
    }

    // Listen for Supabase to process the token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[AdminCallback] event:", event, session?.user?.email);
        if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
          doRedirect(session);
        }
      }
    );

    // Also check immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) doRedirect(session);
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!redirected) setStatus("error");
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Once session is ready AND AuthContext has finished loading, navigate
  useEffect(() => {
    if (status === "ready" && !isLoadingAuth && sessionUser) {
      navigate("/", { replace: true });
    }
  }, [status, isLoadingAuth, sessionUser, navigate]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-destructive font-medium">
            Session could not be established.
          </p>
          <p className="text-xs text-muted-foreground">
            The link may have expired. Ask the admin to generate a new one.
          </p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="mt-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
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
          {sessionUser
            ? `Signing in as ${sessionUser.email}…`
            : "Verifying session…"}
        </p>
      </div>
    </div>
  );
}