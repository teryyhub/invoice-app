// src/pages/Reports.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  X,
  AlertCircle,
  ShieldCheck,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
} from 'lucide-react';
import {
  format,
  isValid,
  differenceInDays,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

async function saveExcelToDownloadsFolder(fileName, base64Data, recordCount) {
  try {
    if (Capacitor.getPlatform() === 'android') {
      const perm = await Filesystem.requestPermissions();
      if (perm.publicStorage !== 'granted') {
        toast.error('Storage permission is required to save to Download/CM Invoice/.', {
          duration: 8000,
        });
        return;
      }
    }

    const relativePath = `Download/CM Invoice/${fileName}`;
    await Filesystem.writeFile({
      path: relativePath,
      data: base64Data,
      directory: Directory.ExternalStorage,
      recursive: true,
    });

    toast.success(`Saved ${recordCount} records to ${relativePath}`, { duration: 5000 });
  } catch (err) {
    const msg = String(err?.message || err);
    toast.error('Save failed: ' + msg, { duration: 10000 });
    throw err;
  }
}

// Single-box Flow Calendar Picker Component
function FlowCalendarPicker({ startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : null;

  const handleDayClick = (day) => {
    if (!start || (start && end)) {
      onChange({ start: format(day, 'yyyy-MM-dd'), end: '' });
      return;
    }

    if (start && !end) {
      if (isSameDay(day, start)) {
        onChange({ start: format(day, 'yyyy-MM-dd'), end: format(day, 'yyyy-MM-dd') });
        setIsOpen(false);
      } else if (day < start) {
        onChange({ start: format(day, 'yyyy-MM-dd'), end: '' });
      } else {
        if (differenceInDays(day, start) > 92) {
          toast.error('Maximum custom date range allowed is 3 months.');
          const maxEnd = addMonths(start, 3);
          onChange({ start: format(start, 'yyyy-MM-dd'), end: format(maxEnd, 'yyyy-MM-dd') });
        } else {
          onChange({ start: format(start, 'yyyy-MM-dd'), end: format(day, 'yyyy-MM-dd') });
          setIsOpen(false);
        }
      }
    }
  };

  const formatDisplayLabel = () => {
    if (!start) return 'Select Range (Max 3 Mo)';
    const startStr = isValid(start) ? format(start, 'dd MMM yyyy') : '';
    const endStr = end && isValid(end) ? format(end, 'dd MMM yyyy') : '';

    if (!endStr || startStr === endStr) {
      return startStr;
    }
    return `${startStr} — ${endStr}`;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-6 rounded-full border border-border bg-background px-3 text-[11px] font-medium text-foreground cursor-pointer hover:border-primary transition-colors select-none"
      >
        <CalendarIcon className="w-3 h-3 text-primary shrink-0" />
        <span className="truncate">{formatDisplayLabel()}</span>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange({ start: '', end: '' });
            }}
            className="text-muted-foreground hover:text-foreground ml-1"
            title="Clear dates"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 w-64 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-6 w-6 rounded p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-6 w-6 rounded p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted-foreground">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {Array.from({ length: startDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}

            {daysInMonth.map((day) => {
              const isSelectedStart = start && isSameDay(day, start);
              const isSelectedEnd = end && isSameDay(day, end);
              const isInBetween = start && end && isWithinInterval(day, { start, end });

              let btnStyle = 'hover:bg-accent text-foreground';
              if (isSelectedStart || isSelectedEnd) {
                btnStyle = 'bg-primary text-primary-foreground font-bold rounded-md';
              } else if (isInBetween) {
                btnStyle = 'bg-primary/10 text-primary rounded-none';
              }

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`h-7 w-full flex items-center justify-center text-[11px] transition-colors ${btnStyle}`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ start: '', end: '' });
                setIsOpen(false);
              }}
              className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 px-3 text-[10px]"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RankedTable({ title, icon: Icon, rows, totalSales }) {
  const max = rows[0]?.revenue || 1;

  return (
    <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden">
      <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-border/60 bg-muted/20">
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
                <div key={i} className="px-3.5 py-2 space-y-1 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between text-xs leading-tight">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">
                        #{i + 1}
                      </span>
                      <span className="font-semibold text-foreground truncate font-mono">{r.name || '—'}</span>
                    </div>
                    <div className="text-right shrink-0 leading-none">
                      <span className="font-bold text-foreground font-mono">
                        ₹{r.revenue.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        {r.count} bill{r.count !== 1 ? 's' : ''} ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
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

// Day-Wise Interactive Graph Component (Invoice Count, RPC Value, or Both)
function DayWiseChart({ dayStats, metricMode }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!dayStats || dayStats.length === 0) return null;

  const showCount = metricMode === 'count' || metricMode === 'both';
  const showRpc = metricMode === 'rpc' || metricMode === 'both';

  const maxCount = Math.max(1, ...dayStats.map((d) => d.count));
  const maxRpc = Math.max(1, ...dayStats.map((d) => d.rpc));

  const chartHeight = 190;
  const padTop = 20;
  const padBottom = 34;
  const padLeft = 36;
  const padRight = metricMode === 'both' ? 46 : 20;
  const plotHeight = chartHeight - padTop - padBottom;

  const slotWidth = Math.max(26, Math.min(48, Math.floor(680 / Math.max(1, dayStats.length))));
  const chartWidth = Math.max(320, padLeft + padRight + dayStats.length * slotWidth);

  const getCountY = (val) => padTop + plotHeight - (val / maxCount) * plotHeight;
  const getRpcY = (val) => padTop + plotHeight - (val / maxRpc) * plotHeight;

  const rpcPoints = dayStats.map((d, idx) => {
    const x = padLeft + idx * slotWidth + slotWidth / 2;
    const y = getRpcY(d.rpc);
    return { x, y, val: d.rpc };
  });

  const rpcPolyline = rpcPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const activePoint = hoveredIdx !== null && dayStats[hoveredIdx] ? dayStats[hoveredIdx] : null;

  return (
    <div className="space-y-2">
      {/* Legend & Active Hover Readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
        <div className="flex items-center gap-3">
          {showCount && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#004C8F] inline-block" />
              Invoice Count
            </span>
          )}
          {showRpc && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              RPC Value (₹)
            </span>
          )}
        </div>

        {activePoint ? (
          <div className="flex items-center gap-2 bg-muted/60 border border-border px-2.5 py-0.5 rounded-full font-mono text-[10px]">
            <span className="font-bold text-foreground">{activePoint.displayDate}</span>
            {showCount && (
              <span className="text-[#004C8F] dark:text-blue-400 font-bold">
                Bills: {activePoint.count}
              </span>
            )}
            {showRpc && (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                RPC: ₹{(Math.round(activePoint.rpc * 100) / 100).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">Tap or hover a day bar for exact metrics</span>
        )}
      </div>

      {/* Horizontal Scrollable SVG Chart */}
      <div className="w-full overflow-x-auto rounded-lg border border-border/60 bg-background/60 p-2">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="block mx-auto select-none"
        >
          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
            const y = padTop + plotHeight * (1 - t);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/60"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                  strokeWidth="1"
                />
                {showCount && (
                  <text
                    x={padLeft - 5}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground font-mono text-[9px]"
                  >
                    {Math.round(maxCount * t)}
                  </text>
                )}
                {!showCount && showRpc && (
                  <text
                    x={padLeft - 5}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground font-mono text-[9px]"
                  >
                    ₹{Math.round(maxRpc * t)}
                  </text>
                )}
                {metricMode === 'both' && (
                  <text
                    x={chartWidth - padRight + 5}
                    y={y + 3}
                    textAnchor="start"
                    className="fill-amber-600 dark:fill-amber-400 font-mono text-[9px]"
                  >
                    ₹{Math.round(maxRpc * t)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Bars (Invoice Count or RPC Value when RPC-only mode) */}
          {dayStats.map((d, idx) => {
            const xCenter = padLeft + idx * slotWidth + slotWidth / 2;
            const barWidth = Math.max(10, Math.min(24, slotWidth * 0.55));
            const isHovered = hoveredIdx === idx;

            const barValue = showCount ? d.count : d.rpc;
            const barTop = showCount ? getCountY(d.count) : getRpcY(d.rpc);
            const barHeight = Math.max(0, padTop + plotHeight - barTop);

            return (
              <g
                key={d.dateKey}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(idx)}
                className="cursor-pointer"
              >
                {/* Hover Column Highlight */}
                <rect
                  x={padLeft + idx * slotWidth}
                  y={padTop}
                  width={slotWidth}
                  height={plotHeight}
                  fill="currentColor"
                  className={isHovered ? 'text-primary/10' : 'text-transparent'}
                />

                {/* Data Bar */}
                {barValue > 0 && (
                  <rect
                    x={xCenter - barWidth / 2}
                    y={barTop}
                    width={barWidth}
                    height={barHeight}
                    rx={3}
                    fill={showCount ? '#004C8F' : '#f59e0b'}
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* Value Label above Bar */}
                {barValue > 0 && (
                  <text
                    x={xCenter}
                    y={Math.max(11, barTop - 4)}
                    textAnchor="middle"
                    className="fill-foreground font-mono font-bold text-[9px]"
                  >
                    {showCount ? d.count : `₹${Math.round(d.rpc)}`}
                  </text>
                )}

                {/* X-Axis Day Label */}
                <text
                  x={xCenter}
                  y={padTop + plotHeight + 14}
                  textAnchor="middle"
                  className={`font-mono text-[9px] ${
                    isHovered ? 'fill-primary font-bold' : 'fill-muted-foreground'
                  }`}
                >
                  {d.shortLabel}
                </text>
              </g>
            );
          })}

          {/* Overlay Line for RPC when Both is selected */}
          {metricMode === 'both' && rpcPoints.length > 0 && (
            <g pointerEvents="none">
              {rpcPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={rpcPolyline}
                />
              )}
              {rpcPoints.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIdx === idx ? 4.5 : 3}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              ))}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();

  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [dateMode, setDateMode] = useState('monthly'); // 'monthly' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [dayWiseMetric, setDayWiseMetric] = useState('both'); // 'count' | 'rpc' | 'both'
  const [detailSort, setDetailSort] = useState({ key: 'invoice_date', direction: 'desc' });
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
    isFetching: fetchingInvoicesVendors,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ['reports-vendors', user?.id],
    queryFn: () => VendorProfile.list(100),
    enabled: hasLoaded && !!user?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const isLoadingData = hasLoaded && (loadingInvoices || loadingVendors);
  const isRefreshing = (fetchingInvoices || fetchingInvoicesVendors) && !isLoadingData;

  useEffect(() => {
    let timer;
    if (isLoadingData) {
      timer = setTimeout(() => {
        setLoadTimedOut(true);
      }, 8000);
    } else {
      setLoadTimedOut(false);
    }
    return () => clearTimeout(timer);
  }, [isLoadingData]);

  const handleInitialLoad = () => {
    setLoadTimedOut(false);
    setHasLoaded(true);
  };

  const handleRefresh = () => {
    refetchInvoices();
    refetchVendors();
  };

  // Map Vendor Profiles by first 10 characters of vendor_code
  const vendorMap = useMemo(() => {
    const m = {};
    if (Array.isArray(vendors)) {
      vendors.forEach((v) => {
        const rawCode = String(v.vendor_code || v.code || '').trim();
        const codeKey = rawCode.slice(0, 10).toUpperCase();
        const name = String(v.vendor_name || v.name || 'Vendor').trim();
        if (codeKey) {
          m[codeKey] = { code: codeKey, name };
        }
      });
    }
    return m;
  }, [vendors]);

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

      const t = d.getTime();
      if (startBoundary && t < startBoundary) return false;
      if (endBoundary && t > endBoundary) return false;
      return true;
    });
  }, [invoices, dateMode, selectedMonth, selectedYear, customStart, customEnd, hasLoaded]);

  const totalSales = filtered.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const totalCount = filtered.length;
  const avgValue = totalCount > 0 ? Math.round(totalSales / totalCount) : 0;

  // Add-ons Stats Aggregation
  const { addonStats, totalAddonsRevenue, totalAddonsCount } = useMemo(() => {
    const map = {};
    let revSum = 0;
    let countSum = 0;

    filtered.forEach((inv) => {
      if (inv.addons && Array.isArray(inv.addons)) {
        inv.addons.forEach((addon) => {
          const name = addon.name || addon.id || 'Unknown Add-on';
          const amt = Number(addon.amount) || 0;
          if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
          map[name].revenue += amt;
          map[name].count += 1;
          revSum += amt;
          countSum += 1;
        });
      }
    });

    const stats = Object.values(map).sort((a, b) => b.revenue - a.revenue);
    return { addonStats: stats, totalAddonsRevenue: revSum, totalAddonsCount: countSum };
  }, [filtered]);

  // Day-wise Stats Aggregation (Invoice Count + RPC Value)
  const dayStats = useMemo(() => {
    const map = {};

    filtered.forEach((inv) => {
      const raw = inv.invoice_date || inv.created_date || inv.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (!isValid(d)) return;

      const dateKey = format(d, 'yyyy-MM-dd');
      if (!map[dateKey]) {
        map[dateKey] = {
          dateKey,
          shortLabel: format(d, 'dd MMM'),
          displayDate: format(d, 'dd MMM yyyy'),
          count: 0,
          revenue: 0,
          addonRevenue: 0,
        };
      }

      map[dateKey].count += 1;
      map[dateKey].revenue += Number(inv.grand_total) || 0;

      if (inv.addons && Array.isArray(inv.addons)) {
        inv.addons.forEach((addon) => {
          map[dateKey].addonRevenue += Number(addon.amount) || 0;
        });
      }
    });

    return Object.values(map)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map((d) => ({
        ...d,
        rpc: d.count > 0 ? d.addonRevenue / d.count : 0,
      }));
  }, [filtered]);

  // Consolidated Vendor Stats with 10-char DO match & Deduplication with Separate Code and Name
  const vendorStats = useMemo(() => {
    const map = {};

    filtered.forEach((inv) => {
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
          revenue: 0,
          count: 0,
          addonRevenue: 0,
          addonCount: 0,
        };
      } else {
        if (map[key].name === 'Vendor' && resolvedName !== 'Vendor') {
          map[key].name = resolvedName;
        }
      }

      map[key].revenue += Number(inv.grand_total) || 0;
      map[key].count += 1;

      if (inv.addons && Array.isArray(inv.addons)) {
        inv.addons.forEach((addon) => {
          map[key].addonRevenue += Number(addon.amount) || 0;
          map[key].addonCount += 1;
        });
      }
    });

    return Object.values(map).map((v) => ({
      ...v,
      rpc: v.count > 0 ? v.addonRevenue / v.count : 0,
      addonShare: totalAddonsRevenue > 0 ? (v.addonRevenue / totalAddonsRevenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, vendorMap, totalAddonsRevenue]);

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

  // Detail Table Sorting
  const handleDetailSort = (key) => {
    setDetailSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const sortedDetailInvoices = useMemo(() => {
    const list = [...filtered];
    const { key, direction } = detailSort;
    const mult = direction === 'asc' ? 1 : -1;

    const getSortValue = (inv) => {
      switch (key) {
        case 'invoice_number':
          return String(inv.invoice_number || '').toLowerCase();
        case 'invoice_date': {
          const d = new Date(inv.invoice_date || inv.created_date || inv.created_at || 0);
          return isValid(d) ? d.getTime() : 0;
        }
        case 'delivery_order_number':
          return String(inv.delivery_order_number || '').toLowerCase();
        case 'customer_name':
          return String(inv.customer_name || '').toLowerCase();
        case 'customer_mobile':
          return String(inv.customer_mobile || '').toLowerCase();
        case 'product_model':
          return String(inv.product_model || '').toLowerCase();
        case 'product_description':
          return String(inv.product_description || inv.brand_name || '').toLowerCase();
        case 'imei_serial':
          return String(inv.imei_serial || '').toLowerCase();
        case 'addons_count':
          return Array.isArray(inv.addons) ? inv.addons.length : 0;
        case 'addons_total':
          return Array.isArray(inv.addons)
            ? inv.addons.reduce((s, a) => s + (Number(a.amount) || 0), 0)
            : 0;
        case 'grand_total':
          return Number(inv.grand_total) || 0;
        default:
          return 0;
      }
    };

    list.sort((a, b) => {
      const va = getSortValue(a);
      const vb = getSortValue(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * mult;
      }
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * mult;
    });

    return list;
  }, [filtered, detailSort]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDetailInvoices.slice(start, start + pageSize);
  }, [sortedDetailInvoices, currentPage]);

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

  const handleExportXLSX = async () => {
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
      ['Total Add-ons Revenue (₹)', totalAddonsRevenue],
      ['Total Add-ons Attached', totalAddonsCount],
      ['Average Invoice Value (₹)', avgValue],
      ['Brands Active', brandStats.length],
      ['Vendors Active', vendorStats.length],
      [],
      ['TOP VENDORS'],
      ['#', 'Vendor Code', 'Vendor Name', 'Invoices', 'Revenue (₹)', 'RPC (₹)', 'Add-on Rev (₹)', 'Add-on Share (%)', 'Share (%)'],
      ...vendorStats.slice(0, 8).map((v, i) => [
        i + 1,
        v.code,
        v.name,
        v.count,
        v.revenue,
        Math.round(v.rpc * 100) / 100,
        v.addonRevenue,
        +v.addonShare.toFixed(1),
        totalSales > 0 ? +((v.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
      [],
      ['TOP ADD-ONS & INSURANCE'],
      ['#', 'Add-on Name', 'Attached Count', 'Revenue (₹)', 'Share (%)'],
      ...addonStats.map((a, i) => [
        i + 1,
        a.name,
        a.count,
        a.revenue,
        totalAddonsRevenue > 0 ? +((a.revenue / totalAddonsRevenue) * 100).toFixed(1) : 0,
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
    ws1['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Overview');

    // Sheet 2: Day Wise
    const dayRows = [
      [`DAY-WISE REPORT: ${reportLabel}`],
      [],
      ['#', 'Date', 'Invoice Count', 'RPC Value (₹)', 'Add-on Revenue (₹)', 'Total Revenue (₹)'],
      ...dayStats.map((d, i) => [
        i + 1,
        d.dateKey,
        d.count,
        Math.round(d.rpc * 100) / 100,
        d.addonRevenue,
        d.revenue,
      ]),
      [],
      [
        '',
        'TOTAL / AVG',
        totalCount,
        totalCount > 0 ? Math.round((totalAddonsRevenue / totalCount) * 100) / 100 : 0,
        totalAddonsRevenue,
        totalSales,
      ],
    ];
    const wsDay = XLSX.utils.aoa_to_sheet(dayRows);
    wsDay['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsDay, 'Day Wise');

    // Sheet 3: By Vendor
    const vendorRows = [
      [`VENDOR-WISE REPORT: ${reportLabel}`],
      [],
      ['#', 'Vendor Code', 'Vendor Name', 'Invoices', 'Revenue (₹)', 'RPC (₹)', 'Add-on Rev (₹)', 'Add-on Share (%)', 'Avg Invoice (₹)', 'Share (%)'],
      ...vendorStats.map((v, i) => [
        i + 1,
        v.code,
        v.name,
        v.count,
        v.revenue,
        Math.round(v.rpc * 100) / 100,
        v.addonRevenue,
        +v.addonShare.toFixed(1),
        Math.round(v.revenue / v.count),
        totalSales > 0 ? +((v.revenue / totalSales) * 100).toFixed(1) : 0,
      ]),
      [],
      ['', '', 'TOTAL', totalCount, totalSales, totalCount > 0 ? Math.round((totalAddonsRevenue / totalCount) * 100) / 100 : 0, totalAddonsRevenue, 100, avgValue, 100],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(vendorRows);
    ws2['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'By Vendor');

    // Sheet 4: By Brand
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

    // Sheet 5: Add-ons
    const addonRows = [
      [`ADD-ONS & INSURANCE REPORT: ${reportLabel}`],
      [],
      ['#', 'Add-on / Insurance Plan', 'Attached Count', 'Total Revenue (₹)', 'Share (%)'],
      ...addonStats.map((a, i) => [
        i + 1,
        a.name,
        a.count,
        a.revenue,
        totalAddonsRevenue > 0 ? +((a.revenue / totalAddonsRevenue) * 100).toFixed(1) : 0,
      ]),
      [],
      ['', 'TOTAL', totalAddonsCount, totalAddonsRevenue, 100],
    ];
    const wsAddon = XLSX.utils.aoa_to_sheet(addonRows);
    wsAddon['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsAddon, 'Add-ons');

    // Sheet 6: Top Products
    const productRows = [
      [`TOP PRODUCTS: ${reportLabel}`],
      [],
      ['#', 'Product', 'Units Sold', 'Revenue (₹)'],
      ...productStats.map((p, i) => [i + 1, p.name, p.count, p.revenue]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(productRows);
    ws4['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Top Products');

    // Sheet 7: Detailed Invoices
    const detailRows = [
      [`DETAILED INVOICE LIST: ${reportLabel}`],
      [],
      [
        'Invoice No', 'Date', 'App ID', 'Customer', 'Mobile',
        'Asset', 'Brand', 'IMEI', 'Scheme', 'Add-ons Count', 'Add-ons Total (₹)', 'Total (₹)',
      ],
      ...sortedDetailInvoices.map((inv) => {
        const invAddons = inv.addons && Array.isArray(inv.addons) ? inv.addons : [];
        const addonsSum = invAddons.reduce((s, a) => s + (Number(a.amount) || 0), 0);
        return [
          inv.invoice_number || '',
          inv.invoice_date || '',
          inv.delivery_order_number || '',
          inv.customer_name || '',
          inv.customer_mobile || '',
          inv.product_model || '',
          inv.product_description || '',
          inv.imei_serial || '',
          inv.mode || '',
          invAddons.length,
          addonsSum,
          inv.grand_total || 0,
        ];
      }),
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(detailRows);
    ws5['!cols'] = [
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws5, 'Detail');

    const fileName = `Report_${reportLabel.replace(/[\s–—]+/g, '_')}.xlsx`;

    try {
      if (Capacitor.isNativePlatform()) {
        const wbBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        await saveExcelToDownloadsFolder(fileName, wbBase64, totalCount);
      } else {
        XLSX.writeFile(wb, fileName);
        toast.success(`Exported ${totalCount} records (7 sheets)`);
      }
    } catch (err) {
      console.error('Excel export failed:', err);
    }
  };

  const renderSortHeader = (label, sortKey, align = 'left') => {
    const isActive = detailSort.key === sortKey;
    return (
      <th
        onClick={() => handleDetailSort(sortKey)}
        className={`px-3 py-2 whitespace-nowrap cursor-pointer select-none hover:bg-muted/80 hover:text-foreground transition-colors ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        } ${isActive ? 'text-primary font-bold' : ''}`}
        title={`Sort by ${label}`}
      >
        <span
          className={`inline-flex items-center gap-1 ${
            align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          {isActive ? (
            detailSort.direction === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-primary shrink-0" />
            ) : (
              <ArrowDown className="w-3 h-3 text-primary shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-2.5 h-2.5 opacity-40 shrink-0" />
          )}
        </span>
      </th>
    );
  };

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto pb-6">
      {/* Page Header & Oval Gradient Card Style */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gradient-to-r from-[#004C8F]/15 via-card to-blue-500/15 border-2 border-[#004C8F]/40 rounded-full px-5 py-3 shadow-lg">
        <div className="leading-tight">
          <h1 className="text-sm font-black tracking-tight text-foreground">Sales &amp; Analytics Reports</h1>
          <p className="text-[10px] text-muted-foreground font-semibold">
            {hasLoaded ? `Metrics for ${reportLabel}` : 'On-demand analytics reports (Max range: 3 months)'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
          {!hasLoaded ? (
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-3 text-xs gap-1.5 font-semibold rounded-full shadow-xs bg-[#004C8F] text-white hover:bg-[#003B70]"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Reports</span>
            </Button>
          ) : (
            <>

              {/* Dropdown Navigation Menu for View Selection */}
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="h-7 rounded-full border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary shadow-2xs"
              >
                <option value="overview">📊 Overview</option>
                <option value="daywise">📅 Day Wise</option>
                <option value="vendor">🏬 By Vendor</option>
                <option value="brand">🏷️ By Brand</option>
                <option value="addons">🛡️ Add-ons</option>
                <option value="detail">📄 Detail</option>
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
                title="Sync analytics data"
              >
                <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportXLSX}
                className="h-7 px-3 text-[11px] gap-1 rounded-full bg-[#004C8F] text-white hover:bg-[#003B70] border-none shadow-2xs"
              >
                <Download className="w-3 h-3" />
                <span>Excel (.xlsx)</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Date Filter Strip with Custom Range Toggle */}
      <div className="flex flex-wrap items-center gap-1.5 bg-card border border-border/80 p-1.5 rounded-full px-4 shadow-2xs">
        {/* Mode Selector */}
        <div className="flex bg-muted/40 p-0.5 rounded-full border border-border/60">
          <button
            type="button"
            onClick={() => {
              setDateMode('monthly');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors ${
              dateMode === 'monthly'
                ? 'bg-[#004C8F] text-white shadow-xs'
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
            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors ${
              dateMode === 'custom'
                ? 'bg-[#004C8F] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Custom Range (Max 3 Mo)
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
              className="h-6 rounded-full border border-border bg-background px-3 text-[11px] font-medium text-foreground outline-none focus:border-primary"
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
              className="h-6 rounded-full border border-border bg-background px-3 text-[11px] font-medium text-foreground outline-none focus:border-primary"
            >
              {['2023', '2024', '2025', '2026', '2027'].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          /* Custom Date Selection via Single Box Calendar Picker using handleDayClick */
          <div className="flex items-center gap-1.5 flex-wrap relative">
            <FlowCalendarPicker
              startDate={customStart}
              endDate={customEnd}
              onChange={({ start, end }) => {
                setCustomStart(start);
                setCustomEnd(end);
                setCurrentPage(1);
              }}
            />

            {(customStart || customEnd) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                  setCurrentPage(1);
                }}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-0.5 rounded-full"
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
              <p className="text-xs font-bold text-foreground">Sales Analytics (Max range: 3 months)</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-normal">
                Click below to calculate revenue, vendor shares, and brand stats for {reportLabel}.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleInitialLoad}
              className="h-7 px-3 text-xs font-semibold gap-1.5 rounded-full shadow-xs mt-1 bg-[#004C8F] text-white hover:bg-[#003B70]"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Analytics Data</span>
            </Button>
          </CardContent>
        </Card>
      ) : isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-14 space-y-2">
          {loadTimedOut ? (
            <div className="text-center space-y-2.5 bg-destructive/10 border border-destructive/20 p-4 rounded-xl max-w-sm">
              <div className="flex items-center justify-center gap-1.5 text-destructive font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Loading took longer than expected.</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                The database query or network timed out. Click below to reset and try again.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHasLoaded(false);
                  setLoadTimedOut(false);
                }}
                className="h-7 text-xs border-destructive text-destructive hover:bg-destructive hover:text-white rounded-full"
              >
                Reset &amp; Try Again
              </Button>
            </div>
          ) : (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Aggregating {reportLabel} records...</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Key Metric Tiles with 3 Dynamic Grid Modes (1x4, 2x2, 4x1) */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Tile 1: Invoices */}
            <div className="w-full min-h-[4rem] h-auto py-2 rounded-2xl sm:rounded-full bg-gradient-to-r from-blue-600/15 via-card to-blue-500/25 border-2 border-blue-500/50 shadow-lg flex items-center justify-between px-4 select-none gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-inner shrink-0 text-xs font-bold">
                  #
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-foreground block">Invoices</span>
                  <span className="text-[9px] text-muted-foreground font-semibold block">Total count</span>
                </div>
              </div>
              <p className="text-sm sm:text-base font-black text-foreground font-mono leading-none shrink-0 pl-1">{totalCount}</p>
            </div>

            {/* Tile 2: Revenue */}
            <div className="w-full min-h-[4rem] h-auto py-2 rounded-2xl sm:rounded-full bg-gradient-to-r from-emerald-600/15 via-card to-emerald-500/25 border-2 border-emerald-500/50 shadow-lg flex items-center justify-between px-4 select-none gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-inner shrink-0 text-xs font-bold">
                  ₹
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-foreground block">Revenue</span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block">Gross billed</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none shrink-0 pl-1">
                ₹{totalSales.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Tile 3: Add-ons Rev */}
            <div className="w-full min-h-[4rem] h-auto py-2 rounded-2xl sm:rounded-full bg-gradient-to-r from-indigo-600/15 via-card to-indigo-500/25 border-2 border-indigo-500/50 shadow-lg flex items-center justify-between px-4 select-none gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-inner shrink-0 text-xs font-bold">
                  +
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-foreground block">Add-ons Rev</span>
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold block">{totalAddonsCount} attached</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono leading-none shrink-0 pl-1">
                ₹{totalAddonsRevenue.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Tile 4: Active Vendors */}
            <div className="w-full min-h-[4rem] h-auto py-2 rounded-2xl sm:rounded-full bg-gradient-to-r from-purple-600/15 via-card to-purple-500/25 border-2 border-purple-500/50 shadow-lg flex items-center justify-between px-4 select-none gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-inner shrink-0 text-xs font-bold">
                  ⚡
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-foreground block">Active Vendors</span>
                  <span className="text-[9px] text-muted-foreground font-semibold block">{brandStats.length} Brands active</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400 font-mono leading-none shrink-0 pl-1">
                {vendorStats.length} Vendors
              </p>
            </div>
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <RankedTable
                title="Top Vendors"
                icon={Store}
                rows={vendorStats.slice(0, 8).map((v) => ({ ...v, name: `[${v.code}] (${v.name})` }))}
                totalSales={totalSales}
              />
              <RankedTable
                title="Top Brands"
                icon={Tag}
                rows={brandStats.slice(0, 8)}
                totalSales={totalSales}
              />

              {/* Product Leaderboard */}
              <Card className="rounded-xl border-border/80 shadow-none bg-card md:col-span-2 overflow-hidden">
                <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-border/60 bg-muted/20">
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
                            className="px-3.5 py-2 space-y-1 hover:bg-muted/20 transition-colors"
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
                            <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
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

          {/* Day Wise Tab (Invoice Count, RPC Value, or Both + Interactive Graph) */}
          {activeTab === 'daywise' && (
            <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden mt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-bold text-foreground">Day-Wise Trend &amp; Breakdown</span>
                  <span className="text-[10px] text-muted-foreground">({dayStats.length} active days)</span>
                </div>

                {/* Parameter Selector: Invoice Count | RPC Value | Both */}
                <div className="flex bg-muted/50 p-0.5 rounded-full border border-border/70">
                  {[
                    { id: 'count', label: 'Invoice Count' },
                    { id: 'rpc', label: 'RPC Value' },
                    { id: 'both', label: 'Both' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDayWiseMetric(opt.id)}
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full transition-colors cursor-pointer ${
                        dayWiseMetric === opt.id
                          ? 'bg-[#004C8F] text-white shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <CardContent className="p-3 space-y-3">
                {dayStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-6 text-center">
                    No daily records for {reportLabel}
                  </p>
                ) : (
                  <>
                    {/* Graph */}
                    <DayWiseChart dayStats={dayStats} metricMode={dayWiseMetric} />

                    {/* Day-Wise Data Table */}
                    <div className="overflow-x-auto rounded-lg border border-border/70">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase border-b border-border font-semibold">
                          <tr>
                            <th className="px-3 py-2 w-8">#</th>
                            <th className="px-3 py-2">Date</th>
                            {(dayWiseMetric === 'count' || dayWiseMetric === 'both') && (
                              <th className="px-3 py-2 text-center">Invoice Count</th>
                            )}
                            {(dayWiseMetric === 'rpc' || dayWiseMetric === 'both') && (
                              <th className="px-3 py-2 text-right">RPC Value (₹)</th>
                            )}
                            <th className="px-3 py-2 text-right">Add-on Rev</th>
                            <th className="px-3 py-2 text-right">Day Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {dayStats.map((d, i) => (
                            <tr key={d.dateKey} className="hover:bg-muted/30 transition-colors leading-tight">
                              <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2 font-mono font-semibold text-foreground">{d.displayDate}</td>
                              {(dayWiseMetric === 'count' || dayWiseMetric === 'both') && (
                                <td className="px-3 py-2 text-center font-bold text-[#004C8F] dark:text-blue-400">
                                  {d.count}
                                </td>
                              )}
                              {(dayWiseMetric === 'rpc' || dayWiseMetric === 'both') && (
                                <td className="px-3 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                  ₹{(Math.round(d.rpc * 100) / 100).toLocaleString('en-IN')}
                                </td>
                              )}
                              <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                                ₹{d.addonRevenue.toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-black text-foreground">
                                ₹{d.revenue.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/60 font-bold border-t border-border text-[11px]">
                          <tr>
                            <td className="px-3 py-2.5" colSpan={2}>
                              Total / Overall RPC
                            </td>
                            {(dayWiseMetric === 'count' || dayWiseMetric === 'both') && (
                              <td className="px-3 py-2.5 text-center">{totalCount}</td>
                            )}
                            {(dayWiseMetric === 'rpc' || dayWiseMetric === 'both') && (
                              <td className="px-3 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                                ₹{totalCount > 0 ? (Math.round((totalAddonsRevenue / totalCount) * 100) / 100).toLocaleString('en-IN') : 0}
                              </td>
                            )}
                            <td className="px-3 py-2.5 text-right font-mono">
                              ₹{totalAddonsRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-black text-foreground">
                              ₹{totalSales.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* By Vendor Tab with Separate Vendor Code and Vendor Name Columns */}
          {activeTab === 'vendor' && (
            <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden mt-2">
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
                          <th className="px-3 py-2 w-8">#</th>
                          <th className="px-3 py-2">Vendor Code</th>
                          <th className="px-3 py-2">Vendor Name</th>
                          <th className="px-3 py-2 text-center">Bills</th>
                          <th className="px-3 py-2 text-right">Revenue</th>
                          <th className="px-3 py-2 text-right">RPC (₹)</th>
                          <th className="px-3 py-2 text-right">Add-on Rev</th>
                          <th className="px-3 py-2 text-right">Add-on Share</th>
                          <th className="px-3 py-2 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {vendorStats.map((v, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                            <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-foreground">
                              {v.code}
                            </td>
                            <td className="px-3 py-2 font-semibold text-foreground truncate max-w-[180px]">
                              {v.name}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">{v.count}</td>
                            <td className="px-3 py-2 text-right font-black text-foreground font-mono">
                              ₹{v.revenue.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              ₹{(Math.round(v.rpc * 100) / 100).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-blue-600 dark:text-blue-400 font-mono">
                              ₹{v.addonRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {v.addonShare.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-primary">
                              {totalSales > 0 ? ((v.revenue / totalSales) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/60 font-bold border-t border-border text-[11px]">
                        <tr>
                          <td className="px-3 py-2.5" colSpan={3}>
                            Total
                          </td>
                          <td className="px-3 py-2.5 text-center">{totalCount}</td>
                          <td className="px-3 py-2.5 text-right font-black text-foreground font-mono">
                            ₹{totalSales.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">
                            ₹{totalCount > 0 ? (Math.round((totalAddonsRevenue / totalCount) * 100) / 100).toLocaleString('en-IN') : 0}
                          </td>
                          <td className="px-3 py-2.5 text-right text-blue-600 dark:text-blue-400 font-mono">
                            ₹{totalAddonsRevenue.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-right">100%</td>
                          <td className="px-3 py-2.5 text-right">100%</td>
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
            <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden mt-2">
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
                          <th className="px-3 py-2 w-8">#</th>
                          <th className="px-3 py-2">Brand / Category</th>
                          <th className="px-3 py-2 text-center">Units Sold</th>
                          <th className="px-3 py-2 text-right">Revenue</th>
                          <th className="px-3 py-2 text-right">Avg Unit</th>
                          <th className="px-3 py-2 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {brandStats.map((b, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                            <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2 font-semibold text-foreground truncate max-w-[200px]">
                              {b.name}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">{b.count}</td>
                            <td className="px-3 py-2 text-right font-black text-foreground">
                              ₹{b.revenue.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              ₹{Math.round(b.revenue / b.count).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-primary">
                              {totalSales > 0 ? ((b.revenue / totalSales) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/60 font-bold border-t border-border text-[11px]">
                        <tr>
                          <td className="px-3 py-2.5" colSpan={2}>
                            Total
                          </td>
                          <td className="px-3 py-2.5 text-center">{totalCount}</td>
                          <td className="px-3 py-2.5 text-right font-black text-foreground">
                            ₹{totalSales.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-right">₹{avgValue.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2.5 text-right">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add-ons Tab */}
          {activeTab === 'addons' && (
            <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden mt-2">
              <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-border/60 bg-muted/20">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground">Add-ons &amp; Insurance Performance</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Total Add-on Revenue: ₹{totalAddonsRevenue.toLocaleString('en-IN')}
                </span>
              </div>
              <CardContent className="p-0">
                {addonStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-6 text-center">
                    No add-ons or insurance plans attached for {reportLabel}
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
                          <th className="px-3 py-2 text-right">Share of Add-ons</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {addonStats.map((a, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors leading-tight">
                            <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2 font-semibold text-foreground truncate max-w-[220px]">
                              {a.name}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">{a.count}</td>
                            <td className="px-3 py-2 text-right font-black text-foreground">
                              ₹{a.revenue.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-primary">
                              {totalAddonsRevenue > 0 ? ((a.revenue / totalAddonsRevenue) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/60 font-bold border-t border-border text-[11px]">
                        <tr>
                          <td className="px-3 py-2.5" colSpan={2}>
                            Total Add-ons
                          </td>
                          <td className="px-3 py-2.5 text-center">{totalAddonsCount}</td>
                          <td className="px-3 py-2.5 text-right font-black text-foreground">
                            ₹{totalAddonsRevenue.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-right">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detail Tab with Sortable Column Headers */}
          {activeTab === 'detail' && (
            <Card className="rounded-xl border-border/80 shadow-none bg-card overflow-hidden mt-2">
              <CardContent className="p-0">
                {sortedDetailInvoices.length === 0 ? (
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
                            {renderSortHeader('Inv No.', 'invoice_number')}
                            {renderSortHeader('Date', 'invoice_date')}
                            {renderSortHeader('App ID', 'delivery_order_number')}
                            {renderSortHeader('Customer', 'customer_name')}
                            {renderSortHeader('Mobile', 'customer_mobile')}
                            {renderSortHeader('Asset', 'product_model')}
                            {renderSortHeader('Brand', 'product_description')}
                            {renderSortHeader('IMEI', 'imei_serial')}
                            {renderSortHeader('Add-ons Count', 'addons_count', 'center')}
                            {renderSortHeader('Add-ons Total', 'addons_total', 'right')}
                            {renderSortHeader('Total', 'grand_total', 'right')}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {paginatedInvoices.map((inv, i) => {
                            const invAddons = inv.addons && Array.isArray(inv.addons) ? inv.addons : [];
                            const addonsSum = invAddons.reduce((s, a) => s + (Number(a.amount) || 0), 0);
                            return (
                              <tr key={inv.id || i} className="hover:bg-muted/30 transition-colors leading-tight">
                                <td className="px-3 py-2 font-bold text-foreground whitespace-nowrap">
                                  {inv.invoice_number}
                                </td>
                                <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                  {inv.invoice_date}
                                </td>
                                <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                  {inv.delivery_order_number || '—'}
                                </td>
                                <td className="px-3 py-2 font-medium text-foreground truncate max-w-[140px]">
                                  {inv.customer_name}
                                </td>
                                <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                  {inv.customer_mobile || '—'}
                                </td>
                                <td className="px-3 py-2 text-foreground truncate max-w-[130px]">
                                  {inv.product_model || '—'}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground truncate max-w-[110px]">
                                  {inv.product_description || '—'}
                                </td>
                                <td className="px-3 py-2 font-mono text-[10px] text-primary whitespace-nowrap">
                                  {inv.imei_serial || '—'}
                                </td>
                                <td className="px-3 py-2 font-medium text-center text-foreground whitespace-nowrap">
                                  {invAddons.length > 0 ? invAddons.length : '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                  {addonsSum > 0 ? `₹${addonsSum.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-black text-foreground whitespace-nowrap">
                                  ₹{(Number(inv.grand_total) || 0).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Strip */}
                    <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/60 text-[10px] text-muted-foreground">
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
                          className="h-6 w-6 p-0 rounded-full"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-6 w-6 p-0 rounded-full"
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