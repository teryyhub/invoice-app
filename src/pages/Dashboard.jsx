import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, isValid } from "date-fns";
import {
  FileText,
  Upload,
  IndianRupee,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  RotateCw,
} from "lucide-react";

import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const formatCurrency = (val = 0) =>
  `₹${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function Dashboard() {
  const { user } = useAuth();

  // Cached query: Prevents refetching 99,999 records on tab switches or route changes
  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    isFetching: fetchingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["dashboard-invoices", user?.id],
    queryFn: () => Invoice.list(99999),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    refetchOnWindowFocus: false,
  });

  const {
    data: vendor,
    isLoading: loadingVendor,
    refetch: refetchVendor,
  } = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: async () => {
      const list = await VendorProfile.list(1);
      return list?.[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes fresh
    refetchOnWindowFocus: false,
  });

  const isLoading = loadingInvoices || loadingVendor;

  const handleRefresh = () => {
    refetchInvoices();
    refetchVendor();
  };

  const { currentMonth, monthInvoicesCount, totalRevenue } = useMemo(() => {
    const monthStr = format(new Date(), "MMM yyyy");
    let revenue = 0;
    let count = 0;

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      const dateVal = inv.invoice_date || inv.created_at;
      const parsed = dateVal ? new Date(dateVal) : null;
      if (parsed && isValid(parsed) && format(parsed, "MMM yyyy") === monthStr) {
        count++;
        revenue += Number(inv.grand_total) || 0;
      }
    }

    return { currentMonth: monthStr, monthInvoicesCount: count, totalRevenue: revenue };
  }, [invoices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Header + Actions */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold leading-tight text-foreground">Dashboard</h1>
          <p className="text-[10px] text-muted-foreground leading-none">Financial summary</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={fetchingInvoices}
            className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
            title="Sync latest data"
          >
            <RotateCw className={`w-3 h-3 ${fetchingInvoices ? "animate-spin" : ""}`} />
          </Button>

          <Link to="/invoices">
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1 rounded-md">
              <FileText className="w-3 h-3" />
              Bills
            </Button>
          </Link>
          <Link to="/generate">
            <Button size="sm" className="h-7 px-2.5 text-[11px] gap-1 font-semibold rounded-md shadow-none">
              <Upload className="w-3 h-3 stroke-[2.5]" />
              New
            </Button>
          </Link>
        </div>
      </div>

      {/* Vendor Setup Notice */}
      {!vendor && (
        <div className="flex items-center justify-between p-2 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-1.5 min-w-0 pr-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-[10px] text-primary font-medium truncate">
              Set up vendor profile to complete invoices.
            </p>
          </div>
          <Link to="/settings" className="shrink-0">
            <Button size="sm" className="h-5 px-1.5 text-[9px] font-semibold rounded">
              Setup
            </Button>
          </Link>
        </div>
      )}

      {/* Compact 2-Metric Grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="rounded-lg border-border/80 shadow-none">
          <CardContent className="p-2.5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <span>Revenue</span>
              <div className="w-4 h-4 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <IndianRupee className="w-2.5 h-2.5 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-base font-black tracking-tight text-foreground leading-tight mt-0.5 truncate">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5 truncate">
              {currentMonth}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border/80 shadow-none">
          <CardContent className="p-2.5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <span>Invoices</span>
              <div className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-2.5 h-2.5 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-base font-black tracking-tight text-foreground leading-tight mt-0.5">
              {monthInvoicesCount}
            </p>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5 truncate">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Ledger List */}
      {invoices.length > 0 && (
        <Card className="rounded-lg border-border/80 shadow-none">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60">
            <span className="text-[11px] font-bold tracking-tight text-foreground">
              Recent Invoices
            </span>
            <Link
              to="/invoices"
              className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              All <ArrowUpRight className="w-2.5 h-2.5" />
            </Link>
          </div>

          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {invoices.slice(0, 5).map((inv) => {
                const rawDate = inv.invoice_date || inv.created_at;
                const d = rawDate ? new Date(rawDate) : null;
                const dateStr = d && isValid(d) ? format(d, "dd/MM/yy") : "";

                return (
                  <Link
                    key={inv.id}
                    to={`/invoice/${inv.id}`}
                    className="flex items-center justify-between px-2.5 py-1.5 hover:bg-accent/40 transition-colors group"
                  >
                    <div className="min-w-0 pr-2 leading-tight">
                      <p className="font-semibold text-[11px] text-foreground group-hover:text-primary transition-colors truncate">
                        {inv.invoice_number || "Draft Invoice"}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">
                        {inv.customer_name || "Walk-in"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-right leading-tight">
                      <div>
                        <p className="font-bold text-[11px] text-foreground tracking-tight">
                          {formatCurrency(inv.grand_total)}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {dateStr}
                        </p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}