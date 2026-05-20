import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart2, Store, Tag, LayoutGrid, Loader2 } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function StatCard({ label, value, sub, color = 'text-primary', highlight = false }) {
  return (
    <Card className={`transition-all duration-300 ${highlight ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Statistics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['statistics-invoices'],
    queryFn: () => Invoice.list(1000),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['statistics-vendors'],
    queryFn: () => VendorProfile.list(100),
  });

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach(v => { m[v.id] = v.vendor_name; });
    return m;
  }, [vendors]);

  const scopedInvoices = useMemo(() => {
    if (viewMode === 'all') return invoices;
    return invoices.filter(inv => {
      const date = new Date(inv.invoice_date || inv.created_date);
      return String(date.getFullYear()) === selectedYear;
    });
  }, [invoices, viewMode, selectedYear]);

  const monthlyData = useMemo(() => MONTHS.map((m, i) => {
    const monthInvs = scopedInvoices.filter(inv => new Date(inv.invoice_date || inv.created_date).getMonth() === i);
    return { 
      name: m, 
      count: monthInvs.length, 
      revenue: Math.round(monthInvs.reduce((s, inv) => s + (inv.grand_total || 0), 0)) 
    };
  }), [scopedInvoices]);

  const aggregateData = (data, key) => {
    const map = {};
    data.forEach(inv => {
      const label = inv[key] || 'Unknown';
      if (!map[label]) map[label] = { label, count: 0, revenue: 0 };
      map[label].count += 1;
      map[label].revenue += (inv.grand_total || 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  };

  const brandData = useMemo(() => aggregateData(scopedInvoices, 'product_description'), [scopedInvoices]);
  
  const vendorStatsData = useMemo(() => {
    const map = {};
    scopedInvoices.forEach(inv => {
      const name = vendorMap[inv.vendor_id] || 'Unknown';
      if (!map[name]) map[name] = { label: name, count: 0, revenue: 0 };
      map[name].count += 1;
      map[name].revenue += (inv.grand_total || 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [scopedInvoices, vendorMap]);

  const totalRevenue = scopedInvoices.reduce((s, inv) => s + (inv.grand_total || 0), 0);
  const totalCount = scopedInvoices.length;

  if (loadingInvoices) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Business Statistics</h1>
          <p className="text-muted-foreground text-sm">Real-time data analysis from your invoices</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly View</SelectItem>
              <SelectItem value="yearly">Yearly View</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          {viewMode !== 'all' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['2023', '2024', '2025'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        <Button 
          variant={activeTab === 'overview' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('overview')} 
          className="gap-2"
        >
          <LayoutGrid className="w-4 h-4" /> Overview
        </Button>
        <Button 
          variant={activeTab === 'vendor' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('vendor')} 
          className="gap-2"
        >
          <Store className="w-4 h-4" /> Vendor Analysis
        </Button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Invoices" value={totalCount} color="text-blue-600" highlight />
            <StatCard label="Total Revenue" value={`₹${Math.round(totalRevenue).toLocaleString('en-IN')}`} color="text-green-600" />
            <StatCard label="Avg. Ticket" value={`₹${totalCount ? Math.round(totalRevenue/totalCount).toLocaleString('en-IN') : 0}`} color="text-violet-600" />
            <StatCard label="Top Brand" value={brandData[0]?.label || '—'} color="text-pink-600" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> Monthly Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48 pt-4">
                {monthlyData.map((m, i) => {
                  const height = totalRevenue > 0 ? (m.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(height, 2)}%` }}></div>
                      <span className="text-[10px] text-muted-foreground">{m.name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'vendor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Store className="w-4 h-4" /> Revenue by Vendor</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {vendorStatsData.length === 0 ? <p className="text-center py-10 text-muted-foreground text-sm">No data available</p> : 
                vendorStatsData.slice(0, 8).map((v, i) => {
                  const pct = (v.revenue / (totalRevenue || 1)) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="truncate">{v.label}</span>
                        <span>₹{Math.round(v.revenue).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              }
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Tag className="w-4 h-4" /> Top Brands</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {brandData.length === 0 ? <p className="text-center py-10 text-muted-foreground text-sm">No data available</p> : 
                brandData.slice(0, 8).map((b, i) => {
                  const pct = (b.count / (totalCount || 1)) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="truncate">{b.label}</span>
                        <span>{b.count} Invoices</span>
                      </div>
                      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              }
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
