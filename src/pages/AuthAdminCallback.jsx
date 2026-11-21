// src/pages/AuthAdminCallback.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AuthAdminCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [userEmail, setUserEmail] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // StrictMode / double-run guard
    startedRef.current = true;

    let isMounted = true;

    const succeed = (session) => {
      if (!isMounted) return;
      setUserEmail(session.user.email);
      setStatus("success");
      setTimeout(() => {
        if (isMounted) navigate("/dashboard", { replace: true });
      }, 800);
    };

    const fail = (msg) => {
      if (!isMounted) return;
      setErrorMsg(msg || "");
      setStatus("error");
    };

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

        const linkError =
          url.searchParams.get("error_description") ||
          hash.get("error_description");
        if (linkError) return fail(linkError);

        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");

        let error = null;

        if (access_token && refresh_token) {
          ({ error } = await supabase.auth.setSession({ access_token, refresh_token }));
        } else if (tokenHash && type) {
          ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
        } else if (code) {
          ({ error } = await supabase.auth.exchangeCodeForSession(code));
        }

        // A session may already exist (e.g. exchanged elsewhere)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return succeed(session);

        fail(error?.message || "No valid session found in this link.");
      } catch (err) {
        fail(err?.message || String(err));
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-destructive font-medium">Session could not be established.</p>
          <p className="text-xs text-muted-foreground">
            The link may have expired or already been used. Ask the admin to generate a new one.
          </p>
          {errorMsg && (
            <p className="text-[11px] text-muted-foreground font-mono break-words">{errorMsg}</p>
          )}
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