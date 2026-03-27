import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export default function Register() {
  const { register, user } = useAuth();
  const [, navigate] = useLocation();
  const { data: branding } = useQuery<{ logoUrl: string; businessName: string }>({
    queryKey: ["/api/public/branding"],
  });

  useEffect(() => {
    if (user && !user.requiresPayment) navigate("/");
  }, [user]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!firstName || !lastName) { setError("First and last name are required"); return; }
    if (!companyName) { setError("Company name is required"); return; }
    if (!agreedToTerms) { setError("You must agree to the Terms and Conditions to create an account"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!/[0-9]/.test(password)) { setError("Password must contain at least one number"); return; }
    if (!/[^a-zA-Z0-9]/.test(password)) { setError("Password must contain at least one symbol"); return; }
    setLoading(true);
    try {
      await register(email, password, firstName, lastName, companyName);
      navigate("/pricing");
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      setError(msg);
      if (msg === "An account with this email already exists") setAccountExists(true);
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm">We've sent a verification link to <strong>{email}</strong>. Click it to activate your account, then choose your plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* Left sidebar */}
      <div className="md:w-1/2 bg-background text-foreground flex flex-col justify-center p-8 md:p-12 border-r border-border">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
          Turn happy customers<br />into 5-star reviews — on autopilot.
        </h1>
        <p className="text-muted-foreground text-base mb-10 leading-relaxed">
          ReviewOptic helps local businesses collect more Google, Trustpilot, and Facebook reviews without any manual effort.
        </p>
        <div className="space-y-6">
          {[
            { icon: "⚡", title: "Send review requests in seconds", desc: "Email, SMS, or WhatsApp — reach customers on the channel they actually use." },
            { icon: "🔄", title: "Automatic follow-ups", desc: "If a customer doesn't respond, ReviewOptic follows up for you — so no opportunity is ever missed." },
            { icon: "📊", title: "Track everything in one place", desc: "See your conversion rate, average star rating, and best-performing channels at a glance." },
            { icon: "🌟", title: "Works with all major platforms", desc: "Google, Trustpilot, Facebook, Checkatrade, TripAdvisor, and more." },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-4">
              <span className="text-2xl mt-0.5">{item.icon}</span>
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-muted-foreground text-sm leading-snug mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="md:w-1/2 flex flex-col items-center justify-start p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <img src={branding?.logoUrl || "/logo.png"} alt="ReviewOptic" className="h-28 object-contain" />
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-1">Create your account</h2>
            <p className="text-sm text-muted-foreground mb-5">Start your free trial — no credit card required to sign up.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <div className="space-y-1.5 flex-1">
                  <label className="block text-sm font-medium">First name</label>
                  <Input type="text" placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="block text-sm font-medium">Last name</label>
                  <Input type="text" placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Company name</label>
                <Input type="text" placeholder="Acme Plumbing" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Email address</label>
                <Input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Password</label>
                <Input type="password" placeholder="••••••••" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                <p className="text-xs text-muted-foreground">At least 8 characters, one number, one symbol</p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-sm text-muted-foreground leading-snug">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms and Conditions</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>
                </span>
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {accountExists && (
                <div className="flex flex-col gap-2 text-sm">
                  <button type="button" onClick={async () => {
                    setResendLoading(true);
                    await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
                    setResendLoading(false);
                    setAccountExists(false);
                    setVerificationSent(true);
                  }} className="text-primary hover:underline font-medium text-left" disabled={resendLoading}>
                    {resendLoading ? "Sending…" : "Resend activation email"}
                  </button>
                  <button type="button" onClick={() => navigate("/login")} className="text-primary hover:underline font-medium text-left">
                    Sign in instead
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{" "}
            <button type="button" onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
              Sign in
            </button>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            <button type="button" onClick={() => navigate("/pricing")} className="underline hover:text-foreground font-medium">
              View pricing plans
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
