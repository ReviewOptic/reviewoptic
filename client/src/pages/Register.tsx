import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Business name</label>
              <Input type="text" placeholder="Acme Plumbing" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Password</label>
              <Input type="password" placeholder="At least 6 characters" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground mt-5">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline font-medium">Sign in</a>
        </p>
      </div>
    </div>
  );
}
