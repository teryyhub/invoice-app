import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function TfaSetup() {
  const [step, setStep] = useState('set'); // 'set' or 'confirm'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    if (pin.length !== 6) return toast.error("Enter a 6-digit PIN");
    setStep('confirm');
  };

  const handleFinish = async () => {
    if (pin !== confirmPin) return toast.error("PINs do not match!");
    
    // Save to Supabase profiles
    await supabase.from('profiles').update({ 
      tfa_enabled: true, 
      tfa_secret: pin, // In real app, encrypt this
      last_tfa_verified: new Date().toISOString() 
    }).eq('id', user.id);

    toast.success("TFA enabled successfully!");
    navigate('/profile');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{step === 'set' ? "Set Your Security PIN" : "Confirm Your PIN"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>6-Digit PIN</Label>
            <Input 
              type="text" maxLength={6} 
              value={step === 'set' ? pin : confirmPin} 
              onChange={e => step === 'set' ? setPin(e.target.value) : setConfirmPin(e.target.value)}
              className="text-center text-2xl tracking-widest"
            />
          </div>
          <Button className="w-full" onClick={step === 'set' ? handleNext : handleFinish}>
            {step === 'set' ? "Next" : "Activate TFA"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
