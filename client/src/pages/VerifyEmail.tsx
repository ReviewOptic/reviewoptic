import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");

  const doVerify = useCallback(async (isRetry = false) => {
    setStatus("loading");
    setCanRetry(false);
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token found in the link.");
      return;
    }
    try {
      const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { credentials: "include" });
      if (res.ok) {
        await refreshUser();
        setStatus("success");
        setTimeout(() => navigate("/"), 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.message?.includes("already used")) {
          // Already verified — treat as success
          await refreshUser();
          setStatus("success");
          setTimeout(() => navigate("/"), 1500);
        } else if (res.status >= 500 && !isRetry) {
          // Server error on first attempt — auto-retry once after a delay
          await new Promise(r => setTimeout(r, 2000));
          return doVerify(true);
        } else {
          setStatus("error");
          setErrorMsg(data.message || "Verification failed.");
          setCanRetry(res.status >= 500);
        }
      }
    } catch {
      if (!isRetry) {
        await new Promise(r => setTimeout(r, 2000));
        return doVerify(true);
      }
      setStatus("error");
      setErrorMsg("Unable to reach the server. Please try again.");
      setCanRetry(true);
    }
  }, [token, refreshUser, navigate]);

  useEffect(() => {
    doVerify();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <img src="/logo.png" alt="ReviewOptic" className="h-28 object-contain mx-auto mb-5" />

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-9 h-9 text-primary mx-auto mb-3 animate-spin" />
              <h3 className="font-semibold">Verifying your email…</h3>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-9 h-9 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Email verified!</h3>
              <p className="text-muted-foreground text-sm">Taking you to your dashboard…</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-9 h-9 text-destructive mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Verification failed</h3>
              <p className="text-muted-foreground text-sm mb-5">{errorMsg}</p>
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <button type="button" onClick={() => doVerify()} className="text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 py-2 rounded-lg">
                    Try again
                  </button>
                )}
                <button type="button" onClick={() => navigate("/login")} className="text-sm text-primary hover:underline font-medium">
                  Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
