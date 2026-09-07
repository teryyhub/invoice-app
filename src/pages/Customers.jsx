import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
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
    queryKey: ['customers-derived'],
    queryFn: () => Invoice.list(1000),
    enabled: hasLoaded,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    data: vendors = [],
    isLoading: loadingVendors,
    isFetching: fetchingVendors,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => VendorProfile.list(100),
    enabled: hasLoaded,
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
  };

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="leading-tight">
          <h1 className="text-base font-bold text-foreground">Customers</h1>
          <p className="text-[10px] text-muted-foreground">
            {hasLoaded ? `${filtered.length} of ${customers.length} total records` : 'On-demand directory view'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {hasLoaded ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 px-2 text-[11px] gap-1 rounded-md"
                title="Refresh customer database"
              >
                <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync</span>
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCSV} className="h-7 px-2 text-[11px] gap-1 rounded-md">
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-3 text-xs gap-1.5 font-semibold rounded-md shadow-xs"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Data</span>
            </Button>
          )}
        </div>
      </div>

      {/* Unloaded State */}
      {!hasLoaded ? (
        <Card className="rounded-xl border-dashed border-border/80 bg-card/50 shadow-none">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Customer Database Ready</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-normal">
                Data fetching is paused to conserve bandwidth and system memory. Click below to load customer metrics.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-8 px-4 text-xs font-semibold gap-1.5 rounded-lg shadow-xs mt-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Customer Directory</span>
            </Button>
          </CardContent>
        </Card>
      ) : isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-14 space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Aggregating records...</p>
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
                className="w-full rounded-md border border-border bg-card pl-8 pr-7 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
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
              className="h-7 px-2 text-[11px] gap-1 shrink-0 rounded-md"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Filter</span>
              {activeFilters > 0 && (
                <span className="bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center -mr-0.5">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card className="rounded-lg border-border/80 shadow-none bg-muted/20">
              <CardContent className="p-2.5 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Min. Invoices</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 2"
                      value={draft.minInvoices}
                      onChange={(e) => setDraft((d) => ({ ...d, minInvoices: e.target.value }))}
                      className="w-full rounded border border-border bg-card px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Min. Spent (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 10000"
                      value={draft.minSpent}
                      onChange={(e) => setDraft((d) => ({ ...d, minSpent: e.target.value }))}
                      className="w-full rounded border border-border bg-card px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Date From</label>
                    <input
                      type="date"
                      value={draft.startDate}
                      onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                      className="w-full rounded border border-border bg-card px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Date To</label>
                    <input
                      type="date"
                      value={draft.endDate}
                      onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                      className="w-full rounded border border-border bg-card px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-0.5 col-span-2 sm:col-span-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Vendor</label>
                    <select
                      value={draft.vendorFilter}
                      onChange={(e) => setDraft((d) => ({ ...d, vendorFilter: e.target.value }))}
                      className="w-full rounded border border-border bg-card px-2 py-1 text-xs outline-none focus:border-primary truncate"
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
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sort By</label>
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
                          className={`py-1 px-1.5 rounded text-[10px] font-semibold border flex items-center justify-center gap-1 transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-muted-foreground border-border hover:text-foreground'
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
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors underline"
                  >
                    Clear all
                  </button>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)} className="h-6 px-2 text-[10px]">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={applyFilters} className="h-6 px-2.5 text-[10px] font-semibold shadow-none">
                      Apply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden shadow-none">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                <tr>
                  <th className="px-3 py-1.5">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleHeaderSort('name')}>
                      Customer <SortIcon active={applied.sortKey === 'name'} dir={applied.sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-1.5">Mobile</th>
                  <th className="px-3 py-1.5">Address</th>
                  <th className="px-3 py-1.5">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleHeaderSort('lastDate')}>
                      Last Date <SortIcon active={applied.sortKey === 'lastDate'} dir={applied.sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-1.5 text-center">
                    <button className="flex items-center gap-1 mx-auto hover:text-foreground" onClick={() => handleHeaderSort('totalInvoices')}>
                      Bills <SortIcon active={applied.sortKey === 'totalInvoices'} dir={applied.sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-1.5 text-right">
                    <button className="flex items-center gap-1 ml-auto hover:text-foreground" onClick={() => handleHeaderSort('totalSpent')}>
                      Total <SortIcon active={applied.sortKey === 'totalSpent'} dir={applied.sortDir} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                      No matching customers.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((c) => {
                    const dateObj = c.lastDate ? new Date(c.lastDate) : null;
                    const formattedDate = dateObj && isValid(dateObj) ? format(dateObj, 'dd/MM/yy') : '—';

                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors leading-tight">
                        <td className="px-3 py-1.5 font-semibold text-foreground">
                          <div className="truncate max-w-[170px]">{c.name}</div>
                          {c.vendorIds.size > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {[...c.vendorIds].map((vid) => (
                                <span key={vid} className="text-[8px] bg-muted text-muted-foreground rounded px-1 leading-none py-0.5">
                                  {vendorLabel[vid] || vid}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{c.mobile}</td>
                        <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[180px] text-[11px]">{c.address}</td>
                        <td className="px-3 py-1.5 text-muted-foreground font-mono text-[10px] whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-3 py-1.5 text-center font-bold">{c.totalInvoices}</td>
                        <td className="px-3 py-1.5 text-right font-black text-foreground">
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
          <div className="grid grid-cols-1 gap-1.5 md:hidden">
            {paginatedList.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-xs">No matching customers.</p>
            ) : (
              paginatedList.map((c) => {
                const dateObj = c.lastDate ? new Date(c.lastDate) : null;
                const formattedDate = dateObj && isValid(dateObj) ? format(dateObj, 'dd/MM/yy') : '—';

                return (
                  <Card key={c.id} className="rounded-lg border-border/80 shadow-none">
                    <CardContent className="p-2.5 space-y-1.5 leading-tight">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{c.mobile}</p>
                        </div>
                        <span className="text-xs font-black text-primary shrink-0">
                          ₹{c.totalSpent.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <p className="text-[10px] text-muted-foreground truncate">{c.address}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" /> {formattedDate}
                          </span>
                        </div>
                        <span className="font-bold text-muted-foreground">
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
                <span className="text-[10px]">Rows:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-6 rounded border border-border bg-card px-1 text-[10px] outline-none focus:border-primary font-medium"
                >
                  {PER_PAGE_OPTIONS.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
                <span className="text-[10px] hidden sm:inline">
                  ({Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length})
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] mr-1">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-6 w-6 p-0 rounded-md"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-6 w-6 p-0 rounded-md"
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