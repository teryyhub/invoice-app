// src/pages/PrivacyPolicy.jsx
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CM Invoice — Privacy Policy</h1>
              <p className="text-xs text-muted-foreground">Last updated: November 2026</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">1. Overview</h2>
          <p>
            CM Invoice (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the CM Invoice web application at{" "}
            <span className="text-foreground font-medium">https://sivacholainvoices.vercel.app/</span> and the
            CM Invoice Android mobile application. This Privacy Policy explains how we collect, use, store,
            and protect your information when you use our billing, invoice generation, customer ledger, and
            EMI/incentive calculation services.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-foreground">Account &amp; Authentication Data:</strong> When you register or
              sign in using email/password or Google Sign-In, we receive your email address, name, and basic
              Google profile identifier to authenticate your account.
            </li>
            <li>
              <strong className="text-foreground">Business &amp; Invoice Records:</strong> Store/vendor details
              (business name, GSTIN, address, contact number), generated GST invoices, product/IMEI/SKU
              entries, and customer names/mobile numbers entered by you for billing and ledger management.
            </li>
            <li>
              <strong className="text-foreground">Technical &amp; Session Data:</strong> Device type, app version,
              and authentication session tokens stored locally on your device to keep you signed in securely.
            </li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To authenticate users and maintain secure access to merchant ledgers and customer portals.</li>
            <li>To generate, store, print, and export GST invoices, reports, and repayment schedules.</li>
            <li>To sync your business data reliably across web and Android devices.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">4. Data Storage &amp; Third-Party Services</h2>
          <p>
            Your account and application records are securely hosted using Supabase (PostgreSQL database and
            authentication infrastructure) with row-level access controls. We do not sell, rent, or trade your
            personal information or customer billing data to third parties or advertisers.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">5. Data Retention &amp; Deletion</h2>
          <p>
            You retain full ownership of the invoices, customer records, and vendor settings you create in CM
            Invoice. You may edit or delete your records directly inside the app at any time, or contact us to
            request complete deletion of your account and associated data.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">6. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or your data, please contact the CM Invoice
            administrator via the support details listed in your merchant profile or at{" "}
            <span className="text-foreground font-medium">sivacholainvoices.vercel.app</span>.
          </p>
        </section>

        <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} CM Invoice</span>
          <Link to="/termsofservice" className="text-primary hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}