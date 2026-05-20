import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Mail, Lock, Save, Camera, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize form with data from the Auth Context
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    password: '',
    phone: ''
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Since we are not using an API, we simulate the save process
    // In a real app, you would call: await updateProfile(form)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast.success("Profile updated successfully!");
    setIsLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account details and security preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Preview */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                  <User className="w-12 h-12 text-primary" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-lg">{user?.email || 'User Name'}</h3>
                <p className="text-xs text-muted-foreground">Account Member</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Verified Email</span>
                <span className="text-green-600 font-medium">Yes</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Two-Factor Auth</span>
                <span className="text-amber-600 font-medium">Disabled</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Edit Forms */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
                <CardDescription>Update your public profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        placeholder="John Doe"
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
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})} 
                    placeholder="+91 00000 00000"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>Change your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      className="pl-9" 
                      value={form.password} 
                      onChange={e => setForm({...form, password: e.target.value})} 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Leave password blank if you don't want to change it.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="gap-2 px-8"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
