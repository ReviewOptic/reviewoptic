import { useState } from "react";
import { useSearch } from "wouter";
import { Star, ThumbsUp, MessageSquare, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Settings, ReviewRequest, Customer } from "@shared/schema";

export default function ReviewLanding() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const rid = params.get("rid");
  const [step, setStep] = useState<"rating" | "positive" | "negative" | "done">("rating");
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState("");

  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });
  const { data: request } = useQuery<ReviewRequest>({
    queryKey: ["/api/review-requests", rid],
    queryFn: async () => {
      const res = await fetch(`/api/review-requests`);
      const all = await res.json();
      return all.find((r: ReviewRequest) => r.id === rid);
    },
    enabled: !!rid,
  });
  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/customers", request?.customerId],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${request?.customerId}`);
      return res.json();
    },
    enabled: !!request?.customerId,
  });

  const feedbackMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/private-feedback", {
      customerId: request?.customerId || "unknown",
      stars,
      message: feedback,
    }),
    onSuccess: () => setStep("done"),
  });

  const handleStarSelect = (s: number) => {
    setStars(s);
    if (s >= 4) {
      setStep("positive");
    } else {
      setStep("negative");
    }
  };

  const businessName = settings?.businessName || "Our Business";
  const googleLink = settings?.googleReviewLink;
  const facebookLink = settings?.facebookReviewLink;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-3">
            <Star className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">{businessName}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Share your experience</p>
        </div>

        <Card className="border-card-border shadow-lg">
          <CardContent className="p-6">
            {step === "rating" && (
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-[18px] font-bold">How was your experience?</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {customer?.name ? `Hi ${customer.name.split(" ")[0]}, ` : ""}
                    Your feedback means a lot to us.
                  </p>
                </div>
                <div className="flex justify-center gap-3" data-testid="star-rating">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => handleStarSelect(s)}
                      className="transition-transform hover:scale-110 active:scale-95"
                      data-testid={`star-${s}`}
                    >
                      <Star
                        className={cn(
                          "w-10 h-10 transition-colors",
                          s <= (hovered || stars)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30 hover:text-amber-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-muted-foreground">Click a star to continue</p>
              </div>
            )}

            {step === "positive" && (
              <div className="text-center space-y-5">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30">
                  <ThumbsUp className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold">We're so glad you loved it!</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Would you mind sharing your experience online? It helps others find us.
                  </p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={cn("w-4 h-4", s <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {googleLink && (
                    <a href={googleLink} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full gap-2 h-11" data-testid="button-google-review">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Review us on Google
                        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                      </Button>
                    </a>
                  )}
                  {facebookLink && (
                    <a href={facebookLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full gap-2 h-11" data-testid="button-facebook-review">
                        <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Review us on Facebook
                        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                      </Button>
                    </a>
                  )}
                  {!googleLink && !facebookLink && (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
                      <p className="text-[13px] text-muted-foreground">
                        Thank you so much for your {stars}-star rating! Your feedback means the world to us.
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setStep("done")}
                  className="text-[12px] text-muted-foreground underline underline-offset-2"
                >
                  Maybe later
                </button>
              </div>
            )}

            {step === "negative" && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-3">
                    <MessageSquare className="w-7 h-7 text-amber-600" />
                  </div>
                  <h2 className="text-[18px] font-bold">We're sorry to hear that</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Tell us what went wrong so we can make it right.
                  </p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={cn("w-4 h-4", s <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                </div>
                <Textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Please share what we could have done better..."
                  className="resize-none h-28 text-[13px]"
                  data-testid="textarea-feedback"
                />
                <Button
                  className="w-full h-11"
                  onClick={() => feedbackMutation.mutate()}
                  disabled={feedbackMutation.isPending}
                  data-testid="button-submit-feedback"
                >
                  {feedbackMutation.isPending ? "Sending..." : "Send Feedback"}
                </Button>
                <button onClick={() => setStep("rating")} className="w-full text-[12px] text-muted-foreground">
                  ← Change my rating
                </button>
              </div>
            )}

            {step === "done" && (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-[18px] font-bold">Thank you!</h2>
                <p className="text-[13px] text-muted-foreground">
                  {stars >= 4
                    ? "We appreciate you taking the time to share your experience."
                    : "Your feedback helps us improve. We'll be in touch soon."}
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
