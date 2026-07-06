import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ShieldCheck, ShieldOff, Lock, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AdminPortalUsers from "@/components/admin/AdminPortalUsers";

// Defined OUTSIDE component so React doesn't remount it on every render
const PinInput = ({ value, onChange, placeholder = "••••••" }) => (
  <div className="relative">
    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

  const [mode, setMode]             = useState(null); // null | 'setup' | 'disable'
  const [pin, setPin]               = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (user?.id) loadTfaProfile(user.id);
  }, [user?.id]);

  const tfaEnabled   = tfaProfile?.tfa_enabled ?? false;
  const isLocked     = tfaProfile?.pin_locked_until &&
    Date.now() < new Date(tfaProfile.pin_locked_until).getTime();
  const attemptsLeft = isLocked
    ? 0
    : Math.max(0, 5 - (tfaProfile?.failed_tfa_attempts ?? 0));
  const lastVerified = tfaProfile?.last_tfa_verified
    ? new Date(tfaProfile.last_tfa_verified).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
      })
    : "Never";

  const resetForm = () => { setPin(""); setConfirmPin(""); setError(""); setMode(null); };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin))  { setError("PIN must be exactly 6 digits."); return; }
    if (pin !== confirmPin)     { setError("PINs do not match."); return; }
    setLoading(true); setError("");
    try {
      await setupTfaPin(pin);
      toast.success("2FA enabled! PIN saved securely.");
      resetForm();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDisableSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) { setError("Enter your current 6-digit PIN."); return; }
    setLoading(true); setError("");
    try {
      await verifyTfaPin(pin);
      await disableTfa();
      toast.success("2FA has been disabled.");
      resetForm();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handlePasswordRequest = async () => {
    try {
      await requestPasswordReset(user.email);
      toast.success("Password reset link sent to your email!");
    } catch { toast.error("Failed to send reset email."); }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Profile Settings</h1>

      {/* ── Security: 2FA ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Security</h2>

        {/* Status card */}
        <div className={`rounded-xl border-2 p-5 ${tfaEnabled ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tfaEnabled
                ? <ShieldCheck className="w-6 h-6 text-green-600" />
                : <ShieldOff className="w-6 h-6 text-gray-400" />}
              <div>
                <p className="font-semibold text-gray-800">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">
                  {tfaEnabled
                    ? `Active · Last verified: ${lastVerified}`
                    : "Not enabled · Your account has no extra protection"}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${tfaEnabled ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-500"}`}>
              {tfaEnabled ? "ON" : "OFF"}
            </span>
          </div>
          {isLocked && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              PIN locked due to too many failed attempts. Try again after 15 minutes.
            </div>
          )}
        </div>

        {/* Action buttons */}
        {mode === null && (
          <div className="flex gap-3">
            {!tfaEnabled ? (
              <button onClick={() => setMode("setup")}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
                <KeyRound className="w-4 h-4" /> Enable 2FA
              </button>
            ) : (
              <>
                <button onClick={() => setMode("setup")}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
                  <KeyRound className="w-4 h-4" /> Change PIN
                </button>
                <button onClick={() => setMode("disable")}
                  className="flex items-center gap-2 border border-red-300 text-red-600 px-5 py-2.5 rounded-lg font-medium hover:bg-red-50 transition">
                  <ShieldOff className="w-4 h-4" /> Disable 2FA
                </button>
              </>
            )}
          </div>
        )}

        {/* Setup / Change PIN */}
        {mode === "setup" && (
          <form onSubmit={handleSetupSubmit} className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              {tfaEnabled ? "Change Your PIN" : "Set Up 2FA PIN"}
            </h2>
            <p className="text-sm text-gray-500">
              Choose a 6-digit numeric PIN. You'll need this on login and every 7 days for re-verification.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">New PIN</label>
              <PinInput value={pin} onChange={setPin} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Confirm PIN</label>
              <PinInput value={confirmPin} onChange={setConfirmPin} />
            </div>
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit"
                disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                {loading ? "Saving…" : tfaEnabled ? "Update PIN" : "Enable 2FA"}
              </button>
              <button type="button" onClick={resetForm}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Disable 2FA */}
        {mode === "disable" && (
          <form onSubmit={handleDisableSubmit} className="bg-white border border-red-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="font-semibold text-red-700 flex items-center gap-2">
              <ShieldOff className="w-4 h-4" /> Disable Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-500">
              Enter your current PIN to confirm removal of 2FA.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Current PIN</label>
              <PinInput value={pin} onChange={setPin} />
            </div>
            {!isLocked && attemptsLeft < 5 && attemptsLeft > 0 && (
              <p className="text-xs text-amber-600">
                {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before lockout.
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit"
                disabled={loading || pin.length !== 6 || isLocked}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50">
                {loading ? "Verifying…" : "Confirm & Disable"}
              </button>
              <button type="button" onClick={resetForm}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Primary credentials */}
        <div className="flex justify-between items-center p-4 bg-gray-50 border rounded-lg">
          <p className="text-gray-600 text-sm">
            Signed in as <span className="font-medium">{user?.email}</span>
          </p>
          <button onClick={handlePasswordRequest}
            className="text-sm text-red-600 hover:text-red-800 font-medium">
            Reset Password
          </button>
        </div>
      </section>

      {/* ── Customer Portal Access ────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Customer Portal</h2>
        <AdminPortalUsers />
      </section>
    </div>
  );
}