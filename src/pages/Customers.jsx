import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice } from '@/api/invoices'; 
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Trash2, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Customers() {
  const [search, setSearch] = useState('');

  // Use the Invoice API to find all unique customers
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['customers-derived'],
    queryFn: () => Invoice.list(1000),
  });

  // Deriving unique customers from invoices
  const customers = useMemo(() => {
    const customerMap = {};
    
    invoices.forEach(inv => {
      const mobile = inv.customer_mobile || 'Unknown';
      if (!customerMap[mobile]) {
        customerMap[mobile] = {
          id: `cust_${mobile}`,
          name: inv.customer_name || 'Unknown Customer',
          mobile: mobile,
          address: inv.customer_address || 'Not provided',
          totalInvoices: 0,
          totalSpent: 0
        };
      }
      customerMap[mobile].totalInvoices += 1;
      customerMap[mobile].totalSpent += (inv.grand_total || 0);
    });

    return Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [invoices]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name?.toLowerCase().includes(search.toLowerCase()) || 
      c.mobile?.includes(search)
    );
  }, [customers, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground text-sm">
            Customer list derived from invoice history ({customers.length} unique customers)
          </p>
        </div>
        <Button 
          onClick={() => toast.info("Customer management is derived from invoices.")} 
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or mobile..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer Name</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium text-center">Invoices</th>
                  <th className="px-4 py-3 font-medium text-right">Total Value</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No customers found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">{c.mobile}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                        {c.address}
                      </td>
                      <td className="px-4 py-3 text-center">{c.totalInvoices}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ₹{c.totalSpent.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toast.info("Read-only derived data")}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => toast.error("Delete the invoice first")}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
