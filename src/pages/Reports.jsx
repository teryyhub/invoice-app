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

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ title, value, sub }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Ranked table ───────────────────────────────────────────────────────────
function RankedTable({ title, icon: Icon, rows, keyLabel }) {
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="text-sm font-medium truncate max-w-[180px]">{r.name || '—'}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{r.revenue.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground">{r.count} invoice{r.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.round((r.revenue / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Reports() {
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear]   = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab]         = useState('overview'); // 'overview' | 'vendor' | 'brand' | 'detail'
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

  // Filter by selected month/year
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

  // Group by vendor
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

  // Group by brand (product_description)
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

  // Paginated detail
  const totalPages       = Math.ceil(totalCount / pageSize);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const monthLabel = `${MONTHS[parseInt(selectedMonth)]} ${selectedYear}`;

  const handleExportCSV = () => {
    if (filtered.length === 0) { toast.error("No data to export."); return; }
    let csv = `\ufeffMONTHLY SALES REPORT: ${monthLabel}\n`;
    csv += `Total Invoices,${totalCount}\nTotal Revenue,₹${totalSales.toFixed(2)}\n\n`;
    csv += ["Invoice No","Date","App ID","Customer","Mobile","Asset","Brand","IMEI","Scheme","Total"].join(",") + "\n";
    filtered.forEach(inv => {
      csv += [
        `"${inv.invoice_number||''}"`, `"${inv.invoice_date||''}"`,
        `"${inv.delivery_order_number||''}"`, `"${inv.customer_name||''}"`,
        `"${inv.customer_mobile||''}"`, `"${inv.product_model||''}"`,
        `"${inv.product_description||''}"`, `"${inv.imei_serial||''}"`,
        `"${inv.mode||''}"`, `"${inv.grand_total||0}"`
      ].join(",") + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `Report_${monthLabel.replace(' ','_')}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
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
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm">Monthly sales & vendor analytics</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['2023','2024','2025','2026'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" value={totalCount} />
        <StatCard title="Total Revenue"  value={`₹${totalSales.toLocaleString('en-IN')}`} />
        <StatCard title="Avg Invoice"    value={totalCount > 0 ? `₹${avgValue.toLocaleString('en-IN')}` : '—'} />
        <StatCard title="Brands Active"  value={brandStats.length} sub={`${vendorStats.length} vendor${vendorStats.length !== 1 ? 's' : ''}`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankedTable title="Top Vendors"  icon={Store} rows={vendorStats.slice(0, 8)} keyLabel="vendor" />
          <RankedTable title="Top Brands"   icon={Tag}   rows={brandStats.slice(0, 8)}  keyLabel="brand" />

          {/* Top products */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Top Products
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const map = {};
                filtered.forEach(inv => {
                  const name = inv.product_model || 'Unknown';
                  if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
                  map[name].revenue += inv.grand_total || 0;
                  map[name].count   += 1;
                });
                const rows = Object.values(map).sort((a,b) => b.count - a.count).slice(0,8);
                const max  = rows[0]?.count ?? 1;
                return rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">No data</p>
                ) : (
                  <div className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <div key={i} className="px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-5">#{i+1}</span>
                            <span className="text-sm font-medium truncate max-w-[180px]">{r.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{r.count} sold</p>
                            <p className="text-xs text-muted-foreground">₹{r.revenue.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((r.count/max)*100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1">
                            {totalSales > 0 ? ((v.revenue/totalSales)*100).toFixed(1) : 0}%
                          </span>
                        </td>
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
                        <td className="px-4 py-3 text-right">
                          {totalSales > 0 ? ((b.revenue/totalSales)*100).toFixed(1) : 0}%
                        </td>
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
                          <td className="px-3 py-3 font-medium">{inv.invoice_number}</td>
                          <td className="px-3 py-3">{inv.invoice_date}</td>
                          <td className="px-3 py-3">{inv.delivery_order_number}</td>
                          <td className="px-3 py-3">{inv.customer_name}</td>
                          <td className="px-3 py-3">{inv.customer_mobile}</td>
                          <td className="px-3 py-3">{inv.product_model}</td>
                          <td className="px-3 py-3">{inv.product_description}</td>
                          <td className="px-3 py-3">{inv.imei_serial}</td>
                          <td className="px-3 py-3">{inv.mode}</td>
                          <td className="px-3 py-3 text-right font-semibold">₹{(inv.grand_total||0).toLocaleString('en-IN')}</td>
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