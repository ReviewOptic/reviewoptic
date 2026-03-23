import { useState } from "react";
import { useSearch } from "wouter";
import { Star, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Step = "rating" | "platforms" | "feedback" | "done";

const PLATFORM_LOGOS: Record<string, React.ReactNode> = {
  google: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  facebook: (
    <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  trustpilot: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00B67A">
      <path d="M12 0L14.59 8.41H23L16.18 13.59L18.76 22L12 16.82L5.24 22L7.82 13.59L1 8.41H9.41L12 0Z"/>
    </svg>
  ),
};

export default function ReviewLanding() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const rid = params.get("rid");

  const [step, setStep] = useState<Step>("rating");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [platforms, setPlatforms] = useState<{ key: string; name: string; url: string }[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);

  const { data: info, isLoading } = useQuery<{
    businessName: string;
    logoUrl: string;
    customerFirstName: string;
    alreadyRated: boolean;
  }>({
    queryKey: [`/api/public/review-request/${rid}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/review-request/${rid}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!rid,
  });

  async function handleStarClick(star: number) {
    if (isSubmitting || !rid) return;
    setSelectedStar(star);
    setRating(star);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/review/${rid}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: star }),
      });
      const data = await res.json();
      if (data.highRating) {
        setPlatforms(data.platforms || []);
        setStep("platforms");
      } else {
        setStep("feedback");
      }
    } catch {
      // still move to feedback on error
      setStep("feedback");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim() || !rid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/public/review/${rid}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText }),
      });
      setStep("done");
    } catch {
      setStep("done");
    } finally {
      setIsSubmitting(false);
    }
  }

  const businessName = info?.businessName || "Our Business";
  const firstName = info?.customerFirstName;

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

            {/* Step 1: Star rating */}
            {step === "rating" && (
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
                ) : (
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        disabled={isSubmitting || !!selectedStar}
                        className="p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed"
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
                )}

                {isSubmitting && selectedStar > 0 && (
                  <div className="flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}

            {/* Step 2a: High rating — show platform links */}
            {step === "platforms" && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={cn("w-6 h-6", s <= rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30")} />
                    ))}
                  </div>
                  <h2 className="text-[18px] font-bold">Thank you{firstName ? `, ${firstName}` : ""}!</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Would you mind sharing your experience on one of these platforms? It means the world to us.
                  </p>
                </div>

                {platforms.length > 0 ? (
                  <div className="space-y-2.5">
                    {platforms.map(p => (
                      <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full gap-2 h-11" variant={p.key === "google" ? "default" : "outline"}>
                          {PLATFORM_LOGOS[p.key] ?? null}
                          Leave a review on {p.name}
                          <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                        </Button>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[13px] text-muted-foreground py-4">
                    Thank you for your support — your kind words mean a lot to us.
                  </p>
                )}
              </div>
            )}

            {/* Step 2b: Low rating — private feedback form */}
            {step === "feedback" && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={cn("w-6 h-6", s <= rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30")} />
                    ))}
                  </div>
                  <h2 className="text-[18px] font-bold">We're sorry to hear that</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Tell us what went wrong so we can make it right.
                  </p>
                </div>

                <Textarea
                  placeholder="Please share what we could have done better..."
                  className="resize-none h-28 text-[13px]"
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                />

                <Button
                  className="w-full"
                  onClick={handleFeedbackSubmit}
                  disabled={!feedbackText.trim() || isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Feedback"}
                </Button>
              </div>
            )}

            {/* Step 3: Done (after feedback submitted) */}
            {step === "done" && (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h2 className="text-[18px] font-bold">Thank you for your feedback</h2>
                <p className="text-[13px] text-muted-foreground">
                  We really appreciate you taking the time to let us know. We'll look into this and be in touch.
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
          Powered by ReviewOptic
        </p>
      </div>
    </div>
  );
}
