import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const PLATFORM_META: Record<string, { name: string; signIn: boolean; logo: React.ReactNode }> = {
  google: {
    name: "Google",
    signIn: true,
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  facebook: {
    name: "Facebook",
    signIn: true,
    logo: (
      <svg className="w-8 h-8" fill="#1877F2" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  trustpilot: {
    name: "Trustpilot",
    signIn: true,
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#00B67A">
        <path d="M12 0L14.59 8.41H23L16.18 13.59L18.76 22L12 16.82L5.24 22L7.82 13.59L1 8.41H9.41L12 0Z"/>
      </svg>
    ),
  },
  tripadvisor: {
    name: "TripAdvisor",
    signIn: true,
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#34E0A1">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-3.5-8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm7 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-3.5 4c-1.8 0-3.3-1-4-2.5h8c-.7 1.5-2.2 2.5-4 2.5z"/>
      </svg>
    ),
  },
  checkatrade: {
    name: "Checkatrade",
    signIn: false,
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#1B5EA6">
        <path d="M12 2L3 7v10l9 5 9-5V7L12 2zm0 2.18L19 8.09v7.82L12 19.82 5 15.91V8.09L12 4.18zm-1 4.32v7l5-3.5-5-3.5z"/>
      </svg>
    ),
  },
  mybuilder: {
    name: "MyBuilder",
    signIn: false,
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#F26522">
        <path d="M3 3h18v4H3zm0 7h8v11H3zm10 0h8v11h-8z"/>
      </svg>
    ),
  },
};

export default function ReviewLanding() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const rid = params.get("rid");
  const preRating = parseInt(params.get("rating") || "0");

  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(preRating || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [highRating, setHighRating] = useState(false);
  const [ratedStar, setRatedStar] = useState(0);
  const [platforms, setPlatforms] = useState<{ key: string; name: string; url: string }[]>([]);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingType, setRecordingType] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [ratingLocked, setRatingLocked] = useState(false);

  const { data: info, isLoading } = useQuery<{
    businessName: string;
    logoUrl: string;
    customerFirstName: string;
    alreadyRated: boolean;
    existingRating: number | null;
    feedbackSubmitted: boolean;
    platforms: { key: string; name: string; url: string }[];
    recordingUrl: string;
    recordingType: string;
  }>({
    queryKey: [`/api/public/review-request/${rid}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/review-request/${rid}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!rid,
  });

  // On return visit: auto-open the appropriate dialog based on existing rating
  useEffect(() => {
    if (!info || ratingLocked) return;
    if (!info.existingRating) return;
    setRatedStar(info.existingRating);
    setRatingLocked(true);
    if (info.existingRating >= 4) {
      setHighRating(true);
      setPlatforms(info.platforms || []);
      setRecordingUrl(info.recordingUrl || "");
      setRecordingType(info.recordingType || "");
      setDialogOpen(true);
    } else if (!info.feedbackSubmitted) {
      setHighRating(false);
      setDialogOpen(true);
    }
    // Low rating + feedback already submitted: just lock the card, no dialog
  }, [info]);

  async function handleRateNow() {
    if (!selectedStar || isSubmitting || !rid) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/review/${rid}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selectedStar }),
      });
      const data = await res.json();
      setRatedStar(selectedStar);
      setHighRating(!!data.highRating);
      setPlatforms(data.platforms || []);
      setRecordingUrl(data.recordingUrl || "");
      setRecordingType(data.recordingType || "");
      setRatingLocked(true);
      setDialogOpen(true);
    } catch {
      setRatedStar(selectedStar);
      setRatingLocked(true);
      setDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim() || feedbackSubmitting || !rid) return;
    setFeedbackSubmitting(true);
    try {
      await fetch(`/api/public/review/${rid}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText }),
      });
    } catch {}
    setFeedbackSubmitting(false);
    setFeedbackSubmitted(true);
  }

  const businessName = info?.businessName || "Our Business";
  const firstName = info?.customerFirstName;
  // Lock the main card (show "already submitted") when:
  // - High rating submitted (this session or return visit)
  // - Low rating where feedback was already submitted
  // Low rating with no feedback = keep card open so they can reopen the dialog
  const alreadyRated =
    (ratingLocked && highRating) ||
    (!!(info?.existingRating && info.existingRating >= 4)) ||
    !!info?.feedbackSubmitted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          {info?.logoUrl ? (
            <img src={info.logoUrl} alt={businessName} className="h-14 object-contain mx-auto mb-3" />
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-3">
              <Star className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
            </div>
          )}
          <h1 className="text-xl font-bold">{businessName}</h1>
        </div>

        <Card className="border-card-border shadow-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-[18px] font-bold">How would you rate your experience?</h2>
                {firstName && (
                  <p className="text-[13px] text-muted-foreground mt-1">Hi {firstName}, we'd love to hear from you.</p>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : alreadyRated ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-[14px] text-muted-foreground">You've already submitted your rating — thank you!</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setSelectedStar(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-1 transition-transform hover:scale-110"
                        aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                      >
                        <Star
                          className={cn(
                            "w-10 h-10 transition-colors",
                            star <= (hoveredStar || selectedStar)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-none text-muted-foreground/40"
                          )}
                        />
                      </button>
                    ))}
                  </div>

                  {ratingLocked && !highRating && !feedbackSubmitted ? (
                    <Button className="w-full" onClick={() => setDialogOpen(true)}>
                      Share your feedback
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={handleRateNow}
                      disabled={!selectedStar || isSubmitting}
                    >
                      {isSubmitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                        : "Rate Now"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
          Powered by ReviewOptic
        </p>
      </div>

      {/* Post-rating dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">

          {/* 4-5 stars: invite to leave a public review */}
          {highRating && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn("w-6 h-6", s <= ratedStar ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30")} />
                  ))}
                </div>
                <DialogTitle className="text-center">
                  Thanks for the rating{firstName ? `, ${firstName}` : ""}!
                </DialogTitle>
                <DialogDescription className="text-center">
                  Would you please take a couple of moments to leave us a review?
                </DialogDescription>
              </DialogHeader>

              {recordingUrl && (
                <div className="rounded-xl overflow-hidden border border-border bg-black">
                  {recordingType === "video" ? (
                    <video src={recordingUrl} controls autoPlay playsInline className="w-full max-h-64 object-contain" />
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-muted/40">
                      <span className="text-2xl">🎙️</span>
                      <audio src={recordingUrl} controls autoPlay className="flex-1" />
                    </div>
                  )}
                </div>
              )}

              {platforms.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map(p => {
                    const meta = PLATFORM_META[p.key];
                    return (
                      <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer"
                        onClick={() => {
                          if (rid) {
                            fetch(`/api/track/${rid}/platform-click`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ platform: p.key }),
                            }).catch(() => {});
                          }
                        }}>
                        <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/40 transition-colors cursor-pointer">
                          {meta?.logo ?? null}
                          <span className="text-[13px] font-semibold">{p.name}</span>
                          <span className={cn(
                            "text-[10.5px] px-2 py-0.5 rounded-full font-medium",
                            meta?.signIn
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-green-50 text-green-700 border border-green-200"
                          )}>
                            {meta?.signIn ? "Sign in required" : "No sign in required"}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-[13px] text-muted-foreground py-4">
                  Thank you for your support — your kind words mean a lot to us.
                </p>
              )}
            </div>
          )}

          {/* 1-3 stars: private feedback — done state */}
          {!highRating && feedbackSubmitted && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <DialogTitle>Thank you for your feedback</DialogTitle>
              <DialogDescription>
                We really appreciate you taking the time to let us know. We'll look into this and be in touch.
              </DialogDescription>
            </div>
          )}

          {/* 1-3 stars: private feedback — form */}
          {!highRating && !feedbackSubmitted && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn("w-6 h-6", s <= ratedStar ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30")} />
                  ))}
                </div>
                <DialogTitle className="text-center">We're sorry to hear that</DialogTitle>
                <DialogDescription className="text-center">
                  Would you take a couple of moments to share your experience and let us know how we can improve?
                </DialogDescription>
              </DialogHeader>

              <Textarea
                placeholder="Please share what we could have done better..."
                className="resize-none h-28 text-[13px]"
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
              />

              <Button
                className="w-full"
                onClick={handleFeedbackSubmit}
                disabled={!feedbackText.trim() || feedbackSubmitting}
              >
                {feedbackSubmitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  : "Send Feedback"}
              </Button>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}
