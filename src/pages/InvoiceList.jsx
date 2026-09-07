import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  FileText,
  ChevronRight,
  Trash2,
  CheckSquare,
  Square,
  Search,
  X,
  ChevronLeft,
  ChevronRight as ChevronR,
  RotateCw,
  Database,
  Smartphone,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function InvoiceList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [hasLoaded, setHasLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    isFetching: fetchingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: () => Invoice.list(99999),
    enabled: hasLoaded && !!user?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    data: vendors = [],
    isLoading: loadingVendors,
    isFetching: fetchingVendors,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ["vendors", user?.id],
    queryFn: () => VendorProfile.list(100),
    enabled: hasLoaded && !!user?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const isLoadingData = hasLoaded && (loadingInvoices || loadingVendors);
  const isRefreshing = (fetchingInvoices || fetchingVendors) && !isLoadingData;

  const handleInitialLoad = () => {
    setHasLoaded(true);
  };

  const handleRefresh = () => {
    refetchInvoices();
    refetchVendors();
  };

  const vendorMap = useMemo(() => {
    const m = {};
    for (let i = 0; i < vendors.length; i++) {
      m[vendors[i].id] = vendors[i].vendor_name;
    }
    return m;
  }, [vendors]);

  const filteredInvoices = useMemo(() => {
    if (!hasLoaded) return [];
    const q = search.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const toTime = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

    return invoices.filter((inv) => {
      const nameMatch =
        !q ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_mobile?.includes(q) ||
        inv.imei_serial?.toLowerCase().includes(q) ||
        inv.product_model?.toLowerCase().includes(q) ||
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.delivery_order_number?.toLowerCase().includes(q);

      const vendorMatch =
        vendorFilter === "all" || String(inv.vendor_id) === String(vendorFilter);

      let dateMatch = true;
      if (fromTime || toTime) {
        const rawDate = inv.invoice_date || inv.created_at;
        const invTime = rawDate ? new Date(rawDate).getTime() : 0;
        if (fromTime && invTime < fromTime) dateMatch = false;
        if (toTime && invTime > toTime) dateMatch = false;
      }

      return nameMatch && vendorMatch && dateMatch;
    });
  }, [invoices, search, vendorFilter, dateFrom, dateTo, hasLoaded]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map((id) => Invoice.delete(id)));
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-invoices", user?.id] });
      setSelected(new Set());
      setSelectMode(false);
      toast.success(`${ids.length} invoice(s) deleted`);
    },
  });

  const toggleSelect = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredInvoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredInvoices.map((i) => i.id)));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setVendorFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const hasActiveFilters = search || vendorFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-2 max-w-5xl mx-auto">
      {/* Header & Main Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="leading-tight">
          <h1 className="text-base font-bold text-foreground">Invoices</h1>
          <p className="text-[10px] text-muted-foreground">
            {hasLoaded
              ? `${filteredInvoices.length} of ${invoices.length} total bills`
              : "On-demand ledger records"}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!hasLoaded ? (
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-2.5 text-[11px] gap-1.5 font-semibold rounded shadow-none"
            >
              <Database className="w-3 h-3" />
              <span>Load Invoices</span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Sync latest records"
              >
                <RotateCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>

              {invoices.length > 0 &&
                (selectMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAll}
                      className="h-6 px-2 text-[10px] gap-1 font-medium rounded"
                    >
                      {selected.size === filteredInvoices.length ? (
                        <CheckSquare className="w-3 h-3 text-primary" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                      <span>
                        {selected.size === filteredInvoices.length ? "Deselect" : "Select All"}
                      </span>
                    </Button>

                    {selected.size > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 px-2 text-[10px] gap-1 font-semibold rounded shadow-none"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete ({selected.size})</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-xs p-4 gap-3">
                          <AlertDialogHeader className="space-y-1">
                            <AlertDialogTitle className="text-sm font-bold">
                              Delete selected invoices?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs">
                              Permanently removes {selected.size} record(s). Cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-1.5 pt-1">
                            <AlertDialogCancel className="h-7 text-xs px-2.5">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate([...selected])}
                              className="h-7 text-xs px-3 bg-destructive hover:bg-destructive/90"
                            >
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectMode(false);
                        setSelected(new Set());
                      }}
                      className="h-6 px-1.5 text-[10px] text-muted-foreground"
                    >
                      Done
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectMode(true)}
                    className="h-6 px-2 text-[10px] gap-1 font-medium rounded"
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>Select</span>
                  </Button>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Unloaded Fallback */}
      {!hasLoaded ? (
        <Card className="rounded-lg border-dashed border-border/80 bg-card shadow-none">
          <CardContent className="p-6 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Invoice Archive Ready</p>
              <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">
                Click below to fetch the invoice ledger. Data is retained in memory with zero auto-refetching.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-3 text-xs font-semibold gap-1.5 rounded shadow-none mt-1"
            >
              <Database className="w-3 h-3" />
              <span>Load Invoices</span>
            </Button>
          </CardContent>
        </Card>
      ) : isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-1.5">
          <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] text-muted-foreground">Loading bills...</p>
        </div>
      ) : (
        <>
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                placeholder="Search mobile, IMEI, model, name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded border border-border bg-card pl-7 pr-6 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 rounded border border-border bg-card px-2 text-[10px] font-medium text-foreground outline-none focus:border-primary max-w-[130px] truncate"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendor_name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 rounded border border-border bg-card px-1.5 text-[10px] text-foreground outline-none focus:border-primary w-[110px]"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 rounded border border-border bg-card px-1.5 text-[10px] text-foreground outline-none focus:border-primary w-[110px]"
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-0.5"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>

          {/* Records List */}
          {filteredInvoices.length === 0 ? (
            <Card className="rounded-lg border-border/80 shadow-none">
              <CardContent className="py-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-foreground">No invoices found</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Try clearing filters or search parameters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              <Card className="rounded-lg border-border/80 shadow-none overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60">
                    {paginatedInvoices.map((inv) => {
                      const isChecked = selected.has(inv.id);
                      const dateObj = inv.invoice_date ? new Date(inv.invoice_date) : null;
                      const dateStr = dateObj && isValid(dateObj) ? format(dateObj, "dd/MM/yy") : "";

                      return (
                        <div
                          key={inv.id}
                          className={`flex items-center transition-colors ${
                            isChecked ? "bg-primary/10" : "hover:bg-accent/40"
                          }`}
                        >
                          {selectMode && (
                            <button
                              onClick={(e) => toggleSelect(inv.id, e)}
                              className="pl-2.5 pr-1 py-2 shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <Link
                            to={`/invoice/${inv.id}`}
                            onClick={
                              selectMode
                                ? (e) => {
                                    e.preventDefault();
                                    toggleSelect(inv.id, e);
                                  }
                                : undefined
                            }
                            className="flex flex-1 items-center justify-between px-2.5 py-2 min-w-0"
                          >
                            {/* Primary Details: Number, Customer, Mobile, Model, IMEI */}
                            <div className="min-w-0 pr-2 leading-tight space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-foreground">
                                  {inv.invoice_number || "Draft"}
                                </span>
                                <span className="text-[11px] font-medium text-foreground truncate">
                                  · {inv.customer_name || "Walk-in"}
                                </span>
                                {inv.customer_mobile && (
                                  <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1 py-0.2 rounded">
                                    {inv.customer_mobile}
                                  </span>
                                )}
                              </div>

                              {/* Asset Info: Model & IMEI */}
                              {(inv.product_model || inv.imei_serial) && (
                                <div className="flex items-center gap-1.5 text-[10px] text-foreground/90 font-medium">
                                  <Smartphone className="w-3 h-3 text-primary shrink-0" />
                                  {inv.product_model && (
                                    <span className="truncate">{inv.product_model}</span>
                                  )}
                                  {inv.product_model && inv.imei_serial && (
                                    <span className="text-muted-foreground/60">·</span>
                                  )}
                                  {inv.imei_serial && (
                                    <span className="font-mono text-[9px] text-primary/90 bg-primary/10 px-1 rounded truncate">
                                      IMEI: {inv.imei_serial}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Vendor / DO identifiers */}
                              <div className="text-[9px] text-muted-foreground truncate flex items-center gap-1">
                                <span className="truncate">
                                  {vendorMap[inv.vendor_id] || "Vendor"}
                                </span>
                                {inv.delivery_order_number && (
                                  <span className="font-mono text-[9px] text-muted-foreground/80 shrink-0">
                                    · DO: {inv.delivery_order_number}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Financial Total & Date */}
                            <div className="flex items-center gap-1.5 shrink-0 text-right leading-tight">
                              <div>
                                <p className="font-black text-xs text-foreground tracking-tight">
                                  ₹{Number(inv.grand_total || 0).toLocaleString("en-IN")}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-medium">{dateStr}</p>
                              </div>
                              {!selectMode && (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                              )}
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-5 rounded border border-border bg-card px-1 text-[10px] font-medium outline-none focus:border-primary"
                  >
                    {PAGE_SIZE_OPTIONS.map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                  <span className="hidden sm:inline">
                    ({Math.min((currentPage - 1) * pageSize + 1, filteredInvoices.length)}–
                    {Math.min(currentPage * pageSize, filteredInvoices.length)} of{" "}
                    {filteredInvoices.length})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-5 w-5 p-0 rounded"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-5 w-5 p-0 rounded"
                  >
                    <ChevronR className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}