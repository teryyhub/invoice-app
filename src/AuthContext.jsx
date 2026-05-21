import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./api/supabaseClient";
// Import your query client instance to clear the cache
import { queryClientInstance } from "./lib/query-client"; 

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
      
      // If the event is SIGNED_OUT, clear the query cache immediately
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
        redirectTo: window.location.origin, // Redirects back to your home page after Google login
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
      type: 'signup', // Ensures it's used for a new account verification
    });
    if (error) throw error;
    return data;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading: setLoading, // Keep internal setter
        isLoadingAuth: loading, // Alias for App.jsx compatibility
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
