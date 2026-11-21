// src/pages/TermsOfService.jsx
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CM Invoice — Terms of Service</h1>
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
          <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using CM Invoice (<span className="text-foreground font-medium">https://sivacholainvoices.vercel.app/</span>{" "}
            or the CM Invoice Android application), you agree to be bound by these Terms of Service. If you do
            not agree with these terms, please discontinue use of the application.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">2. Description of Service</h2>
          <p>
            CM Invoice provides digital GST invoicing, customer ledger tracking, sales reporting, and consumer
            durable EMI &amp; incentive calculation tools for authorized merchants and retail staff.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">3. User Accounts &amp; Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for maintaining the confidentiality of your login credentials and security PIN.</li>
            <li>
              You are solely responsible for the accuracy of GST numbers, tax rates, invoice amounts, IMEI/serial
              numbers, and customer details entered into the system.
            </li>
            <li>You agree not to misuse the platform, attempt unauthorized access, or disrupt service availability.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">4. Financial &amp; EMI Calculations</h2>
          <p>
            EMI schedules, insurance eligibility indicators, and sales incentive calculations provided within CM
            Invoice are informational estimation tools. Final loan approval, disbursement, and scheme terms remain
            subject to the respective finance provider&apos;s official policies.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">5. Limitation of Liability</h2>
          <p>
            CM Invoice is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis. To the maximum extent permitted by
            law, we are not liable for indirect, incidental, or consequential damages resulting from data entry
            errors, network interruptions, or third-party service outages.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">6. Changes to Terms</h2>
          <p>
            We may update these Terms of Service periodically to reflect feature updates or compliance
            requirements. Continued use of CM Invoice after changes are posted constitutes acceptance of the
            revised terms.
          </p>
        </section>

        <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} CM Invoice</span>
          <Link to="/privacypolicy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}