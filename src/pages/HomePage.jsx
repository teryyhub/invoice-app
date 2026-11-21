// src/pages/HomePage.jsx
import { Link } from "react-router-dom";
import { FileText, ArrowRight, ShieldCheck, Calculator } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between px-4 py-8">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <FileText className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CM Invoice</h1>
              <p className="text-xs text-muted-foreground">GST Billing, Ledger &amp; EMI Tools</p>
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <span>Go to Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">
            Streamlined Invoicing &amp; Consumer Finance Management
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            CM Invoice helps retail merchants and finance teams generate GST invoices, manage customer
            ledgers, review sales reports, and calculate EMI repayment schedules and sales incentives.
            Google Sign-In is used to authenticate user accounts and protect merchant records.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>GST Invoices &amp; Customer Ledger</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create A4-ready invoices, track customer accounts, and view business reporting once
              signed in to your merchant workspace.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calculator className="w-4 h-4 text-primary" />
              <span>EMI &amp; Incentive Calculators</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estimate monthly EMI schedules, device insurance eligibility, and sales incentives.
            </p>
            <div className="pt-1 flex gap-3 text-xs font-medium text-primary">
              <Link to="/emi-calculator" className="hover:underline">
                EMI Calculator
              </Link>
              <Link to="/incentive-calculator" className="hover:underline">
                Incentive Calculator
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="max-w-3xl w-full mx-auto pt-6 mt-8 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} CM Invoice</span>
        <div className="flex items-center gap-4">
          <Link to="/privacypolicy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          <Link to="/termsofservice" className="text-primary hover:underline">
            Terms of Service
          </Link>
          <Link to="/login" className="hover:underline">
            Login
          </Link>
        </div>
      </footer>
    </div>
  );
}