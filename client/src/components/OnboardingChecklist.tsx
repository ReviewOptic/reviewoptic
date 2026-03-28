import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CheckCircle2, Circle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

type Settings = {
  businessName?: string;
  ownerName?: string;
  googleReviewLink?: string;
  trustpilotLink?: string;
  facebookReviewLink?: string;
  tripadvisorLink?: string;
  checkatradeLink?: string;
  mybuilderLink?: string;
};

const DISMISSED_KEY = "ro_onboarding_dismissed";

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISSED_KEY));

  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });

  if (!user || user.role !== "owner" || dismissed) return null;

  const hasBusinessDetails = !!(settings?.businessName?.trim() && settings?.ownerName?.trim());
  const hasReviewPlatform = !!(
    settings?.googleReviewLink ||
    settings?.trustpilotLink ||
    settings?.facebookReviewLink ||
    settings?.tripadvisorLink ||
    settings?.checkatradeLink ||
    settings?.mybuilderLink
  );
  const hasCustomers = (customers as any[]).length > 0;
  const hasSentRequest = (customers as any[]).some((c: any) => c.status !== "pending_request");

  const steps = [
    { done: hasBusinessDetails, label: "Add your business details", path: "/settings", hint: "Settings → Business tab" },
    { done: hasReviewPlatform, label: "Connect a review platform", path: "/settings?tab=platforms", hint: "Settings → Review Platforms tab" },
    { done: hasCustomers, label: "Add your first customer", path: "/customers", hint: "Customers page → Add Customer" },
    { done: hasSentRequest, label: "Send your first review request", path: "/customers", hint: "Customers page → Send Request" },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  // Auto-dismiss once everything is complete
  useEffect(() => {
    if (allDone) {
      localStorage.setItem(DISMISSED_KEY, "1");
      setDismissed(true);
    }
  }, [allDone]);

  if (dismissed) return null;

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6 relative shadow-sm">
      <button
        onClick={() => { localStorage.setItem(DISMISSED_KEY, "1"); setDismissed(true); }}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Get started with ReviewOptic</h2>
          <p className="text-sm text-gray-500">{completedCount} of {steps.length} steps complete</p>
        </div>
        <div className="ml-auto mr-8 flex gap-1">
          {steps.map((s, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${s.done ? "bg-blue-500" : "bg-gray-200"}`} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => !step.done && navigate(step.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              step.done ? "opacity-60 cursor-default" : "hover:bg-blue-50 cursor-pointer"
            }`}
          >
            {step.done
              ? <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
              : <Circle className="w-5 h-5 text-gray-300 shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium ${step.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                {step.label}
              </span>
              {!step.done && <p className="text-xs text-gray-400 mt-0.5">{step.hint}</p>}
            </div>
            {!step.done && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}
