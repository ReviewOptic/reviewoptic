import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Register() {
  const { register, user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const referredByAccountId = new URLSearchParams(search).get("ref") || undefined;

  useEffect(() => {
    if (user && !user.requiresPayment) navigate("/");
  }, [user]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!firstName || !lastName) { setError("Please enter your first and last name"); return; }
    if (!companyName) { setError("Please enter your company name"); return; }
    if (email.toLowerCase() !== confirmEmail.toLowerCase()) { setError("Email addresses do not match — please check and try again"); return; }
    if (!agreedToTerms) { setError("You must agree to the Terms and Conditions to continue"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!/[0-9]/.test(password)) { setError("Password must contain at least one number"); return; }
    if (!/[^a-zA-Z0-9]/.test(password)) { setError("Password must contain at least one symbol"); return; }
    setLoading(true);
    try {
      const data = await register(email, password, firstName, lastName, companyName, referredByAccountId, agreedToTerms);
      if (data?.requiresVerification) {
        setError("This email is already registered but not yet verified. We've resent the activation link — check your inbox.");
        setAccountExists(true);
      } else {
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-primary rounded-t-2xl px-8 py-7 text-center">
          <img src="/logo.png" alt="ReviewOptic" className="h-16 object-contain mx-auto mb-4 brightness-0 invert" />
          <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-sm text-white/75">Start your 14-day free trial. Cancel within 14 days and pay nothing.</p>
        </div>

        <div className="bg-card rounded-b-2xl border border-t-0 border-border shadow-sm p-8">
          <h2 className="sr-only">Registration form</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="space-y-1.5 flex-1">
                <label className="block text-sm font-medium text-gray-700">First name</label>
                <Input type="text" placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="block text-sm font-medium text-gray-700">Last name</label>
                <Input type="text" placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Company name</label>
              <Input type="text" placeholder="Acme Plumbing" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <Input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Confirm email address</label>
              <Input type="email" placeholder="you@example.com" autoComplete="off" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <Input type="password" placeholder="••••••••" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              <p className="text-xs text-gray-400">Min. 8 characters, at least one number and one symbol</p>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="text-sm text-gray-500 leading-snug">
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-gray-700 hover:text-gray-900">Terms and Conditions</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-gray-700 hover:text-gray-900">Privacy Policy</a>
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {accountExists && (
              <div className="flex flex-col gap-1.5 text-sm border-t border-gray-100 pt-3">
                <button type="button" onClick={async () => {
                  setResendLoading(true);
                  await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
                  setResendLoading(false);
                  setAccountExists(false);
                  setError("Activation email resent — check your inbox.");
                }} className="text-blue-600 hover:underline font-medium text-left" disabled={resendLoading}>
                  {resendLoading ? "Sending…" : "Resend activation email"}
                </button>
                <button type="button" onClick={() => navigate("/login")} className="text-blue-600 hover:underline font-medium text-left">
                  Sign in to existing account
                </button>
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/login")} className="text-blue-600 hover:underline font-medium">
            Sign in
          </button>
        </p>
        <p className="text-center text-sm text-gray-400 mt-2 space-x-3">
          <button type="button" onClick={() => navigate("/pricing")} className="underline hover:text-gray-600">View pricing plans</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/faq")} className="underline hover:text-gray-600">FAQ</button>
        </p>
      </div>
    </div>
  );
}
