// /src/components/admin/AdminPortalUsers.jsx
// Drop this inside your existing Settings or UserManagement page.
// Admin can create, activate/deactivate, and delete portal login accounts.

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerPortalUser } from "@/api/customerPortalUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Eye, EyeOff, Loader2, ToggleLeft, ToggleRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function AddUserForm({ onSave, onCancel, isSaving }) {
  const [form,    setForm]    = useState({ login_id: "", password: "", label: "" });
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = () => {
    if (!form.login_id.trim() || !form.password.trim()) {
      toast.error("Login ID and Password are required");
      return;
    }
    onSave(form);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Display Name / Label</Label>
        <Input
          value={form.label}
          onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
          placeholder="e.g. Branch Manager"
        />
        <p className="text-xs text-muted-foreground">Shown at top of the portal after login.</p>
      </div>
      <div className="space-y-2">
        <Label>Login ID *</Label>
        <Input
          value={form.login_id}
          onChange={e => setForm(p => ({ ...p, login_id: e.target.value }))}
          placeholder="e.g. branch01"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label>Password *</Label>
        <div className="relative">
          <Input
            type={showPwd ? "text" : "password"}
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Create Account
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminPortalUsers() {
  const queryClient = useQueryClient();
  const [addOpen,        setAddOpen]        = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["portal-users"],
    queryFn: CustomerPortalUser.list,
  });

  const createMutation = useMutation({
    mutationFn: (data) => CustomerPortalUser.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-users"] });
      setAddOpen(false);
      toast.success("Portal account created");
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => CustomerPortalUser.setActive(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal-users"] }),
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => CustomerPortalUser.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-users"] });
      setDeleteConfirm(null);
      toast.success("Account deleted");
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Customer Portal Access
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage who can log in to the read-only customer portal at{" "}
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">/portal</span>
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-sm">No portal accounts yet.</p>
            <Button size="sm" onClick={() => setAddOpen(true)} className="mt-3 gap-2">
              <Plus className="w-4 h-4" />Create First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">
                        {u.label || u.login_id}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Login ID: {u.login_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}
                      disabled={toggleMutation.isPending}
                      className="gap-1 text-xs"
                    >
                      {u.is_active
                        ? <><ToggleRight className="w-4 h-4 text-green-600" />Deactivate</>
                        : <><ToggleLeft  className="w-4 h-4" />Activate</>}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(u)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Portal Account</DialogTitle></DialogHeader>
          <AddUserForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setAddOpen(false)}
            isSaving={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Account?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete portal account{" "}
            <span className="font-semibold text-foreground font-mono">{deleteConfirm?.login_id}</span>?
            This cannot be undone.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}