import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { useLocation } from "wouter";
import {
  Send, Clock, CheckCircle2, ArrowRight, Plus, BarChart2,
  Eye, Users, Star, MessageSquare, Play, AlertCircle, Mail,
  FileText, Settings as SettingsIcon, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ActivityLog, Customer, Settings, ReviewRequest } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  "People trust people. A real review beats any ad you'll ever run.",
  "Ask for the review. The worst they can say is nothing.",
  "Your best salespeople are your happiest customers.",
  "A business with no reviews is a business people scroll past.",
  "Reviews aren't just feedback — they're free advertising.",
  "Word of mouth never went away. It just moved online.",
  "Great service gets remembered. A review makes sure it gets found.",
  "The follow-up is where most businesses give up. Don't.",
  "Consistency builds trust. Trust builds reviews. Reviews build growth.",
  "One unhappy customer handled well can become your loudest advocate.",
  "Don't wait for customers to find you. Let your reviews do it for you.",
  "You can't buy a genuine five-star review — you have to earn it.",
];

// Replace with your real YouTube embed URL when ready

// Format: "https://www.youtube.com/embed/YOUR_VIDEO_ID"
const INTRO_VIDEO_URL = "";

function RespondDialog({ feedback, onClose }: { feedback: any; onClose: () => void }) {
  const { toast } = useToast();
  const firstName = (feedback.customer_name || "").split(" ")[0] || "there";

  // Default channel matches how the original request was sent
  const originalChannel: string = feedback.request_channel || "email";
  const hasEmail = !!feedback.customer_email;
  const hasPhone = !!feedback.customer_phone;

  const [replyChannel, setReplyChannel] = useState(originalChannel);
  const [replyMessage, setReplyMessage] = useState(`Hi ${firstName}, thank you for taking the time to share your feedback — we're sorry to hear your experience wasn't what it should have been. We'd love to make this right.`);
  const [internalNote, setInternalNote] = useState("");

  const receivedAt = new Date(feedback.created_at);
  const timeAgo = formatDistanceToNow(receivedAt, { addSuffix: true });

  const canSendEmail = hasEmail;
  const canSendSms = hasPhone;
  const canSendWhatsApp = hasPhone;

  const channelAvailable = (ch: string) => {
    if (ch === "email") return canSendEmail;
    if (ch === "sms") return canSendSms;
    if (ch === "whatsapp") return canSendWhatsApp;
    return false;
  };

  const channelLabel: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
  const channelIcon: Record<string, React.ReactNode> = {
    email: <Mail className="w-3.5 h-3.5" />,
    sms: <MessageSquare className="w-3.5 h-3.5" />,
    whatsapp: <MessageSquare className="w-3.5 h-3.5 text-green-500" />,
  };

  const mutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/private-feedback/${feedback.id}/respond`, {
      response: internalNote || replyMessage,
      replyChannel,
      replyMessage,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/private-feedback"] });
      toast({ title: `Reply sent via ${channelLabel[replyChannel]} and feedback marked as responded.` });
      onClose();
    },
    onError: (err: any) => toast({ title: "Failed to send reply", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reply to Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {/* Feedback summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium">{feedback.customer_name}</span>
                <span className="text-[11px] text-muted-foreground">·</span>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn("w-3 h-3", s <= feedback.stars ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30")} />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Received {timeAgo}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground italic">"{feedback.message}"</p>
          </div>

          {/* Channel selector */}
          <div className="space-y-1.5">
            <p className="text-[12.5px] font-medium">Send reply via</p>
            <div className="flex gap-2">
              {(["email", "sms", "whatsapp"] as const).map(ch => (
                <button
                  key={ch}
                  type="button"
                  disabled={!channelAvailable(ch)}
                  onClick={() => setReplyChannel(ch)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-colors flex items-center justify-center gap-1.5",
                    replyChannel === ch ? "bg-selected text-selected-foreground border-selected" : "border-border text-muted-foreground hover:bg-muted",
                    !channelAvailable(ch) && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {channelIcon[ch]} {channelLabel[ch]}
                </button>
              ))}
            </div>
            {replyChannel === "email" && !hasEmail && (
              <p className="text-[11.5px] text-destructive">No email address saved for this customer.</p>
            )}
            {(replyChannel === "sms" || replyChannel === "whatsapp") && !hasPhone && (
              <p className="text-[11.5px] text-destructive">No phone number saved for this customer.</p>
            )}
          </div>

          {/* Reply message */}
          <div className="space-y-1.5">
            <p className="text-[12.5px] font-medium">Message to customer</p>
            <Textarea
              className="resize-none h-28 text-[13px]"
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
            />
          </div>

          {/* Internal note */}
          <div className="space-y-1.5">
            <p className="text-[12.5px] font-medium text-muted-foreground">Internal note <span className="font-normal">(optional — not sent to customer)</span></p>
            <Textarea
              placeholder="How did you resolve this? Any follow-up actions?"
              className="resize-none h-16 text-[13px]"
              value={internalNote}
              onChange={e => setInternalNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate(undefined)}
            disabled={!replyMessage.trim() || mutation.isPending || !channelAvailable(replyChannel)}
          >
            {mutation.isPending ? "Sending..." : `Send via ${channelLabel[replyChannel]}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [showIntro, setShowIntro] = useState(false);
  const [videoWatched, setVideoWatched] = useState(!INTRO_VIDEO_URL);
  const [respondingTo, setRespondingTo] = useState<any>(null);
  const ignoreFeedbackMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/private-feedback/${id}/ignore`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/private-feedback"] }),
  });
  const [quote] = useState(() => inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;
    // Intro disabled until video is ready — uncomment below to re-enable
    // const key = `hasSeenIntro_v2_${user.id}`;
    // if (!localStorage.getItem(key)) {
    //   setShowIntro(true);
    //   setVideoWatched(!INTRO_VIDEO_URL);
    // }
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
    requestsThisMonth: number; pendingRequests: number; clicksThisMonth: number; clickRate: number; averageRating: number | null;
  }>({ queryKey: ["/api/stats"] });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
  });

  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"], refetchInterval: 15000 });
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });
  const { data: privateFeedback = [] } = useQuery<any[]>({ queryKey: ["/api/private-feedback"], refetchInterval: 15000 });
  const { data: allRequests = [] } = useQuery<ReviewRequest[]>({ queryKey: ["/api/review-requests"] });

  const pendingFollowUp = customers?.filter(c => c.status === "request_sent" && !c.doNotContact) || [];
  const unrespondedFeedback = privateFeedback.filter(f => !f.responded);
  const noResponseCustomers = customers?.filter(c => c.status === "no_response" && !c.doNotContact) || [];
  const stalePendingCustomers = customers?.filter(c => {
    if (c.doNotContact || c.status !== "request_sent") return false;
    const daysSince = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 14;
  }) || [];

  const pendingCustomers = customers?.filter(c => c.status === "pending_request" && !c.doNotContact && !c.archived) || [];

  const customerMap = Object.fromEntries((customers || []).map(c => [c.id, c.name]));
  const recentRatings = [...allRequests]
    .filter(r => r.rating !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map(r => ({ ...r, customerName: customerMap[r.customerId] || "Customer" }));

  return (
    <div className="max-w-6xl mx-auto">

      {/* Intro welcome popup */}
      <Dialog open={showIntro}>
        <DialogContent className="max-w-xl p-0 overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
          <div className="px-7 pt-7 pb-2 text-center">
            <img src="/logo.png" alt="ReviewOptic" className="h-28 object-contain mx-auto mb-5" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
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

      {/* Page header band */}
      <div className="bg-primary/[0.07] border-b border-primary/10 px-6 pt-7 pb-5">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {getGreeting()}{settings?.ownerName ? `, ${settings.ownerName.trim().split(" ")[0]}` : ""}!
        </h1>
        <p className="text-[13.5px] text-muted-foreground mt-0.5 italic">{quote}</p>
      </div>

      <div className="px-6 py-6 space-y-6">

      <OnboardingChecklist />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="flex items-center gap-3 bg-primary rounded-xl px-4 py-4">
          {statsLoading ? <Skeleton className="h-12 w-full opacity-30" /> : (
            <>
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white leading-none">{stats?.requestsThisMonth ?? 0}</div>
                <div className="text-[11.5px] text-white/70 mt-1 leading-tight">Requests Sent</div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 bg-primary rounded-xl px-4 py-4">
          {statsLoading ? <Skeleton className="h-12 w-full opacity-30" /> : (
            <>
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white leading-none">{stats?.clicksThisMonth ?? 0}</div>
                <div className="text-[11.5px] text-white/70 mt-1 leading-tight">Links Clicked</div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 bg-primary rounded-xl px-4 py-4">
          {statsLoading ? <Skeleton className="h-12 w-full opacity-30" /> : (
            <>
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white leading-none">{stats?.clickRate ?? 0}%</div>
                <div className="text-[11.5px] text-white/70 mt-1 leading-tight">Click Rate</div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 bg-primary rounded-xl px-4 py-4">
          {statsLoading ? <Skeleton className="h-12 w-full opacity-30" /> : (
            <>
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white leading-none">{unrespondedFeedback.length}</div>
                <div className="text-[11.5px] text-white/70 mt-1 leading-tight">Unread Feedback</div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 bg-primary rounded-xl px-4 py-4">
          {statsLoading ? <Skeleton className="h-12 w-full opacity-30" /> : (
            <>
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white leading-none">
                  {stats?.averageRating != null ? stats.averageRating.toFixed(1) : "—"}
                </div>
                <div className="text-[11.5px] text-white/70 mt-1 leading-tight">Avg. Star Rating</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick links — mobile only */}
      <div className="grid grid-cols-2 sm:hidden gap-3">
        {[
          { label: "Customers", icon: Users, path: "/customers" },
          { label: "Templates", icon: FileText, path: "/templates" },
          { label: "Analytics", icon: BarChart2, path: "/analytics" },
          { label: "Settings", icon: SettingsIcon, path: "/settings" },
        ].map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
          >
            <link.icon className="w-5 h-5 text-primary" />
            <span className="text-[12px] font-medium">{link.label}</span>
          </button>
        ))}
      </div>

      {/* To-do nudges */}
      {(noResponseCustomers.length > 0 || stalePendingCustomers.length > 0) && (
        <div className="space-y-2">
          {noResponseCustomers.length > 0 && (
            <div className="flex items-center justify-between gap-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[13px] text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">{noResponseCustomers.length} customer{noResponseCustomers.length !== 1 ? "s" : ""}</span> got no response — consider sending a new request for a recent job.
                </p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 text-[12px] h-7 border-amber-300 hover:bg-amber-100" onClick={() => navigate("/customers?status=no_response")}>
                View
              </Button>
            </div>
          )}
          {stalePendingCustomers.length > 0 && (
            <div className="flex items-center justify-between gap-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-[13px] text-blue-800 dark:text-blue-200">
                  <span className="font-semibold">{stalePendingCustomers.length} customer{stalePendingCustomers.length !== 1 ? "s" : ""}</span> have been waiting over 14 days with no response.
                </p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 text-[12px] h-7 border-blue-300 hover:bg-blue-100" onClick={() => navigate("/customers")}>
                View
              </Button>
            </div>
          )}
        </div>
      )}

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

          {/* Private Feedback */}
          {unrespondedFeedback.length > 0 && (
            <Card className="border-card-border border-amber-300 dark:border-amber-700">
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[14px] font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Private Feedback
                  </CardTitle>
                  <Badge className="text-[11px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                    {unrespondedFeedback.length} Needs Response
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                {unrespondedFeedback.slice(0, 4).map((f: any) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setRespondingTo(f)}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[13px] font-medium truncate">{f.customer_name}</p>
                        <div className="flex">
                          {[1,2,3].map(s => (
                            <Star key={s} className={cn("w-2.5 h-2.5", s <= f.stars ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30")} />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground truncate italic">"{f.message}"</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setRespondingTo(f)}
                        className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                        title="Respond"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => ignoreFeedbackMutation.mutate(f.id)}
                        className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
                        title="Ignore"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pending customers */}
          {pendingCustomers.length > 0 && (
            <Card className="border-card-border">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[14px] font-semibold">Ready to Send</CardTitle>
                  <Badge variant="secondary" className="text-[11px]">{pendingCustomers.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-[11.5px] text-muted-foreground mb-2">Added but no request sent yet</p>
                <div className="space-y-1">
                  {pendingCustomers.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">{c.name}</p>
                        {(c.serviceType || c.email) && (
                          <p className="text-[11px] text-muted-foreground truncate">{c.serviceType || c.email}</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[11.5px] ml-2 shrink-0" onClick={() => navigate(`/customers/${c.id}`)}>
                        Send
                      </Button>
                    </div>
                  ))}
                </div>
                {pendingCustomers.length > 5 && (
                  <button onClick={() => navigate("/customers")} className="text-[12px] text-primary mt-2 hover:underline">
                    +{pendingCustomers.length - 5} more
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Latest ratings */}
          {recentRatings.length > 0 && (
            <Card className="border-card-border">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-[14px] font-semibold">Latest Ratings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-0">
                  {recentRatings.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">{r.customerName}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={cn("w-3 h-3", i <= (r.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {respondingTo && <RespondDialog feedback={respondingTo} onClose={() => setRespondingTo(null)} />}

      </div>{/* end px-6 py-6 content area */}
    </div>
  );
}
