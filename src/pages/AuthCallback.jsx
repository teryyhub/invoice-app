// src/pages/AuthCallback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const handleSession = (session, event) => {
      if (!isMounted || !session) return;

      // If it's a password recovery flow, send them to the reset password page
      if (event === "PASSWORD_RECOVERY" || window.location.hash.includes("type=recovery")) {
        navigate("/reset-password", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(session, event);
    });

    // Also handle it immediately in case event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground animate-pulse">Signing in…</p>
    </div>
  );
}