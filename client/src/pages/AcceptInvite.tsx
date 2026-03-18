import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [info, setInfo] = useState<{ email: string; firstName: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); return; }
    fetch(`/api/auth/accept-invite?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setInfo(d); else setInvalid(true); });
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDone(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (invalid) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-bold mb-2">Invalid invitation</h2>
        <p className="text-muted-foreground text-sm">This invitation link is invalid or has already been used.</p>
      </div>
    </div>
  );

  if (!info) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-2">You're all set!</h2>
        <p className="text-muted-foreground text-sm">Taking you to the dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <img src="/logo.png" alt="ReviewOptic" className="h-12 w-auto mx-auto mb-8" />
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-1">Set your password</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Welcome, {info.firstName}! You're joining as <strong>{info.email}</strong>. Set a password to get started.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Password</label>
              <Input type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Confirm password</label>
              <Input type="password" placeholder="Repeat your password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting up your account…" : "Create account & sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
