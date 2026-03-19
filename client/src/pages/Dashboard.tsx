import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Send, Star, TrendingUp, Users, Clock, MessageSquare, CheckCircle2,
  AlertTriangle, ArrowRight, Plus, Zap, Eye, BarChart2, Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ActivityLog, Customer, PrivateFeedback, Review, Settings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const activityIcons: Record<string, React.ReactNode> = {
  customer_added: <Users className="w-3.5 h-3.5" />,
  request_sent: <Send className="w-3.5 h-3.5" />,
  link_clicked: <Eye className="w-3.5 h-3.5" />,
  review_received: <Star className="w-3.5 h-3.5" />,
  private_feedback: <MessageSquare className="w-3.5 h-3.5" />,
  follow_up_sent: <Clock className="w-3.5 h-3.5" />,
};

const activityColors: Record<string, string> = {
  customer_added: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  request_sent: "bg-primary/10 text-primary",
  link_clicked: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  review_received: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  private_feedback: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  follow_up_sent: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
};

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn("w-3 h-3", i <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const inspirationalQuotes = [
  "Every great review starts with a great experience.",
  "Happy customers don't just come back — they bring others with them.",
  "The best marketing is a customer who can't stop talking about you.",
  "One five-star review is worth a thousand ads.",
  "Service is not what you do, it's who you are.",
  "A satisfied customer is the best business strategy of all.",
  "Excellence is not a skill — it's an attitude.",
  "Your reputation is built one customer at a time.",
];

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return inspirationalQuotes[dayOfYear % inspirationalQuotes.length];
}

// Replace with your real YouTube embed URL when ready
// Format: "https://www.youtube.com/embed/YOUR_VIDEO_ID"
const INTRO_VIDEO_URL = "";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [statModal, setStatModal] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const key = `hasSeenIntro_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowIntro(true);
    }
  }, [user?.id]);

  function dismissIntro() {
    if (user?.id) localStorage.setItem(`hasSeenIntro_${user.id}`, "true");
    setShowIntro(false);
  }
  const isReadOnly = !!user?.isImpersonating;
  const { data: stats, isLoading: statsLoading } = useQuery<{
    requestsThisMonth: number; pendingRequests: number; reviewsThisMonth: number;
    responseRate: number; avgRating: number;
  }>({ queryKey: ["/api/stats"] });
  const { data: activity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
  });
  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: feedback } = useQuery<PrivateFeedback[]>({ queryKey: ["/api/private-feedback"] });
  const { data: reviews } = useQuery<Review[]>({ queryKey: ["/api/reviews"] });
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });

  const pendingFollowUp = customers?.filter(c => c.status === "request_sent" && !c.doNotContact) || [];
  const unrespondedFeedback = feedback?.filter(f => !f.responded) || [];
  const recentReviews = reviews?.slice(0, 5) || [];

  const respondMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/private-feedback/${id}`, { responded: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/private-feedback"] });
      toast({ title: "Marked as responded" });
    },
  });

  const statCards = [
    { label: "Requests This Month", value: stats?.requestsThisMonth ?? 0, icon: Send, color: "text-primary", bg: "bg-primary/10", suffix: "", path: "/stat/requests" },
    { label: "Pending Response", value: stats?.pendingRequests ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20", suffix: "", path: "/stat/pending" },
    { label: "Reviews This Month", value: stats?.reviewsThisMonth ?? 0, icon: Star, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", suffix: "", path: "/stat/reviews" },
    { label: "Response Rate", value: stats?.responseRate ?? 0, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/20", suffix: "%", path: "/stat/response-rate" },
    { label: "Avg. Star Rating", value: stats?.avgRating ?? 0, icon: Star, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", suffix: "★", path: "/stat/avg-rating" },
  ];

  return (
    <div className="px-6 py-7 max-w-7xl mx-auto space-y-7">

      {/* Intro welcome popup */}
      <Dialog open={showIntro} onOpenChange={(open) => { if (!open) dismissIntro(); }}>
        <DialogContent className="max-w-xl p-0 overflow-hidden" aria-describedby={undefined}>
          <div className="px-7 pt-7 pb-2 text-center">
            <img src="/logo.png" alt="ReviewOptic" className="h-8 object-contain mx-auto mb-5" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <h2 className="text-2xl font-bold mb-1">Welcome to ReviewOptic</h2>
            <p className="text-muted-foreground text-sm mb-5">Your review growth starts here.</p>
          </div>

          {/* Video */}
          <div className="mx-7">
            {INTRO_VIDEO_URL ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                <iframe src={INTRO_VIDEO_URL} title="Welcome to ReviewOptic" className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            ) : (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                </div>
                <span className="text-white/40 text-sm">Intro video coming soon</span>
              </div>
            )}
          </div>

          <div className="px-7 pt-5 pb-1 text-center">
            <button
              onClick={() => { dismissIntro(); navigate("/tutorial"); }}
              className="text-sm text-primary hover:underline font-medium"
            >
              Click here for tutorials
            </button>
          </div>

          <div className="px-7 pb-7 pt-5">
            <button
              onClick={dismissIntro}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Let's get started
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{getGreeting()}{settings?.ownerName ? `, ${settings.ownerName.trim().split(" ")[0]}` : ""}!</h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5 italic">{getDailyQuote()}</p>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/customers")} data-testid="button-add-customer"><Plus className="w-3.5 h-3.5" />Add Customer</Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s, i) => (
          <div
            key={i}
            onClick={() => !statsLoading && navigate(s.path)}
            className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-4 cursor-pointer hover:bg-muted/70 transition-colors"
          >
            {statsLoading ? <Skeleton className="h-12 w-full" /> : (
              <>
                <div className={cn("flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full", s.bg)}>
                  <s.icon className={cn("w-5 h-5", s.color)} />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground leading-none">{s.value}{s.suffix}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-1 leading-tight">{s.label}</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-card-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {activityLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-0">
                  {activity.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5 py-1.5 border-b border-border/60 last:border-0" data-testid={`activity-item-${item.id}`}>
                      <div className={cn("flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full", activityColors[item.type] || "bg-muted text-muted-foreground")}>
                        {activityIcons[item.type] || <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <p className="text-[12px] text-foreground leading-snug flex-1 min-w-0 truncate">{item.message}</p>
                      <p className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px]">No activity yet. Add customers to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          {recentReviews.length > 0 && (
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] font-semibold">Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {recentReviews.map((review) => {
                  const customer = customers?.find(c => c.id === review.customerId);
                  return (
                    <div key={review.id} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-card-border" data-testid={`review-item-${review.id}`}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium">{customer?.name || "Customer"}</span>
                          <StarRating stars={review.stars} />
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">{review.platform}</Badge>
                        </div>
                        {review.reviewText && (
                          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{review.reviewText}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Items Sidebar */}
        <div className="space-y-4">
          {/* Pending Follow-ups */}
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] font-semibold">Needs Follow-Up</CardTitle>
                {pendingFollowUp.length > 0 && (
                  <Badge variant="secondary" className="text-[11px]">{pendingFollowUp.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {pendingFollowUp.length === 0 ? (
                <div className="text-center py-5 text-muted-foreground">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-[12px]">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingFollowUp.slice(0, 4).map(c => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      data-testid={`followup-item-${c.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  ))}
                  {pendingFollowUp.length > 4 && (
                    <button onClick={() => navigate("/customers")} className="text-[12px] text-primary font-medium flex items-center gap-1 px-2.5 pt-1">
                      +{pendingFollowUp.length - 4} more <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Private Feedback */}
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] font-semibold">Private Feedback</CardTitle>
                {unrespondedFeedback.length > 0 && (
                  <Badge variant="destructive" className="text-[11px]">{unrespondedFeedback.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {unrespondedFeedback.length === 0 ? (
                <div className="text-center py-5 text-muted-foreground">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-[12px]">No unresolved feedback</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unrespondedFeedback.slice(0, 3).map(f => {
                    const customer = customers?.find(c => c.id === f.customerId);
                    return (
                      <div key={f.id} className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10" data-testid={`feedback-item-${f.id}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium">{customer?.name || "Customer"}</span>
                          <StarRating stars={f.stars} />
                        </div>
                        {f.message && <p className="text-[11.5px] text-muted-foreground line-clamp-2">{f.message}</p>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] mt-1.5 px-2 text-primary"
                          onClick={() => respondMutation.mutate(f.id)}
                          data-testid={`button-respond-${f.id}`}
                        >
                          Mark responded
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {!isReadOnly && (
                <Button variant="outline" className="w-full justify-start gap-2 h-9 text-[13px]" onClick={() => navigate("/customers")} data-testid="quick-add-customer">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  Add Customer
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-[13px]" onClick={() => navigate("/analytics")} data-testid="quick-view-analytics">
                <BarChart2 className="w-3.5 h-3.5 text-primary" />
                View Analytics
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-[13px]" onClick={() => navigate("/settings")} data-testid="quick-settings">
                <Star className="w-3.5 h-3.5 text-primary" />
                Review Platforms
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
