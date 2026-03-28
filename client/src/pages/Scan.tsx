import { useState } from "react";
import { useParams } from "wouter";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const PLATFORM_LOGOS: Record<string, React.ReactNode> = {
  google: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  facebook: <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  trustpilot: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00B67A"><path d="M12 0L14.59 8.41H23L16.18 13.59L18.76 22L12 16.82L5.24 22L7.82 13.59L1 8.41H9.41L12 0Z"/></svg>,
  tripadvisor: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#34E0A1"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-3.5-8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm7 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-3.5 4c-1.8 0-3.3-1-4-2.5h8c-.7 1.5-2.2 2.5-4 2.5z"/></svg>,
  checkatrade: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1B5EA6"><path d="M12 2L3 7v10l9 5 9-5V7L12 2zm0 2.18L19 8.09v7.82L12 19.82 5 15.91V8.09L12 4.18zm-1 4.32v7l5-3.5-5-3.5z"/></svg>,
  mybuilder: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF6B00"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z"/></svg>,
};

export default function Scan() {
  const { accountId } = useParams<{ accountId: string }>();
  const [selectedStar, setSelectedStar] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [highRating, setHighRating] = useState(false);
  const [platforms, setPlatforms] = useState<{ key: string; name: string; url: string }[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: info, isLoading, isError } = useQuery<{ businessName: string; platforms: { key: string; name: string; url: string }[] }>({
    queryKey: [`/api/public/scan-info/${accountId}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/scan-info/${accountId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!accountId,
  });

  async function handleSubmit() {
    if (!selectedStar || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/scan-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, star: selectedStar }),
      });
      const data = await res.json();
      setHighRating(data.highRating);
      setPlatforms(data.platforms || []);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return;
    await fetch("/api/public/scan-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, star: selectedStar, message: feedbackText }),
    }).catch(() => {});
    setFeedbackSubmitted(true);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">This link is no longer active.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">{info.businessName}</h1>
          <p className="text-sm text-muted-foreground">How was your experience?</p>
        </div>

        {!submitted ? (
          <div className="space-y-6">
            {/* Stars */}
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStar(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={cn("w-10 h-10 transition-colors", (hoveredStar || selectedStar) >= star
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30")}
                  />
                </button>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={!selectedStar || submitting}
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit rating"}
            </Button>
          </div>
        ) : highRating ? (
          /* High rating — show review platform buttons */
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Thank you so much!</p>
              <p className="text-sm text-muted-foreground mt-1">
                We're delighted you had a great experience. Would you mind leaving us a quick review?
              </p>
            </div>
            <div className="space-y-2">
              {platforms.map(p => (
                <a
                  key={p.key}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full border border-border rounded-lg py-3 px-4 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  {PLATFORM_LOGOS[p.key]}
                  Leave a review on {p.name}
                </a>
              ))}
            </div>
          </div>
        ) : (
          /* Low rating — show feedback form */
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-semibold text-foreground">We're sorry to hear that.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Could you tell us what went wrong? We'd love to make it right.
              </p>
            </div>
            {!feedbackSubmitted ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="What could we have done better?"
                  className="resize-none h-28 text-sm"
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                />
                <Button className="w-full" onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()}>
                  Send feedback
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  This doesn't affect your right to leave a public review.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                <p className="text-sm font-medium">Thank you for your feedback.</p>
                <p className="text-xs text-muted-foreground">We'll look into this and work to improve.</p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/50">Powered by ReviewOptic</p>
      </div>
    </div>
  );
}
