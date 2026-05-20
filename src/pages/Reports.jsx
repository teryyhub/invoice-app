import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, BarChart2, IndianRupee, FileText, Package } from 'lucide-react';
import { format, getYear, getMonth } from 'date-fns';

function exportToCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function Reports() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(getMonth(currentDate))); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(String(getYear(currentDate)));

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices-all'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date', 1000),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.VendorProfile.list('-created_date', 100),
  });

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach(v => { m[v.id] = v.vendor_name; });
    return m;
  }, [vendors]);

  // Available years from invoice data
  const years = useMemo(() => {
    const ys = new Set(invoices.map(inv => {
      const d = inv.invoice_date ? new Date(inv.invoice_date) : new Date(inv.created_date);
      return String(getYear(d));
    }));
    ys.add(String(getYear(currentDate)));
    return [...ys].sort((a, b) => b - a);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = inv.invoice_date ? new Date(inv.invoice_date) : new Date(inv.created_date);
      return String(getMonth(d)) === selectedMonth && String(getYear(d)) === selectedYear;
    });
  }, [invoices, selectedMonth, selectedYear]);

  // Summary stats
  const totalSales = filteredInvoices.reduce((s, inv) => s + (inv.grand_total || 0), 0);
  const totalCount = filteredInvoices.length;

  // Product type breakdown
  const productBreakdown = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => {
      const key = inv.product_description || 'Unknown';
      if (!map[key]) map[key] = { product: key, count: 0, revenue: 0 };
      map[key].count += 1;
      map[key].revenue += inv.grand_total || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices]);

  // Full invoice detail table (for display + CSV)
  const invoiceDetailRows = useMemo(() => filteredInvoices.map(inv => ({
    'Invoice Number': inv.invoice_number || '',
    'Application ID': inv.delivery_order_number || '',
    'Date': inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yyyy') : '',
    'Customer Name': inv.customer_name || '',
    'Mobile': inv.customer_mobile || '',
    'Address': inv.customer_address || '',
    'Vendor': vendorMap[inv.vendor_id] || '',
    'Product': inv.product_description || '',
    'Model': inv.product_model || '',
    'IMEI / Serial': inv.imei_serial || '',
    'Mode': inv.mode || '',
    'Rate': inv.rate || 0,
    'CGST': inv.cgst || 0,
    'SGST': inv.sgst || 0,
    'Grand Total': inv.grand_total || 0,
  })), [filteredInvoices, vendorMap]);

  // Product model breakdown
  const modelBreakdown = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => {
      const key = inv.product_model || 'Unknown';
      if (!map[key]) map[key] = { model: key, count: 0, revenue: 0 };
      map[key].count += 1;
      map[key].revenue += inv.grand_total || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredInvoices]);

  // Vendor breakdown
  const vendorBreakdown = useMemo(() => {
    const map = {};
    filteredInvoices.forEach(inv => {
      const key = inv.vendor_id || 'unknown';
      const name = vendorMap[key] || 'Unknown Vendor';
      if (!map[key]) map[key] = { vendor: name, count: 0, revenue: 0 };
      map[key].count += 1;
      map[key].revenue += inv.grand_total || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices, vendorMap]);

  const monthLabel = `${MONTHS[parseInt(selectedMonth)]} ${selectedYear}`;

  const handleExportCSV = () => {
    // Fix: use global replace /g so all spaces become underscores in filename
    const safeLabel = monthLabel.replace(/ /g, '_');

    const summaryRows = [
      { 'Report': `Monthly Report - ${monthLabel}`, 'Value': '' },
      { 'Report': 'Total Invoices', 'Value': totalCount },
      { 'Report': 'Total Revenue (₹)', 'Value': totalSales.toFixed(2) },
      { 'Report': '', 'Value': '' },
      { 'Report': '--- Product Type Breakdown ---', 'Value': '' },
      ...productBreakdown.map(p => ({ 'Report': p.product, 'Value': `Count: ${p.count}, Revenue: ₹${p.revenue.toFixed(2)}` })),
      { 'Report': '', 'Value': '' },
      { 'Report': '--- Vendor Breakdown ---', 'Value': '' },
      ...vendorBreakdown.map(v => ({ 'Report': v.vendor, 'Value': `Count: ${v.count}, Revenue: ₹${v.revenue.toFixed(2)}` })),
    ];

    exportToCSV(summaryRows, `Summary_${safeLabel}.csv`);
    setTimeout(() => exportToCSV(invoiceDetailRows, `Invoices_${safeLabel}.csv`), 400);
  };

  if (loadingInvoices) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Monthly sales summary and breakdown</p>
        </div>
        <Button onClick={handleExportCSV} disabled={filteredInvoices.length === 0} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Month / Year selector */}
      <div className="flex gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{monthLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <IndianRupee className="w-4 h-4" /> Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">{monthLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" /> Avg. Invoice Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {totalCount > 0 ? `₹${(totalSales / totalCount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">per invoice</p>
          </CardContent>
        </Card>
      </div>

      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices found for {monthLabel}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productBreakdown.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate mr-2">{p.product}</span>
                      <span className="text-muted-foreground shrink-0">{p.count} unit{p.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.round((p.revenue / totalSales) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-24 text-right">₹{p.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vendor Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendorBreakdown.map((v, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate mr-2">{v.vendor}</span>
                      <span className="text-muted-foreground shrink-0">{v.count} invoice{v.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.round((v.revenue / totalSales) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-24 text-right">₹{v.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Product Model Breakdown */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Product Model Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4">Model</th>
                      <th className="text-center py-2 px-4">Count</th>
                      <th className="text-right py-2 pl-4">Revenue</th>
                      <th className="text-right py-2 pl-4">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {modelBreakdown.map((m, i) => (
                      <tr key={i} className="hover:bg-accent/30 transition-colors">
                        <td className="py-2 pr-4 font-medium">{m.model}</td>
                        <td className="py-2 px-4 text-center">{m.count}</td>
                        <td className="py-2 pl-4 text-right">₹{m.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 pl-4 text-right text-muted-foreground">
                          {totalSales > 0 ? `${Math.round((m.revenue / totalSales) * 100)}%` : '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Full Invoice Detail Table */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Inv No.</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Date</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Customer</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Mobile</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Address</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Vendor</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Product</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Model</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">Application ID</th>
                      <th className="text-left py-2 pr-3 whitespace-nowrap">IMEI / Serial</th>
                      <th className="text-right py-2 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInvoices.map((inv, i) => (
                      <tr key={i} className="hover:bg-accent/30 transition-colors">
                        <td className="py-2 pr-3 font-medium whitespace-nowrap">{inv.invoice_number}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yy') : ''}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{inv.customer_name}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{inv.customer_mobile}</td>
                        <td className="py-2 pr-3 max-w-[150px] truncate">{inv.customer_address}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{vendorMap[inv.vendor_id] || '—'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{inv.product_description}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{inv.product_model}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{inv.delivery_order_number}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{inv.imei_serial}</td>
                        <td className="py-2 text-right font-semibold whitespace-nowrap">₹{(inv.grand_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}