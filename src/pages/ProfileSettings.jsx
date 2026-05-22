import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeProvider'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch'; 
import { User, Mail, Lock, Save, Camera, ShieldCheck, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSettings() {
  const { user, requestPasswordReset } = useAuth();
  const { theme, toggleTheme } = useTheme(); 
  const [isLoading, setIsLoading] = useState(false);
  const [tfaEnabled, setTfaEnabled] = useState(false);
  
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
  });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success("Profile information updated!");
    setIsLoading(false);
  };

 const handlePasswordRequest = async () => {
  console.log("user:", user);
  console.log("email:", user?.email);
  try {
    await requestPasswordReset(user.email);
    toast.success("Password reset link sent to your email!");
  } catch (err) {
    console.error("caught error:", err);
    toast.error("Failed to send reset email.");
  }
};

  const handleTfaToggle = () => {
    const newState = !tfaEnabled;
    setTfaEnabled(newState);
    toast.success(newState ? "TFA Enabled! Please check your email for setup." : "TFA Disabled.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account, security and appearance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-20 bg-primary/10 w-full" />
            <CardContent className="p-6 flex flex-col items-center text-center -mt-12">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-background border-4 border-card flex items-center justify-center overflow-hidden shadow-sm">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-lg truncate max-w-xs">{user?.email || 'User Name'}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Member</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Security Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Email Verified</span>
                <span className="text-green-600 font-bold px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">Yes</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Two-Factor Auth</span>
                <span className={`font-bold px-2 py-0.5 rounded-full ${tfaEnabled ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'}`}>
                  {tfaEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your basic account details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="fullName" 
                        className="pl-9" 
                        value={form.fullName} 
                        onChange={e => setForm({...form, fullName: e.target.value})} 
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        className="pl-9" 
                        value={form.email} 
                        disabled 
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isLoading} className="gap-2">
                    {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security & Access</CardTitle>
              <CardDescription>Manage password and multi-factor authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={handleTfaToggle}>
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
                </div>
                <Switch checked={tfaEnabled} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Password Change</Label>
                  <p className="text-xs text-muted-foreground">Change your password via email verification.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={handlePasswordRequest}>
                  <Lock className="w-4 h-4" /> Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription>Customize how the application looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={toggleTheme}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
