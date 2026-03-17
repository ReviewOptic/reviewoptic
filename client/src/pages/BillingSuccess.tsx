import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function BillingSuccess() {
  const [, navigate] = useLocation();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"confirming" | "done" | "error">("confirming");
  const [plan, setPlan] = useState("");
  const [period, setPeriod] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) { setStatus("error"); return; }

    fetch(`/api/billing/confirm?session_id=${sessionId}`, { credentials: "include" })
      .then((r) => r.json())
      .then(async (data) => {
        if (data.success) {
          setPlan(data.plan);
          setPeriod(data.period);
          await refreshUser();
          setStatus("done");
          setTimeout(() => navigate("/"), 3000);
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "confirming") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Confirming your payment…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <p className="text-red-600 font-semibold mb-2">Something went wrong confirming your payment.</p>
        <p className="text-gray-500 text-sm mb-6">
          If your card was charged, contact us and we'll sort it out right away.
        </p>
        <Button onClick={() => navigate("/pricing")}>Back to pricing</Button>
      </div>
    );
  }

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const periodLabel = period === "annual" ? "Annual" : "Monthly";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mb-5" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment successful!</h1>
      <p className="text-gray-600 mb-1">
        You're now on the{" "}
        <span className="font-semibold">{planLabel} Plan ({periodLabel})</span>.
      </p>
      <p className="text-gray-400 text-sm mb-8">Redirecting you to your dashboard…</p>
      <Button onClick={() => navigate("/")}>Go to dashboard now</Button>
    </div>
  );
}
