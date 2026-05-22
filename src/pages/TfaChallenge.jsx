import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function TfaChallenge() {
  const { verifyTfaPin } = useAuth();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async () => {
    try {
      await verifyTfaPin(pin);
      toast.success("Verified!");
      navigate('/');
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setIsLocked(true);
      } else {
        toast.error(`${err.message}. ${3 - newAttempts} attempts left.`);
      }
    }
  };

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="max-w-sm text-center space-y-4 p-6 border-destructive">
          <h2 className="text-xl font-bold text-destructive">Account Locked</h2>
          <p className="text-sm text-muted-foreground">
            Too many failed attempts. For your security, this account is temporarily locked.
          </p>
          <Button className="w-full" onClick={() => window.location.href = 'mailto:admin@example.com'}>
            Contact Administrator
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle className="text-center">Security Verification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input type="text" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} className="text-center text-2xl" />
          <Button className="w-full" onClick={handleVerify}>Verify Identity</Button>
        </CardContent>
      </Card>
    </div>
  );
}
