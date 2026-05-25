import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const SORT_OPTIONS = [
  { key: 'totalSpent',    label: 'Total Value',     defaultDir: 'desc' },
  { key: 'totalInvoices', label: 'No. of Invoices', defaultDir: 'desc' },
  { key: 'name',          label: 'Name (A–Z)',       defaultDir: 'asc'  },
];

function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return dir === 'asc'
    ? <ArrowUp   className="w-3.5 h-3.5" />
    : <ArrowDown className="w-3.5 h-3.5" />;
}

const EMPTY_DRAFT = { minInvoices: '', minSpent: '', vendorFilter: '', sortKey: 'totalSpent', sortDir: 'desc' };

export default function Customers() {
  const [search,      setSearch]      = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Draft — what the user is editing inside the filter panel
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });

  // Applied — what actually drives the filtered list (only updated on Apply)
  const [applied, setApplied] = useState({ ...EMPTY_DRAFT });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['customers-derived'],
    queryFn: () => Invoice.list(1000),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => VendorProfile.list(100),
  });

  const vendorLabel = useMemo(() => {
    const map = {};
    vendors.forEach(v => {
      const isCdap = /^CDAP\d+$/i.test((v.vendor_name || '').trim());
      map[v.id] = isCdap ? (v.address || v.vendor_name) : v.vendor_name;
    });
    return map;
  }, [vendors]);

  const vendorNameToId = useMemo(() => {
    const map = {};
    vendors.forEach(v => {
      if (v.vendor_name) map[v.vendor_name.trim().toLowerCase()] = v.id;
      if (v.address)     map[v.address.trim().toLowerCase()]     = v.id;
    });
    return map;
  }, [vendors]);

  const customers = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      const mobile = inv.customer_mobile || 'Unknown';
      if (!map[mobile]) {
        map[mobile] = {
          id: `cust_${mobile}`,
          name: inv.customer_name || 'Unknown Customer',
          mobile,
          address: inv.customer_address || 'Not provided',
          totalInvoices: 0,
          totalSpent: 0,
          vendorIds: new Set(),
        };
      }
      map[mobile].totalInvoices += 1;
      map[mobile].totalSpent   += inv.grand_total || 0;
      if (inv.vendor_id) {
        map[mobile].vendorIds.add(String(inv.vendor_id));
      } else if (inv.vendor_name) {
        const resolvedId = vendorNameToId[inv.vendor_name.trim().toLowerCase()];
        if (resolvedId) map[mobile].vendorIds.add(String(resolvedId));
      }
    });
    return Object.values(map);
  }, [invoices, vendorNameToId]);

  // Table-header sort clicks apply immediately (outside filter panel)
  const handleHeaderSort = (key) => {
    const opt = SORT_OPTIONS.find(o => o.key === key);
    const newDir = applied.sortKey === key
      ? (applied.sortDir === 'asc' ? 'desc' : 'asc')
      : opt.defaultDir;
    const next = { ...applied, sortKey: key, sortDir: newDir };
    setApplied(next);
    setDraft(next);
  };

  const filtered = useMemo(() => {
    const q    = search.toLowerCase();
    const minI = parseInt(applied.minInvoices)  || 0;
    const minS = parseFloat(applied.minSpent)   || 0;

    return customers
      .filter(c =>
        (c.name?.toLowerCase().includes(q) || c.mobile?.includes(search)) &&
        c.totalInvoices >= minI &&
        c.totalSpent    >= minS &&
        (!applied.vendorFilter || c.vendorIds.has(String(applied.vendorFilter)))
      )
      .sort((a, b) => {
        const mul = applied.sortDir === 'asc' ? 1 : -1;
        if (applied.sortKey === 'name') return mul * a.name.localeCompare(b.name);
        return mul * (a[applied.sortKey] - b[applied.sortKey]);
      });
  }, [customers, search, applied]);

  const applyFilters = () => {
    setApplied({ ...draft });
    setShowFilters(false);
  };

  const clearFilters = () => {
    const reset = { ...EMPTY_DRAFT };
    setDraft(reset);
    setApplied(reset);
  };

  const activeFilters =
    (applied.minInvoices ? 1 : 0) +
    (applied.minSpent    ? 1 : 0) +
    (applied.vendorFilter ? 1 : 0) +
    (applied.sortKey !== 'totalSpent' || applied.sortDir !== 'desc' ? 1 : 0);

  const downloadCSV = () => {
    const header = ['Customer Name', 'Mobile', 'Address', 'Total Invoices', 'Total Spent (₹)', 'Vendors'];
    const rows   = filtered.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.mobile,
      `"${c.address.replace(/"/g, '""')}"`,
      c.totalInvoices,
      c.totalSpent.toFixed(2),
      `"${[...c.vendorIds].map(vid => vendorLabel[vid] || vid).join('; ')}"`,
    ]);
    const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-2 shrink-0">
          <Download className="w-4 h-4" />Download CSV
        </Button>
      </div>

      {/* Search + filter toggle */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => { setDraft({ ...applied }); setShowFilters(v => !v); }}
          className="gap-2 shrink-0"
        >
          Filter
          {activeFilters > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Min invoices */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Min. Invoices
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 2"
                  value={draft.minInvoices}
                  onChange={e => setDraft(d => ({ ...d, minInvoices: e.target.value }))}
                />
              </div>

              {/* Min spent */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Min. Total Spent (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 10000"
                  value={draft.minSpent}
                  onChange={e => setDraft(d => ({ ...d, minSpent: e.target.value }))}
                />
              </div>

              {/* Vendor */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Vendor
                </label>
                <select
                  value={draft.vendorFilter}
                  onChange={e => setDraft(d => ({ ...d, vendorFilter: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {vendorLabel[v.id] || v.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort by */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sort By
                </label>
                <div className="flex flex-col gap-1">
                  {SORT_OPTIONS.map(opt => {
                    const isActive = draft.sortKey === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setDraft(d => ({
                          ...d,
                          sortKey: opt.key,
                          sortDir: isActive
                            ? (d.sortDir === 'asc' ? 'desc' : 'asc')
                            : opt.defaultDir,
                        }))}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center justify-between gap-2
                          ${isActive
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:bg-accent'}`}
                      >
                        {opt.label}
                        <SortIcon active={isActive} dir={draft.sortDir} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
              >
                Clear all
              </button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFilters(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleHeaderSort('name')}>
                      Customer Name <SortIcon active={applied.sortKey === 'name'} dir={applied.sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium text-center">
                    <button className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors" onClick={() => handleHeaderSort('totalInvoices')}>
                      Invoices <SortIcon active={applied.sortKey === 'totalInvoices'} dir={applied.sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    <button className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors" onClick={() => handleHeaderSort('totalSpent')}>
                      Total Value <SortIcon active={applied.sortKey === 'totalSpent'} dir={applied.sortDir} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      No customers match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div>{c.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[...c.vendorIds].map(vid => (
                            <span key={vid} className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                              {vendorLabel[vid] || vid}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">{c.mobile}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.address}</td>
                      <td className="px-4 py-3 text-center">{c.totalInvoices}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ₹{c.totalSpent.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No customers match your filters.</p>
        ) : (
          filtered.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-base leading-tight">{c.name}</p>
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 whitespace-nowrap">
                    {c.totalInvoices} invoice{c.totalInvoices !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{c.mobile}</p>
                <p className="text-xs text-muted-foreground leading-snug">{c.address}</p>
                {c.vendorIds.size > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {[...c.vendorIds].map(vid => (
                      <span key={vid} className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                        {vendorLabel[vid] || vid}
                      </span>
                    ))}
                  </div>
                )}
                <div className="pt-1 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total spent</span>
                  <span className="font-bold text-primary">
                    ₹{c.totalSpent.toLocaleString('en-IN')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}