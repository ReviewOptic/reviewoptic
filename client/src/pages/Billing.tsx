import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Download, ArrowUpCircle, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
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
  const qc = useQueryClient();
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeClientSecret, setUpgradeClientSecret] = useState<string | null>(null);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm">("idle");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
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

  async function cancelSubscription() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel");
      qc.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      setCancelStep("idle");
      toast({
        title: "Subscription cancelled",
        description: `You'll still have full access until ${formatDate(data.currentPeriodEnd)}. After that, your account will be locked.`,
        duration: 8000,
      });
    } catch (err: any) {
      toast({ title: "Could not cancel", description: err.message, variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  }

  async function reactivateSubscription() {
    setReactivateLoading(true);
    try {
      const res = await fetch("/api/billing/reactivate", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reactivate");
      qc.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      toast({ title: "Subscription reactivated", description: "Your plan will continue as normal." });
    } catch (err: any) {
      toast({ title: "Could not reactivate", description: err.message, variant: "destructive" });
    } finally {
      setReactivateLoading(false);
    }
  }

  async function openUpgradeCheckout(plan: string, period: string) {
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to start upgrade");
      setUpgradeClientSecret(data.clientSecret);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  const planLabel = user?.planType === "pro" ? "Pro Plan" : user?.planType === "lite" ? "Lite Plan" : "Plan";
  const periodLabel = user?.planPeriod === "annual" ? "Annual" : "Monthly";
  const annualSaving = user?.planType === "lite" ? "Save £29 — equivalent to 1 month free" : "Save £49 — equivalent to 1 month free";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {/* Current plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Current plan</h2>
          {subLoading ? (
            <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">{planLabel} — {periodLabel}</span>
                {sub?.status === "trialing" && (
                  <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full">Free trial</span>
                )}
                {sub?.status === "active" && !sub.cancelAtPeriodEnd && (
                  <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">Active</span>
                )}
                {sub?.cancelAtPeriodEnd && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">Cancelling</span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {user?.planType === "lite"
                  ? "Up to 10 review requests per month"
                  : user?.planType === "pro"
                  ? "Unlimited review requests per month"
                  : null}
              </p>
              {sub?.status === "trialing" && sub?.trialEnd && (
                <p className="text-sm text-blue-600 font-medium">
                  Your free trial ends on {formatDate(sub.trialEnd)} — no charge until then.
                </p>
              )}
              {sub?.currentPeriodEnd && sub?.status !== "trialing" && (
                <p className="text-sm text-gray-500">
                  {sub.cancelAtPeriodEnd
                    ? `Access ends on ${formatDate(sub.currentPeriodEnd)}`
                    : `Renews on ${formatDate(sub.currentPeriodEnd)}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Plan switching */}
        {(user?.planType === "lite" || user?.planType === "pro") && sub?.status === "active" && !sub.cancelAtPeriodEnd && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            {user.planType === "lite" && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Upgrade to Pro</p>
                  <p className="text-xs text-gray-500 mt-0.5">Unlimited review requests every month</p>
                </div>
                <Button size="sm" className="shrink-0 gap-1.5" onClick={() => openUpgradeCheckout("pro", user.planPeriod)}>
                  <ArrowUpCircle className="w-4 h-4" />
                  Upgrade
                </Button>
              </div>
            )}
            {user.planType === "pro" && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Switch to Lite</p>
                  <p className="text-xs text-gray-500 mt-0.5">£29/month — up to 10 review requests per month</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => openUpgradeCheckout("lite", user.planPeriod)}>
                  Switch
                </Button>
              </div>
            )}
            {user.planPeriod === "monthly" && (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Switch to annual billing</p>
                  <p className="text-xs text-gray-500 mt-0.5">{annualSaving}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => openUpgradeCheckout(user.planType || "pro", "annual")}>
                  <ArrowUpCircle className="w-4 h-4" />
                  Switch
                </Button>
              </div>
            )}
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

      {/* Cancel / reactivate — always show for non-cancelled owners */}
      {user?.role !== "member" && user?.planType !== "cancelled" && (
        <div>
          {sub?.cancelAtPeriodEnd ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Your subscription is scheduled to cancel on <strong>{sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "the end of your billing period"}</strong>. You'll have full access until then — after that only analytics will be available.
                </p>
              </div>
              <Button variant="outline" onClick={reactivateSubscription} disabled={reactivateLoading} className="gap-2">
                {reactivateLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Keep my subscription
              </Button>
            </div>
          ) : cancelStep === "confirm" ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  You'll keep full access until <strong>{sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "the end of your current billing period"}</strong>. After that your account will be locked — you'll only be able to view analytics.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={cancelSubscription} disabled={cancelLoading} className="gap-2">
                  {cancelLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Yes, cancel my subscription
                </Button>
                <Button variant="ghost" onClick={() => setCancelStep("idle")} disabled={cancelLoading}>
                  Never mind
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 text-xs" onClick={() => setCancelStep("confirm")}>
              Cancel subscription
            </Button>
          )}
        </div>
      )}

      {/* Fully cancelled — subscription ended */}
      {user?.planType === "cancelled" && !sub && (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-red-700">Your subscription has ended</h2>
              <p className="text-sm text-gray-500 mt-1">
                You currently have read-only access to your analytics. All other features are locked until you reactivate.
              </p>
            </div>
          </div>
          <Button onClick={() => window.location.href = "/pricing"} className="gap-2">
            Reactivate subscription
          </Button>
        </div>
      )}


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
