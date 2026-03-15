import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle2 } from "lucide-react";

const features = [
  "Send review requests via email, SMS or WhatsApp",
  "Automated follow-ups — set it once and forget it",
  "Unhappy customers go to private feedback, not public reviews",
  "Track requests, clicks, and your average rating in one place",
];

export default function Register() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, businessName);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-primary text-primary-foreground p-12">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15">
            <Star className="w-5 h-5 fill-current" />
          </div>
          <span className="font-bold text-lg tracking-tight">ReviewOptic</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight mb-5">
            Turn happy customers into 5-star reviews — automatically
          </h1>
          <p className="text-primary-foreground/75 text-lg mb-10 leading-relaxed">
            ReviewOptic helps local businesses collect more online reviews with zero extra effort. Send requests, follow up automatically, and grow your reputation while you focus on the job.
          </p>
          <ul className="space-y-4">
            {features.map(f => (
              <li key={f} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-white/80" />
                <span className="text-white/90 text-[15px]">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/40 text-sm">© 2026 ReviewOptic</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Star className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">ReviewOptic</span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Create your account</h2>
          <p className="text-muted-foreground text-sm mb-7">Get set up in under 5 minutes. No credit card needed.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Acme Plumbing"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
