// src/pages/InvoiceList.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
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
  AlertCircle,
  Edit3,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { 
  format, 
  isValid, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval, 
  addMonths, 
  subMonths 
} from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const AVAILABLE_ADDONS = [
  { id: "one_assist", name: "ONE ASSIST HOME ASSURE", amount: 1099 },
  { id: "anmol_xpress", name: "ANMOL XPRESS HEALTH", amount: 799 },
  { id: "hdfc_suraksha", name: "HDFC LIFE JEEVAN SURAKSHA", amount: 745 },
];

function calculateAckoPlan(price) {
  const p = parseFloat(price) || 0;
  if (p >= 10000 && p <= 15000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 999 };
  if (p > 15000 && p <= 20000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 1399 };
  if (p > 20000 && p <= 25000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 1799 };
  if (p > 25000 && p <= 30000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 2199 };
  if (p > 30000 && p <= 35000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 2499 };
  if (p > 35000 && p <= 50000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 3299 };
  if (p > 50000 && p <= 70000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 4699 };
  if (p > 70000 && p <= 100000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 6599 };
  if (p > 100000 && p <= 120000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 8499 };
  if (p > 120000 && p <= 140000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 9999 };
  if (p > 140000 && p <= 160000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 11599 };
  if (p > 160000 && p <= 180000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 13099 };
  if (p > 180000 && p <= 200000) return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 14599 };
  return { id: "acko_mobile", name: "ACKO ADLD MOBILE INSURANCE", amount: 999 };
}

// Flow Calendar Picker Component (Fixed alignment so it stays within page view)
function FlowCalendarPicker({ startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : null;

  const handleDayClick = (day) => {
    if (!start || (start && end)) {
      onChange({ start: format(day, "yyyy-MM-dd"), end: "" });
      return;
    }

    if (start && !end) {
      if (isSameDay(day, start)) {
        onChange({ start: format(day, "yyyy-MM-dd"), end: format(day, "yyyy-MM-dd") });
        setIsOpen(false);
      } else if (day < start) {
        onChange({ start: format(day, "yyyy-MM-dd"), end: "" });
      } else {
        onChange({ start: format(start, "yyyy-MM-dd"), end: format(day, "yyyy-MM-dd") });
        setIsOpen(false);
      }
    }
  };

  const formatDisplayLabel = () => {
    if (!start) return "Filter Date Range";
    const startStr = isValid(start) ? format(start, "dd/MM/yyyy") : "";
    const endStr = end && isValid(end) ? format(end, "dd/MM/yyyy") : "";

    if (!endStr || startStr === endStr) {
      return startStr;
    }
    return `${startStr} — ${endStr}`;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded border border-border bg-card text-xs text-foreground cursor-pointer hover:border-primary/50 transition-colors select-none"
      >
        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] font-medium truncate">{formatDisplayLabel()}</span>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange({ start: "", end: "" });
            }}
            className="text-muted-foreground hover:text-foreground ml-1"
            title="Clear dates"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed left-3 right-3 top-28 sm:absolute sm:inset-auto sm:left-0 sm:mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 sm:w-64 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-6 w-6 rounded p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-6 w-6 rounded p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted-foreground">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {Array.from({ length: startDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}

            {daysInMonth.map((day) => {
              const isSelectedStart = start && isSameDay(day, start);
              const isSelectedEnd = end && isSameDay(day, end);
              const isInBetween = start && end && isWithinInterval(day, { start, end });

              let btnStyle = "hover:bg-accent text-foreground";
              if (isSelectedStart || isSelectedEnd) {
                btnStyle = "bg-primary text-primary-foreground font-bold rounded-md";
              } else if (isInBetween) {
                btnStyle = "bg-primary/10 text-primary rounded-none";
              }

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`h-7 w-full flex items-center justify-center text-[11px] transition-colors ${btnStyle}`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ start: "", end: "" });
                setIsOpen(false);
              }}
              className="h-6 px-2 text-[10px] text-muted-foreground"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (start && !end) {
                  onChange({ start: format(start, "yyyy-MM-dd"), end: format(start, "yyyy-MM-dd") });
                }
                setIsOpen(false);
              }}
              className="h-6 px-3 text-[10px]"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoiceList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editingInvoice, setEditingInvoice] = useState(null);
  const [singleSelectedAddons, setSingleSelectedAddons] = useState([]);

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

  useEffect(() => {
    let timer;
    if (isLoadingData) {
      timer = setTimeout(() => {
        setLoadTimedOut(true);
      }, 8000);
    } else {
      setLoadTimedOut(false);
    }
    return () => clearTimeout(timer);
  }, [isLoadingData]);

  const handleInitialLoad = () => {
    setLoadTimedOut(false);
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
    const fromTime = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const toTime = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

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
  }, [invoices, search, vendorFilter, startDate, endDate, hasLoaded]);

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

  const updateSingleAddonsMutation = useMutation({
    mutationFn: async ({ id, addonsList }) => {
      const inv = invoices.find((i) => i.id === id);
      const price = inv?.product_price;
      const acko = calculateAckoPlan(price);

      const compiled = addonsList.map((addonId) => {
        if (addonId === "acko_mobile" && acko) return acko;
        return AVAILABLE_ADDONS.find((a) => a.id === addonId);
      }).filter(Boolean);

      return Invoice.update(id, { addons: compiled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-invoices", user?.id] });
      setEditingInvoice(null);
      toast.success("Invoice add-ons updated successfully!");
    },
    onError: (err) => {
      toast.error("Failed to update add-ons: " + err.message);
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

  const togglePageSelectAll = () => {
    const pageIds = paginatedInvoices.map((i) => i.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const openSingleEdit = (inv, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingInvoice(inv);
    const currentAddons = inv.addons && Array.isArray(inv.addons) ? inv.addons.map(a => a.id) : [];
    setSingleSelectedAddons(currentAddons);
  };

  const toggleSingleAddon = (addonId) => {
    setSingleSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleSaveSingleAddons = () => {
    if (!editingInvoice) return;
    updateSingleAddonsMutation.mutate({
      id: editingInvoice.id,
      addonsList: singleSelectedAddons,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setVendorFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters = search || vendorFilter !== "all" || startDate || endDate;
  const pageIds = paginatedInvoices.map((i) => i.id);
  const isAllPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const dynamicAckoAmount = useMemo(() => {
    if (!editingInvoice) return 999;
    const plan = calculateAckoPlan(editingInvoice.product_price);
    return plan ? plan.amount : 999;
  }, [editingInvoice]);

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Header & Main Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="leading-tight">
          <h1 className="text-base font-bold text-foreground">Invoices</h1>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasLoaded && (
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
                      onClick={togglePageSelectAll}
                      className="h-6 px-2 text-[10px] gap-1 font-medium rounded"
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="w-3 h-3 text-primary" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                      <span>{isAllPageSelected ? "Deselect Page" : "Select Page"}</span>
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

      {/* Individual Add-on Edit Dialog */}
      <Dialog open={!!editingInvoice} onOpenChange={(open) => !open && setEditingInvoice(null)}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Invoice Add-ons</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              Modify add-ons for customer <span className="font-bold text-foreground">{editingInvoice?.customer_name}</span> (Product Price: ₹{Number(editingInvoice?.product_price || 0).toLocaleString("en-IN")}):
            </p>
            <div className="space-y-2">
              <div
                onClick={() => toggleSingleAddon("acko_mobile")}
                className={`p-2.5 rounded-md border flex items-center justify-between text-xs cursor-pointer transition-all ${
                  singleSelectedAddons.includes("acko_mobile")
                    ? 'bg-primary/10 border-primary/50 text-foreground font-medium'
                    : 'bg-background border-border/80 text-muted-foreground hover:border-border'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={singleSelectedAddons.includes("acko_mobile")}
                    onChange={() => {}}
                    className="rounded border-border accent-primary cursor-pointer"
                  />
                  <div className="truncate">
                    <p className="font-semibold text-xs truncate">ACKO ADLD MOBILE INSURANCE</p>
                    <p className="text-[10px] text-muted-foreground">Calculated per invoice price bracket</p>
                  </div>
                </div>
                <span className="font-semibold text-xs shrink-0">₹{dynamicAckoAmount.toLocaleString("en-IN")}</span>
              </div>

              {AVAILABLE_ADDONS.map(addon => {
                const isChecked = singleSelectedAddons.includes(addon.id);
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleSingleAddon(addon.id)}
                    className={`p-2.5 rounded-md border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-primary/10 border-primary/50 text-foreground font-medium'
                        : 'bg-background border-border/80 text-muted-foreground hover:border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-border accent-primary cursor-pointer"
                      />
                      <span className="truncate text-xs">{addon.name}</span>
                    </div>
                    <span className="font-semibold text-xs shrink-0">₹{addon.amount.toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingInvoice(null)}
              className="h-8 text-xs px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSingleAddons}
              disabled={updateSingleAddonsMutation.isPending}
              className="h-8 text-xs px-4"
            >
              {updateSingleAddonsMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unloaded Fallback */}
      {!hasLoaded ? (
        <Card className="rounded-lg border-dashed border-border/80 bg-card shadow-none">
          <CardContent className="p-6 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Invoice Archive</p>
              <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">
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
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          {loadTimedOut ? (
            <div className="text-center space-y-2 bg-destructive/10 border border-destructive/20 p-4 rounded-lg max-w-sm">
              <div className="flex items-center justify-center gap-1.5 text-destructive font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Loading took longer than expected.</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                The network or database query timed out. Click below to reset and try again.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHasLoaded(false);
                  setLoadTimedOut(false);
                }}
                className="h-7 text-xs border-destructive text-destructive hover:bg-destructive hover:text-white"
              >
                Reset & Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] text-muted-foreground">Loading bills...</p>
            </>
          )}
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

            {/* Single Calendar Box Flow Range Picker */}
            <FlowCalendarPicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ start, end }) => {
                setStartDate(start);
                setEndDate(end);
                setCurrentPage(1);
              }}
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
                            <div className="min-w-0 pr-2 leading-tight space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-[11px] text-foreground font-mono">
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

                              {inv.product_model && (
                                <div className="flex items-center gap-1 text-[11px] text-foreground font-medium truncate">
                                  <Smartphone className="w-3 h-3 text-primary shrink-0" />
                                  <span className="truncate">{inv.product_model}</span>
                                </div>
                              )}

                              <div className="text-[9px] text-muted-foreground truncate flex items-center gap-1 pt-0.5">
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

                            <div className="flex items-center gap-2 shrink-0 text-right leading-tight">
                              <div>
                                <p className="font-black text-xs text-foreground tracking-tight font-mono">
                                  ₹{Number(inv.grand_total || 0).toLocaleString("en-IN")}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-medium font-mono">{dateStr}</p>
                              </div>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => openSingleEdit(inv, e)}
                                className="h-6 px-1.5 text-[9px] gap-1 font-medium rounded"
                                title="Edit Add-ons"
                              >
                                <Edit3 className="w-3 h-3 text-primary" />
                                <span className="hidden sm:inline">Add-ons</span>
                              </Button>

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