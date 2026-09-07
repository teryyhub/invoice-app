import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VendorProfile } from "@/api/vendorProfiles";
import { uploadStamp } from "@/api/storage";
import UserManagement from "@/components/admin/UserManagement";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Save,
  Upload,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
  Info,
  Store,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const isCdapCode = (val) => /^CDAP\d+$/i.test((val || "").trim());
const getVendorCode = (v) => (v?.address || "").trim().toUpperCase();
const hasRealName = (v) =>
  v?.vendor_name && !isCdapCode(v.vendor_name) && v.vendor_name.trim() !== "";

function StampUploader({ stampUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
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
    <div className="flex items-center gap-2.5">
      {stampUrl ? (
        <div className="relative shrink-0">
          <img
            src={stampUrl}
            alt="Stamp"
            className="w-12 h-12 object-contain border border-border rounded bg-muted/20 p-1"
          />
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 absolute -top-1 -right-1" />
        </div>
      ) : (
        <div className="w-12 h-12 border border-dashed border-border rounded flex items-center justify-center text-muted-foreground text-[9px] text-center p-1 leading-tight shrink-0">
          No seal
        </div>
      )}
      <div className="space-y-0.5 min-w-0">
        <label className="cursor-pointer inline-block">
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic"
            className="hidden"
            onChange={handleChange}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            disabled={uploading}
            className="h-6 px-2 text-[10px] gap-1 rounded shadow-none"
          >
            <span>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              <span>{uploading ? "Uploading..." : "Select Seal"}</span>
            </span>
          </Button>
        </label>
        <p className="text-[9px] text-muted-foreground leading-none">JPG, PNG, or HEIC</p>
      </div>
    </div>
  );
}

function AddVendorForm({ onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({ gstin: "", address: "", stamp_url: "" });

  const handleSubmit = () => {
    const code = (form.address || "").trim().toUpperCase();
    if (!form.gstin.trim() || !code) {
      toast.error("GSTIN and Vendor Code are required");
      return;
    }
    onSave({
      vendor_name: code,
      gstin: form.gstin.trim(),
      address: code,
      vendor_address: "",
      stamp_url: form.stamp_url || "",
    });
  };

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-start gap-1.5 rounded bg-blue-500/10 border border-blue-500/20 p-2 text-blue-700 dark:text-blue-300">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p className="text-[10px] leading-tight">
          Shop name & address are auto-extracted on first delivery order upload.
        </p>
      </div>

      <div className="space-y-0.5">
        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
          GSTIN *
        </label>
        <input
          value={form.gstin}
          onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value }))}
          placeholder="e.g. 36AABCU9603R1ZM"
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary uppercase font-mono text-[11px]"
        />
      </div>

      <div className="space-y-0.5">
        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
          Vendor Code * (from DO)
        </label>
        <input
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value.toUpperCase() }))}
          placeholder="e.g. CDAP000127"
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary uppercase font-mono text-[11px]"
        />
        <p className="text-[9px] text-muted-foreground leading-none">Code matched against PDF delivery order</p>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
          Authorised Seal / Stamp
        </label>
        <StampUploader
          stampUrl={form.stamp_url}
          onUploaded={(url) => setForm((p) => ({ ...p, stamp_url: url }))}
        />
      </div>

      <DialogFooter className="gap-1.5 pt-1 sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          className="h-6 px-2 text-[10px]"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          size="sm"
          className="h-6 px-2.5 text-[10px] font-semibold gap-1 rounded shadow-none"
        >
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          <span>Save Vendor</span>
        </Button>
      </DialogFooter>
    </div>
  );
}

function EditVendorForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    vendor_name: isCdapCode(initial?.vendor_name) ? "" : initial?.vendor_name || "",
    gstin: initial?.gstin || "",
    address: initial?.address || "",
    vendor_address: initial?.vendor_address || "",
    stamp_url: initial?.stamp_url || "",
  });

  const handleSubmit = () => {
    const code = (form.address || "").trim().toUpperCase();
    if (!form.gstin.trim() || !code) {
      toast.error("GSTIN and Vendor Code are required");
      return;
    }
    onSave({
      vendor_name: (form.vendor_name || "").trim() || code,
      gstin: form.gstin.trim(),
      address: code,
      vendor_address: (form.vendor_address || "").trim(),
      stamp_url: form.stamp_url || "",
    });
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="space-y-0.5">
        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
          Shop Name
        </label>
        <input
          value={form.vendor_name}
          onChange={(e) => setForm((p) => ({ ...p, vendor_name: e.target.value }))}
          placeholder="e.g. Siva Enterprises"
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary font-medium"
        />
      </div>

      <div className="space-y-0.5">
        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
          Shop Address
        </label>
        <textarea
          value={form.vendor_address}
          onChange={(e) => setForm((p) => ({ ...p, vendor_address: e.target.value }))}
          placeholder="Shop / Building address"
          rows={2}
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary resize-none leading-snug"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
            GSTIN *
          </label>
          <input
            value={form.gstin}
            onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value }))}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary uppercase font-mono text-[11px]"
          />
        </div>

        <div className="space-y-0.5">
          <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
            Vendor Code *
          </label>
          <input
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value.toUpperCase() }))}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary uppercase font-mono text-[11px]"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
          Seal / Stamp Image
        </label>
        <StampUploader
          stampUrl={form.stamp_url}
          onUploaded={(url) => setForm((p) => ({ ...p, stamp_url: url }))}
        />
      </div>

      <DialogFooter className="gap-1.5 pt-1 sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          className="h-6 px-2 text-[10px]"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          size="sm"
          className="h-6 px-2.5 text-[10px] font-semibold gap-1 rounded shadow-none"
        >
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          <span>Update Vendor</span>
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function VendorSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editConfirm, setEditConfirm] = useState(null);

  const {
    data: vendors = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => VendorProfile.list(100),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
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
      toast.success(isAdding ? "Vendor profile created" : "Vendor profile updated");
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
      toast.success("Vendor profile deleted");
    },
  });

  const openAdd = () => {
    setIsAdding(true);
    setEditingVendor(null);
    setDialogOpen(true);
  };

  const openEdit = (v) => {
    setEditConfirm(v);
  };

  const confirmEdit = () => {
    setIsAdding(false);
    setEditingVendor(editConfirm);
    setEditConfirm(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-5xl mx-auto">
      {/* Header and Controls */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
        <div className="leading-tight">
          <h1 className="text-base font-bold text-foreground">Vendor Settings</h1>
          <p className="text-[10px] text-muted-foreground">
            {vendors.length} vendor profile{vendors.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            title="Sync vendors"
          >
            <RotateCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            onClick={openAdd}
            className="h-6 px-2 text-[10px] gap-1 font-semibold rounded shadow-none"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>Add Vendor</span>
          </Button>
        </div>
      </div>

      {/* Vendors Grid */}
      {vendors.length === 0 ? (
        <Card className="rounded-lg border-dashed border-border/80 bg-card shadow-none">
          <CardContent className="p-6 text-center flex flex-col items-center justify-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-foreground">No vendors added yet</p>
            <p className="text-[10px] text-muted-foreground max-w-xs">
              Add your merchant code and GSTIN to auto-fill invoices from incoming delivery orders.
            </p>
            <Button
              size="sm"
              onClick={openAdd}
              className="h-6 px-2.5 text-[10px] gap-1 font-semibold rounded shadow-none mt-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add First Vendor</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {vendors.map((v) => {
            const nameReady = hasRealName(v);
            const addressReady = v?.vendor_address && v.vendor_address.trim() !== "";

            return (
              <Card
                key={v.id}
                className="rounded-lg border-border/80 shadow-none bg-card hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <CardContent className="p-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1 leading-tight space-y-0.5">
                      {nameReady ? (
                        <p className="font-bold text-xs text-foreground truncate">{v.vendor_name}</p>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-xs text-muted-foreground italic">
                            Pending upload
                          </span>
                          <span className="text-[8px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded px-1 py-0.2 font-semibold">
                            Auto-fill
                          </span>
                        </div>
                      )}

                      {addressReady ? (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                          {v.vendor_address}
                        </p>
                      ) : (
                        <p className="text-[9px] text-muted-foreground/60 italic">
                          Address will auto-fill on first DO
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        <span className="text-[9px] font-mono font-bold bg-muted/60 text-foreground px-1 py-0.2 rounded">
                          {getVendorCode(v)}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground truncate">
                          GST: {v.gstin}
                        </span>
                      </div>
                    </div>

                    {v.stamp_url ? (
                      <img
                        src={v.stamp_url}
                        alt="seal"
                        className="w-10 h-10 object-contain rounded border border-border/70 p-0.5 shrink-0 bg-muted/20"
                      />
                    ) : (
                      <div className="w-10 h-10 border border-dashed border-border/60 rounded flex items-center justify-center text-muted-foreground/40 text-[8px] shrink-0">
                        No seal
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(v)}
                      className="h-5 px-1.5 text-[10px] gap-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(v)}
                      className="h-5 px-1.5 text-[10px] gap-0.5 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm p-4 gap-3">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-sm font-bold">
              {isAdding ? "Register New Vendor" : "Edit Vendor Details"}
            </DialogTitle>
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
              onCancel={() => {
                setDialogOpen(false);
                setEditingVendor(null);
              }}
              isSaving={saveMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Confirmation Dialog */}
      <Dialog open={!!editConfirm} onOpenChange={() => setEditConfirm(null)}>
        <DialogContent className="max-w-xs p-4 gap-2.5">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-sm font-bold">Edit Vendor Profile?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-tight">
            Modify profile for{" "}
            <span className="font-semibold text-foreground">
              {editConfirm?.vendor_name || getVendorCode(editConfirm)}
            </span>
            ?
          </p>
          <DialogFooter className="gap-1.5 pt-1 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditConfirm(null)}
              className="h-6 text-[10px] px-2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmEdit}
              className="h-6 text-[10px] px-2.5 font-semibold"
            >
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-xs p-4 gap-2.5">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-sm font-bold">Delete Vendor Profile?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-tight">
            Permanently delete{" "}
            <span className="font-semibold text-foreground">
              {deleteConfirm?.vendor_name || getVendorCode(deleteConfirm)}
            </span>
            ? Existing invoices will retain their snapshot details.
          </p>
          <DialogFooter className="gap-1.5 pt-1 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirm(null)}
              className="h-6 text-[10px] px-2"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="h-6 text-[10px] px-2.5 font-semibold gap-1"
            >
              {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Administrative User Management Section */}
      <div className="pt-2 border-t border-border/60">
        <UserManagement />
      </div>
    </div>
  );
}