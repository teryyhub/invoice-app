import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { FileText, ChevronRight, Trash2, CheckSquare, Square, Search, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function InvoiceList() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => Invoice.list(200),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => VendorProfile.list(100),
  });

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach(v => { m[v.id] = v.vendor_name; });
    return m;
  }, [vendors]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const nameMatch = !search || inv.customer_name?.toLowerCase().includes(search.toLowerCase()) || inv.invoice_number?.toLowerCase().includes(search.toLowerCase());
      const vendorMatch = vendorFilter === "all" || inv.vendor_id === vendorFilter;
      const invDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
      const fromMatch = !dateFrom || (invDate && invDate >= new Date(dateFrom));
      const toMatch = !dateTo || (invDate && invDate <= new Date(dateTo));
      return nameMatch && vendorMatch && fromMatch && toMatch;
    });
  }, [invoices, search, vendorFilter, dateFrom, dateTo]);

  const deleteMutation = useMutation({
    mutationFn: async (ids) => { await Promise.all(ids.map(id => Invoice.delete(id))); },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setSelected(new Set()); setSelectMode(false);
      toast.success(`${ids.length} invoice${ids.length > 1 ? "s" : ""} deleted`);
    },
  });

  const toggleSelect = (id, e) => {
    e.preventDefault(); e.stopPropagation();
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleAll = () => {
    selected.size === filteredInvoices.length ? setSelected(new Set()) : setSelected(new Set(filteredInvoices.map(i => i.id)));
  };

  const clearFilters = () => { setSearch(""); setVendorFilter("all"); setDateFrom(""); setDateTo(""); };
  const hasFilters = search || vendorFilter !== "all" || dateFrom || dateTo;

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">{filteredInvoices.length} of {invoices.length} invoices</p>
        </div>
        {invoices.length > 0 && (
          <div className="flex gap-2">
            {selectMode ? (
              <>
                <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2">
                  {selected.size === filteredInvoices.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selected.size === filteredInvoices.length ? "Deselect All" : "Select All"}
                </Button>
                {selected.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2"><Trash2 className="w-4 h-4" />Delete ({selected.size})</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.size} invoice{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate([...selected])} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>Cancel</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="gap-2"><CheckSquare className="w-4 h-4" />Select</Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or invoice no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Vendors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground"><X className="w-4 h-4" />Clear</Button>}
      </div>

      {filteredInvoices.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-lg font-medium text-muted-foreground">{invoices.length === 0 ? "No invoices yet" : "No invoices match the filters"}</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredInvoices.map(inv => {
                const isChecked = selected.has(inv.id);
                return (
                  <div key={inv.id} className={`flex items-center transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-accent/50"}`}>
                    {selectMode && (
                      <button onClick={(e) => toggleSelect(inv.id, e)} className="pl-4 pr-2 py-4 shrink-0">
                        {isChecked ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                      </button>
                    )}
                    <Link to={`/invoice/${inv.id}`} className="flex flex-1 items-center justify-between p-4" onClick={selectMode ? (e) => { e.preventDefault(); toggleSelect(inv.id, e); } : undefined}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{inv.invoice_number}</p>
                          <p className="text-sm text-foreground">{inv.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{vendorMap[inv.vendor_id] || ""}{inv.delivery_order_number ? ` · App ID: ${inv.delivery_order_number}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-sm">₹{(inv.grand_total || 0).toLocaleString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground">{inv.invoice_date ? format(new Date(inv.invoice_date), "dd/MMM/yyyy") : ""}</p>
                        </div>
                        {!selectMode && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
