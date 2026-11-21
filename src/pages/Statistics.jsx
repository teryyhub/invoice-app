// src/pages/Statistics.jsx
import React, { useState, useMemo, useEffect } from 'react';
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
  ShieldCheck,
  TrendingUp,
  FileText,
  IndianRupee,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

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

const STORAGE_KEY = 'stats_secure_token_v1';
const SECRET_SALT = 'chola_analytics_salt_2026';
const MAX_LOADS = 2;
const COOLDOWN_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

function generateChecksum(count, time) {
  const str = `${count}:${time}:${SECRET_SALT}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getSecureCooldownState() {
  try {
    const encoded = localStorage.getItem(STORAGE_KEY);
    if (!encoded) return { allowed: true, count: 0 };

    const jsonStr = atob(encoded);
    const data = JSON.parse(jsonStr);

    const expectedChecksum = generateChecksum(data.count, data.firstLoadTime);
    if (data.checksum !== expectedChecksum) {
      return { allowed: false, remainingMs: COOLDOWN_DURATION_MS, tampered: true };
    }

    const now = Date.now();
    if (now - data.firstLoadTime > COOLDOWN_DURATION_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return { allowed: true, count: 0 };
    }

    if (data.count >= MAX_LOADS) {
      const remaining = COOLDOWN_DURATION_MS - (now - data.firstLoadTime);
      return { allowed: false, remainingMs: remaining };
    }

    return { allowed: true, count: data.count };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { allowed: true, count: 0 };
  }
}

function saveSecureCooldownState(count, firstLoadTime) {
  const checksum = generateChecksum(count, firstLoadTime);
  const payload = JSON.stringify({ count, firstLoadTime, checksum });
  const encoded = btoa(payload);
  localStorage.setItem(STORAGE_KEY, encoded);
}

function formatTimeRemaining(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}d ${hours}h ${minutes}m`;
}

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
  const containerRef = React.useRef(null);
  const [width, setWidth] = useState(300);
  const [tip, setTip] = useState(null);

  React.useEffect(() => {
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
      <div className="flex items-center gap-3 mb-1.5 text-[12px] text-muted-foreground font-semibold">
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
          className="absolute z-30 pointer-events-none bg-popover border border-border rounded px-2 py-1 shadow-md text-[12px] space-y-0.5"
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
        <div key={i} className="flex items-center justify-between gap-1 text-[12px] leading-tight">
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
  const [selectedVendorKey, setSelectedVendorKey] = useState('all');
  const [cooldownRemaining, setCooldownRemaining] = useState(null);

  useEffect(() => {
    const status = getSecureCooldownState();
    if (!status.allowed) {
      setCooldownRemaining(status.remainingMs);
    }
  }, []);

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
    const status = getSecureCooldownState();
    if (!status.allowed) {
      if (status.tampered) {
        toast.error('Security alert: Cooldown storage tampering detected.');
      } else {
        toast.error(`Cooldown active! You can load analytics again in ${formatTimeRemaining(status.remainingMs)}.`);
      }
      setCooldownRemaining(status.remainingMs);
      return;
    }

    const encoded = localStorage.getItem(STORAGE_KEY);
    let firstLoadTime = Date.now();
    let count = 0;

    if (encoded) {
      try {
        const data = JSON.parse(atob(encoded));
        firstLoadTime = data.firstLoadTime;
        count = data.count;
      } catch {}
    }

    count += 1;
    saveSecureCooldownState(count, firstLoadTime);

    if (count >= MAX_LOADS) {
      toast.warning(`This was your ${count}nd load. Cooldown period of 1 week is now triggered.`);
      setCooldownRemaining(COOLDOWN_DURATION_MS);
    } else {
      toast.success(`Analytics loaded successfully (${count}/${MAX_LOADS} used this week).`);
    }

    setHasLoaded(true);
  };

  const handleRefresh = () => {
    const status = getSecureCooldownState();
    if (!status.allowed) {
      toast.error(`Cooldown active! Refresh blocked for ${formatTimeRemaining(status.remainingMs)}.`);
      return;
    }
    refetchInvoices();
    refetchVendors();
  };

  // Map Vendor Profiles by first 10 characters of vendor_code
  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach((v) => {
      const rawCode = String(v.vendor_code || v.code || '').trim();
      const codeKey = rawCode.slice(0, 10).toUpperCase();
      const name = String(v.vendor_name || v.name || 'Vendor').trim();
      
      if (codeKey) {
        m[codeKey] = { code: codeKey, name };
      }
    });
    return m;
  }, [vendors]);

  const yearInvoices = useMemo(() => {
    if (!hasLoaded) return [];
    return invoices.filter((inv) => {
      const raw = inv.invoice_date || inv.created_date || inv.created_at;
      if (!raw) return false;
      const inYear = String(new Date(raw).getFullYear()) === selectedYear;

      const doNum = String(inv.delivery_order_number || '').trim();
      const invPrefix = doNum.slice(0, 10).toUpperCase();

      const matchVendor = selectedVendorKey === 'all' || invPrefix === selectedVendorKey;
      return inYear && matchVendor;
    });
  }, [invoices, selectedYear, selectedVendorKey, hasLoaded]);

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

    const monthInvs = yearInvoices.filter((inv) => {
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
  }, [yearInvoices, selectedMonth, selectedYear, hasLoaded]);

  const totalRevenue = yearInvoices.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const totalCount = yearInvoices.length;

  // Add-ons & Insurance Telemetry
  const { totalAddonsRev, totalAddonsCount, addonTypeStats } = useMemo(() => {
    let revSum = 0;
    let countSum = 0;
    const typeMap = {};

    yearInvoices.forEach((inv) => {
      if (inv.addons && Array.isArray(inv.addons)) {
        inv.addons.forEach((a) => {
          const amt = Number(a.amount) || 0;
          const name = a.name || a.id || 'Unknown Add-on';
          revSum += amt;
          countSum += 1;

          if (!typeMap[name]) typeMap[name] = { label: name, count: 0, revenue: 0 };
          typeMap[name].count += 1;
          typeMap[name].revenue += amt;
        });
      }
    });

    return {
      totalAddonsRev: revSum,
      totalAddonsCount: countSum,
      addonTypeStats: Object.values(typeMap).sort((a, b) => b.revenue - a.revenue),
    };
  }, [yearInvoices]);

  const rpc = totalCount > 0 ? totalAddonsRev / totalCount : 0;
  const crossSaleRate = totalCount > 0 ? (totalAddonsCount / totalCount) * 100 : 0;

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

  // Consolidated Vendor Statistics with Separate Code and Name Columns
  const vendorData = useMemo(() => {
    if (!hasLoaded) return [];
    const map = {};

    yearInvoices.forEach((inv) => {
      const doNum = String(inv.delivery_order_number || '').trim();
      const code = doNum.slice(0, 10).toUpperCase() || String(inv.vendor_code || inv.vendor_id || 'CDAP000000').trim().slice(0, 10).toUpperCase();
      
      const vInfo = vendorMap[code] || vendorMap[inv.vendor_id];
      const explicitName = String(inv.vendor_name || '').trim();
      
      const resolvedName = (vInfo && vInfo.name && vInfo.name !== 'Vendor') 
        ? vInfo.name 
        : (explicitName && explicitName !== 'Vendor' ? explicitName : 'Vendor');

      const key = code;

      if (!map[key]) {
        map[key] = {
          code: code,
          name: resolvedName,
          count: 0,
          revenue: 0,
          addonsRev: 0,
          addonsCount: 0,
        };
      } else {
        if (map[key].name === 'Vendor' && resolvedName !== 'Vendor') {
          map[key].name = resolvedName;
        }
      }

      map[key].count += 1;
      map[key].revenue += Number(inv.grand_total) || 0;

      if (inv.addons && Array.isArray(inv.addons)) {
        inv.addons.forEach((a) => {
          map[key].addonsRev += Number(a.amount) || 0;
          map[key].addonsCount += 1;
        });
      }
    });

    return Object.values(map)
      .map((item) => {
        const vRpc = item.count > 0 ? item.addonsRev / item.count : 0;
        const vAttach = item.count > 0 ? (item.addonsCount / item.count) * 100 : 0;
        return {
          code: item.code,
          name: item.name,
          label: `[${item.code}] (${item.name})`,
          count: item.count,
          revenue: Math.round(item.revenue),
          addonsRev: Math.round(item.addonsRev),
          rpc: Math.round(vRpc),
          attachRate: vAttach.toFixed(1),
          sortMetric: shareMetric === 'revenue' ? item.revenue : item.count,
        };
      })
      .sort((a, b) => b.sortMetric - a.sortMetric);
  }, [yearInvoices, vendorMap, shareMetric, hasLoaded]);

  const fmtRevenue = (v) =>
    v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`;
  const fmtCount = (v) => String(v);

  const ShareToggle = () => (
    <div className="flex bg-muted/40 p-0.5 rounded border border-border/60 w-fit">
      <button
        type="button"
        onClick={() => setShareMetric('revenue')}
        className={`px-2 py-0.5 text-[12px] font-bold rounded transition-colors ${
          shareMetric === 'revenue' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        By Revenue
      </button>
      <button
        type="button"
        onClick={() => setShareMetric('count')}
        className={`px-2 py-0.5 text-[12px] font-bold rounded transition-colors ${
          shareMetric === 'count' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        By Count
      </button>
    </div>
  );

  const ShareCards = ({ data, metricLabel }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <Card className="rounded-xl border-border/80 shadow-none bg-card">
        <div className="px-3 py-1.5 border-b border-border/60 text-xs font-bold text-foreground">
          {metricLabel} Share — {shareMetric === 'revenue' ? 'Revenue' : 'Count'}
        </div>
        <CardContent className="p-3 flex flex-col items-center">
          <DonutChart segments={data.map((d) => ({ label: d.label, value: d.sortMetric }))} />
          <Legend
            items={data.map((d) => ({
              label: d.label,
              display: shareMetric === 'revenue' ? fmtRevenue(Math.round(d.revenue)) : `${d.count}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/80 shadow-none bg-card">
        <div className="px-3 py-1.5 border-b border-border/60 text-xs font-bold text-foreground">
          {metricLabel} Breakdown &amp; Add-on Telemetry
        </div>
        <CardContent className="p-3 space-y-2.5">
          {data.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-xs">No records available</p>
          ) : (
            data.map((d, i) => {
              const total = data.reduce((s, x) => s + x.sortMetric, 0) || 1;
              const pct = (d.sortMetric / total) * 100;
              return (
                <div key={i} className="space-y-1 p-2 rounded bg-muted/30 border border-border/50">
                  <div className="flex justify-between text-[13px] font-medium leading-tight">
                    <span className="truncate text-foreground font-mono font-bold">{d.label}</span>
                    <span className="shrink-0 text-foreground font-semibold">
                      {shareMetric === 'revenue' ? fmtRevenue(Math.round(d.revenue)) : `${d.count} bills`}
                      <span className="text-muted-foreground font-normal ml-1">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] text-muted-foreground border-t border-border/40 font-mono">
                    <div>Add-ons: <span className="font-bold text-foreground">₹{d.addonsRev.toLocaleString('en-IN')}</span></div>
                    <div>RPC: <span className="font-bold text-amber-600 dark:text-amber-400">₹{d.rpc}</span></div>
                    <div className="text-right">Attach: <span className="font-bold text-purple-600 dark:text-purple-400">{d.attachRate}%</span></div>
                  </div>

                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1">
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

  const selectedVendorInfo = vendorMap[selectedVendorKey];

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto pb-6">
      {/* Header & Oval Gradient Card Style */}
      {/* Header & Oval Gradient Card Style */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gradient-to-r from-[#004C8F]/15 via-card to-blue-500/15 border-2 border-[#004C8F]/40 rounded-full px-5 py-3 shadow-lg focus:outline-none focus:ring-0 focus:border-transparent">
        <div className="leading-tight">
          <h1 className="text-sm font-black tracking-tight text-foreground">Business Statistics</h1>
          <p className="text-[10px] text-muted-foreground font-semibold">
            {selectedVendorKey === 'all' 
              ? 'Showing telemetry for all vendors' 
              : `Filtered by Vendor: [${selectedVendorInfo?.code || selectedVendorKey}] (${selectedVendorInfo?.name || 'Vendor'})`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
          {!hasLoaded ? null : (
            <>
              {/* Dropdown Menu for Tab Navigation */}
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="h-7 rounded-full border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary shadow-2xs"
              >
                <option value="overview">📊 Overview</option>
                <option value="daily">📅 Daily</option>
                <option value="vendor">🏬 By Vendor</option>
                <option value="brand">🏷️ By Brand</option>
                <option value="addons">🛡️ Add-ons</option>
              </select>

              {/* Vendor Filter Dropdown matching DO first 10 chars */}
              <select
                value={selectedVendorKey}
                onChange={(e) => setSelectedVendorKey(e.target.value)}
                className="h-7 rounded-full border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary font-mono shadow-2xs"
              >
                <option value="all">All Vendors ({vendors.length})</option>
                {vendors.map((v) => {
                  const code = String(v.vendor_code || v.code || '').trim().slice(0, 10).toUpperCase();
                  const name = String(v.vendor_name || v.name || 'Vendor').trim();
                  return (
                    <option key={v.id} value={code}>
                      [{code}] ({name})
                    </option>
                  );
                })}
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
                title="Sync metrics"
              >
                <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-7 rounded-full border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary shadow-2xs"
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
              <p className="text-xs font-bold text-foreground">Analytics Engine  (Limit: 2 loads per week)</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-normal">
                Click below to compute combo charts, Vendor telemetry, and daily sales trends for {selectedYear}.
              </p>
            </div>
            {cooldownRemaining !== null ? (
              <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/15 border border-amber-500/40 rounded-full text-amber-600 dark:text-amber-400 text-xs font-bold mt-1">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>Cooldown active: {formatTimeRemaining(cooldownRemaining)}</span>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleInitialLoad}
                className="h-7 px-3 text-xs font-semibold gap-1.5 rounded-full shadow-xs mt-1 bg-[#004C8F] text-white hover:bg-[#003B70]"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Load Analytics</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-14 space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Aggregating {selectedYear} statistics...</p>
        </div>
      ) : (
        <>
          {/* Main Grid: Left Column Single-Column Oval Metric Capsules with Gradients, Right Column Charts/Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            
            {/* Left Column: Vertical Single-Column True Oval Pill Stack with Gradient Colour Themes */}
            <div className="md:col-span-1 flex flex-col items-center gap-2">
              
              {/* Oval Pill 1: Invoices */}
              <div className="w-full h-16 rounded-full bg-gradient-to-r from-blue-600/15 via-card to-blue-500/25 border-2 border-blue-500/50 shadow-lg flex items-center justify-between px-5 hover:scale-[1.02] transition-transform duration-300 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-inner shrink-0">
                    <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">Invoices</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">{selectedYear} Total</span>
                  </div>
                </div>
                <p className="text-base font-black tracking-tight text-foreground font-mono leading-none">
                  {totalCount}
                </p>
              </div>

              {/* Oval Pill 2: Revenue */}
              <div className="w-full h-16 rounded-full bg-gradient-to-r from-emerald-600/15 via-card to-emerald-500/25 border-2 border-emerald-500/50 shadow-lg flex items-center justify-between px-5 hover:scale-[1.02] transition-transform duration-300 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-inner shrink-0">
                    <IndianRupee className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">Revenue</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">Gross volume</span>
                  </div>
                </div>
                <p className="text-sm sm:text-base font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono leading-none truncate max-w-[130px]">
                  {fmtRevenue(Math.round(totalRevenue))}
                </p>
              </div>

              {/* Oval Pill 3: Add-ons Rev */}
              <div className="w-full h-16 rounded-full bg-gradient-to-r from-indigo-600/15 via-card to-indigo-500/25 border-2 border-indigo-500/50 shadow-lg flex items-center justify-between px-5 hover:scale-[1.02] transition-transform duration-300 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-inner shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">Add-ons Rev</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">{totalAddonsCount} add-ons</span>
                  </div>
                </div>
                <p className="text-sm sm:text-base font-black tracking-tight text-indigo-600 dark:text-indigo-400 font-mono leading-none truncate max-w-[130px]">
                  {fmtRevenue(Math.round(totalAddonsRev))}
                </p>
              </div>

              {/* Oval Pill 4: RPC */}
              <div className="w-full h-16 rounded-full bg-gradient-to-r from-amber-600/15 via-card to-amber-500/25 border-2 border-amber-500/50 shadow-lg flex items-center justify-between px-5 hover:scale-[1.02] transition-transform duration-300 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-inner shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">RPC</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">Add-on / inv</span>
                  </div>
                </div>
                <p className="text-sm sm:text-base font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono leading-none truncate max-w-[130px]">
                  ₹{Math.round(rpc).toLocaleString('en-IN')}
                </p>
              </div>

              {/* Oval Pill 5: Attach Rate */}
              <div className="w-full h-16 rounded-full bg-gradient-to-r from-purple-600/15 via-card to-purple-500/25 border-2 border-purple-500/50 shadow-lg flex items-center justify-between px-5 hover:scale-[1.02] transition-transform duration-300 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-inner shrink-0">
                    <BarChart2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">Attach Rate</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">Cross-sale rate</span>
                  </div>
                </div>
                <p className="text-base font-black tracking-tight text-purple-600 dark:text-purple-400 font-mono leading-none">
                  {crossSaleRate.toFixed(1)}%
                </p>
              </div>

              {/* Oval Pill 6: Top Brand */}
              <div className="w-full h-16 rounded-full bg-gradient-to-r from-pink-600/15 via-card to-pink-500/25 border-2 border-pink-500/50 shadow-lg flex items-center justify-between px-5 hover:scale-[1.02] transition-transform duration-300 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-pink-600 text-white flex items-center justify-center shadow-inner shrink-0">
                    <Tag className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">Top Brand</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">{brandData[0] ? `${brandData[0].count} bills` : 'No data'}</span>
                  </div>
                </div>
                <p className="text-xs font-black tracking-tight text-pink-600 dark:text-pink-400 font-mono leading-none truncate max-w-[120px]">
                  {brandData[0]?.label || '—'}
                </p>
              </div>

            </div>

            {/* Right Column: Content Cards */}
            <div className="md:col-span-2 space-y-2.5">
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden">
                  <div className="px-3.5 py-2 border-b border-border/60 text-xs font-bold text-foreground flex items-center gap-1.5">
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
                    <span className="text-[12px] font-bold uppercase text-muted-foreground">Month:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="h-6 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
                    >
                      {FULL_MONTHS.map((m, i) => (
                        <option key={i} value={String(i)}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden">
                    <div className="px-3.5 py-2 border-b border-border/60 text-xs font-bold text-foreground flex items-center gap-1.5">
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

                  <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden">
                    <div className="px-3.5 py-2 border-b border-border/60 text-xs font-bold text-foreground">
                      Daily Breakdown Table
                    </div>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                            <tr>
                              <th className="px-3 py-2">Day</th>
                              <th className="px-3 py-2 text-center">Invoices</th>
                              <th className="px-3 py-2 text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {dailyData
                              .filter((d) => d.count > 0)
                              .map((d, i) => (
                                <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                                  <td className="px-3 py-2 font-medium">
                                    {FULL_MONTHS[parseInt(selectedMonth, 10)].slice(0, 3)} {d.name}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold">{d.count}</td>
                                  <td className="px-3 py-2 text-right font-black text-foreground font-mono">
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

              {/* Tab 3: Vendor Stats with Separate Code and Name Columns */}
              {activeTab === 'vendor' && (
                <div className="space-y-2">
                  <ShareToggle />
                  <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden">
                    <div className="px-3.5 py-2 border-b border-border/60 text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Vendor Performance &amp; Telemetry</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{vendorData.length} Vendors</span>
                    </div>
                    <CardContent className="p-0">
                      {vendorData.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-6 text-center">No records available</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                              <tr>
                                <th className="px-3 py-2 w-8">#</th>
                                <th className="px-3 py-2">Vendor Code</th>
                                <th className="px-3 py-2">Vendor Name</th>
                                <th className="px-3 py-2 text-center">Bills</th>
                                <th className="px-3 py-2 text-right">Revenue</th>
                                <th className="px-3 py-2 text-right">RPC</th>
                                <th className="px-3 py-2 text-right">Attach</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {vendorData.map((d, i) => (
                                <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{i + 1}</td>
                                  <td className="px-3 py-2 font-mono font-bold text-foreground">{d.code}</td>
                                  <td className="px-3 py-2 font-semibold text-foreground truncate max-w-[160px]">{d.name}</td>
                                  <td className="px-3 py-2 text-center font-bold">{d.count}</td>
                                  <td className="px-3 py-2 text-right font-black text-foreground font-mono">
                                    {shareMetric === 'revenue' ? fmtRevenue(d.revenue) : d.count}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400">₹{d.rpc}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-purple-600 dark:text-purple-400">{d.attachRate}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tab 4: Brand */}
              {activeTab === 'brand' && (
                <div className="space-y-2">
                  <ShareToggle />
                  <ShareCards data={brandData} metricLabel="Brand" />
                </div>
              )}

              {/* Tab 5: Add-ons */}
              {activeTab === 'addons' && (
                <div className="space-y-2">
                  <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden">
                    <div className="px-3.5 py-2 border-b border-border/60 text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      Add-ons &amp; Insurance Breakdown — {selectedYear}
                    </div>
                    <CardContent className="p-0">
                      {addonTypeStats.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-6 text-center">
                          No add-ons or insurance plans attached in {selectedYear}
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                              <tr>
                                <th className="px-3 py-2 w-8">#</th>
                                <th className="px-3 py-2">Add-on / Insurance Plan</th>
                                <th className="px-3 py-2 text-center">Attached Count</th>
                                <th className="px-3 py-2 text-right">Total Revenue</th>
                                <th className="px-3 py-2 text-right">Share</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {addonTypeStats.map((a, i) => (
                                <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{i + 1}</td>
                                  <td className="px-3 py-2 font-semibold text-foreground truncate max-w-[220px]">
                                    {a.label}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold">{a.count}</td>
                                  <td className="px-3 py-2 text-right font-black text-foreground font-mono">
                                    ₹{a.revenue.toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-primary">
                                    {totalAddonsRev > 0 ? ((a.revenue / totalAddonsRev) * 100).toFixed(1) : 0}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-muted/60 font-bold border-t border-border text-[12px]">
                              <tr>
                                <td className="px-3 py-2.5" colSpan={2}>
                                  Total Add-ons
                                </td>
                                <td className="px-3 py-2.5 text-center">{totalAddonsCount}</td>
                                <td className="px-3 py-2.5 text-right font-black text-foreground font-mono">
                                  ₹{totalAddonsRev.toLocaleString('en-IN')}
                                </td>
                                <td className="px-3 py-2.5 text-right">100%</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}