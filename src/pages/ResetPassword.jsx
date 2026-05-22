import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recoveryTokens, setRecoveryTokens] = useState(null);

  useEffect(() => {
    // Parse access_token and refresh_token from the URL hash
    // Supabase reset links look like: /reset-password#access_token=XXX&refresh_token=YYY&type=recovery
    const hash = window.location.hash.substring(1); // remove leading #
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (type === 'recovery' && accessToken && refreshToken) {
      // Store tokens — we'll use them just before updating the password
      setRecoveryTokens({ accessToken, refreshToken });
      setIsValidSession(true);
      setChecking(false);
      // Clear the hash from the URL so tokens aren't exposed
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    // Fallback: listen for PASSWORD_RECOVERY auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
      setChecking(false);
    });

    // Safety timeout — if no event fires in 3s, stop checking
    const timeout = setTimeout(() => setChecking(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' };
    if (score === 2) return { label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' };
    if (score === 3) return { label: 'Good', color: 'bg-blue-500', width: 'w-3/4' };
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // Explicitly set the recovery session using the tokens from the email link
      // This bypasses the "current password required" check
      if (recoveryTokens) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: recoveryTokens.accessToken,
          refresh_token: recoveryTokens.refreshToken,
        });
        if (sessionError) throw sessionError;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Password updated! Redirecting to login...');
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      console.error('Password update error:', err);
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Invalid or Expired Link</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This password reset link is no longer valid. Please request a new one from your profile settings.
              </p>
            </div>
            <Button onClick={() => navigate('/login')} className="mt-2">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong password to secure your account.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-9 pr-9"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Strength: <span className="font-medium text-foreground">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    className={`pl-9 pr-9 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-400 focus-visible:ring-red-400'
                        : ''
                    }`}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500">Passwords do not match.</p>
                )}
              </div>

              {/* Requirements checklist */}
              <ul className="text-xs text-muted-foreground space-y-1 pl-1">
                <li className={password.length >= 8 ? 'text-green-600' : ''}>
                  {password.length >= 8 ? '✓' : '○'} At least 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                  {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                </li>
                <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                  {/[0-9]/.test(password) ? '✓' : '○'} One number
                </li>
              </ul>

              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <ShieldCheck className="w-4 h-4" />
                }
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}