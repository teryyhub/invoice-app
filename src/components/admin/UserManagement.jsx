import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Users, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [inviting, setInviting] = useState(false);

  // Check if current user is admin via user_metadata
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Only admins see this panel
  if (!currentUser || currentUser.user_metadata?.role !== "admin") return null;

  const handleInvite = async () => {
    if (!email.trim()) { toast.error("Please enter an email address"); return; }
    setInviting(true);
    try {
      // Supabase invite via Admin API — requires service role key on backend
      // For now send magic link as invite equivalent
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
      setRole("user");
    } catch (e) {
      toast.error("Failed to send invitation: " + e.message);
    }
    setInviting(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          User Management
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal ml-1">Admin Only</span>
        </CardTitle>
        <CardDescription>Invite new users to this app.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-9"
                onKeyDown={e => e.key === "Enter" && handleInvite()}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs invisible">Action</Label>
            <Button onClick={handleInvite} disabled={inviting} className="gap-2 w-full sm:w-auto">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Invite
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">The invited user will receive a magic link to join.</p>
      </CardContent>
    </Card>
  );
}
