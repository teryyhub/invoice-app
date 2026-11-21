// src/pages/Customers.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  Loader2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Database,
  RotateCw,
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

const SORT_OPTIONS = [
  { key: 'totalSpent', label: 'Value', defaultDir: 'desc' },
  { key: 'totalInvoices', label: 'Invoices', defaultDir: 'desc' },
  { key: 'lastDate', label: 'Date', defaultDir: 'desc' },
  { key: 'name', label: 'A–Z', defaultDir: 'asc' },
];

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return dir === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
}

const EMPTY_DRAFT = {
  minInvoices: '',
  minSpent: '',
  vendorFilter: '',
  startDate: '',
  endDate: '',
  sortKey: 'totalSpent',
  sortDir: 'desc',
};

export default function Customers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [applied, setApplied] = useState({ ...EMPTY_DRAFT });

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Queries only execute when hasLoaded is true
  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    isFetching: fetchingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['customers-derived', user?.id],
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
    queryKey: ['vendors', user?.id],
    queryFn: () => VendorProfile.list(100),
    enabled: hasLoaded && !!user?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const isLoadingData = (loadingInvoices || loadingVendors) && hasLoaded;
  const isRefreshing = (fetchingInvoices || fetchingVendors) && !isLoadingData;

  const handleInitialLoad = () => {
    setHasLoaded(true);
  };

  const handleRefresh = () => {
    refetchInvoices();
    refetchVendors();
    toast.success("Customer database synced");
  };

  const vendorLabel = useMemo(() => {
    const map = {};
    vendors.forEach((v) => {
      const isCdap = /^CDAP\d+$/i.test((v.vendor_name || '').trim());
      map[v.id] = isCdap ? (v.address || v.vendor_name) : v.vendor_name;
    });
    return map;
  }, [vendors]);

  const vendorNameToId = useMemo(() => {
    const map = {};
    vendors.forEach((v) => {
      if (v.vendor_name) map[v.vendor_name.trim().toLowerCase()] = v.id;
      if (v.address) map[v.address.trim().toLowerCase()] = v.id;
    });
    return map;
  }, [vendors]);

  // Aggregate in memory
  const customers = useMemo(() => {
    if (!hasLoaded) return [];
    const map = {};
    invoices.forEach((inv) => {
      const mobile = inv.customer_mobile || 'Unknown';
      const invDate = inv.invoice_date || inv.created_at;

      if (!map[mobile]) {
        map[mobile] = {
          id: `cust_${mobile}`,
          name: inv.customer_name || 'Unknown',
          mobile,
          address: inv.customer_address || '—',
          totalInvoices: 0,
          totalSpent: 0,
          lastDate: invDate || '',
          vendorIds: new Set(),
        };
      }

      map[mobile].totalInvoices += 1;
      map[mobile].totalSpent += Number(inv.grand_total) || 0;

      if (invDate && (!map[mobile].lastDate || new Date(invDate) > new Date(map[mobile].lastDate))) {
        map[mobile].lastDate = invDate;
      }

      if (inv.vendor_id) {
        map[mobile].vendorIds.add(String(inv.vendor_id));
      } else if (inv.vendor_name) {
        const resolvedId = vendorNameToId[inv.vendor_name.trim().toLowerCase()];
        if (resolvedId) map[mobile].vendorIds.add(String(resolvedId));
      }
    });
    return Object.values(map);
  }, [invoices, vendorNameToId, hasLoaded]);

  const handleHeaderSort = (key) => {
    const opt = SORT_OPTIONS.find((o) => o.key === key);
    const newDir = applied.sortKey === key
      ? (applied.sortDir === 'asc' ? 'desc' : 'asc')
      : opt.defaultDir;
    const next = { ...applied, sortKey: key, sortDir: newDir };
    setApplied(next);
    setDraft(next);
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!hasLoaded) return [];
    const q = search.toLowerCase();
    const minI = parseInt(applied.minInvoices, 10) || 0;
    const minS = parseFloat(applied.minSpent) || 0;
    const start = applied.startDate ? new Date(applied.startDate).setHours(0, 0, 0, 0) : null;
    const end = applied.endDate ? new Date(applied.endDate).setHours(23, 59, 59, 999) : null;

    return customers
      .filter((c) => {
        const matchesSearch = c.name?.toLowerCase().includes(q) || c.mobile?.includes(search);
        const matchesCount = c.totalInvoices >= minI;
        const matchesSpent = c.totalSpent >= minS;
        const matchesVendor = !applied.vendorFilter || c.vendorIds.has(String(applied.vendorFilter));

        let matchesDate = true;
        if (start || end) {
          const cDate = c.lastDate ? new Date(c.lastDate).getTime() : 0;
          if (start && cDate < start) matchesDate = false;
          if (end && cDate > end) matchesDate = false;
        }

        return matchesSearch && matchesCount && matchesSpent && matchesVendor && matchesDate;
      })
      .sort((a, b) => {
        const mul = applied.sortDir === 'asc' ? 1 : -1;
        if (applied.sortKey === 'name') return mul * a.name.localeCompare(b.name);
        if (applied.sortKey === 'lastDate') {
          return mul * (new Date(a.lastDate || 0).getTime() - new Date(b.lastDate || 0).getTime());
        }
        return mul * (a[applied.sortKey] - b[applied.sortKey]);
      });
  }, [customers, search, applied, hasLoaded]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginatedList = useMemo(() => {
    const startIdx = (page - 1) * perPage;
    return filtered.slice(startIdx, startIdx + perPage);
  }, [filtered, page, perPage]);

  const applyFilters = () => {
    setApplied({ ...draft });
    setShowFilters(false);
    setPage(1);
  };

  const clearFilters = () => {
    const reset = { ...EMPTY_DRAFT };
    setDraft(reset);
    setApplied(reset);
    setSearch('');
    setPage(1);
  };

  const activeFilters =
    (applied.minInvoices ? 1 : 0) +
    (applied.minSpent ? 1 : 0) +
    (applied.vendorFilter ? 1 : 0) +
    (applied.startDate ? 1 : 0) +
    (applied.endDate ? 1 : 0) +
    (applied.sortKey !== 'totalSpent' || applied.sortDir !== 'desc' ? 1 : 0);

  const downloadCSV = () => {
    const header = ['Customer Name', 'Mobile', 'Address', 'Last Active Date', 'Total Invoices', 'Total Spent (₹)', 'Vendors'];
    const rows = filtered.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.mobile,
      `"${c.address.replace(/"/g, '""')}"`,
      c.lastDate ? format(new Date(c.lastDate), 'yyyy-MM-dd') : '—',
      c.totalInvoices,
      c.totalSpent.toFixed(2),
      `"${[...c.vendorIds].map((vid) => vendorLabel[vid] || vid).join('; ')}"`,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Customer list exported to CSV");
  };

  return (
    <div className="space-y-2 max-w-5xl mx-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <div>
          <h1 className="text-xs font-bold tracking-tight text-foreground">Customers Directory</h1>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasLoaded && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 w-7 p-0 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                title="Sync database"
              >
                <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCSV} className="h-7 px-2 text-[13px] font-semibold gap-1 rounded shadow-none">
                <Download className="w-3 h-3 text-[#004C8F]" />
                <span>CSV</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Unloaded State */}
      {!hasLoaded ? (
        <Card className="rounded-md border-dashed border-border/80 bg-card/40 shadow-none">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Users className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[13px] font-bold text-foreground">Customer Database</p>
              <p className="text-[12px] text-muted-foreground max-w-xs mx-auto">
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-3 text-[12px] font-semibold rounded shadow-none mt-1 bg-[#004C8F] text-white"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Customer Directory</span>
            </Button>
          </CardContent>
        </Card>
      ) : isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#004C8F]" />
          <p className="text-xs text-muted-foreground font-medium">Aggregating records...</p>
        </div>
      ) : (
        <>
          {/* Search + Filter Bar */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                placeholder="Search name or mobile..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-border bg-background pl-8 pr-7 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[#004C8F] transition-colors"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setDraft({ ...applied });
                setShowFilters((v) => !v);
              }}
              className="h-7 px-2 text-xs gap-1 shrink-0 rounded shadow-none"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#004C8F]" />
              <span>Filter</span>
              {activeFilters > 0 && (
                <span className="bg-[#004C8F] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center -mr-0.5">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card className="rounded-md border-border/80 shadow-2xs bg-muted/40">
              <CardContent className="p-2.5 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min. Invoices</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 2"
                      value={draft.minInvoices}
                      onChange={(e) => setDraft((d) => ({ ...d, minInvoices: e.target.value }))}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-[#004C8F]"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min. Spent (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 10000"
                      value={draft.minSpent}
                      onChange={(e) => setDraft((d) => ({ ...d, minSpent: e.target.value }))}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-[#004C8F]"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date From</label>
                    <input
                      type="date"
                      value={draft.startDate}
                      onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-[#004C8F]"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date To</label>
                    <input
                      type="date"
                      value={draft.endDate}
                      onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-[#004C8F]"
                    />
                  </div>

                  <div className="space-y-0.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendor</label>
                    <select
                      value={draft.vendorFilter}
                      onChange={(e) => setDraft((d) => ({ ...d, vendorFilter: e.target.value }))}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-[#004C8F] truncate"
                    >
                      <option value="">All</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{vendorLabel[v.id] || v.id}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sort Options */}
                <div className="space-y-0.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort By</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                    {SORT_OPTIONS.map((opt) => {
                      const isActive = draft.sortKey === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setDraft((d) => ({
                            ...d,
                            sortKey: opt.key,
                            sortDir: isActive ? (d.sortDir === 'asc' ? 'desc' : 'asc') : opt.defaultDir,
                          }))}
                          className={`py-1 px-1.5 rounded text-xs font-semibold border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[#004C8F] text-white border-[#004C8F]'
                              : 'bg-background text-muted-foreground border-border hover:text-foreground'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <SortIcon active dir={draft.sortDir} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors underline cursor-pointer"
                  >
                    Clear all
                  </button>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)} className="h-6 px-2 text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={applyFilters} className="h-6 px-2.5 text-xs font-semibold shadow-none bg-[#004C8F] text-white">
                      Apply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border border-border/80 bg-card overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase border-b border-border/60 font-bold">
                <tr>
                  <th className="px-3 py-1.5 font-sans">
                    <button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => handleHeaderSort('name')}>
                      Customer <SortIcon active={applied.sortKey === 'name'} dir={applied.sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-1.5">Mobile</th>
                  <th className="px-3 py-1.5">
                    <button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => handleHeaderSort('lastDate')}>
                      Last Date <SortIcon active={applied.sortKey === 'lastDate'} dir={applied.sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-1.5 text-center font-sans">
                    <button className="flex items-center gap-1 mx-auto hover:text-foreground cursor-pointer" onClick={() => handleHeaderSort('totalInvoices')}>
                      Bills <SortIcon active={applied.sortKey === 'totalInvoices'} dir={applied.sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-1.5 text-right font-sans">
                    <button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => handleHeaderSort('totalSpent')}>
                      Total <SortIcon active={applied.sortKey === 'totalSpent'} dir={applied.sortDir} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground text-xs space-y-2">
                      <p>No matching customers found.</p>
                      <button onClick={clearFilters} className="text-[#004C8F] underline text-xs font-medium cursor-pointer">
                        Reset search and filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((c) => {
                    const dateObj = c.lastDate ? new Date(c.lastDate) : null;
                    const formattedDate = dateObj && isValid(dateObj) ? format(dateObj, 'dd/MM/yy') : '—';

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => navigate(`/customer/${c.mobile}`)}
                        className="hover:bg-accent/40 transition-colors leading-tight cursor-pointer"
                      >
                        <td className="px-3 py-1.5 font-bold text-foreground font-sans">
                          <div className="truncate max-w-[170px]">{c.name}</div>
                          {c.vendorIds.size > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {[...c.vendorIds].map((vid) => (
                                <span key={vid} className="text-[9px] bg-secondary text-secondary-foreground rounded px-1 leading-none py-0.5 font-mono">
                                  {vendorLabel[vid] || vid}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{c.mobile}</td>
                        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-3 py-1.5 text-center font-bold font-sans">{c.totalInvoices}</td>
                        <td className="px-3 py-1.5 text-right font-black text-foreground font-sans">
                          ₹{c.totalSpent.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-2 md:hidden">
            {paginatedList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs space-y-2 bg-card rounded-md border border-border/80">
                <p>No matching customers found.</p>
                <button onClick={clearFilters} className="text-[#004C8F] underline text-xs font-medium">
                  Reset search and filters
                </button>
              </div>
            ) : (
              paginatedList.map((c) => {
                const dateObj = c.lastDate ? new Date(c.lastDate) : null;
                const formattedDate = dateObj && isValid(dateObj) ? format(dateObj, 'dd/MM/yy') : '—';

                return (
                  <Card 
                    key={c.id} 
                    onClick={() => navigate(`/customer/${c.mobile}`)}
                    className="rounded-md border-border/80 shadow-2xs hover:border-primary/50 transition-colors cursor-pointer bg-card"
                  >
                    <CardContent className="p-2.5 space-y-1.5 leading-tight">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] text-foreground truncate">{c.name}</p>
                          <p className="text-[12px] text-muted-foreground font-mono mt-0.5">{c.mobile}</p>
                        </div>
                        <span className="text-xs font-black text-[#004C8F] font-mono shrink-0">
                          ₹{c.totalSpent.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-[12px]">
                        <div className="flex items-center gap-1 text-muted-foreground font-mono">
                          <Calendar className="w-3 h-3" /> {formattedDate}
                        </div>
                        <span className="font-bold text-muted-foreground font-sans">
                          {c.totalInvoices} bill{c.totalInvoices !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Compact Pagination Bar */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-1 py-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-6 rounded border border-border bg-card px-1 text-[11px] outline-none focus:border-[#004C8F] font-medium"
                >
                  {PER_PAGE_OPTIONS.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
                <span className="text-[11px] hidden sm:inline">
                  ({Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length})
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] mr-1">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-6 w-6 p-0 rounded"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-6 w-6 p-0 rounded"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}