import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function BillingSuccess() {
  const [, navigate] = useLocation();
  const { refreshUser, user } = useAuth();
  const [status, setStatus] = useState<"confirming" | "done" | "error">("confirming");
  const [plan, setPlan] = useState("");
  const [period, setPeriod] = useState("");
  const [resendDone, setResendDone] = useState(false);

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

  // If already verified, go straight to dashboard
  if (user?.emailVerified) {
    setTimeout(() => navigate("/"), 2000);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-5" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h1>
        <p className="text-gray-600 mb-1">You're on the <span className="font-semibold">{planLabel} Plan ({periodLabel})</span>.</p>
        <p className="text-gray-400 text-sm mb-8">Redirecting you to your dashboard…</p>
        <Button onClick={() => navigate("/")}>Go to dashboard now</Button>
      </div>
    );
  }

  // Not yet verified — prompt to check email
  async function resend() {
    if (!user?.email) return;
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });
    setResendDone(true);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <img src="/logo.png" alt="ReviewOptic" style={{ maxWidth: "180px", height: "auto" }} className="mb-6" />
      <CheckCircle className="w-16 h-16 text-green-500 mb-5" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment successful!</h1>
      <p className="text-gray-600 mb-6">
        You're now on the <span className="font-semibold">{planLabel} Plan ({periodLabel})</span>.
      </p>
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-sm w-full text-left shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Mail className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="font-semibold text-gray-900">One last step — verify your email</h2>
        </div>
        <p className="text-sm text-gray-500 mb-2">
          We sent a verification link to <strong>{user?.email}</strong>. Click it to activate your account and access your dashboard.
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Can't see it? Check your spam or junk folder.
        </p>
        <button
          onClick={resend}
          disabled={resendDone}
          className="text-sm text-blue-600 hover:underline font-medium disabled:opacity-50"
        >
          {resendDone ? "Email resent!" : "Resend verification email"}
        </button>
      </div>
    </div>
  );
}
