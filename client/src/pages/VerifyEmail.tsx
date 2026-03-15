import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Star, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token found in the link.");
      return;
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { credentials: "include" })
      .then(async res => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => navigate("/"), 2000);
        } else {
          const data = await res.json();
          setStatus("error");
          setErrorMsg(data.message || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      });
  }, []);

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
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm text-primary hover:underline font-medium"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
