import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Login() {
  const { login, register, user } = useAuth();
  const [, navigate] = useLocation();
  const { data: branding } = useQuery<{ logoUrl: string; businessName: string }>({
    queryKey: ["/api/public/branding"],
  });

  useEffect(() => {
    if (user) navigate("/");
  }, [user]);
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailVal = (e.currentTarget.elements.namedItem("email") as HTMLInputElement)?.value || email;
    const passwordVal = (e.currentTarget.elements.namedItem("password") as HTMLInputElement)?.value || password;
    setError("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal }),
        });
        setForgotSent(true);
      } else if (mode === "login") {
        await login(emailVal, passwordVal);
        // navigation handled by useEffect watching user state
      } else {
        if (!firstName || !lastName) throw new Error("First and last name are required");
        if (!companyName) throw new Error("Company name is required");
        if (!agreedToTerms) throw new Error("You must agree to the Terms and Conditions to create an account");
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        if (!/[0-9]/.test(password)) throw new Error("Password must contain at least one number");
        if (!/[^a-zA-Z0-9]/.test(password)) throw new Error("Password must contain at least one symbol");
        const result = await register(email, password, firstName, lastName, companyName);
        if (result.requiresVerification) {
          setVerificationSent(true);
        } else {
          navigate("/");
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "register" | "forgot") => {
    setMode(m);
    setError("");
    setForgotSent(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex flex-col items-center gap-3 mb-0">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="logo" style={{width: "100%", maxWidth: "320px", height: "auto"}} />
          ) : (
            <img src="/logo.png" alt="ReviewOptic" className="h-8 w-auto" />
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Turn happy customers into 5-star reviews</h1>
        <p className="text-muted-foreground text-sm mb-8">Send review requests, follow up automatically, and grow your reputation on autopilot.</p>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-left">
          {verificationSent ? (
            <div className="text-center py-2">
              <CheckCircle2 className="w-9 h-9 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Check your email</h3>
              <p className="text-muted-foreground text-sm mb-5">We sent a verification link to <strong>{email}</strong>. Click it to activate your account.</p>
              <button
                type="button"
                disabled={resendLoading || resendDone}
                onClick={async () => {
                  setResendLoading(true);
                  await fetch("/api/auth/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                  setResendLoading(false);
                  setResendDone(true);
                }}
                className="text-sm text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendDone ? "Email resent!" : resendLoading ? "Resending…" : "Resend verification email"}
              </button>
              <div className="mt-3">
                <button type="button" onClick={() => { setVerificationSent(false); setMode("login"); }} className="text-sm text-muted-foreground hover:underline">Back to sign in</button>
              </div>
            </div>
          ) : mode === "forgot" ? (
            forgotSent ? (
              <div className="text-center py-2">
                <CheckCircle2 className="w-9 h-9 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Check your email</h3>
                <p className="text-muted-foreground text-sm mb-5">If an account exists for <strong>{email}</strong>, we've sent a reset link. Check your inbox.</p>
                <button type="button" onClick={() => switchMode("login")} className="text-sm text-primary hover:underline font-medium">Back to sign in</button>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => switchMode("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <h3 className="font-semibold mb-1">Forgot your password?</h3>
                <p className="text-muted-foreground text-sm mb-5">Enter your email and we'll send you a reset link.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Email</label>
                    <Input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
                </form>
              </>
            )
          ) : (
            <>
              {/* Toggle */}
              <div className="flex rounded-lg bg-muted p-1 mb-6">
                <button type="button" onClick={() => switchMode("login")} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${mode === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  Sign in
                </button>
                <button type="button" onClick={() => switchMode("register")} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${mode === "register" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  Create account
                </button>
              </div>

              <form key={mode} onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <>
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
                  </>
                )}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Email</label>
                  <Input type="email" name="email" placeholder="you@example.com" autoComplete="email" onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium">Password</label>
                    {mode === "login" && (
                      <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-muted-foreground hover:text-primary">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={mode === "register" ? 8 : undefined}
                  />
                </div>
                {mode === "register" && (
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
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Sign in" : "Create account")}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          <a href="/pricing" className="underline hover:text-foreground font-medium">View pricing plans</a>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-3">
          By signing up, you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms and Conditions</a>
          {" "}and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
