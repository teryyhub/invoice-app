import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  ShieldCheck,
  ShieldOff,
  Lock,
  KeyRound,
  AlertTriangle,
  Mail,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AdminPortalUsers from "@/components/admin/AdminPortalUsers";

const PinInput = ({ value, onChange, placeholder = "••••••" }) => (
  <div className="relative">
    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
    <input
      type="password"
      inputMode="numeric"
      maxLength={6}
      value={value}
      autoComplete="off"
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "");
        if (v.length <= 6) onChange(v);
      }}
      placeholder={placeholder}
      className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-background text-center text-sm font-mono tracking-[0.4em] outline-none focus:border-primary transition-colors"
    />
  </div>
);

export default function ProfileSettings() {
  const {
    user,
    tfaProfile,
    loadTfaProfile,
    setupTfaPin,
    verifyTfaPin,
    disableTfa,
    requestPasswordReset,
  } = useAuth();

  const [mode, setMode] = useState(null); // null | 'setup' | 'disable'
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) loadTfaProfile(user.id);
  }, [user?.id]);

  const tfaEnabled = tfaProfile?.tfa_enabled ?? false;
  const isLocked =
    tfaProfile?.pin_locked_until &&
    Date.now() < new Date(tfaProfile.pin_locked_until).getTime();
  const attemptsLeft = isLocked
    ? 0
    : Math.max(0, 5 - (tfaProfile?.failed_tfa_attempts ?? 0));
  const lastVerified = tfaProfile?.last_tfa_verified
    ? new Date(tfaProfile.last_tfa_verified).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Never";

  const resetForm = () => {
    setPin("");
    setConfirmPin("");
    setError("");
    setMode(null);
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setError("PIN must be 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await setupTfaPin(pin);
      toast.success("2FA enabled successfully.");
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setError("Enter 6-digit PIN.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyTfaPin(pin);
      await disableTfa();
      toast.success("2FA disabled.");
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRequest = async () => {
    try {
      await requestPasswordReset(user.email);
      toast.success("Password reset link sent to your email.");
    } catch {
      toast.error("Failed to send reset email.");
    }
  };

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">
            Security & Profile
          </h1>
          <p className="text-[10px] text-muted-foreground leading-none">
            Two-factor PIN, credentials & portal users
          </p>
        </div>
      </div>

      {/* Security Section */}
      <section className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block px-0.5">
          Two-Factor Authentication
        </span>

        {/* 2FA Status Card */}
        <Card
          className={`rounded-lg border shadow-none ${
            tfaEnabled
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-border/80 bg-card"
          }`}
        >
          <CardContent className="p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    tfaEnabled
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tfaEnabled ? (
                    <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                  ) : (
                    <ShieldOff className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-foreground">
                      Two-Factor Protection
                    </p>
                    <span
                      className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded leading-none ${
                        tfaEnabled
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tfaEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {tfaEnabled
                      ? `Active · Verified: ${lastVerified}`
                      : "Account is only protected by password"}
                  </p>
                </div>
              </div>

              {/* Mode Triggers */}
              {mode === null && (
                <div className="flex items-center gap-1 shrink-0">
                  {!tfaEnabled ? (
                    <Button
                      size="sm"
                      onClick={() => setMode("setup")}
                      className="h-6 px-2 text-[10px] font-semibold gap-1 rounded"
                    >
                      <KeyRound className="w-3 h-3" />
                      Enable
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMode("setup")}
                        className="h-6 px-2 text-[10px] gap-1 rounded"
                      >
                        <KeyRound className="w-3 h-3" />
                        Change PIN
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMode("disable")}
                        className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10 rounded"
                      >
                        <ShieldOff className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {isLocked && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 border border-destructive/20 rounded p-1.5 leading-tight">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Locked due to failed attempts. Try again in 15 minutes.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup / Change PIN Form */}
        {mode === "setup" && (
          <Card className="rounded-lg border-border/80 shadow-none bg-card">
            <CardContent className="p-2.5 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  <span>{tfaEnabled ? "Update Security PIN" : "Setup 6-Digit PIN"}</span>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSetupSubmit} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      New 6-Digit PIN
                    </label>
                    <PinInput value={pin} onChange={setPin} />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Confirm PIN
                    </label>
                    <PinInput value={confirmPin} onChange={setConfirmPin} />
                  </div>
                </div>

                {error && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/50">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="h-6 px-2 text-[10px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
                    size="sm"
                    className="h-6 px-3 text-[10px] font-semibold gap-1 rounded"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <KeyRound className="w-3 h-3" />
                    )}
                    <span>{tfaEnabled ? "Update PIN" : "Save PIN"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Disable Form */}
        {mode === "disable" && (
          <Card className="rounded-lg border-destructive/30 bg-destructive/5 shadow-none">
            <CardContent className="p-2.5 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-destructive/20">
                <div className="flex items-center gap-1 text-xs font-bold text-destructive">
                  <ShieldOff className="w-3.5 h-3.5" />
                  <span>Disable 2FA Confirmation</span>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleDisableSubmit} className="space-y-2">
                <div className="space-y-0.5 max-w-xs">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Current PIN
                  </label>
                  <PinInput value={pin} onChange={setPin} />
                </div>

                {!isLocked && attemptsLeft < 5 && attemptsLeft > 0 && (
                  <p className="text-[10px] text-amber-600">
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before lockout.
                  </p>
                )}

                {error && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-destructive/20">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="h-6 px-2 text-[10px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={loading || pin.length !== 6 || isLocked}
                    size="sm"
                    className="h-6 px-3 text-[10px] font-semibold gap-1 rounded"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ShieldOff className="w-3 h-3" />
                    )}
                    <span>Disable 2FA</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Credentials Strip */}
        <div className="flex items-center justify-between p-2 rounded-lg border border-border/80 bg-card">
          <div className="flex items-center gap-1.5 min-w-0">
            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">
              Signed in as <span className="font-semibold text-foreground">{user?.email}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePasswordRequest}
            className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10 font-semibold rounded shrink-0"
          >
            Reset Password
          </Button>
        </div>
      </section>

      {/* Customer Portal Management Section */}
      <section className="space-y-1.5 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block px-0.5">
          Customer Portal Access
        </span>
        <AdminPortalUsers />
      </section>
    </div>
  );
}