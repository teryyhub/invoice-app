// src/pages/CustomerDetail.jsx
import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Invoice } from "@/api/invoices";
import { VendorProfile } from "@/api/vendorProfiles";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  FileText,
  Smartphone,
  Calendar,
  Building,
  Phone,
  ArrowRight,
} from "lucide-react";
import { format, isValid } from "date-fns";

export default function CustomerDetail() {
  const { mobile } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: () => Invoice.list(99999),
    enabled: !!user?.id,
    staleTime: Infinity,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors", user?.id],
    queryFn: () => VendorProfile.list(100),
    enabled: !!user?.id,
    staleTime: Infinity,
  });

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach((v) => {
      const isCdap = /^CDAP\d+$/i.test((v.vendor_name || "").trim());
      m[v.id] = isCdap ? (v.address || v.vendor_name) : v.vendor_name;
    });
    return m;
  }, [vendors]);

  const customerInvoices = useMemo(() => {
    return invoices.filter((inv) => String(inv.customer_mobile) === String(mobile));
  }, [invoices, mobile]);

  const customerSummary = useMemo(() => {
    if (customerInvoices.length === 0) return { name: "Unknown Customer", address: "—", totalSpent: 0 };
    const first = customerInvoices[0];
    const totalSpent = customerInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    return {
      name: first.customer_name || "Unknown Customer",
      address: first.customer_address || "—",
      totalSpent,
    };
  }, [customerInvoices]);

  if (loadingInvoices) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto text-xs">
      {/* Top Bar Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
      </div>

      {/* Customer Header Card */}
      <Card className="rounded-lg border-border/80 shadow-none bg-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-bold text-foreground">{customerSummary.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-0.5 font-mono text-[11px]">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-primary" /> {mobile}
                </span>
                <span>·</span>
                <span>{customerSummary.address}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-lg border border-border/60 shrink-0">
              <div>
                <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Total Bills</p>
                <p className="font-bold text-sm text-foreground">{customerInvoices.length}</p>
              </div>
              <div className="h-7 w-px bg-border/80" />
              <div>
                <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Total Spent</p>
                <p className="font-black text-sm text-primary font-mono">
                  ₹{customerSummary.totalSpent.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Invoices Section */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Linked Invoices ({customerInvoices.length})
        </h2>

        {customerInvoices.length === 0 ? (
          <Card className="rounded-lg border-dashed border-border/80 shadow-none">
            <CardContent className="py-8 text-center text-muted-foreground">
              No invoices found for this mobile number.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {customerInvoices.map((inv) => {
              const dateObj = inv.invoice_date ? new Date(inv.invoice_date) : null;
              const dateStr = dateObj && isValid(dateObj) ? format(dateObj, "dd/MM/yyyy") : "—";
              const vendorName = vendorMap[inv.vendor_id] || "Store";

              return (
                <Card
                  key={inv.id}
                  onClick={() => navigate(`/invoice/${inv.id}`)}
                  className="rounded-lg border-border/80 shadow-none hover:border-primary/50 transition-colors cursor-pointer bg-card"
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs font-mono text-foreground">
                          {inv.invoice_number || "Draft Invoice"}
                        </span>
                        <span className="text-[12px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                          {vendorName}
                        </span>
                      </div>

                      {inv.product_model && (
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <Smartphone className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate">{inv.product_model}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {dateStr}
                        </span>
                        {inv.imei_serial && <span>IMEI: {inv.imei_serial}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <p className="font-black text-xs text-foreground font-mono">
                          ₹{Number(inv.grand_total || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}