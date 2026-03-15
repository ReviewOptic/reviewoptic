import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Login() {
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setForgotSent(true);
      } else if (mode === "login") {
        await login(email, password);
        navigate("/");
      } else {
        await register(email, password, businessName);
        navigate("/");
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
        <div className="flex justify-center mb-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Star className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
            </div>
            <span className="font-bold text-[15px] tracking-tight">ReviewOptic</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Turn happy customers into 5-star reviews</h1>
        <p className="text-muted-foreground text-sm mb-8">Send review requests, follow up automatically, and grow your reputation on autopilot.</p>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-left">
          {mode === "forgot" ? (
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

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Business name</label>
                    <Input type="text" placeholder="Acme Plumbing" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Email</label>
                  <Input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
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
                    placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={mode === "register" ? 6 : undefined}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Sign in" : "Create account")}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
