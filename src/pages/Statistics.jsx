import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart2, Store, Tag, LayoutGrid, Loader2, Calendar } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Nice round ceiling for y-axis ─────────────────────────────────────────
function niceMax(val) {
  if (!val || val === 0) return 10;
  const exp = Math.floor(Math.log10(val));
  const step = Math.pow(10, exp);
  return Math.ceil(val / step) * step;
}

function yTicks(max, count = 4) {
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i));
}

// ── Bar + Y-axis chart ─────────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = '#6366f1', formatValue = v => v }) {
  const CHART_H = 200; // px height of the bar area
  const Y_W     = 56;  // px width of y-axis labels

  const rawMax  = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const max     = niceMax(rawMax);
  const ticks   = yTicks(max, 4);

  return (
    <div className="w-full select-none">
      <div className="flex">
        {/* Y-axis */}
        <div className="flex flex-col-reverse justify-between shrink-0 pr-2 text-right"
          style={{ width: Y_W, height: CHART_H }}>
          {ticks.map((t, i) => (
            <span key={i} className="text-[10px] text-muted-foreground leading-none">
              {formatValue(t)}
            </span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1 relative" style={{ height: CHART_H }}>
          {/* Grid lines */}
          {ticks.map((t, i) => (
            <div key={i}
              className="absolute w-full border-t border-dashed border-border/50"
              style={{ bottom: `${(t / max) * 100}%` }}
            />
          ))}

          {/* Bar columns */}
          <div className="absolute inset-0 flex items-end gap-0.5 px-0.5">
            {data.map((d, i) => {
              const pct = Math.max((d[valueKey] / max) * 100, d[valueKey] > 0 ? 1 : 0);
              return (
                <div key={i} className="group flex-1 flex flex-col items-center justify-end h-full">
                  {/* Tooltip */}
                  <div className="relative w-full flex justify-center">
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex z-10
                      bg-popover border border-border text-foreground text-xs rounded px-2 py-1
                      shadow-md whitespace-nowrap pointer-events-none">
                      {d[labelKey]}: {formatValue(d[valueKey])}
                    </div>
                  </div>
                  <div
                    className="w-full rounded-t-sm cursor-pointer transition-opacity hover:opacity-75"
                    style={{ height: `${pct}%`, background: color, minHeight: d[valueKey] > 0 ? 3 : 0 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex mt-1" style={{ paddingLeft: Y_W }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {data.length <= 31 && (
              <span className="text-[9px] text-muted-foreground leading-none">
                {data.length > 14 ? (parseInt(d[labelKey]) % 5 === 1 ? d[labelKey] : '') : d[labelKey]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut chart ────────────────────────────────────────────────────────────
const COLORS = [
  '#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6',
  '#8b5cf6','#f97316','#06b6d4','#84cc16','#e11d48',
  '#0ea5e9','#a855f7','#10b981','#f43f5e','#eab308',
  '#3b82f6','#d946ef','#64748b','#78716c','#059669',
];

function DonutChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="flex items-center justify-center h-36 text-sm text-muted-foreground">No data</div>;
  const radius = 50, cx = 60, cy = 60, stroke = 18;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={140} height={140} viewBox="0 0 120 120">
      {segments.map((seg, i) => {
        const pct  = seg.value / total;
        const dash = pct * circ;
        const el   = (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none"
            stroke={COLORS[i % COLORS.length]} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset * circ}
            style={{ transition: 'stroke-dasharray 0.5s' }} />
        );
        offset += pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r={radius - stroke / 2 - 1} fill="hsl(var(--background))" />
    </svg>
  );
}

function Legend({ items }) {
  return (
    <div className="space-y-1.5 mt-3 w-full">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-muted-foreground truncate">{item.label}</span>
          </div>
          <span className="text-xs font-medium shrink-0">{item.display}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-primary' }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold truncate ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Statistics() {
  const { user } = useAuth();

  const [activeTab, setActiveTab]         = useState('overview');
  const [selectedYear, setSelectedYear]   = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [shareMetric, setShareMetric]     = useState('revenue');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['statistics-invoices', user?.id],
    queryFn: () => Invoice.list(1000),
    enabled: !!user?.id,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['statistics-vendors', user?.id],
    queryFn: () => VendorProfile.list(100),
    enabled: !!user?.id,
  });

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach(v => { m[v.id] = v.vendor_name; });
    return m;
  }, [vendors]);

  const yearInvoices = useMemo(() =>
    invoices.filter(inv => String(new Date(inv.invoice_date || inv.created_date).getFullYear()) === selectedYear),
    [invoices, selectedYear]);

  const monthlyData = useMemo(() => MONTHS.map((name, i) => {
    const mis = yearInvoices.filter(inv => new Date(inv.invoice_date || inv.created_date).getMonth() === i);
    return { name, count: mis.length, revenue: Math.round(mis.reduce((s, inv) => s + (inv.grand_total || 0), 0)) };
  }), [yearInvoices]);

  const dailyData = useMemo(() => {
    const mi = parseInt(selectedMonth), yi = parseInt(selectedYear);
    const days = new Date(yi, mi + 1, 0).getDate();
    const monthInvs = invoices.filter(inv => {
      const d = new Date(inv.invoice_date || inv.created_date);
      return d.getMonth() === mi && d.getFullYear() === yi;
    });
    return Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const dayInvs = monthInvs.filter(inv => new Date(inv.invoice_date || inv.created_date).getDate() === day);
      return { name: String(day), count: dayInvs.length, revenue: Math.round(dayInvs.reduce((s, inv) => s + (inv.grand_total || 0), 0)) };
    });
  }, [invoices, selectedMonth, selectedYear]);

  const totalRevenue = yearInvoices.reduce((s, inv) => s + (inv.grand_total || 0), 0);
  const totalCount   = yearInvoices.length;

  const brandData = useMemo(() => {
    const map = {};
    yearInvoices.forEach(inv => {
      const label = inv.product_description || 'Unknown';
      if (!map[label]) map[label] = { label, count: 0, revenue: 0 };
      map[label].count   += 1;
      map[label].revenue += inv.grand_total || 0;
    });
    return Object.values(map).sort((a, b) => b[shareMetric] - a[shareMetric]).slice(0, 8);
  }, [yearInvoices, shareMetric]);

  const vendorData = useMemo(() => {
    const map = {};
    yearInvoices.forEach(inv => {
      const label = vendorMap[inv.vendor_id] || inv.vendor_name || 'Unknown';
      if (!map[label]) map[label] = { label, count: 0, revenue: 0 };
      map[label].count   += 1;
      map[label].revenue += inv.grand_total || 0;
    });
    return Object.values(map).sort((a, b) => b[shareMetric] - a[shareMetric]);
  }, [yearInvoices, vendorMap, shareMetric]);

  const fmtRevenue = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`;
  const fmtCount   = v => String(v);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview',     icon: LayoutGrid },
    { id: 'daily',    label: 'Daily Trend',  icon: Calendar },
    { id: 'vendor',   label: 'Vendor Share', icon: Store },
    { id: 'brand',    label: 'Brand Share',  icon: Tag },
  ];

  const ShareToggle = () => (
    <div className="flex gap-2">
      <Button size="sm" variant={shareMetric === 'revenue' ? 'default' : 'outline'} onClick={() => setShareMetric('revenue')}>By Revenue</Button>
      <Button size="sm" variant={shareMetric === 'count'   ? 'default' : 'outline'} onClick={() => setShareMetric('count')}>By Count</Button>
    </div>
  );

  const ShareCards = ({ data, metricLabel }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{metricLabel} Share ({shareMetric === 'revenue' ? 'Revenue' : 'Count'})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <DonutChart segments={data.map(d => ({ label: d.label, value: d[shareMetric] }))} />
          <Legend items={data.map(d => ({
            label: d.label,
            display: shareMetric === 'revenue' ? fmtRevenue(Math.round(d.revenue)) : `${d.count}`,
          }))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{metricLabel} Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.length === 0
            ? <p className="text-center py-10 text-muted-foreground text-sm">No data</p>
            : data.map((d, i) => {
              const total = data.reduce((s, x) => s + x[shareMetric], 0) || 1;
              const pct   = (d[shareMetric] / total) * 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="truncate max-w-[160px]">{d.label}</span>
                    <span>
                      {shareMetric === 'revenue' ? fmtRevenue(Math.round(d.revenue)) : `${d.count}`}
                      <span className="text-muted-foreground ml-1">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })
          }
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Statistics</h1>
          <p className="text-muted-foreground text-sm">Real-time analytics from your invoices</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['2023','2024','2025','2026'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Invoices" value={totalCount} color="text-blue-600" />
        <StatCard label="Total Revenue"  value={fmtRevenue(Math.round(totalRevenue))} color="text-green-600" />
        <StatCard label="Avg Ticket"     value={totalCount ? fmtRevenue(Math.round(totalRevenue/totalCount)) : '—'} color="text-violet-600" />
        <StatCard label="Top Brand"      value={brandData[0]?.label || '—'} color="text-pink-600"
          sub={brandData[0] ? `${brandData[0].count} invoices` : undefined} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> Monthly Revenue — {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={monthlyData} valueKey="revenue" labelKey="name"
                color="#6366f1" formatValue={fmtRevenue} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-violet-500" /> Monthly Invoice Count — {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={monthlyData} valueKey="count" labelKey="name"
                color="#8b5cf6" formatValue={fmtCount} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily trend */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FULL_MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Daily Revenue — {FULL_MONTHS[parseInt(selectedMonth)]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={dailyData} valueKey="revenue" labelKey="name"
                color="#10b981" formatValue={fmtRevenue} />
              <p className="text-xs text-muted-foreground mt-2 text-center">Hover bars for exact values</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                Daily Invoice Count — {FULL_MONTHS[parseInt(selectedMonth)]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={dailyData} valueKey="count" labelKey="name"
                color="#f59e0b" formatValue={fmtCount} />
            </CardContent>
          </Card>

          {/* Daily table */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Daily Summary</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr className="border-b border-border">
                      <th className="px-4 py-2 text-left">Day</th>
                      <th className="px-4 py-2 text-right">Invoices</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dailyData.filter(d => d.count > 0).map((d, i) => (
                      <tr key={i} className="hover:bg-accent/50">
                        <td className="px-4 py-2">{FULL_MONTHS[parseInt(selectedMonth)].slice(0,3)} {d.name}</td>
                        <td className="px-4 py-2 text-right">{d.count}</td>
                        <td className="px-4 py-2 text-right font-medium">₹{d.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {dailyData.every(d => d.count === 0) && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No invoices this month</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vendor share */}
      {activeTab === 'vendor' && (
        <div className="space-y-4">
          <ShareToggle />
          <ShareCards data={vendorData} metricLabel="Vendor" />
        </div>
      )}

      {/* Brand share */}
      {activeTab === 'brand' && (
        <div className="space-y-4">
          <ShareToggle />
          <ShareCards data={brandData} metricLabel="Brand" />
        </div>
      )}
    </div>
  );
}