import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VerifyOtp() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = location.state?.email || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    if (!email) {
      toast.error("Email not found. Please sign up again.");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, otp);
      toast.success("Email verified successfully!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <ShieldCheck className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit OTP sent to your email</p>
        </div>

        <Card className="bg-card border border-border shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-sm font-medium">{email}</CardTitle>
            <CardDescription className="text-center">Verification Code</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label>OTP Code</Label>
                <Input 
                  type="text" 
                  maxLength={6} 
                  placeholder="123456" 
                  className="text-center text-lg tracking-widest font-bold"
                  value={otp} 
                  onChange={e => setOtp(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full py-6 text-md font-semibold gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
