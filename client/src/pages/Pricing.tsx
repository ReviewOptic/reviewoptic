import { useState } from "react";
import { useLocation } from "wouter";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    id: "standard",
    name: "Standard",
    description: "For local service businesses",
    monthly: { price: 49, display: "£49", amount: 4900 },
    annual:  { price: 539, display: "£539", amount: 53900, saving: "Save £49 — 1 month free" },
    features: [
      "Unlimited review requests",
      "Email & SMS campaigns",
      "AI-generated messages",
      "Analytics dashboard",
      "Custom email templates",
      "Google, Trustpilot & more",
      "No contracts — cancel anytime",
    ],
    highlight: false,
  },
  {
    id: "agency",
    name: "Agency",
    description: "Manage multiple clients",
    monthly: { price: 149, display: "£149", amount: 14900 },
    annual:  { price: 1639, display: "£1,639", amount: 163900, saving: "Save £149 — 1 month free" },
    features: [
      "Everything in Standard",
      "Multiple client accounts",
      "Priority support",
      "Bulk campaign management",
      "Advanced analytics",
      "No contracts — cancel anytime",
    ],
    highlight: false,
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planId: string) {
    if (!user) {
      navigate("/register");
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: planId, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to start checkout");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h1>
        <p className="text-lg text-gray-500">No setup fees. No hidden charges. Cancel anytime.</p>
      </div>

      {/* Monthly / Annual toggle */}
      <div className="flex items-center gap-3 mb-10 bg-white border border-gray-200 rounded-full p-1">
        <button
          onClick={() => setPeriod("monthly")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            period === "monthly"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setPeriod("annual")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            period === "annual"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800"
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
          return (
            <div
              key={plan.id}
              className={`flex-1 rounded-2xl border-2 bg-white p-8 flex flex-col shadow-sm ${
                plan.highlight ? "border-blue-600 relative" : "border-gray-200"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Most popular
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{pricing.display}</span>
                  <span className="text-gray-500 mb-1">
                    {period === "monthly" ? "/month" : "/year"}
                  </span>
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
                    <button
                      onClick={() => setPeriod("annual")}
                      className="text-blue-600 hover:underline"
                    >
                      pay annually and save 1 month
                    </button>
                  </p>
                )}
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <div className="w-full text-center py-2.5 rounded-lg bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
                  Your current plan
                </div>
              ) : (
                <Button
                  className={`w-full ${plan.highlight ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!loading}
                >
                  {loading === plan.id ? "Redirecting…" : `Get ${plan.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-sm text-gray-400 text-center">
        Payments are processed securely by Stripe. You can cancel at any time from your account settings.
      </p>
    </div>
  );
}
