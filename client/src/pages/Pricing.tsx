import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Check, X, ArrowLeft, Star } from "lucide-react";
import { useFeatures } from "@/hooks/useFeatures";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const SHARED_FEATURES = [
  "Email, SMS & WhatsApp review requests",
  "Automatic follow-ups — all 3 included",
  "AI-generated & custom message templates",
  "Full analytics dashboard",
  "Private feedback capture",
  "Website review widget",
  "Works with Google, Trustpilot, Facebook, Checkatrade & more",
  "No contracts — cancel anytime",
];

const PLANS = [
  {
    id: "lite",
    name: "Standard",
    description: "Perfect for getting started",
    monthly: { display: "£29", per: "/month" },
    annual:  { display: "£319", per: "/year", saving: "Save £29 — 1 month free" },
    highlight: false,
    limitLine: "Up to 10 review requests per month",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For businesses serious about reviews",
    monthly: { display: "£49", per: "/month" },
    annual:  { display: "£539", per: "/year", saving: "Save £49 — 1 month free" },
    highlight: true,
    limitLine: "Unlimited review requests per month",
  },
];

export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const { smsEnabled, whatsappEnabled } = useFeatures();

  useEffect(() => {
    if (user?.isImpersonating) refreshUser();
  }, []);
  const { toast } = useToast();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise] = useState(() =>
    fetch("/api/billing/config")
      .then((r) => r.json())
      .then((d) => loadStripe(d.publishableKey))
  );

  async function openCheckout(planId: string) {
    if (!user) {
      navigate("/register");
      return;
    }
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: planId, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to start checkout");
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col items-center px-4 py-16">
      <button
        onClick={async () => {
          if (user && !user.requiresPayment) {
            navigate("/");
          } else {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            navigate("/login");
          }
        }}
        className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h1>
        <p className="text-lg text-gray-500 mb-3">No setup fees. No hidden charges. Cancel anytime.</p>
        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full border border-blue-200">
          14-day free trial — cancel anytime within 14 days and pay nothing
        </span>
      </div>

      {/* Monthly / Annual toggle */}
      <div className="flex items-center gap-3 mb-10 bg-white border border-gray-200 rounded-full p-1">
        <button
          onClick={() => setPeriod("monthly")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            period === "monthly" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setPeriod("annual")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            period === "annual" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Annual
          {period !== "annual" && (
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              1 month free
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">
        {PLANS.map((plan) => {
          const pricing = period === "monthly" ? plan.monthly : plan.annual;
          const isCurrentPlan = user?.planType === plan.id && user?.planPeriod === period;
          const isOtherPeriod = user?.planType === plan.id && user?.planPeriod !== period;
          return (
            <div
              key={plan.id}
              className={`flex-1 rounded-2xl border-2 bg-white p-8 flex flex-col shadow-sm relative ${
                plan.highlight ? "border-blue-500" : "border-gray-200"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    <Star className="w-3 h-3 fill-white" /> Most popular
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{pricing.display}</span>
                  <span className="text-gray-500 mb-1">{pricing.per}</span>
                </div>
                {period === "annual" && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
                    <Check className="w-3 h-3" />
                    {plan.annual.saving}
                  </div>
                )}
                {period === "monthly" && (
                  <p className="mt-2 text-xs text-gray-400">
                    Or{" "}
                    <button onClick={() => setPeriod("annual")} className="text-blue-600 hover:underline">
                      pay annually and save 1 month
                    </button>
                  </p>
                )}
              </div>

              {/* Review request limit — the key differentiator */}
              <div className={`mb-5 px-3 py-2 rounded-lg text-sm font-semibold ${
                plan.id === "pro" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-700"
              }`}>
                {plan.limitLine}
              </div>

              <ul className="flex-1 space-y-3 mb-3">
                {SHARED_FEATURES.map((f) => {
                  const isChannelFeature = f === "Email, SMS & WhatsApp review requests";
                  const tags = [!smsEnabled && "SMS", !whatsappEnabled && "WhatsApp"].filter(Boolean);
                  return (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>
                        {f}
                        {isChannelFeature && tags.length > 0 && (
                          <span className="ml-1.5 text-[10px] bg-blue-50 text-blue-500 border border-blue-200 rounded px-1 py-0.5 font-medium">{tags.join(" & ")} coming soon</span>
                        )}
                      </span>
                    </li>
                  );
                })}
                {plan.id === "pro" && (
                  <>
                    <li className="flex items-start gap-2 text-sm font-semibold text-blue-700">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      Multiple users &amp; team management
                    </li>
                  </>
                )}
                {plan.id === "lite" && (
                  <>
                    <li className="flex items-start gap-2 text-sm text-gray-400">
                      <X className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                      Multiple users &amp; team management
                    </li>
                  </>
                )}
              </ul>
              <a
                href="/features"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline font-medium mb-5 block"
              >
                See full feature list →
              </a>

              {isCurrentPlan ? (
                <div className="w-full text-center py-2.5 rounded-lg bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
                  Your current plan
                </div>
              ) : isOtherPeriod ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => openCheckout(plan.id)}
                >
                  Switch to {period === "annual" ? "annual" : "monthly"}
                </Button>
              ) : user?.planType && user.planType !== "free" && user.planType !== "cancelled" && user.planType !== plan.id ? (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => openCheckout(plan.id)}
                >
                  {plan.id === "pro" ? "Upgrade to Pro" : "Switch to Standard"}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => openCheckout(plan.id)}
                >
                  Get started
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <a href="/faq" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">
          Have questions? Read our FAQ →
        </a>
        <p className="text-sm text-gray-400 text-center">
          Payments are processed securely by Stripe. You can cancel at any time from your account settings.
        </p>
      </div>

      {/* Embedded checkout modal */}
      {clientSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setClientSecret(null)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-700 bg-white rounded-full p-1 shadow"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      )}
    </div>
  );
}
