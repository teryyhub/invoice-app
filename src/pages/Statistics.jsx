import React, { useState, useMemo, useRef, useEffect } from 'react';
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
const COLORS = [
  '#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6',
  '#8b5cf6','#f97316','#06b6d4','#84cc16','#e11d48',
  '#0ea5e9','#a855f7','#10b981','#f43f5e','#eab308',
  '#3b82f6','#d946ef','#64748b','#78716c','#059669',
];

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

// ── Tooltip state hook ─────────────────────────────────────────────────────
function useTooltip() {
  const [tip, setTip] = useState(null); // { x, y, content }
  return { tip, setTip };
}

// ══════════════════════════════════════════════════════════════════════════
// ComboChart — fully SVG-based, bars + lines properly separated
// ══════════════════════════════════════════════════════════════════════════
function ComboChart({
  data, barAKey, barBKey, labelKey,
  colorA = '#6366f1', colorB = '#10b981',
  labelA = 'A', labelB = 'B',
  formatA = v => v, formatB = v => v,
}) {
  const containerRef = useRef(null);
  const [width, setWidth]   = useState(600);
  const { tip, setTip }     = useTooltip();

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) return (
    <p className="text-center py-10 text-muted-foreground text-sm">No data</p>
  );

  // Layout constants
  const H          = 260;
  const PAD_TOP    = 16;
  const PAD_BOTTOM = 32; // space for x-labels
  const PAD_LEFT   = 64; // left y-axis
  const PAD_RIGHT  = 52; // right y-axis
  const chartW     = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const chartH     = H - PAD_TOP - PAD_BOTTOM;

  const maxA   = niceMax(Math.max(...data.map(d => d[barAKey] || 0), 1));
  const maxB   = niceMax(Math.max(...data.map(d => d[barBKey] || 0), 1));
  const ticksA = yTicks(maxA, 4);
  const ticksB = yTicks(maxB, 4);

  const n          = data.length;
  const groupW     = chartW / n;
  const BAR_W      = Math.max(Math.min(groupW * 0.32, 28), 4);
  const GAP        = Math.max(groupW * 0.06, 2);

  // Center x of each group
  const groupCenterX = i => PAD_LEFT + groupW * i + groupW / 2;

  // Bar tops (in SVG coords — y increases downward)
  const barTopA = (val) => PAD_TOP + chartH - (val / maxA) * chartH;
  const barTopB = (val) => PAD_TOP + chartH - (val / maxB) * chartH;

  // Build polyline points
  const linePointsA = data
    .map((d, i) => d[barAKey] > 0 ? `${groupCenterX(i) - GAP / 2 - BAR_W / 2},${barTopA(d[barAKey])}` : null)
    .filter(Boolean).join(' ');
  const linePointsB = data
    .map((d, i) => d[barBKey] > 0 ? `${groupCenterX(i) + GAP / 2 + BAR_W / 2},${barTopB(d[barBKey])}` : null)
    .filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className="w-full relative select-none">

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium" style={{ color: colorA }}>
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colorA }} />
          {labelA} (bars)
        </span>
        <span className="flex items-center gap-1.5 font-medium" style={{ color: colorB }}>
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colorB }} />
          {labelB} (bars)
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="10">
            <polyline points="0,5 8,5 16,5 24,5" fill="none" stroke={colorA}
              strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round"/>
            <circle cx="0"  cy="5" r="2.5" fill={colorA}/>
            <circle cx="12" cy="5" r="2.5" fill={colorA}/>
            <circle cx="24" cy="5" r="2.5" fill={colorA}/>
          </svg>
          {labelA} trend
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="10">
            <polyline points="0,5 8,5 16,5 24,5" fill="none" stroke={colorB}
              strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round"/>
            <circle cx="0"  cy="5" r="2.5" fill={colorB}/>
            <circle cx="12" cy="5" r="2.5" fill={colorB}/>
            <circle cx="24" cy="5" r="2.5" fill={colorB}/>
          </svg>
          {labelB} trend
        </span>
      </div>

      {/* SVG chart */}
      <svg width={width} height={H} className="overflow-visible">

        {/* ── Grid lines + Left Y-axis ── */}
        {ticksA.map((t, i) => {
          const y = PAD_TOP + chartH - (t / maxA) * chartH;
          return (
            <g key={i}>
              <line x1={PAD_LEFT} y1={y} x2={PAD_LEFT + chartW} y2={y}
                stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 3" />
              <text x={PAD_LEFT - 6} y={y + 3.5} textAnchor="end"
                fontSize="9" fill={colorA} fillOpacity="0.85">{formatA(t)}</text>
            </g>
          );
        })}

        {/* ── Right Y-axis (barB) ── */}
        {ticksB.map((t, i) => {
          const y = PAD_TOP + chartH - (t / maxB) * chartH;
          return (
            <text key={i} x={PAD_LEFT + chartW + 6} y={y + 3.5}
              textAnchor="start" fontSize="9" fill={colorB} fillOpacity="0.85">
              {formatB(t)}
            </text>
          );
        })}

        {/* ── Axis border ── */}
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + chartH}
          stroke="currentColor" strokeOpacity="0.15" />
        <line x1={PAD_LEFT} y1={PAD_TOP + chartH} x2={PAD_LEFT + chartW} y2={PAD_TOP + chartH}
          stroke="currentColor" strokeOpacity="0.15" />

        {/* ── Bars ── */}
        {data.map((d, i) => {
          const cx  = groupCenterX(i);
          const hA  = Math.max((d[barAKey] / maxA) * chartH, d[barAKey] > 0 ? 3 : 0);
          const hB  = Math.max((d[barBKey] / maxB) * chartH, d[barBKey] > 0 ? 3 : 0);
          const xA  = cx - GAP / 2 - BAR_W;
          const xB  = cx + GAP / 2;
          const yA  = PAD_TOP + chartH - hA;
          const yB  = PAD_TOP + chartH - hB;

          return (
            <g key={i}
              className="cursor-pointer"
              onMouseEnter={e => {
                const rect = containerRef.current.getBoundingClientRect();
                setTip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 48,
                  labelA, labelB,
                  valA: formatA(d[barAKey]),
                  valB: formatB(d[barBKey]),
                  name: d[labelKey],
                });
              }}
              onMouseLeave={() => setTip(null)}
            >
              {/* Bar A */}
              {d[barAKey] > 0 && (
                <rect x={xA} y={yA} width={BAR_W} height={hA} rx="2"
                  fill={colorA} fillOpacity="0.85">
                  <animate attributeName="height" from="0" to={hA} dur="0.4s" fill="freeze"/>
                  <animate attributeName="y" from={PAD_TOP + chartH} to={yA} dur="0.4s" fill="freeze"/>
                </rect>
              )}
              {/* Bar B */}
              {d[barBKey] > 0 && (
                <rect x={xB} y={yB} width={BAR_W} height={hB} rx="2"
                  fill={colorB} fillOpacity="0.85">
                  <animate attributeName="height" from="0" to={hB} dur="0.4s" fill="freeze"/>
                  <animate attributeName="y" from={PAD_TOP + chartH} to={yB} dur="0.4s" fill="freeze"/>
                </rect>
              )}
              {/* Hover highlight */}
              <rect x={cx - groupW / 2} y={PAD_TOP} width={groupW} height={chartH}
                fill="transparent" className="hover:fill-white hover:fill-opacity-[0.03]" />

              {/* X-axis label */}
              <text
                x={cx} y={PAD_TOP + chartH + 14}
                textAnchor="middle" fontSize="9"
                fill="currentColor" fillOpacity="0.5"
              >
                {n > 15 ? (parseInt(d[labelKey]) % 5 === 1 ? d[labelKey] : '') : d[labelKey]}
              </text>
            </g>
          );
        })}

        {/* ── Trend line A — drawn ABOVE bars ── */}
        {linePointsA && (
          <polyline
            points={linePointsA}
            fill="none"
            stroke={colorA}
            strokeWidth="2"
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}
        {/* Dots on line A */}
        {data.map((d, i) => {
          if (!d[barAKey]) return null;
          const x = groupCenterX(i) - GAP / 2 - BAR_W / 2;
          const y = barTopA(d[barAKey]);
          return <circle key={i} cx={x} cy={y} r="3" fill={colorA} stroke="white" strokeWidth="1.5" />;
        })}

        {/* ── Trend line B ── */}
        {linePointsB && (
          <polyline
            points={linePointsB}
            fill="none"
            stroke={colorB}
            strokeWidth="2"
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}
        {/* Dots on line B */}
        {data.map((d, i) => {
          if (!d[barBKey]) return null;
          const x = groupCenterX(i) + GAP / 2 + BAR_W / 2;
          const y = barTopB(d[barBKey]);
          return <circle key={i} cx={x} cy={y} r="3" fill={colorB} stroke="white" strokeWidth="1.5" />;
        })}

      </svg>

      {/* Tooltip */}
      {tip && (
        <div
          className="absolute z-30 pointer-events-none bg-popover border border-border
            rounded-lg px-3 py-2 shadow-xl text-xs space-y-1"
          style={{ left: tip.x + 12, top: tip.y }}
        >
          <p className="font-semibold text-foreground mb-1">{tip.name}</p>
          <p style={{ color: colorA }}>{tip.labelA}: <span className="font-medium text-foreground">{tip.valA}</span></p>
          <p style={{ color: colorB }}>{tip.labelB}: <span className="font-medium text-foreground">{tip.valB}</span></p>
        </div>
      )}
    </div>
  );
}

// ── Donut ──────────────────────────────────────────────────────────────────
function DonutChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-36 text-sm text-muted-foreground">No data</div>
  );
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
    <Card>
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
    invoices.filter(inv =>
      String(new Date(inv.invoice_date || inv.created_date).getFullYear()) === selectedYear),
    [invoices, selectedYear]);

  const monthlyData = useMemo(() => MONTHS.map((name, i) => {
    const mis = yearInvoices.filter(inv =>
      new Date(inv.invoice_date || inv.created_date).getMonth() === i);
    return {
      name,
      count:   mis.length,
      revenue: Math.round(mis.reduce((s, inv) => s + (inv.grand_total || 0), 0)),
    };
  }), [yearInvoices]);

  const dailyData = useMemo(() => {
    const mi = parseInt(selectedMonth), yi = parseInt(selectedYear);
    const days = new Date(yi, mi + 1, 0).getDate();
    const monthInvs = invoices.filter(inv => {
      const d = new Date(inv.invoice_date || inv.created_date);
      return d.getMonth() === mi && d.getFullYear() === yi;
    });
    return Array.from({ length: days }, (_, i) => {
      const day     = i + 1;
      const dayInvs = monthInvs.filter(inv =>
        new Date(inv.invoice_date || inv.created_date).getDate() === day);
      return {
        name:    String(day),
        count:   dayInvs.length,
        revenue: Math.round(dayInvs.reduce((s, inv) => s + (inv.grand_total || 0), 0)),
      };
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
    { id: 'overview', label: 'Overview',    icon: LayoutGrid },
    { id: 'daily',    label: 'Daily Trend', icon: Calendar },
    { id: 'vendor',   label: 'Vendor Share',icon: Store },
    { id: 'brand',    label: 'Brand Share', icon: Tag },
  ];

  const ShareToggle = () => (
    <div className="flex gap-2">
      <Button size="sm" variant={shareMetric === 'revenue' ? 'default' : 'outline'}
        onClick={() => setShareMetric('revenue')}>By Revenue</Button>
      <Button size="sm" variant={shareMetric === 'count' ? 'default' : 'outline'}
        onClick={() => setShareMetric('count')}>By Count</Button>
    </div>
  );

  const ShareCards = ({ data, metricLabel }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            {metricLabel} Share — {shareMetric === 'revenue' ? 'Revenue' : 'Count'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <DonutChart segments={data.map(d => ({ label: d.label, value: d[shareMetric] }))} />
          <Legend items={data.map(d => ({
            label:   d.label,
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Invoices" value={totalCount} color="text-blue-500" />
        <StatCard label="Total Revenue"  value={fmtRevenue(Math.round(totalRevenue))} color="text-emerald-500" />
        <StatCard label="Avg Ticket"     value={totalCount ? fmtRevenue(Math.round(totalRevenue/totalCount)) : '—'} color="text-violet-500" />
        <StatCard label="Top Brand"      value={brandData[0]?.label || '—'} color="text-pink-500"
          sub={brandData[0] ? `${brandData[0].count} invoices` : undefined} />
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap
              transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Monthly Revenue &amp; Invoice Count — {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ComboChart
              data={monthlyData}
              barAKey="revenue" barBKey="count"
              labelKey="name"
              colorA="#6366f1" colorB="#10b981"
              labelA="Revenue" labelB="Invoices"
              formatA={fmtRevenue} formatB={fmtCount}
            />
          </CardContent>
        </Card>
      )}

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
                <Calendar className="w-4 h-4 text-emerald-500" />
                Daily Revenue &amp; Invoice Count — {FULL_MONTHS[parseInt(selectedMonth)]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ComboChart
                data={dailyData}
                barAKey="revenue" barBKey="count"
                labelKey="name"
                colorA="#6366f1" colorB="#10b981"
                labelA="Revenue" labelB="Invoices"
                formatA={fmtRevenue} formatB={fmtCount}
              />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Left axis = Revenue · Right axis = Invoices · Hover for exact values
              </p>
            </CardContent>
          </Card>

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
                      <tr key={i} className="hover:bg-accent/50 transition-colors">
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

      {activeTab === 'vendor' && (
        <div className="space-y-4">
          <ShareToggle />
          <ShareCards data={vendorData} metricLabel="Vendor" />
        </div>
      )}

      {activeTab === 'brand' && (
        <div className="space-y-4">
          <ShareToggle />
          <ShareCards data={brandData} metricLabel="Brand" />
        </div>
      )}
    </div>
  );
}