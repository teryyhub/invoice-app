import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VendorProfile } from "@/api/vendorProfiles";
import { uploadStamp } from "@/api/storage";
import UserManagement from "@/components/admin/UserManagement";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Upload, CheckCircle2, Loader2, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// The DB has no vendor_code column, so we store the code in the `address` field.
// Helper to read it back consistently.
const getVendorCode = (v) => (v?.address || "").trim().toUpperCase();

const emptyForm = { vendor_name: "", gstin: "", address: "", stamp_url: "" };

function VendorForm({ initial, onSave, onCancel, isSaving }) {
  // Expose `address` as the vendor code field in the UI
  const [form, setForm] = useState(initial || emptyForm);
  const [uploading, setUploading] = useState(false);

  const handleStampUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadStamp(file);
      setForm(prev => ({ ...prev, stamp_url: file_url }));
      toast.success("Stamp uploaded");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    const code = (form.address || "").trim().toUpperCase();
    if (!form.gstin || !code) {
      toast.error("GSTIN and Vendor Code are required");
      return;
    }
    // vendor_name is set to the code to satisfy the DB NOT NULL constraint.
    // The real shop name is extracted from the PDF at invoice-generation time.
    onSave({
      vendor_name: code,   // satisfies NOT NULL; real name comes from PDF
      gstin: form.gstin.trim(),
      address: code,       // this IS the vendor code
      stamp_url: form.stamp_url || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>GSTIN *</Label>
        <Input
          value={form.gstin}
          onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Vendor Code *{" "}
          <span className="text-muted-foreground text-xs">(short code after "To:" on delivery order)</span>
        </Label>
        <Input
          value={form.address}
          onChange={e => setForm(p => ({ ...p, address: e.target.value.toUpperCase() }))}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          e.g. CDAP000127 — used to auto-match this vendor when generating invoices.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Stamp / Seal Image</Label>
        <div className="flex items-center gap-4">
          {form.stamp_url ? (
            <div className="relative">
              <img src={form.stamp_url} alt="Stamp" className="w-20 h-20 object-contain border border-border rounded-lg p-1" />
              <CheckCircle2 className="w-4 h-4 text-green-600 absolute -top-1 -right-1" />
            </div>
          ) : (
            <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-xs text-center p-2">
              No stamp
            </div>
          )}
          <div>
            <label className="cursor-pointer">
              <input type="file" accept="image/jpeg,image/png,image/heic" className="hidden" onChange={handleStampUpload} />
              <Button variant="outline" size="sm" asChild disabled={uploading}>
                <span className="gap-2 flex items-center">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading..." : "Upload Stamp"}
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or HEIC</p>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-1" />Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Vendor
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function VendorSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editConfirm, setEditConfirm] = useState(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => VendorProfile.list(100),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingVendor) return VendorProfile.update(editingVendor.id, data);
      return VendorProfile.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setDialogOpen(false);
      setEditingVendor(null);
      toast.success(editingVendor ? "Vendor updated" : "Vendor added");
    },
    onError: (err) => {
      toast.error("Save failed: " + (err.message || "Unknown error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => VendorProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setDeleteConfirm(null);
      toast.success("Vendor deleted");
    },
  });

  const openAdd = () => { setEditingVendor(null); setDialogOpen(true); };
  const openEdit = (v) => { setEditConfirm(v); };
  const confirmEdit = () => { setEditingVendor(editConfirm); setEditConfirm(null); setDialogOpen(true); };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your vendor/shop profiles for invoices</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" />Add Vendor</Button>
      </div>

      {vendors.length === 0 ? (
        <Card className="border-dashed">
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium">No vendors added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first vendor to get started</p>
            <Button onClick={openAdd} className="mt-4 gap-2"><Plus className="w-4 h-4" />Add Vendor</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map(v => (
            <Card key={v.id}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base font-mono truncate">{getVendorCode(v)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">GSTIN: {v.gstin}</p>
                  </div>
                  {v.stamp_url && (
                    <img src={v.stamp_url} alt="stamp" className="w-12 h-12 object-contain rounded border border-border p-0.5" />
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openEdit(v)} className="gap-1">
                    <Pencil className="w-3.5 h-3.5" />Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(v)} className="gap-1">
                    <Trash2 className="w-3.5 h-3.5" />Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
          </DialogHeader>
          <VendorForm
            initial={editingVendor}
            onSave={(data) => saveMutation.mutate(data)}
            onCancel={() => { setDialogOpen(false); setEditingVendor(null); }}
            isSaving={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editConfirm} onOpenChange={() => setEditConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Vendor?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Edit <span className="font-semibold font-mono text-foreground">{getVendorCode(editConfirm)}</span>?
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditConfirm(null)}>No, Cancel</Button>
            <Button onClick={confirmEdit}>Yes, Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserManagement />

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Vendor?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-semibold font-mono text-foreground">{getVendorCode(deleteConfirm)}</span>? This cannot be undone.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}