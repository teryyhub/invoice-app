import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart2,
  Store,
  Tag,
  LayoutGrid,
  Loader2,
  Calendar,
  RotateCw,
  Database,
} from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6',
  '#8b5cf6', '#f97316', '#06b6d4', '#84cc16', '#e11d48',
  '#0ea5e9', '#a855f7', '#10b981', '#f43f5e', '#eab308',
  '#3b82f6', '#d946ef', '#64748b', '#78716c', '#059669',
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

function ComboChart({
  data,
  barAKey,
  barBKey,
  labelKey,
  colorA = '#6366f1',
  colorB = '#10b981',
  labelA = 'A',
  labelB = 'B',
  formatA = (v) => v,
  formatB = (v) => v,
}) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(300);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) setWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return <p className="text-center py-6 text-muted-foreground text-xs">No chart records</p>;
  }

  const H = 190;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 24;
  const PAD_LEFT = 46;
  const PAD_RIGHT = 38;
  const chartW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const maxA = niceMax(Math.max(...data.map((d) => d[barAKey] || 0), 1));
  const maxB = niceMax(Math.max(...data.map((d) => d[barBKey] || 0), 1));
  const ticksA = yTicks(maxA, 4);
  const ticksB = yTicks(maxB, 4);

  const n = data.length;
  const groupW = chartW / n;
  const BAR_W = Math.max(Math.min(groupW * 0.32, 20), 2.5);
  const GAP = Math.max(groupW * 0.05, 1.5);
  const groupCenterX = (i) => PAD_LEFT + groupW * i + groupW / 2;
  const barTopA = (val) => PAD_TOP + chartH - (val / maxA) * chartH;
  const barTopB = (val) => PAD_TOP + chartH - (val / maxB) * chartH;

  const linePointsA = data
    .map((d, i) => (d[barAKey] > 0 ? `${groupCenterX(i) - GAP / 2 - BAR_W / 2},${barTopA(d[barAKey])}` : null))
    .filter(Boolean)
    .join(' ');

  const linePointsB = data
    .map((d, i) => (d[barBKey] > 0 ? `${groupCenterX(i) + GAP / 2 + BAR_W / 2},${barTopB(d[barBKey])}` : null))
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={containerRef} className="w-full relative select-none">
      <div className="flex items-center gap-3 mb-1.5 text-[10px] text-muted-foreground font-semibold">
        <span className="flex items-center gap-1" style={{ color: colorA }}>
          <span className="w-2 h-2 rounded-xs" style={{ background: colorA }} />
          {labelA}
        </span>
        <span className="flex items-center gap-1" style={{ color: colorB }}>
          <span className="w-2 h-2 rounded-xs" style={{ background: colorB }} />
          {labelB}
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${H}`} className="overflow-visible w-full">
        {ticksA.map((t, i) => {
          const y = PAD_TOP + chartH - (t / maxA) * chartH;
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={PAD_LEFT + chartW}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="3 3"
              />
              <text x={PAD_LEFT - 4} y={y + 3} textAnchor="end" fontSize="7.5" fill={colorA} fillOpacity="0.85">
                {formatA(t)}
              </text>
            </g>
          );
        })}

        {ticksB.map((t, i) => {
          const y = PAD_TOP + chartH - (t / maxB) * chartH;
          return (
            <text
              key={i}
              x={PAD_LEFT + chartW + 4}
              y={y + 3}
              textAnchor="start"
              fontSize="7.5"
              fill={colorB}
              fillOpacity="0.85"
            >
              {formatB(t)}
            </text>
          );
        })}

        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + chartH} stroke="currentColor" strokeOpacity="0.15" />
        <line x1={PAD_LEFT} y1={PAD_TOP + chartH} x2={PAD_LEFT + chartW} y2={PAD_TOP + chartH} stroke="currentColor" strokeOpacity="0.15" />

        {data.map((d, i) => {
          const cx = groupCenterX(i);
          const hA = Math.max((d[barAKey] / maxA) * chartH, d[barAKey] > 0 ? 2 : 0);
          const hB = Math.max((d[barBKey] / maxB) * chartH, d[barBKey] > 0 ? 2 : 0);
          const xA = cx - GAP / 2 - BAR_W;
          const xB = cx + GAP / 2;
          const yA = PAD_TOP + chartH - hA;
          const yB = PAD_TOP + chartH - hB;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                setTip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 44,
                  labelA,
                  labelB,
                  valA: formatA(d[barAKey]),
                  valB: formatB(d[barBKey]),
                  name: d[labelKey],
                });
              }}
              onMouseLeave={() => setTip(null)}
            >
              {d[barAKey] > 0 && <rect x={xA} y={yA} width={BAR_W} height={hA} rx="1" fill={colorA} fillOpacity="0.85" />}
              {d[barBKey] > 0 && <rect x={xB} y={yB} width={BAR_W} height={hB} rx="1" fill={colorB} fillOpacity="0.85" />}
              <rect x={cx - groupW / 2} y={PAD_TOP} width={groupW} height={chartH} fill="transparent" />
              <text x={cx} y={PAD_TOP + chartH + 11} textAnchor="middle" fontSize="7.5" fill="currentColor" fillOpacity="0.5">
                {n > 15 ? (parseInt(d[labelKey], 10) % 5 === 1 ? d[labelKey] : '') : d[labelKey]}
              </text>
            </g>
          );
        })}

        {linePointsA && (
          <polyline
            points={linePointsA}
            fill="none"
            stroke={colorA}
            strokeWidth="1.2"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}
        {data.map((d, i) => {
          if (!d[barAKey]) return null;
          return (
            <circle
              key={i}
              cx={groupCenterX(i) - GAP / 2 - BAR_W / 2}
              cy={barTopA(d[barAKey])}
              r="2"
              fill={colorA}
              stroke="white"
              strokeWidth="0.8"
            />
          );
        })}

        {linePointsB && (
          <polyline
            points={linePointsB}
            fill="none"
            stroke={colorB}
            strokeWidth="1.2"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}
        {data.map((d, i) => {
          if (!d[barBKey]) return null;
          return (
            <circle
              key={i}
              cx={groupCenterX(i) + GAP / 2 + BAR_W / 2}
              cy={barTopB(d[barBKey])}
              r="2"
              fill={colorB}
              stroke="white"
              strokeWidth="0.8"
            />
          );
        })}
      </svg>

      {tip && (
        <div
          className="absolute z-30 pointer-events-none bg-popover border border-border rounded px-2 py-1 shadow-md text-[10px] space-y-0.5"
          style={{ left: Math.min(tip.x + 8, width - 120), top: tip.y }}
        >
          <p className="font-bold text-foreground leading-none">{tip.name}</p>
          <p style={{ color: colorA }}>
            {tip.labelA}: <span className="font-semibold text-foreground">{tip.valA}</span>
          </p>
          <p style={{ color: colorB }}>
            {tip.labelB}: <span className="font-semibold text-foreground">{tip.valB}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function DonutChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">No records</div>;

  const radius = 46;
  const cx = 55;
  const cy = 55;
  const stroke = 15;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset * circ}
            style={{ transition: 'stroke-dasharray 0.4s' }}
          />
        );
        offset += pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r={radius - stroke / 2 - 1} fill="hsl(var(--card))" />
    </svg>
  );
}

function Legend({ items }) {
  return (
    <div className="space-y-1 mt-2 w-full">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-1 text-[10px] leading-tight">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-muted-foreground truncate">{item.label}</span>
          </div>
          <span className="font-semibold text-foreground shrink-0">{item.display}</span>
        </div>
      ))}
    </div>
  );
}

export default function Statistics() {
  const { user } = useAuth();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [shareMetric, setShareMetric] = useState('revenue');

  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    isFetching: fetchingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['statistics-invoices', user?.id],
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
    queryKey: ['statistics-vendors', user?.id],
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
    vendors.forEach((v) => {
      m[v.id] = v.vendor_name;
    });
    return m;
  }, [vendors]);

  const yearInvoices = useMemo(() => {
    if (!hasLoaded) return [];
    return invoices.filter((inv) => {
      const raw = inv.invoice_date || inv.created_date || inv.created_at;
      if (!raw) return false;
      return String(new Date(raw).getFullYear()) === selectedYear;
    });
  }, [invoices, selectedYear, hasLoaded]);

  const monthlyData = useMemo(() => {
    if (!hasLoaded) return [];
    return MONTHS.map((name, i) => {
      const mis = yearInvoices.filter((inv) => {
        const raw = inv.invoice_date || inv.created_date || inv.created_at;
        return new Date(raw).getMonth() === i;
      });
      return {
        name,
        count: mis.length,
        revenue: Math.round(mis.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0)),
      };
    });
  }, [yearInvoices, hasLoaded]);

  const dailyData = useMemo(() => {
    if (!hasLoaded) return [];
    const mi = parseInt(selectedMonth, 10);
    const yi = parseInt(selectedYear, 10);
    const days = new Date(yi, mi + 1, 0).getDate();

    const monthInvs = invoices.filter((inv) => {
      const raw = inv.invoice_date || inv.created_date || inv.created_at;
      if (!raw) return false;
      const d = new Date(raw);
      return d.getMonth() === mi && d.getFullYear() === yi;
    });

    return Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const dayInvs = monthInvs.filter((inv) => {
        const raw = inv.invoice_date || inv.created_date || inv.created_at;
        return new Date(raw).getDate() === day;
      });
      return {
        name: String(day),
        count: dayInvs.length,
        revenue: Math.round(dayInvs.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0)),
      };
    });
  }, [invoices, selectedMonth, selectedYear, hasLoaded]);

  const totalRevenue = yearInvoices.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const totalCount = yearInvoices.length;

  const brandData = useMemo(() => {
    if (!hasLoaded) return [];
    const map = {};
    yearInvoices.forEach((inv) => {
      const label = inv.product_description || inv.brand_name || 'Unknown';
      if (!map[label]) map[label] = { label, count: 0, revenue: 0 };
      map[label].count += 1;
      map[label].revenue += Number(inv.grand_total) || 0;
    });
    return Object.values(map)
      .sort((a, b) => b[shareMetric] - a[shareMetric])
      .slice(0, 8);
  }, [yearInvoices, shareMetric, hasLoaded]);

  const vendorData = useMemo(() => {
    if (!hasLoaded) return [];
    const map = {};
    yearInvoices.forEach((inv) => {
      const label = vendorMap[inv.vendor_id] || inv.vendor_name || 'Unknown';
      if (!map[label]) map[label] = { label, count: 0, revenue: 0 };
      map[label].count += 1;
      map[label].revenue += Number(inv.grand_total) || 0;
    });
    return Object.values(map).sort((a, b) => b[shareMetric] - a[shareMetric]);
  }, [yearInvoices, vendorMap, shareMetric, hasLoaded]);

  const fmtRevenue = (v) =>
    v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`;
  const fmtCount = (v) => String(v);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'vendor', label: 'Vendor', icon: Store },
    { id: 'brand', label: 'Brand', icon: Tag },
  ];

  const ShareToggle = () => (
    <div className="flex bg-muted/40 p-0.5 rounded border border-border/60 w-fit">
      <button
        type="button"
        onClick={() => setShareMetric('revenue')}
        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
          shareMetric === 'revenue' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        By Revenue
      </button>
      <button
        type="button"
        onClick={() => setShareMetric('count')}
        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
          shareMetric === 'count' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        By Count
      </button>
    </div>
  );

  const ShareCards = ({ data, metricLabel }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <Card className="rounded-lg border-border/80 shadow-none bg-card">
        <div className="px-3 py-1.5 border-b border-border/60 text-xs font-bold text-foreground">
          {metricLabel} Share — {shareMetric === 'revenue' ? 'Revenue' : 'Count'}
        </div>
        <CardContent className="p-3 flex flex-col items-center">
          <DonutChart segments={data.map((d) => ({ label: d.label, value: d[shareMetric] }))} />
          <Legend
            items={data.map((d) => ({
              label: d.label,
              display: shareMetric === 'revenue' ? fmtRevenue(Math.round(d.revenue)) : `${d.count}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card className="rounded-lg border-border/80 shadow-none bg-card">
        <div className="px-3 py-1.5 border-b border-border/60 text-xs font-bold text-foreground">
          {metricLabel} Breakdown
        </div>
        <CardContent className="p-3 space-y-2">
          {data.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-xs">No records available</p>
          ) : (
            data.map((d, i) => {
              const total = data.reduce((s, x) => s + x[shareMetric], 0) || 1;
              const pct = (d[shareMetric] / total) * 100;
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between text-[11px] font-medium leading-tight">
                    <span className="truncate text-foreground">{d.label}</span>
                    <span className="shrink-0 text-foreground font-semibold">
                      {shareMetric === 'revenue' ? fmtRevenue(Math.round(d.revenue)) : `${d.count}`}
                      <span className="text-muted-foreground font-normal ml-1">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="leading-tight">
          <h1 className="text-base font-bold text-foreground">Business Statistics</h1>
          <p className="text-[10px] text-muted-foreground">
            {hasLoaded ? `Real-time analytics for ${selectedYear}` : 'On-demand chart analytics'}
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
              <span>Load Analytics</span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Sync metrics"
              >
                <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-7 rounded border border-border bg-card px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
              >
                {['2023', '2024', '2025', '2026', '2027'].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Unloaded State */}
      {!hasLoaded ? (
        <Card className="rounded-xl border-dashed border-border/80 bg-card shadow-none">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Analytics Engine Ready</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-normal">
                Click below to compute combo charts, brand shares, and daily sales trends for {selectedYear}.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-3 text-xs font-semibold gap-1.5 rounded-lg shadow-xs mt-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Analytics</span>
            </Button>
          </CardContent>
        </Card>
      ) : isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-14 space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Aggregating {selectedYear} statistics...</p>
        </div>
      ) : (
        <>
          {/* Top Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Card className="rounded-lg border-border/80 shadow-none bg-card">
              <CardContent className="p-2 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Invoices
                </span>
                <p className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1">{totalCount}</p>
                <span className="text-[9px] text-muted-foreground block mt-0.5">{selectedYear} Total</span>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border/80 shadow-none bg-card">
              <CardContent className="p-2 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Revenue
                </span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 truncate mt-1">
                  {fmtRevenue(Math.round(totalRevenue))}
                </p>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Gross volume</span>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border/80 shadow-none bg-card">
              <CardContent className="p-2 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Avg Ticket
                </span>
                <p className="text-sm font-black text-violet-600 dark:text-violet-400 truncate mt-1">
                  {totalCount ? fmtRevenue(Math.round(totalRevenue / totalCount)) : '—'}
                </p>
                <span className="text-[9px] text-muted-foreground block mt-0.5">Per invoice</span>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-border/80 shadow-none bg-card">
              <CardContent className="p-2 leading-none">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Top Brand
                </span>
                <p className="text-sm font-black text-pink-600 dark:text-pink-400 truncate mt-1">
                  {brandData[0]?.label || '—'}
                </p>
                <span className="text-[9px] text-muted-foreground block mt-0.5">
                  {brandData[0] ? `${brandData[0].count} bills` : 'No data'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-border gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <Card className="rounded-lg border-border/80 shadow-none bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border/60 text-xs font-bold text-foreground flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-primary" />
                Monthly Revenue &amp; Invoice Volume — {selectedYear}
              </div>
              <CardContent className="p-3">
                <ComboChart
                  data={monthlyData}
                  barAKey="revenue"
                  barBKey="count"
                  labelKey="name"
                  colorA="#6366f1"
                  colorB="#10b981"
                  labelA="Revenue"
                  labelB="Invoices"
                  formatA={fmtRevenue}
                  formatB={fmtCount}
                />
              </CardContent>
            </Card>
          )}

          {/* Tab 2: Daily */}
          {activeTab === 'daily' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-6 rounded border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  {FULL_MONTHS.map((m, i) => (
                    <option key={i} value={String(i)}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <Card className="rounded-lg border-border/80 shadow-none bg-card overflow-hidden">
                <div className="px-3 py-2 border-b border-border/60 text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  Daily Trends — {FULL_MONTHS[parseInt(selectedMonth, 10)]} {selectedYear}
                </div>
                <CardContent className="p-3">
                  <ComboChart
                    data={dailyData}
                    barAKey="revenue"
                    barBKey="count"
                    labelKey="name"
                    colorA="#6366f1"
                    colorB="#10b981"
                    labelA="Revenue"
                    labelB="Invoices"
                    formatA={fmtRevenue}
                    formatB={fmtCount}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-lg border-border/80 shadow-none bg-card overflow-hidden">
                <div className="px-3 py-1.5 border-b border-border/60 text-xs font-bold text-foreground">
                  Daily Breakdown Table
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                        <tr>
                          <th className="px-3 py-1.5">Day</th>
                          <th className="px-3 py-1.5 text-center">Invoices</th>
                          <th className="px-3 py-1.5 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {dailyData
                          .filter((d) => d.count > 0)
                          .map((d, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                              <td className="px-3 py-1.5 font-medium">
                                {FULL_MONTHS[parseInt(selectedMonth, 10)].slice(0, 3)} {d.name}
                              </td>
                              <td className="px-3 py-1.5 text-center font-bold">{d.count}</td>
                              <td className="px-3 py-1.5 text-right font-black text-foreground">
                                ₹{d.revenue.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        {dailyData.every((d) => d.count === 0) && (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                              No invoices recorded for this month
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 3: Vendor */}
          {activeTab === 'vendor' && (
            <div className="space-y-2">
              <ShareToggle />
              <ShareCards data={vendorData} metricLabel="Vendor" />
            </div>
          )}

          {/* Tab 4: Brand */}
          {activeTab === 'brand' && (
            <div className="space-y-2">
              <ShareToggle />
              <ShareCards data={brandData} metricLabel="Brand" />
            </div>
          )}
        </>
      )}
    </div>
  );
}