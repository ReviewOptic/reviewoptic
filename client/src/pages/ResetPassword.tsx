import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords don't match");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Something went wrong");
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Star className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
            </div>
            <span className="font-bold text-[15px] tracking-tight">ReviewOptic</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {done ? (
            <div className="text-center py-2">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold mb-2">Password updated</h2>
              <p className="text-muted-foreground text-sm mb-5">You can now sign in with your new password.</p>
              <Button className="w-full" onClick={() => navigate("/login")}>Go to sign in</Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-1">Set a new password</h2>
              <p className="text-muted-foreground text-sm mb-5">Choose a new password for your account.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">New password</label>
                  <Input type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Confirm password</label>
                  <Input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
