// Inside AuthProvider in AuthContext.jsx

// 1. Password Reset (Real Supabase API)
const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    console.error("Reset email error:", error.message, error.status); // 👈 added
    throw error;
  }
  return true;
};

// 2. TFA Verification Logic
const verifyTfaPin = async (pin) => {
  // In a real app, you'd call an Edge Function to verify the TOTP
  // For this implementation, we simulate the check against the stored secret
  if (pin === "123456") { // Replace with actual TOTP validation logic
    const { data: { user } } = await supabase.auth.getUser();
    
    // Update last verification date to today
    await supabase
      .from('profiles')
      .update({ last_tfa_verified: new Date().toISOString(), failed_tfa_attempts: 0 })
      .eq('id', user.id);
      
    return { success: true };
  } else {
    // Increment failure count in DB
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('increment_tfa_failures', 'user_id'); // You'd create this function in SQL
    throw new Error("Invalid PIN. Please try again.");
  }
};

// 3. Weekly Verification Check
const checkTfaRequirement = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('tfa_enabled, last_tfa_verified')
    .eq('id', user.id)
    .single();

  if (profile?.tfa_enabled) {
    const lastVer = new Date(profile.last_tfa_verified);
    const now = new Date();
    const diffInDays = (now - lastVer) / (1000 * 60 * 60 * 24);
    
    if (diffInDays > 7) return true; // Must re-verify every 7 days
  }
  return false;
};

// Add these to your return value in AuthContext
return (
  <AuthContext.Provider value={{ 
    user, loading, signIn, signUp, signOut, 
    requestPasswordReset, verifyTfaPin, checkTfaRequirement 
  }}>
    {children}
  </AuthContext.Provider>
);
