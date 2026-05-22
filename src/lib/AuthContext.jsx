import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient"; // FIXED: Using @ alias to reach src/api
import { queryClientInstance } from "@/lib/query-client"; // FIXED: Using @ alias to reach src/lib

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // Clear cache on sign out to prevent 404 errors
      if (_event === 'SIGNED_OUT') {
        queryClientInstance.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Standard Auth Methods ---
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      queryClientInstance.clear(); 
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // --- Google Login Method ---
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, 
      },
    });
    if (error) throw error;
    return data;
  };

  // --- OTP Verification Method ---
  const verifyOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOTP({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;
    return data;
  };

  // --- Password Reset ---
  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      console.error("Reset email error:", error.message, error.status);
      throw error;
    }
    return true;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        isLoadingAuth: loading, 
        signIn, 
        signUp, 
        signOut, 
        signInWithGoogle, 
        verifyOtp,
        requestPasswordReset, // 👈 added
      }}
    >
      {children}
    </AuthContext.Provider>
  );

  
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        isLoadingAuth: loading, 
        signIn, 
        signUp, 
        signOut, 
        signInWithGoogle, 
        verifyOtp 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
