import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { useAuth } from "@/lib/AuthContext"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Upload, TrendingUp, IndianRupee } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["dashboard-invoices", user?.id], 
    queryFn: () => Invoice.list(99999), // UPDATED: Now supports up to 99,999 invoices
    enabled: !!user?.id, 
  });

  const { data: vendor } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: async () => {
      const list = await VendorProfile.list(1);
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const currentMonth = format(new Date(), "MMM yyyy");
  const monthInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.invoice_date || inv.created_at);
    return format(invDate, "MMM yyyy") === currentMonth;
  });
  const totalRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your invoicing activity</p>
      </div>

      {!vendor && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-primary font-medium">Set up your vendor profile to start generating invoices</p>
            <Link to="/settings"><Button size="sm">Setup Now</Button></Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{monthInvoices.length}</p>
            <p className="text-xs text-muted-foreground mt-1">invoices generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <IndianRupee className="w-4 h-4" /> Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground mt-1">{currentMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{invoices.length}</p>
            <p className="text-xs text-muted-foreground mt-1">all time</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link to="/generate"><Button className="gap-2"><Upload className="w-4 h-4" />Generate Invoice</Button></Link>
        <Link to="/invoices"><Button variant="outline" className="gap-2"><FileText className="w-4 h-4" />View All Invoices</Button></Link>
      </div>

      {invoices.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Invoices</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {invoices.slice(0, 5).map(inv => (
                <Link key={inv.id} to={`/invoice/${inv.id}`} className="flex items-center justify-between py-3 hover:bg-accent/50 -mx-4 px-4 rounded-lg transition-colors">
                  <div>
                    <p className="font-medium text-sm">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{inv.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">₹{(inv.grand_total || 0).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.invoice_date ? format(new Date(inv.invoice_date), "dd/MMM/yyyy") : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
