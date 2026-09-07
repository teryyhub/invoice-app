import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { queryClientInstance } from "@/lib/query-client";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const AuthContext = createContext(null);

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function isRecoveryFlow() {
  return (
    window.location.hash.includes("type=recovery") ||
    window.location.pathname === "/reset-password" ||
    window.location.pathname === "/admin-callback"   // ← added
  );
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [tfaProfile, setTfaProfile]   = useState(null);
  const [tfaRequired, setTfaRequired] = useState(false);
  const tfaProfileRef                 = useRef(null);

  const loadTfaProfile = async (userId) => {
    if (!userId) { setTfaProfile(null); tfaProfileRef.current = null; return null; }
    try {
      const result = await withTimeout(
        supabase
          .from("profiles")
          .select("tfa_enabled, last_tfa_verified, failed_tfa_attempts, pin_locked_until")
          .eq("id", userId)
          .single(),
        4000,
        { data: null, error: { message: "timeout" } }
      );
      const { data, error } = result;
      if (error) {
        console.warn("loadTfaProfile:", error.message);
        setTfaProfile(null); tfaProfileRef.current = null; return null;
      }
      setTfaProfile(data); tfaProfileRef.current = data; return data;
    } catch (e) {
      console.warn("loadTfaProfile exception:", e);
      setTfaProfile(null); tfaProfileRef.current = null; return null;
    }
  };

  const checkTfaRequirement = async (userId) => {
    try {
      const profile = await loadTfaProfile(userId);
      if (!profile?.tfa_enabled) { setTfaRequired(false); return false; }
      if (!profile.last_tfa_verified) { setTfaRequired(true); return true; }
      const days = (Date.now() - new Date(profile.last_tfa_verified).getTime()) / 86400000;
      const needed = days > 7;
      setTfaRequired(needed);
      return needed;
    } catch (e) {
      console.warn("checkTfaRequirement:", e);
      setTfaRequired(false); return false;
    }
  };

  useEffect(() => {
    const handleDeepLink = (urlStr) => {
      try {
        const url = new URL(urlStr);
        // We only care about the path, query, and hash
        const path = url.pathname + url.search + url.hash;
        if (path && path !== "/") {
          window.location.href = path;
        }
      } catch (e) {
        console.error("Deep link error:", e);
      }
    };

    if (Capacitor.isNativePlatform()) {
      App.addListener("appUrlOpen", (event) => {
        handleDeepLink(event.url);
      });

      App.getLaunchUrl().then((launchUrl) => {
        if (launchUrl?.url) handleDeepLink(launchUrl.url);
      });
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && !isRecoveryFlow()) {
        await checkTfaRequirement(currentUser.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (_event === "PASSWORD_RECOVERY") return;

        if (_event === "SIGNED_IN" && currentUser) {
          if (!isRecoveryFlow()) await checkTfaRequirement(currentUser.id);
        }

        if (_event === "SIGNED_OUT") {
          queryClientInstance.clear();
          setTfaProfile(null);
          setTfaRequired(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email, password) => {
    const origin = Capacitor.isNativePlatform()
      ? "com.sivcholainv.app://localhost"
      : window.location.origin;
    return supabase.auth.signUp({
      email,
      password,
      options: { redirectTo: `${origin}/` }
    });
  };

  const signOut = async () => {
    try { await supabase.auth.signOut(); queryClientInstance.clear(); }
    catch (e) { console.error("signOut error:", e); }
  };

  const signInWithGoogle = async () => {
    const redirectTo = Capacitor.isNativePlatform()
      ? "com.sivcholainv.app://localhost"
      : window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  };

  const verifyOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOTP({ email, token, type: "signup" });
    if (error) throw error;
    return data;
  };

  const requestPasswordReset = async (email) => {
    const origin = Capacitor.isNativePlatform()
      ? "com.sivcholainv.app://localhost"
      : window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  };

  const setupTfaPin = async (pin) => {
    const hash = await hashPin(pin);
    const { error } = await supabase
      .from("profiles")
      .update({
        tfa_enabled: true,
        pin_hash: hash,
        last_tfa_verified: null,
        failed_tfa_attempts: 0,
        pin_locked_until: null,
      })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    await loadTfaProfile(user.id);
    setTfaRequired(false);
  };

  const verifyTfaPin = async (pin) => {
    const profile = tfaProfileRef.current;
    if (profile?.pin_locked_until) {
      const lockedUntil = new Date(profile.pin_locked_until);
      if (Date.now() < lockedUntil.getTime()) {
        const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
        throw new Error(`PIN locked. Try again in ${mins} minute${mins > 1 ? "s" : ""}.`);
      }
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("pin_hash")
      .eq("id", user.id)
      .single();
    if (error || !data?.pin_hash) throw new Error("PIN not set up.");
    const inputHash = await hashPin(pin);
    if (inputHash !== data.pin_hash) {
      await supabase.rpc("increment_tfa_failures", { user_id: user.id });
      await loadTfaProfile(user.id);
      throw new Error("Incorrect PIN. Please try again.");
    }
    await supabase
      .from("profiles")
      .update({
        last_tfa_verified: new Date().toISOString(),
        failed_tfa_attempts: 0,
        pin_locked_until: null,
      })
      .eq("id", user.id);
    await loadTfaProfile(user.id);
    setTfaRequired(false);
    return { success: true };
  };

  const disableTfa = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        tfa_enabled: false,
        pin_hash: null,
        last_tfa_verified: null,
        failed_tfa_attempts: 0,
        pin_locked_until: null,
      })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    await loadTfaProfile(user.id);
    setTfaRequired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading, isLoadingAuth: loading,
        tfaProfile, tfaRequired, setTfaRequired,
        signIn, signUp, signOut, signInWithGoogle, verifyOtp,
        requestPasswordReset, setupTfaPin, verifyTfaPin, disableTfa,
        checkTfaRequirement, loadTfaProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);