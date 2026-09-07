import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
  Tag,
  FileText,
  RotateCw,
  Database,
  Calendar,
  X,
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function RankedTable({ title, icon: Icon, rows, totalSales }) {
  const max = rows[0]?.revenue || 1;

  return (
    <Card className="rounded-lg border-border/80 shadow-none bg-card overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-muted/20">
        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-bold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{rows.length} total</span>
      </div>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-[11px] text-muted-foreground p-4 text-center">No records found</p>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((r, i) => {
              const pct = totalSales > 0 ? ((r.revenue / totalSales) * 100).toFixed(1) : 0;
              return (
                <div key={i} className="px-3 py-1.5 space-y-1 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between text-xs leading-tight">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">
                        #{i + 1}
                      </span>
                      <span className="font-semibold text-foreground truncate">{r.name || '—'}</span>
                    </div>
                    <div className="text-right shrink-0 leading-none">
                      <span className="font-bold text-foreground">
                        ₹{r.revenue.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        {r.count} bill{r.count !== 1 ? 's' : ''} ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((r.revenue / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { user } = useAuth();

  const [hasLoaded, setHasLoaded] = useState(false);
  const [dateMode, setDateMode] = useState('monthly'); // 'monthly' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    isFetching: fetchingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['reports-invoices', user?.id],
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
    queryKey: ['reports-vendors', user?.id],
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
    if (Array.isArray(vendors)) {
      vendors.forEach((v) => {
        m[v.id] = v.vendor_name;
      });
    }
    return m;
  }, [vendors]);

  // Combined Date Filter (Monthly or Custom Range)
  const filtered = useMemo(() => {
    if (!hasLoaded || !Array.isArray(invoices)) return [];

    const startBoundary = customStart ? new Date(customStart).setHours(0, 0, 0, 0) : null;
    const endBoundary = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : null;

    return invoices.filter((inv) => {
      const raw = inv.invoice_date || inv.created_date || inv.created_at;
      if (!raw) return false;
      const d = new Date(raw);
      if (!isValid(d)) return false;

      if (dateMode === 'monthly') {
        return (
          String(d.getMonth()) === selectedMonth &&
          String(d.getFullYear()) === selectedYear
        );
      }

      // Custom Range mode
      const t = d.getTime();
      if (startBoundary && t < startBoundary) return false;
      if (endBoundary && t > endBoundary) return false;
      return true;
    });
  }, [invoices, dateMode, selectedMonth, selectedYear, customStart, customEnd, hasLoaded]);

  const totalSales = filtered.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const totalCount = filtered.length;
  const avgValue = totalCount > 0 ? Math.round(totalSales / totalCount) : 0;

  const vendorStats = useMemo(() => {
    const map = {};
    filtered.forEach((inv) => {
      const name = vendorMap[inv.vendor_id] || inv.vendor_name || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += Number(inv.grand_total) || 0;
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, vendorMap]);

  const brandStats = useMemo(() => {
    const map = {};
    filtered.forEach((inv) => {
      const name = inv.product_description || inv.brand_name || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += Number(inv.grand_total) || 0;
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const productStats = useMemo(() => {
    const map = {};
    filtered.forEach((inv) => {
      const name = inv.product_model || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += Number(inv.grand_total) || 0;
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const reportLabel = useMemo(() => {
    if (dateMode === 'monthly') {
      return `${MONTHS[parseInt(selectedMonth, 10)]} ${selectedYear}`;
    }
    if (customStart && customEnd) {
      return `${format(new Date(customStart), 'dd MMM yyyy')} to ${format(new Date(customEnd), 'dd MMM yyyy')}`;
    }
    if (customStart) {
      return `From ${format(new Date(customStart), 'dd MMM yyyy')}`;
    }
    if (customEnd) {
      return `Until ${format(new Date(customEnd), 'dd MMM yyyy')}`;
    }
    return 'All-Time Records';
  }, [dateMode, selectedMonth, selectedYear, customStart, customEnd]);

  const handleExportXLSX = () => {
    if (filtered.length === 0) {
      toast.error('No records to export');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Overview
    const overviewData = [
      [`SALES REPORT: ${reportLabel}`],
      [`Generated on: ${new Date().toLocaleString('en-IN')}`],
      [],
      ['Metric', 'Value'],
      ['Total Invoices', totalCount],
      ['Total Revenue (₹)', totalSales],
      ['Average Invoice Value (₹)', avgValue],
      ['Brands Active', brandStats.length],
      ['Vendors Active', vendorStats.length],
      [],
      ['TOP VENDORS'],
      ['#', 'Vendor', 'Invoices', 'Revenue (₹)', 'Share (%)'],
      ...vendorStats.slice(0, 8).map((v, i) => [
        i + 1,
        v.name,
        v.count,
        v.revenue,
        totalSales > 0 ? +((v.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
      [],
      ['TOP BRANDS'],
      ['#', 'Brand', 'Units Sold', 'Revenue (₹)', 'Share (%)'],
      ...brandStats.slice(0, 8).map((b, i) => [
        i + 1,
        b.name,
        b.count,
        b.revenue,
        totalSales > 0 ? +((b.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
    ws1['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Overview');

    // Sheet 2: By Vendor
    const vendorRows = [
      [`VENDOR-WISE REPORT: ${reportLabel}`],
      [],
      ['#', 'Vendor', 'Invoices', 'Revenue (₹)', 'Avg Invoice (₹)', 'Share (%)'],
      ...vendorStats.map((v, i) => [
        i + 1,
        v.name,
        v.count,
        v.revenue,
        Math.round(v.revenue / v.count),
        totalSales > 0 ? +((v.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
      [],
      ['', 'TOTAL', totalCount, totalSales, avgValue, 100],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(vendorRows);
    ws2['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'By Vendor');

    // Sheet 3: By Brand
    const brandRows = [
      [`BRAND-WISE REPORT: ${reportLabel}`],
      [],
      ['#', 'Brand', 'Units Sold', 'Revenue (₹)', 'Avg Price (₹)', 'Share (%)'],
      ...brandStats.map((b, i) => [
        i + 1,
        b.name,
        b.count,
        b.revenue,
        Math.round(b.revenue / b.count),
        totalSales > 0 ? +((b.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
      [],
      ['', 'TOTAL', totalCount, totalSales, avgValue, 100],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(brandRows);
    ws3['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'By Brand');

    // Sheet 4: Top Products
    const productRows = [
      [`TOP PRODUCTS: ${reportLabel}`],
      [],
      ['#', 'Product', 'Units Sold', 'Revenue (₹)'],
      ...productStats.map((p, i) => [i + 1, p.name, p.count, p.revenue]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(productRows);
    ws4['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Top Products');

    // Sheet 5: Detailed Invoices
    const detailRows = [
      [`DETAILED INVOICE LIST: ${reportLabel}`],
      [],
      [
        'Invoice No', 'Date', 'App ID', 'Customer', 'Mobile',
        'Asset', 'Brand', 'IMEI', 'Scheme', 'Total (₹)',
      ],
      ...filtered.map((inv) => [
        inv.invoice_number || '',
        inv.invoice_date || '',
        inv.delivery_order_number || '',
        inv.customer_name || '',
        inv.customer_mobile || '',
        inv.product_model || '',
        inv.product_description || '',
        inv.imei_serial || '',
        inv.mode || '',
        inv.grand_total || 0,
      ]),
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(detailRows);
    ws5['!cols'] = [
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws5, 'Detail');

    XLSX.writeFile(wb, `Report_${reportLabel.replace(/[\s–—]+/g, '_')}.xlsx`);
    toast.success(`Exported ${totalCount} records (5 sheets)`);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'vendor', label: 'By Vendor' },
    { id: 'brand', label: 'By Brand' },
    { id: 'detail', label: 'Detail' },
  ];

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="leading-tight">
          <h1 className="text-base font-bold text-foreground">Reports</h1>
          <p className="text-[10px] text-muted-foreground">
            {hasLoaded ? `Sales & GST metrics (${reportLabel})` : 'On-demand analytics reports'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!hasLoaded ? (
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-3 text-xs gap-1.5 font-semibold rounded-md shadow-xs"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Reports</span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Sync analytics data"
              >
                <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportXLSX}
                className="h-7 px-2 text-[11px] gap-1 rounded-md"
              >
                <Download className="w-3 h-3" />
                <span>Excel (.xlsx)</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Date Filter Strip with Custom Range Toggle */}
      <div className="flex flex-wrap items-center gap-1.5 bg-card border border-border/80 p-1 rounded-lg">
        {/* Mode Selector */}
        <div className="flex bg-muted/40 p-0.5 rounded-md border border-border/60">
          <button
            type="button"
            onClick={() => {
              setDateMode('monthly');
              setCurrentPage(1);
            }}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
              dateMode === 'monthly'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => {
              setDateMode('custom');
              setCurrentPage(1);
            }}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
              dateMode === 'custom'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Monthly Selectors */}
        {dateMode === 'monthly' ? (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="h-6 rounded border border-border bg-background px-2 text-[11px] font-medium text-foreground outline-none focus:border-primary"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={String(i)}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="h-6 rounded border border-border bg-background px-2 text-[11px] font-medium text-foreground outline-none focus:border-primary"
            >
              {['2023', '2024', '2025', '2026', '2027'].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          /* Custom Date Inputs */
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground">From</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-6 rounded border border-border bg-background px-1.5 text-[10px] text-foreground outline-none focus:border-primary w-[110px]"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground">To</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-6 rounded border border-border bg-background px-1.5 text-[10px] text-foreground outline-none focus:border-primary w-[110px]"
              />
            </div>
            {(customStart || customEnd) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                  setCurrentPage(1);
                }}
                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-0.5"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Unloaded State */}
      {!hasLoaded ? (
        <Card className="rounded-xl border-dashed border-border/80 bg-card shadow-none">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Sales Analytics Ready</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-normal">
                Click below to calculate revenue, vendor shares, and brand stats for {reportLabel}.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-3 text-xs font-semibold gap-1.5 rounded-lg shadow-xs mt-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Analytics Data</span>
            </Button>
          </CardContent>
        </Card>
      ) : isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-14 space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Aggregating {reportLabel} records...</p>
        </div>
      ) : (
        <>
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Card className="rounded-lg border-border/80 shadow-none bg-card">
              <CardContent className="p-2 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Invoices
                </span>
                <p className="text-sm font-black text-foreground mt-1">{totalCount}</p>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Total count</span>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border/80 shadow-none bg-card">
              <CardContent className="p-2 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Revenue
                </span>
                <p className="text-sm font-black text-foreground truncate mt-1">
                  ₹{totalSales.toLocaleString('en-IN')}
                </p>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  Gross billed
                </span>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border/80 shadow-none bg-card">
              <CardContent className="p-2 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Avg Bill
                </span>
                <p className="text-sm font-black text-foreground truncate mt-1">
                  {totalCount > 0 ? `₹${avgValue.toLocaleString('en-IN')}` : '—'}
                </p>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Per invoice</span>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border/80 shadow-none bg-card">
              <CardContent className="p-2 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Active
                </span>
                <p className="text-sm font-black text-foreground mt-1">{brandStats.length} Brands</p>
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  {vendorStats.length} vendor{vendorStats.length !== 1 ? 's' : ''}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Pill Bar */}
          <div className="flex border-b border-border gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <RankedTable
                title="Top Vendors"
                icon={Store}
                rows={vendorStats.slice(0, 8)}
                totalSales={totalSales}
              />
              <RankedTable
                title="Top Brands"
                icon={Tag}
                rows={brandStats.slice(0, 8)}
                totalSales={totalSales}
              />

              {/* Product Leaderboard */}
              <Card className="rounded-lg border-border/80 shadow-none bg-card md:col-span-2 overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-muted/20">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-bold text-foreground">Top Product Models</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {productStats.length} models
                  </span>
                </div>
                <CardContent className="p-0">
                  {productStats.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground p-4 text-center">
                      No product sales for {reportLabel}
                    </p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {productStats.slice(0, 8).map((r, i) => {
                        const maxCount = productStats[0]?.count || 1;
                        return (
                          <div
                            key={i}
                            className="px-3 py-1.5 space-y-1 hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs leading-tight">
                              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">
                                  #{i + 1}
                                </span>
                                <span className="font-semibold text-foreground truncate">
                                  {r.name}
                                </span>
                              </div>
                              <div className="text-right shrink-0 leading-none">
                                <span className="font-bold text-foreground">{r.count} sold</span>
                                <span className="text-[9px] text-muted-foreground block mt-0.5">
                                  ₹{r.revenue.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                            <div className="h-1 w-full bg-muted/60 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${Math.round((r.count / maxCount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* By Vendor Tab */}
          {activeTab === 'vendor' && (
            <Card className="rounded-lg border-border/80 shadow-none bg-card overflow-hidden">
              <CardContent className="p-0">
                {vendorStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-6 text-center">
                    No vendor transactions for {reportLabel}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                        <tr>
                          <th className="px-3 py-1.5 w-8">#</th>
                          <th className="px-3 py-1.5">Vendor</th>
                          <th className="px-3 py-1.5 text-center">Bills</th>
                          <th className="px-3 py-1.5 text-right">Revenue</th>
                          <th className="px-3 py-1.5 text-right">Avg Bill</th>
                          <th className="px-3 py-1.5 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {vendorStats.map((v, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                            <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="px-3 py-1.5 font-semibold text-foreground truncate max-w-[200px]">
                              {v.name}
                            </td>
                            <td className="px-3 py-1.5 text-center font-bold">{v.count}</td>
                            <td className="px-3 py-1.5 text-right font-black text-foreground">
                              ₹{v.revenue.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-1.5 text-right text-muted-foreground">
                              ₹{Math.round(v.revenue / v.count).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold text-primary">
                              {totalSales > 0 ? ((v.revenue / totalSales) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/60 font-bold border-t border-border text-[11px]">
                        <tr>
                          <td className="px-3 py-2" colSpan={2}>
                            Total
                          </td>
                          <td className="px-3 py-2 text-center">{totalCount}</td>
                          <td className="px-3 py-2 text-right font-black text-foreground">
                            ₹{totalSales.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right">₹{avgValue.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* By Brand Tab */}
          {activeTab === 'brand' && (
            <Card className="rounded-lg border-border/80 shadow-none bg-card overflow-hidden">
              <CardContent className="p-0">
                {brandStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-6 text-center">
                    No brand transactions for {reportLabel}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                        <tr>
                          <th className="px-3 py-1.5 w-8">#</th>
                          <th className="px-3 py-1.5">Brand / Category</th>
                          <th className="px-3 py-1.5 text-center">Units Sold</th>
                          <th className="px-3 py-1.5 text-right">Revenue</th>
                          <th className="px-3 py-1.5 text-right">Avg Unit</th>
                          <th className="px-3 py-1.5 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {brandStats.map((b, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                            <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="px-3 py-1.5 font-semibold text-foreground truncate max-w-[200px]">
                              {b.name}
                            </td>
                            <td className="px-3 py-1.5 text-center font-bold">{b.count}</td>
                            <td className="px-3 py-1.5 text-right font-black text-foreground">
                              ₹{b.revenue.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-1.5 text-right text-muted-foreground">
                              ₹{Math.round(b.revenue / b.count).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold text-primary">
                              {totalSales > 0 ? ((b.revenue / totalSales) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/60 font-bold border-t border-border text-[11px]">
                        <tr>
                          <td className="px-3 py-2" colSpan={2}>
                            Total
                          </td>
                          <td className="px-3 py-2 text-center">{totalCount}</td>
                          <td className="px-3 py-2 text-right font-black text-foreground">
                            ₹{totalSales.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right">₹{avgValue.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detail Tab */}
          {activeTab === 'detail' && (
            <Card className="rounded-lg border-border/80 shadow-none bg-card overflow-hidden">
              <CardContent className="p-0">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center space-y-1">
                    <BarChart2 className="w-6 h-6 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">No invoices found</p>
                    <p className="text-[10px] text-muted-foreground">
                      No invoices recorded for {reportLabel}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                          <tr>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">Inv No.</th>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">Date</th>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">App ID</th>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">Customer</th>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">Mobile</th>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">Asset</th>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">Brand</th>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">IMEI</th>
                            <th className="px-2.5 py-1.5 whitespace-nowrap">Mode</th>
                            <th className="px-2.5 py-1.5 text-right whitespace-nowrap">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {paginatedInvoices.map((inv, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                              <td className="px-2.5 py-1.5 font-bold text-foreground whitespace-nowrap">
                                {inv.invoice_number}
                              </td>
                              <td className="px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                {inv.invoice_date}
                              </td>
                              <td className="px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                {inv.delivery_order_number || '—'}
                              </td>
                              <td className="px-2.5 py-1.5 font-medium text-foreground truncate max-w-[140px]">
                                {inv.customer_name}
                              </td>
                              <td className="px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                {inv.customer_mobile || '—'}
                              </td>
                              <td className="px-2.5 py-1.5 text-foreground truncate max-w-[130px]">
                                {inv.product_model || '—'}
                              </td>
                              <td className="px-2.5 py-1.5 text-muted-foreground truncate max-w-[110px]">
                                {inv.product_description || '—'}
                              </td>
                              <td className="px-2.5 py-1.5 font-mono text-[10px] text-primary whitespace-nowrap">
                                {inv.imei_serial || '—'}
                              </td>
                              <td className="px-2.5 py-1.5 uppercase font-medium text-[10px] text-muted-foreground whitespace-nowrap">
                                {inv.mode}
                              </td>
                              <td className="px-2.5 py-1.5 text-right font-black text-foreground whitespace-nowrap">
                                ₹{(Number(inv.grand_total) || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Strip */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border/60 text-[10px] text-muted-foreground">
                      <span>
                        Showing {(currentPage - 1) * pageSize + 1}–
                        {Math.min(currentPage * pageSize, totalCount)} of {totalCount} bills
                      </span>
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
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}