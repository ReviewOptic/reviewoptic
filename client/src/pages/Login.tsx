import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface TrustpilotReview {
  id: string;
  stars: number;
  text: string;
  author: string;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <span className="text-[#00b67a] text-sm leading-none" aria-label={`${stars} stars`}>
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
    </span>
  );
}

function ReviewCards({ reviews }: { reviews: TrustpilotReview[] }) {
  const [index, setIndex] = useState(0);
  const review = reviews[index];
  return (
    <div className="mt-10 pt-8 border-t border-border">
      <div className="flex items-center gap-1.5 mb-4">
        <span className="text-[#00b67a] font-semibold text-xs">★</span>
        <span className="text-xs text-muted-foreground font-medium">Trusted by businesses across the UK</span>
      </div>
      <div className="bg-muted/40 rounded-xl p-5 min-h-[110px]">
        <StarRating stars={review.stars} />
        <p className="text-sm text-foreground leading-relaxed mt-2">{review.text}</p>
        <p className="text-xs text-muted-foreground font-medium mt-2">— {review.author}</p>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button onClick={() => setIndex(i => (i - 1 + reviews.length) % reviews.length)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">‹</button>
        {reviews.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/60"}`} />
        ))}
        <button onClick={() => setIndex(i => (i + 1) % reviews.length)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">›</button>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "📈", title: "Every review grows your business", desc: "A one-star improvement in your Google rating can increase revenue by up to 9%. Every new 5-star review makes you more visible in local search." },
  { icon: "⚡", title: "Send review requests in seconds", desc: "Email, SMS, or WhatsApp — reach customers on the channel they actually use." },
  { icon: "🎙️", title: "Personal voice & video messages", desc: "Record a short voice note or video from you personally — customers respond far more to a human touch than a plain text message." },
  { icon: "🔄", title: "Automatic follow-ups", desc: "If a customer doesn't respond, ReviewOptic follows up for you — so no opportunity is ever missed." },
  { icon: "📊", title: "Track everything in one place", desc: "See your conversion rate, average star rating, and best-performing channels at a glance." },
  { icon: "🤖", title: "AI-powered insights", desc: "Get a personalised weekly report with actionable tips to improve your review performance." },
  { icon: "🛡️", title: "Turn unhappy customers into loyal ones", desc: "Low ratings go to a private feedback form — so you can make it right before it becomes a public complaint." },
  { icon: "📱", title: "Auto-post reviews to social media", desc: "Automatically share your best reviews to Instagram, Facebook, and LinkedIn. Your reputation, amplified." },
  { icon: "🌟", title: "Works with all major platforms", desc: "Google, Trustpilot, Facebook, Checkatrade, TripAdvisor, and more." },
];

export default function Login() {
  const { login, register, user } = useAuth();
  const [, navigate] = useLocation();
  const { data: branding } = useQuery<{ logoUrl: string; businessName: string }>({ queryKey: ["/api/public/branding"] });
  const { data: reviewsData } = useQuery<{ reviews: TrustpilotReview[]; source: string }>({ queryKey: ["/api/public/trustpilot-reviews"] });

  useEffect(() => {
    if (user && !user.requiresPayment) navigate("/");
  }, [user]);

  const initialMode = new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailVal = (e.currentTarget.elements.namedItem("email") as HTMLInputElement)?.value || email;
    const passwordVal = (e.currentTarget.elements.namedItem("password") as HTMLInputElement)?.value || password;
    setError("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: emailVal }) });
        setForgotSent(true);
      } else if (mode === "login") {
        await login(emailVal, passwordVal);
      } else {
        if (!firstName || !lastName) throw new Error("First and last name are required");
        if (!companyName) throw new Error("Company name is required");
        if (!agreedToTerms) throw new Error("You must agree to the Terms and Conditions to create an account");
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        if (!/[0-9]/.test(password)) throw new Error("Password must contain at least one number");
        if (!/[^a-zA-Z0-9]/.test(password)) throw new Error("Password must contain at least one symbol");
        await register(email, password, firstName, lastName, companyName, undefined, agreedToTerms);
        navigate("/pricing");
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      setError(msg);
      if (msg === "An account with this email already exists") setAccountExists(true);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "register" | "forgot") => {
    setMode(m);
    setError("");
    setForgotSent(false);
    setAccountExists(false);
  };

  // ── The form card contents (shared across all layouts) ──────────────────────
  const formCard = (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-left">
      {mode === "forgot" ? (
        forgotSent ? (
          <div className="text-center py-2">
            <CheckCircle2 className="w-9 h-9 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Check your email</h3>
            <p className="text-muted-foreground text-sm mb-5">If an account exists for <strong>{email}</strong>, we've sent a reset link.</p>
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
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            <button type="button" onClick={() => switchMode("login")} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${mode === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sign in</button>
            <button type="button" onClick={() => switchMode("register")} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${mode === "register" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Create account</button>
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
                  <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-muted-foreground hover:text-primary">Forgot password?</button>
                )}
              </div>
              <Input type="password" name="password" placeholder="••••••••" autoComplete={mode === "register" ? "new-password" : "current-password"} onChange={e => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : undefined} />
            </div>
            {mode === "register" && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                <span className="text-sm text-muted-foreground leading-snug">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms and Conditions</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>
                </span>
              </label>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {accountExists && (
              <div className="flex flex-col gap-2 text-sm">
                <button type="button" onClick={async () => {
                  setResendLoading(true);
                  await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
                  setResendLoading(false); setResendDone(true); setError(""); setAccountExists(false); setVerificationSent(true);
                }} className="text-primary hover:underline font-medium text-left" disabled={resendLoading}>
                  {resendLoading ? "Sending…" : "Resend activation email"}
                </button>
                <button type="button" onClick={() => switchMode("forgot")} className="text-primary hover:underline font-medium text-left">Reset your password</button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Sign in" : "Create account")}
            </Button>
          </form>
        </>
      )}
    </div>
  );

  const logoUrl = branding?.logoUrl || "/logo.png";
  const reviews = reviewsData?.reviews;

  const footerLinks = (
    <p className="text-center text-sm text-muted-foreground mt-4 space-x-3">
      <button type="button" onClick={() => navigate("/pricing")} className="underline hover:text-foreground font-medium">View pricing</button>
      <span>·</span>
      <button type="button" onClick={() => navigate("/faq")} className="underline hover:text-foreground font-medium">FAQ</button>
    </p>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:w-1/2 bg-primary text-white flex flex-col justify-between p-8 md:p-12 md:min-h-screen">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4 text-white">Turn happy customers<br />into 5-star reviews — on autopilot.</h1>
          <p className="text-white/75 text-base mb-10 leading-relaxed">ReviewOptic helps local businesses automatically collect more reviews on Google, Trustpilot, Facebook, and more.</p>
          <div className="space-y-6">
            {FEATURES.map(item => (
              <div key={item.title} className="flex items-start gap-4">
                <span className="text-2xl mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-white">{item.title}</p>
                  <p className="text-white/65 text-sm leading-snug mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="md:w-1/2 flex flex-col items-center justify-start p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <img src={logoUrl} alt="ReviewOptic" className="h-28 object-contain" />
          </div>
          {formCard}
          {footerLinks}
          {reviews?.length ? <ReviewCards reviews={reviews} /> : null}
        </div>
      </div>
    </div>
  );
}
