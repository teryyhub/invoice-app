import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices';
import { VendorProfile } from '@/api/vendorProfiles';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, BarChart2, IndianRupee, FileText, Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function Reports() {
  const { user } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
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
    if (Array.isArray(vendors)) {
      vendors.forEach(v => { m[v.id] = v.vendor_name; });
    }
    return m;
  }, [vendors]);

  const filteredInvoices = useMemo(() => {
    if (!invoices || !Array.isArray(invoices)) return [];
    return invoices.filter(inv => {
      const dateStr = inv.invoice_date || inv.created_date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return String(d.getMonth()) === selectedMonth && String(d.getFullYear()) === selectedYear;
    });
  }, [invoices, selectedMonth, selectedYear]);

  const totalSales = filteredInvoices.reduce((s, inv) => s + (inv.grand_total || 0), 0);
  const totalCount = filteredInvoices.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage]);

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    const monthLabel = `${MONTHS[parseInt(selectedMonth)]} ${selectedYear}`;
    let csv = "\ufeff"; 
    csv += `MONTHLY SALES REPORT: ${monthLabel}\n`;
    csv += `Total Invoices,${totalCount}\n`;
    csv += `Total Revenue,₹${totalSales.toFixed(2)}\n`;
    csv += `\n`;
    
    const headers = [
      "Invoice No", "Invoice Date", "Application ID", "Customer Name", 
      "Mobile No", "Asset Name", "Brand Name", "IMEI No", "Total Amount", "Scheme"
    ];
    csv += headers.join(",") + "\n";

    filteredInvoices.forEach(inv => {
      const row = [
        `"${inv.invoice_number || 'N/A'}"`,
        `"${inv.invoice_date || 'N/A'}"`,
        `"${inv.delivery_order_number || 'N/A'}"`,
        `"${inv.customer_name || 'N/A'}"`,
        `"${inv.customer_mobile || 'N/A'}"`,
        `"${inv.product_model || 'N/A'}"`,
        `"${inv.product_description || 'N/A'}"`,
        `"${inv.imei_serial || 'N/A'}"`,
        `"${inv.grand_total || 0}"`,
        `"${inv.mode || 'N/A'}"`
      ];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Detailed_Report_${monthLabel.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded successfully!");
  };

  if (loadingInvoices) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const monthLabel = `${MONTHS[parseInt(selectedMonth)] || 'Unknown'} ${selectedYear}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm">Detailed monthly sales breakdown</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={selectedMonth} onValueChange={(val) => { setSelectedMonth(val); setCurrentPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setCurrentPage(1); }}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['2023', '2024', '2025'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Value</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalCount > 0 ? `₹${Math.round(totalSales/totalCount).toLocaleString('en-IN')}` : '—'}</p></CardContent>
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
        <Card>
          <CardHeader><CardTitle className="text-base">Detailed Invoice List</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr className="border-b border-border">
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Inv No.</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Date</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">App ID</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Customer</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Mobile</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Asset Name</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Brand</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">IMEI</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Scheme</th>
                    <th className="px-3 py-3 font-medium text-right whitespace-nowrap">Total</th>
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
                      <td className="px-3 py-3 text-right font-semibold">₹{(inv.grand_total || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
