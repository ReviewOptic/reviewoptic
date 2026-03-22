import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Send, Clock, CheckCircle2, ArrowRight, Plus, BarChart2,
  Eye, Users, Star, MessageSquare, Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ActivityLog, Customer, Settings } from "@shared/schema";
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
  const [showIntro, setShowIntro] = useState(false);
  const [videoWatched, setVideoWatched] = useState(!INTRO_VIDEO_URL);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const key = `hasSeenIntro_v2_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowIntro(true);
      setVideoWatched(!INTRO_VIDEO_URL);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!INTRO_VIDEO_URL || !showIntro) return;
    function handleMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data.event === "onStateChange" && data.info === 0) setVideoWatched(true);
      } catch {}
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [showIntro]);

  function dismissIntro() {
    if (user?.id) localStorage.setItem(`hasSeenIntro_v2_${user.id}`, "true");
    setShowIntro(false);
  }

  const isReadOnly = !!user?.isImpersonating;

  const { data: stats, isLoading: statsLoading } = useQuery<{
    requestsThisMonth: number; pendingRequests: number; clicksThisMonth: number; clickRate: number;
  }>({ queryKey: ["/api/stats"] });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
  });

  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });

  const pendingFollowUp = customers?.filter(c => c.status === "request_sent" && !c.doNotContact) || [];

  return (
    <div className="px-6 py-7 max-w-6xl mx-auto space-y-7">

      {/* Intro welcome popup */}
      <Dialog open={showIntro}>
        <DialogContent className="max-w-xl p-0 overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
          <div className="px-7 pt-7 pb-2 text-center">
            <img src="/logo.png" alt="ReviewOptic" className="h-28 object-contain mx-auto mb-5" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <h2 className="text-2xl font-bold mb-1">Welcome to ReviewOptic</h2>
            <p className="text-muted-foreground text-sm mb-5">Your review growth starts here.</p>
          </div>
          <div className="mx-7">
            {INTRO_VIDEO_URL ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                <iframe src={`${INTRO_VIDEO_URL}?autoplay=1&enablejsapi=1`} title="Welcome to ReviewOptic" className="w-full h-full"
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
          <div className="px-7 pb-7 pt-5 space-y-2">
            {INTRO_VIDEO_URL && !videoWatched && (
              <p className="text-center text-[12px] text-muted-foreground">Please watch the video to continue.</p>
            )}
            <button
              onClick={() => { dismissIntro(); navigate("/tutorial"); }}
              disabled={!videoWatched}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {videoWatched ? "Let's get started" : "Watch the video to continue"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {getGreeting()}{settings?.ownerName ? `, ${settings.ownerName.trim().split(" ")[0]}` : ""}!
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5 italic">{getDailyQuote()}</p>
        </div>
        {!isReadOnly && (
          <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => navigate("/customers")}>
            <Plus className="w-3.5 h-3.5" />Add Customer
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-4">
          {statsLoading ? <Skeleton className="h-12 w-full" /> : (
            <>
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground leading-none">{stats?.requestsThisMonth ?? 0}</div>
                <div className="text-[11.5px] text-muted-foreground mt-1 leading-tight">Requests This Month</div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-4">
          {statsLoading ? <Skeleton className="h-12 w-full" /> : (
            <>
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground leading-none">{stats?.pendingRequests ?? 0}</div>
                <div className="text-[11.5px] text-muted-foreground mt-1 leading-tight">Awaiting Response</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Feed */}
        <div className="lg:col-span-2">
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
                <div>
                  {activity.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5 py-2 border-b border-border/60 last:border-0">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Needs Follow-Up */}
          <Card className="border-card-border">
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[14px] font-semibold">Awaiting Response</CardTitle>
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
                <div className="space-y-1">
                  {pendingFollowUp.slice(0, 5).map(c => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.email || c.phone}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  ))}
                  {pendingFollowUp.length > 5 && (
                    <button onClick={() => navigate("/customers")} className="text-[12px] text-primary font-medium flex items-center gap-1 px-2.5 pt-1">
                      +{pendingFollowUp.length - 5} more <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-card-border">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-[14px] font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {!isReadOnly && (
                <Button variant="outline" className="w-full justify-start gap-2 h-9 text-[13px]" onClick={() => navigate("/customers")}>
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  Add Customer
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-[13px]" onClick={() => navigate("/analytics")}>
                <BarChart2 className="w-3.5 h-3.5 text-primary" />
                View Analytics
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-[13px]" onClick={() => navigate("/settings?tab=platforms")}>
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
