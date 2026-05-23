import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/**
 * Renders a full-screen blocking modal when `tfaRequired` is true.
 * Mounted once inside AppLayout, above <Outlet />.
 */
export default function TfaVerifyModal() {
  const { tfaRequired, verifyTfaPin, signOut, tfaProfile } = useAuth();

  const [pin, setPin]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  if (!tfaRequired) return null;

  const isLocked = tfaProfile?.pin_locked_until &&
    Date.now() < new Date(tfaProfile.pin_locked_until).getTime();

  const attemptsLeft = isLocked
    ? 0
    : Math.max(0, 5 - (tfaProfile?.failed_tfa_attempts ?? 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError("Enter a 6-digit numeric PIN.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyTfaPin(pin);
      toast.success("Identity verified!");
      setPin("");
    } catch (err) {
      setError(err.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-indigo-600 px-6 py-5 text-white text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-lg font-bold">Verify Your Identity</h2>
          <p className="text-indigo-200 text-sm mt-1">
            Two-factor authentication is required to continue.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {isLocked ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <p className="font-semibold text-gray-800">PIN Locked</p>
              <p className="text-sm text-gray-500">
                Too many failed attempts. Your PIN is locked for 15 minutes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  6-Digit PIN
                </label>
                {/* Input inline here — no child component, no focus loss */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    autoFocus
                    autoComplete="off"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      if (v.length <= 6) setPin(v);
                    }}
                    placeholder="••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </p>
              )}

              {attemptsLeft < 5 && attemptsLeft > 0 && (
                <p className="text-xs text-amber-600">
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before lockout.
                </p>
              )}

              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying…" : "Verify PIN"}
              </button>
            </form>
          )}

          <button
            onClick={() => signOut()}
            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 transition text-center"
          >
            Sign out instead
          </button>
        </div>

        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-gray-400">
            Verification required every 7 days. Forgot your PIN? Sign out and contact support.
          </p>
        </div>
      </div>
    </div>
  );
}