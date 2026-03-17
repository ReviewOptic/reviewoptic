import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Download, ArrowUpCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeClientSecret, setUpgradeClientSecret] = useState<string | null>(null);
  const [stripePromise] = useState(() =>
    fetch("/api/billing/config").then(r => r.json()).then(d => loadStripe(d.publishableKey))
  );

  const { data: subData, isLoading: subLoading } = useQuery<any>({
    queryKey: ["/api/billing/subscription"],
  });

  const { data: invoiceData, isLoading: invoicesLoading } = useQuery<any>({
    queryKey: ["/api/billing/invoices"],
  });

  const sub = subData?.subscription;
  const invoices: any[] = invoiceData?.invoices || [];

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", credentials: "include" });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Unexpected server response. Please try again."); }
      if (!res.ok) throw new Error(data.message || "Could not open billing portal");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Could not open billing portal", description: err.message, variant: "destructive" });
      setPortalLoading(false);
    }
  }

  async function upgradeToAnnual() {
    const plan = user?.planType || "standard";
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, period: "annual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to start upgrade");
      setUpgradeClientSecret(data.clientSecret);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  const planLabel = user?.planType === "agency" ? "Agency Plan" : "Standard Plan";
  const periodLabel = user?.planPeriod === "annual" ? "Annual" : "Monthly";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {/* Current plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Current plan</h2>
        {subLoading ? (
          <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">{planLabel} — {periodLabel}</span>
              {sub?.status === "active" && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">Active</span>
              )}
            </div>
            {sub?.currentPeriodEnd && (
              <p className="text-sm text-gray-500">
                {sub.cancelAtPeriodEnd
                  ? `Cancels on ${formatDate(sub.currentPeriodEnd)}`
                  : `Renews on ${formatDate(sub.currentPeriodEnd)}`}
              </p>
            )}
            {!sub && <p className="text-sm text-gray-400">No active subscription found.</p>}
          </div>
        )}

        {/* Upgrade to annual */}
        {user?.planPeriod === "monthly" && sub?.status === "active" && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Switch to annual billing</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user.planType === "agency" ? "Save £149 — equivalent to 1 month free" : "Save £49 — equivalent to 1 month free"}
                </p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={upgradeToAnnual}>
                <ArrowUpCircle className="w-4 h-4" />
                Upgrade
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Payment details</h2>
        <p className="text-sm text-gray-500 mb-4">
          Update your card details or billing address via the secure Stripe portal.
        </p>
        <Button variant="outline" className="gap-2" onClick={openPortal} disabled={portalLoading}>
          {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          {portalLoading ? "Opening…" : "Manage payment details"}
        </Button>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Invoices</h2>
        {invoicesLoading ? (
          <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-gray-400">No invoices yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{formatAmount(inv.amountPaid, inv.currency)}</p>
                  <p className="text-xs text-gray-400">{formatDate(inv.created)}{inv.number ? ` · ${inv.number}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {inv.status}
                  </span>
                  {inv.pdfUrl && (
                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700" title="Download invoice">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" className="mt-3 gap-1.5 text-gray-500" onClick={openPortal} disabled={portalLoading}>
          <ExternalLink className="w-3.5 h-3.5" />
          View all invoices in Stripe
        </Button>
      </div>

      {/* Upgrade to annual modal */}
      {upgradeClientSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setUpgradeClientSecret(null)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-700 bg-white rounded-full p-1 shadow text-lg leading-none"
            >
              ✕
            </button>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: upgradeClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      )}
    </div>
  );
}
