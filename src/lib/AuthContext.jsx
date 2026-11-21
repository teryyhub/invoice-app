// src/lib/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { queryClientInstance } from "@/lib/query-client";
import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

const AuthContext = createContext(null);

// Google Cloud Console WEB Client ID (same one in Supabase Google Provider)
const GOOGLE_WEB_CLIENT_ID = "54020713640-1an1acs3hpnl79747u0uldu7m2f0aq4m.apps.googleusercontent.com";

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
    window.location.pathname === "/admin-callback"
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tfaProfile, setTfaProfile] = useState(null);
  const [tfaRequired, setTfaRequired] = useState(false);
  const tfaProfileRef = useRef(null);

  const loadTfaProfile = useCallback(async (userId) => {
    if (!userId) {
      setTfaProfile(null);
      tfaProfileRef.current = null;
      return null;
    }
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
        setTfaProfile(null);
        tfaProfileRef.current = null;
        return null;
      }
      setTfaProfile(data);
      tfaProfileRef.current = data;
      return data;
    } catch (e) {
      console.warn("loadTfaProfile exception:", e);
      setTfaProfile(null);
      tfaProfileRef.current = null;
      return null;
    }
  }, []);

  const checkTfaRequirement = useCallback(
    async (userId) => {
      try {
        const profile = await loadTfaProfile(userId);
        if (!profile?.tfa_enabled) {
          setTfaRequired(false);
          return false;
        }
        if (!profile.last_tfa_verified) {
          setTfaRequired(true);
          return true;
        }
        const days = (Date.now() - new Date(profile.last_tfa_verified).getTime()) / 86400000;
        const needed = days > 7;
        setTfaRequired(needed);
        return needed;
      } catch (e) {
        console.warn("checkTfaRequirement:", e);
        setTfaRequired(false);
        return false;
      }
    },
    [loadTfaProfile]
  );

  useEffect(() => {
    let isMounted = true;

    if (Capacitor.isNativePlatform()) {
      GoogleSignIn.initialize({
        clientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ["profile", "email"],
      }).catch((err) => {
        console.error("GoogleSignIn.initialize failed:", err);
      });
    }

    async function initAuth() {
      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          5000,
          { data: { session: null }, error: { message: "timeout" } }
        );

        if (!isMounted) return;

        if (result.error) {
          console.warn("Session retrieval warning:", result.error.message);
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          return;
        }

        const session = result?.data?.session ?? null;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser && !isRecoveryFlow()) {
          await checkTfaRequirement(currentUser.id);
        }
      } catch (e) {
        console.warn("Auth initialization exception:", e);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (event === "PASSWORD_RECOVERY") return;

      if (event === "SIGNED_IN" && currentUser) {
        if (!isRecoveryFlow()) {
          await checkTfaRequirement(currentUser.id);
        }
      }

      if (event === "SIGNED_OUT") {
        queryClientInstance.clear();
        setTfaProfile(null);
        tfaProfileRef.current = null;
        setTfaRequired(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [checkTfaRequirement]);

  const signIn = useCallback(
    (email, password) => supabase.auth.signInWithPassword({ email, password }),
    []
  );

  const signUp = useCallback((email, password) => {
    const origin = Capacitor.isNativePlatform()
      ? "com.cminvoice.app://localhost"
      : window.location.origin;
    return supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/dashboard` },
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const googleResult = await GoogleSignIn.signIn();
      const idToken = googleResult?.idToken;
      if (!idToken) {
        throw new Error("Google sign-in did not return an ID token.");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) throw error;
      if (data?.user) setUser(data.user);
      return data;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleSignIn.signOut();
      } catch {}
    }
    try {
      await supabase.auth.signOut();
      queryClientInstance.clear();
      setUser(null);
      setTfaProfile(null);
      tfaProfileRef.current = null;
      setTfaRequired(false);
    } catch (e) {
      console.error("signOut error:", e);
    }
  }, []);

  const verifyOtp = useCallback(async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    if (error) throw error;
    return data;
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    const origin = Capacitor.isNativePlatform()
      ? "com.cminvoice.app://localhost"
      : window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  }, []);

  const setupTfaPin = useCallback(
    async (pin) => {
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
    },
    [user, loadTfaProfile]
  );

  const verifyTfaPin = useCallback(
    async (pin) => {
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
    },
    [user, loadTfaProfile]
  );

  const disableTfa = useCallback(async () => {
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
  }, [user, loadTfaProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoadingAuth: loading,
        tfaProfile,
        tfaRequired,
        setTfaRequired,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        verifyOtp,
        requestPasswordReset,
        setupTfaPin,
        verifyTfaPin,
        disableTfa,
        checkTfaRequirement,
        loadTfaProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}