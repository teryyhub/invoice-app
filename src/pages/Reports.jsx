import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, BarChart2, ChevronLeft, ChevronRight, Loader2,
  Store, Tag, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function StatCard({ title, value, sub }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl sm:text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function RankedTable({ title, icon: Icon, rows }) {
  const max = rows[0]?.revenue ?? 1;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">No data</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r, i) => (
              <div key={i} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                    <span className="text-sm font-medium truncate">{r.name || '—'}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-semibold">₹{r.revenue.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground">{r.count} invoice{r.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.round((r.revenue / max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear]   = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab]         = useState('overview');
  const [currentPage, setCurrentPage]     = useState(1);
  const pageSize = 15;

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['reports-invoices', user?.id],
    queryFn: () => Invoice.list(99999),
    enabled: !!user?.id,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['reports-vendors', user?.id],
    queryFn: () => VendorProfile.list(100),
    enabled: !!user?.id,
  });

  const vendorMap = useMemo(() => {
    const m = {};
    if (Array.isArray(vendors)) vendors.forEach(v => { m[v.id] = v.vendor_name; });
    return m;
  }, [vendors]);

  const filtered = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    return invoices.filter(inv => {
      const d = new Date(inv.invoice_date || inv.created_date);
      return String(d.getMonth()) === selectedMonth && String(d.getFullYear()) === selectedYear;
    });
  }, [invoices, selectedMonth, selectedYear]);

  const totalSales = filtered.reduce((s, inv) => s + (inv.grand_total || 0), 0);
  const totalCount = filtered.length;
  const avgValue   = totalCount > 0 ? Math.round(totalSales / totalCount) : 0;

  const vendorStats = useMemo(() => {
    const map = {};
    filtered.forEach(inv => {
      const name = vendorMap[inv.vendor_id] || inv.vendor_name || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += inv.grand_total || 0;
      map[name].count   += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, vendorMap]);

  const brandStats = useMemo(() => {
    const map = {};
    filtered.forEach(inv => {
      const name = inv.product_description || inv.brand_name || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += inv.grand_total || 0;
      map[name].count   += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const productStats = useMemo(() => {
    const map = {};
    filtered.forEach(inv => {
      const name = inv.product_model || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += inv.grand_total || 0;
      map[name].count   += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const totalPages        = Math.ceil(totalCount / pageSize);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const monthLabel = `${MONTHS[parseInt(selectedMonth)]} ${selectedYear}`;

  // ── Export as Excel with multiple sheets ──────────────────────────────
  const handleExportXLSX = () => {
    if (filtered.length === 0) { toast.error("No data to export."); return; }

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Overview ──
    const overviewData = [
      [`MONTHLY SALES REPORT: ${monthLabel}`],
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
        i + 1, v.name, v.count, v.revenue,
        totalSales > 0 ? +((v.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
      [],
      ['TOP BRANDS'],
      ['#', 'Brand', 'Units Sold', 'Revenue (₹)', 'Share (%)'],
      ...brandStats.slice(0, 8).map((b, i) => [
        i + 1, b.name, b.count, b.revenue,
        totalSales > 0 ? +((b.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
    ws1['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Overview');

    // ── Sheet 2: By Vendor ──
    const vendorRows = [
      [`VENDOR-WISE REPORT: ${monthLabel}`],
      [],
      ['#', 'Vendor', 'Invoices', 'Revenue (₹)', 'Avg Invoice (₹)', 'Share (%)'],
      ...vendorStats.map((v, i) => [
        i + 1, v.name, v.count, v.revenue,
        Math.round(v.revenue / v.count),
        totalSales > 0 ? +((v.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
      [],
      ['', 'TOTAL', totalCount, totalSales, avgValue, 100],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(vendorRows);
    ws2['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'By Vendor');

    // ── Sheet 3: By Brand ──
    const brandRows = [
      [`BRAND-WISE REPORT: ${monthLabel}`],
      [],
      ['#', 'Brand', 'Units Sold', 'Revenue (₹)', 'Avg Price (₹)', 'Share (%)'],
      ...brandStats.map((b, i) => [
        i + 1, b.name, b.count, b.revenue,
        Math.round(b.revenue / b.count),
        totalSales > 0 ? +((b.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
      [],
      ['', 'TOTAL', totalCount, totalSales, avgValue, 100],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(brandRows);
    ws3['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'By Brand');

    // ── Sheet 4: Top Products ──
    const productRows = [
      [`TOP PRODUCTS: ${monthLabel}`],
      [],
      ['#', 'Product', 'Units Sold', 'Revenue (₹)'],
      ...productStats.map((p, i) => [i + 1, p.name, p.count, p.revenue]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(productRows);
    ws4['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Top Products');

    // ── Sheet 5: Detailed Invoices ──
    const detailRows = [
      [`DETAILED INVOICE LIST: ${monthLabel}`],
      [],
      [
        'Invoice No', 'Date', 'App ID', 'Customer', 'Mobile',
        'Asset', 'Brand', 'IMEI', 'Scheme', 'Total (₹)',
      ],
      ...filtered.map(inv => [
        inv.invoice_number   || '',
        inv.invoice_date     || '',
        inv.delivery_order_number || '',
        inv.customer_name    || '',
        inv.customer_mobile  || '',
        inv.product_model    || '',
        inv.product_description || '',
        inv.imei_serial      || '',
        inv.mode             || '',
        inv.grand_total      || 0,
      ]),
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(detailRows);
    ws5['!cols'] = [
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws5, 'Detail');

    // Write and download
    XLSX.writeFile(wb, `Report_${monthLabel.replace(' ', '_')}.xlsx`);
    toast.success(`Excel report exported — 5 sheets, ${totalCount} invoices`);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'vendor',   label: 'By Vendor' },
    { id: 'brand',    label: 'By Brand' },
    { id: 'detail',   label: 'Detail' },
  ];

  return (
    <div className="space-y-4 p-1">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm">Monthly sales &amp; vendor analytics</p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleExportXLSX}>
          <Download className="w-4 h-4" /> Export Excel (.xlsx)
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-36 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-24 sm:w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['2023','2024','2025','2026'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Invoices" value={totalCount} />
        <StatCard title="Total Revenue"  value={`₹${totalSales.toLocaleString('en-IN')}`} />
        <StatCard title="Avg Invoice"    value={totalCount > 0 ? `₹${avgValue.toLocaleString('en-IN')}` : '—'} />
        <StatCard title="Brands Active"  value={brandStats.length} sub={`${vendorStats.length} vendor${vendorStats.length !== 1 ? 's' : ''}`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0 ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RankedTable title="Top Vendors" icon={Store} rows={vendorStats.slice(0, 8)} />
          <RankedTable title="Top Brands"  icon={Tag}   rows={brandStats.slice(0, 8)} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Top Products
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {productStats.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No data</p>
              ) : (
                <div className="divide-y divide-border">
                  {productStats.slice(0, 8).map((r, i) => {
                    const max = productStats[0]?.count ?? 1;
                    return (
                      <div key={i} className="px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i+1}</span>
                            <span className="text-sm font-medium truncate">{r.name}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-sm font-semibold">{r.count} sold</p>
                            <p className="text-xs text-muted-foreground">₹{r.revenue.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((r.count/max)*100)}%` }} />
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

      {/* Vendor tab */}
      {activeTab === 'vendor' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vendor-wise Report — {monthLabel}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {vendorStats.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">No data for {monthLabel}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr className="border-b border-border">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3 text-right">Invoices</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Avg</th>
                      <th className="px-4 py-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {vendorStats.map((v, i) => (
                      <tr key={i} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{i+1}</td>
                        <td className="px-4 py-3 font-medium">{v.name}</td>
                        <td className="px-4 py-3 text-right">{v.count}</td>
                        <td className="px-4 py-3 text-right font-semibold">₹{v.revenue.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right">₹{Math.round(v.revenue/v.count).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right">{totalSales > 0 ? ((v.revenue/totalSales)*100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-semibold">
                    <tr className="border-t-2 border-border">
                      <td className="px-4 py-3" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right">{totalCount}</td>
                      <td className="px-4 py-3 text-right">₹{totalSales.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{avgValue.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Brand tab */}
      {activeTab === 'brand' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Brand-wise Report — {monthLabel}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {brandStats.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">No data for {monthLabel}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr className="border-b border-border">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Brand</th>
                      <th className="px-4 py-3 text-right">Units Sold</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Avg Price</th>
                      <th className="px-4 py-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {brandStats.map((b, i) => (
                      <tr key={i} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{i+1}</td>
                        <td className="px-4 py-3 font-medium">{b.name}</td>
                        <td className="px-4 py-3 text-right">{b.count}</td>
                        <td className="px-4 py-3 text-right font-semibold">₹{b.revenue.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right">₹{Math.round(b.revenue/b.count).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right">{totalSales > 0 ? ((b.revenue/totalSales)*100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-semibold">
                    <tr className="border-t-2 border-border">
                      <td className="px-4 py-3" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right">{totalCount}</td>
                      <td className="px-4 py-3 text-right">₹{totalSales.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{avgValue.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail tab */}
      {activeTab === 'detail' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Detailed Invoice List — {monthLabel}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No invoices for {monthLabel}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase">
                      <tr className="border-b border-border">
                        <th className="px-3 py-3 whitespace-nowrap">Inv No.</th>
                        <th className="px-3 py-3 whitespace-nowrap">Date</th>
                        <th className="px-3 py-3 whitespace-nowrap">App ID</th>
                        <th className="px-3 py-3 whitespace-nowrap">Customer</th>
                        <th className="px-3 py-3 whitespace-nowrap">Mobile</th>
                        <th className="px-3 py-3 whitespace-nowrap">Asset</th>
                        <th className="px-3 py-3 whitespace-nowrap">Brand</th>
                        <th className="px-3 py-3 whitespace-nowrap">IMEI</th>
                        <th className="px-3 py-3 whitespace-nowrap">Scheme</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedInvoices.map((inv, i) => (
                        <tr key={i} className="hover:bg-accent/50 transition-colors">
                          <td className="px-3 py-3 font-medium whitespace-nowrap">{inv.invoice_number}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{inv.invoice_date}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{inv.delivery_order_number}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{inv.customer_name}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{inv.customer_mobile}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{inv.product_model}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{inv.product_description}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{inv.imei_serial}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{inv.mode}</td>
                          <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">₹{(inv.grand_total||0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}