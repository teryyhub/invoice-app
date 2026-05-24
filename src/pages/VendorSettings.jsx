import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VendorProfile } from "@/api/vendorProfiles";
import { uploadStamp } from "@/api/storage";
import UserManagement from "@/components/admin/UserManagement";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Upload, CheckCircle2, Loader2, Plus, Trash2, Pencil, X, Info } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// DB columns used:
//   vendor_name    → real shop name          e.g. "XXXXXXX XXXXXX XXXXX"   (auto-filled from first PDF)
//   address        → vendor code             e.g. "CDXX000000"                 (user-entered, used for matching)
//   vendor_address → real postal address     e.g. "12-3, MG Road, Warangal"   (auto-filled from first PDF)
//   gstin          → GST number                                                (user-entered)
//   stamp_url      → stamp image                                               (user-uploaded)

const isCdapCode = (val) => /^CDAP\d+$/i.test((val || "").trim());
const getVendorCode = (v) => (v?.address || "").trim().toUpperCase();

// True only when vendor_name is a real shop name, not a placeholder CDAP code
const hasRealName = (v) =>
  v?.vendor_name && !isCdapCode(v.vendor_name) && v.vendor_name.trim() !== "";

// ─── STAMP UPLOAD HELPER ─────────────────────────────────────────────────────
function StampUploader({ stampUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadStamp(file);
      onUploaded(file_url);
      toast.success("Stamp uploaded");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    }
    setUploading(false);
  };
  return (
    <div className="flex items-center gap-4">
      {stampUrl ? (
        <div className="relative">
          <img src={stampUrl} alt="Stamp" className="w-20 h-20 object-contain border border-border rounded-lg p-1" />
          <CheckCircle2 className="w-4 h-4 text-green-600 absolute -top-1 -right-1" />
        </div>
      ) : (
        <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-xs text-center p-2">
          No stamp
        </div>
      )}
      <div>
        <label className="cursor-pointer">
          <input type="file" accept="image/jpeg,image/png,image/heic" className="hidden" onChange={handleChange} disabled={uploading} />
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
  );
}

// ─── ADD FORM ────────────────────────────────────────────────────────────────
// Only shows GSTIN + Vendor Code + Stamp.
// vendor_name and vendor_address are hidden — auto-filled from the first matching PDF.
function AddVendorForm({ onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({ gstin: "", address: "", stamp_url: "" });

  const handleSubmit = () => {
    const code = (form.address || "").trim().toUpperCase();
    if (!form.gstin.trim() || !code) {
      toast.error("GSTIN and Vendor Code are required");
      return;
    }
    // vendor_name & vendor_address are left blank / placeholder;
    // GenerateInvoice will patch them on the first matching PDF upload.
    onSave({
      vendor_name:    code,   // NOT-NULL placeholder, overwritten automatically
      gstin:          form.gstin.trim(),
      address:        code,   // vendor code — used for matching
      vendor_address: "",     // will be auto-filled
      stamp_url:      form.stamp_url || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Shop name and address will be auto-filled when you upload the first delivery order for this vendor.
        </p>
      </div>

      <div className="space-y-2">
        <Label>GSTIN *</Label>
        <Input
          value={form.gstin}
          onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))}
          placeholder="e.g. 30XXXXX0000X0XM"
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
          placeholder="e.g. CDXX000000"
        />
        <p className="text-xs text-muted-foreground">Used to auto-match this vendor when generating invoices.</p>
      </div>

      <div className="space-y-2">
        <Label>Stamp / Seal Image</Label>
        <StampUploader
          stampUrl={form.stamp_url}
          onUploaded={(url) => setForm(p => ({ ...p, stamp_url: url }))}
        />
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

// ─── EDIT FORM ────────────────────────────────────────────────────────────────
// Shows ALL fields — user can correct anything that was auto-filled incorrectly.
function EditVendorForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    vendor_name:    isCdapCode(initial?.vendor_name) ? "" : (initial?.vendor_name || ""),
    gstin:          initial?.gstin          || "",
    address:        initial?.address        || "",
    vendor_address: initial?.vendor_address || "",
    stamp_url:      initial?.stamp_url      || "",
  });

  const handleSubmit = () => {
    const code = (form.address || "").trim().toUpperCase();
    if (!form.gstin.trim() || !code) {
      toast.error("GSTIN and Vendor Code are required");
      return;
    }
    onSave({
      vendor_name:    (form.vendor_name || "").trim() || code,
      gstin:          form.gstin.trim(),
      address:        code,
      vendor_address: (form.vendor_address || "").trim(),
      stamp_url:      form.stamp_url || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Shop Name
          <span className="ml-2 text-xs text-muted-foreground">(auto-filled from first PDF — edit if incorrect)</span>
        </Label>
        <Input
          value={form.vendor_name}
          onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))}
          placeholder="e.g. M/S SRI LAKSHMI MOBILES"
        />
      </div>

      <div className="space-y-2">
        <Label>
          Shop Address
          <span className="ml-2 text-xs text-muted-foreground">(auto-filled from first PDF — edit if incorrect)</span>
        </Label>
        <Textarea
          value={form.vendor_address}
          onChange={e => setForm(p => ({ ...p, vendor_address: e.target.value }))}
          placeholder="e.g. 12-3, MG Road, Warangal - 506002"
          rows={2}
          className="resize-none"
        />
      </div>

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
      </div>

      <div className="space-y-2">
        <Label>Stamp / Seal Image</Label>
        <StampUploader
          stampUrl={form.stamp_url}
          onUploaded={(url) => setForm(p => ({ ...p, stamp_url: url }))}
        />
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function VendorSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [isAdding, setIsAdding]           = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editConfirm, setEditConfirm]     = useState(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => VendorProfile.list(100),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (!isAdding && editingVendor) return VendorProfile.update(editingVendor.id, data);
      return VendorProfile.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setDialogOpen(false);
      setEditingVendor(null);
      toast.success(isAdding ? "Vendor added" : "Vendor updated");
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

  const openAdd    = () => { setIsAdding(true);  setEditingVendor(null);    setDialogOpen(true); };
  const openEdit   = (v) => { setEditConfirm(v); };
  const confirmEdit = () => { setIsAdding(false); setEditingVendor(editConfirm); setEditConfirm(null); setDialogOpen(true); };

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
          {vendors.map(v => {
            const nameReady    = hasRealName(v);
            const addressReady = v?.vendor_address && v.vendor_address.trim() !== "";
            return (
              <Card key={v.id}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">

                      {/* Shop name */}
                      {nameReady ? (
                        <p className="font-bold text-base truncate">{v.vendor_name}</p>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-base text-muted-foreground italic">Pending first upload</p>
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded px-1.5 py-0.5">
                            Auto-fill pending
                          </span>
                        </div>
                      )}

                      {/* Shop address */}
                      {addressReady ? (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{v.vendor_address}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 italic mt-0.5">Address pending first upload</p>
                      )}

                      {/* Vendor code + GSTIN */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{getVendorCode(v)}</span>
                        <span className="text-xs text-muted-foreground">GSTIN: {v.gstin}</span>
                      </div>
                    </div>

                    {v.stamp_url && (
                      <img src={v.stamp_url} alt="stamp" className="w-12 h-12 object-contain rounded border border-border p-0.5 shrink-0" />
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
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAdding ? "Add New Vendor" : "Edit Vendor"}</DialogTitle>
          </DialogHeader>
          {isAdding ? (
            <AddVendorForm
              onSave={(data) => saveMutation.mutate(data)}
              onCancel={() => setDialogOpen(false)}
              isSaving={saveMutation.isPending}
            />
          ) : (
            <EditVendorForm
              initial={editingVendor}
              onSave={(data) => saveMutation.mutate(data)}
              onCancel={() => { setDialogOpen(false); setEditingVendor(null); }}
              isSaving={saveMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit confirmation */}
      <Dialog open={!!editConfirm} onOpenChange={() => setEditConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Vendor?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Edit <span className="font-semibold text-foreground">{editConfirm?.vendor_name}</span>?
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditConfirm(null)}>No, Cancel</Button>
            <Button onClick={confirmEdit}>Yes, Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserManagement />

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Vendor?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{deleteConfirm?.vendor_name}</span>? This cannot be undone.
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