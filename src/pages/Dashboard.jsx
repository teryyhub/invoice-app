// src/pages/Dashboard.jsx
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
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { useAuth } from "@/lib/AuthContext";
import IncentiveBanner from "@/components/dashboard/IncentiveBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const formatCurrency = (val = 0) =>
  `₹${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function Dashboard() {
  const { user } = useAuth();

  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    isFetching: fetchingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["dashboard-invoices", user?.id],
    queryFn: () => Invoice.list(99999),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
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
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isLoading = loadingInvoices || loadingVendor;

  const handleRefresh = () => {
    refetchInvoices();
    refetchVendor();
  };

  const {
    currentMonth,
    monthInvoices,
    monthInvoicesCount,
    totalAddonsRevenue,
    rpc,
    crossSalePercentage,
  } = useMemo(() => {
    const monthStr = format(new Date(), "MMM yyyy");
    const currentMonthList = [];
    let count = 0;
    let addonsCount = 0;
    let addonsRevenue = 0;

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      const dateVal = inv.invoice_date || inv.created_at;
      const parsed = dateVal ? new Date(dateVal) : null;
      if (parsed && isValid(parsed) && format(parsed, "MMM yyyy") === monthStr) {
        currentMonthList.push(inv);
        count++;

        if (inv.addons && Array.isArray(inv.addons)) {
          inv.addons.forEach((addon) => {
            addonsCount++;
            addonsRevenue += Number(addon.amount) || 0;
          });
        }
      }
    }

    const calculatedRpc = count > 0 ? addonsRevenue / count : 0;
    const calculatedCrossSale = count > 0 ? (addonsCount / count) * 100 : 0;

    return {
      currentMonth: monthStr,
      monthInvoices: currentMonthList,
      monthInvoicesCount: count,
      totalAddonsRevenue: addonsRevenue,
      rpc: calculatedRpc,
      crossSalePercentage: calculatedCrossSale,
    };
  }, [invoices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-[#004C8F]/20 border-t-[#004C8F] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto pb-6">
      {/* Header & Slim Action Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5 gap-2">
        <div>
          <h1 className="text-xs font-bold tracking-tight text-foreground">Dashboard Overview</h1>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={fetchingInvoices}
            className="h-7 w-7 p-0 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Sync data"
          >
            <RotateCw className={`w-4 h-4 ${fetchingInvoices ? "animate-spin" : ""}`} />
          </Button>

          <Link to="/invoices">
            <Button type="button" variant="outline" size="md" className="h-6 px-2 text-[13px] font-semibold gap-1 rounded shadow-none">
              <FileText className="w-3 h-3 text-[#004C8F]" />
              Bills
            </Button>
          </Link>

          <Link to="/generate">
            <Button type="button" size="md" className="h-6 px-2.5 text-[13px] font-semibold gap-1 rounded shadow-none bg-[#004C8F] hover:bg-[#003B70] text-white">
              <Upload className="w-3 h-3 stroke-[2.5]" />
              New Bill
            </Button>
          </Link>
        </div>
      </div>

      {/* Vendor Setup Notice Banner */}
      {!vendor && (
        <div className="flex items-center justify-between p-2 bg-[#004C8F]/10 border border-[#004C8F]/30 rounded-md shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#004C8F] shrink-0" />
            <p className="text-[13px] text-[#004C8F] font-semibold truncate">
              Vendor profile setup required
            </p>
          </div>
          <Link to="/settings" className="shrink-0">
            <Button type="button" size="sm" className="h-5 px-2 text-[12px] font-bold rounded bg-[#004C8F] text-white">
              Setup Now
            </Button>
          </Link>
        </div>
      )}

      {/* Live Earned Incentive Banner (Synced with Admin Slabs) */}
      <IncentiveBanner invoices={monthInvoices} periodLabel={currentMonth} />

              {/* Main Grid: metric pills left, recent ledger right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">

        {/* Left Column: Metric pills */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-2 content-start">

          {/* Invoices */}
          <div className="w-full min-h-[4.5rem] rounded-3xl md:rounded-full bg-gradient-to-r from-card via-card to-[#004C8F]/15 border-2 border-[#004C8F]/50 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between justify-center gap-1 px-3 md:px-4 py-2 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-[#004C8F] text-white flex items-center justify-center shadow-inner shrink-0">
                <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground whitespace-nowrap">Invoices</span>
            </div>
            <p className="text-sm font-black tracking-tight text-foreground font-mono leading-none whitespace-nowrap pl-8 md:pl-1">
              {monthInvoicesCount}
            </p>
          </div>

          {/* Cross-sale revenue */}
          <div className="w-full min-h-[4.5rem] rounded-3xl md:rounded-full bg-gradient-to-r from-card via-card to-blue-500/15 border-2 border-blue-500/50 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between justify-center gap-1 px-3 md:px-4 py-2 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-inner shrink-0">
                <IndianRupee className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground whitespace-nowrap">Cross-sale</span>
            </div>
            <p className="text-sm font-black tracking-tight text-foreground font-mono leading-none whitespace-nowrap pl-8 md:pl-1">
              {formatCurrency(totalAddonsRevenue)}
            </p>
          </div>

          {/* RPC */}
          <div className="w-full min-h-[4.5rem] rounded-3xl md:rounded-full bg-gradient-to-r from-card via-card to-amber-500/15 border-2 border-amber-500/50 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between justify-center gap-1 px-3 md:px-4 py-2 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-inner shrink-0">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground whitespace-nowrap">RPC</span>
            </div>
            <p className="text-sm font-black tracking-tight text-foreground font-mono leading-none whitespace-nowrap pl-8 md:pl-1">
              {rpc.toFixed(2)}
            </p>
          </div>

          {/* Attach rate */}
          <div className="w-full min-h-[4.5rem] rounded-3xl md:rounded-full bg-gradient-to-r from-card via-card to-purple-500/15 border-2 border-purple-500/50 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between justify-center gap-1 px-3 md:px-4 py-2 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-inner shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground whitespace-nowrap">Attach</span>
            </div>
            <p className="text-sm font-black tracking-tight text-foreground font-mono leading-none whitespace-nowrap pl-8 md:pl-1">
              {crossSalePercentage.toFixed(1)}%
            </p>
          </div>

        </div>
        {/* Right Column: Recent Invoices Ledger */}
        <div className="space-y-2">
          {invoices.length > 0 ? (
            <Card className="rounded-md border-border/80 shadow-2xs bg-card overflow-hidden">
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60 bg-muted/40">
                <span className="text-[13px] font-bold tracking-tight text-foreground">
                  Recent Invoices Ledger
                </span>
                <Link
                  to="/invoices"
                  className="text-[12px] font-bold text-[#004C8F] hover:underline flex items-center gap-0.5"
                >
                  View All <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {invoices.slice(0, 6).map((inv) => {
                    const rawDate = inv.invoice_date || inv.created_at;
                    const d = rawDate ? new Date(rawDate) : null;
                    const dateStr = d && isValid(d) ? format(d, "dd/MM/yy") : "";

                    return (
                      <Link
                        key={inv.id}
                        to={`/invoice/${inv.id}`}
                        className="flex items-center justify-between px-2.5 py-1 hover:bg-accent/40 transition-colors group"
                      >
                        <div className="min-w-0 pr-2 leading-tight">
                          <p className="font-bold text-[13px] text-foreground group-hover:text-[#004C8F] transition-colors truncate font-mono">
                            {inv.invoice_number || "Draft Invoice"}
                          </p>
                          <p className="text-[12px] text-muted-foreground truncate mt-0.5 font-medium">
                            {inv.customer_name || "Walk-in Customer"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-right leading-tight">
                          <div>
                            <p className="font-bold text-[13px] text-foreground tracking-tight font-mono">
                              {formatCurrency(inv.grand_total)}
                            </p>
                            <p className="text-[12px] text-muted-foreground font-mono mt-0.5">
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
          ) : (
            <Card className="rounded-md border-dashed border-border/80 bg-card/40 shadow-none">
              <CardContent className="p-5 text-center space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <p className="text-[13px] font-bold text-foreground">No invoices generated yet</p>
                <p className="text-[12px] text-muted-foreground max-w-xs mx-auto">
                  Create your first GST or finance invoice to populate your dashboard ledger.
                </p>
                <Link to="/generate">
                  <Button type="button" size="sm" className="h-6 px-2.5 text-[12px] font-semibold rounded shadow-none mt-1 bg-[#004C8F] text-white">
                    Create First Invoice
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}