import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Send, Star, TrendingUp, Clock, Search, Plus,
  ArrowRight, BarChart2, CheckCircle2, AlertCircle, Eye, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { Customer, Review, PrivateFeedback, ReviewRequest } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn("w-3 h-3", i <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_request: { label: "Pending", color: "bg-muted text-muted-foreground" },
  request_sent: { label: "Request Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  clicked: { label: "Clicked", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  review_completed: { label: "Reviewed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  no_response: { label: "No Response", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

type PeriodKey = "this_month" | "last_month" | "all_time" | "custom";

function periodLabel(p: PeriodKey) {
  if (p === "this_month") return "This Month";
  if (p === "last_month") return "Last Month";
  if (p === "custom") return "Custom Range";
  return "All Time";
}

function inPeriod(date: Date, period: PeriodKey, customFrom?: Date, customTo?: Date) {
  if (period === "all_time") return true;
  if (period === "custom") {
    if (customFrom && date < customFrom) return false;
    if (customTo) {
      const end = new Date(customTo);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    return true;
  }
  const now = new Date();
  const base = period === "last_month" ? subMonths(now, 1) : now;
  return date >= startOfMonth(base) && date <= endOfMonth(base);
}

// ─────────────────────────────────────────────
// VIEW: Requests
// ─────────────────────────────────────────────
function RequestsView({ customers = [], reviewRequests = [], privateFeedback = [] }: { customers: Customer[]; reviewRequests: ReviewRequest[]; privateFeedback: PrivateFeedback[] }) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fromDate = customFrom ? new Date(customFrom) : undefined;
  const toDate = customTo ? new Date(customTo) : undefined;

  const filtered = customers.filter(c => {
    const d = new Date(c.createdAt);
    const matchesPeriod = inPeriod(d, period, fromDate, toDate);
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return c.status !== "pending_request" && matchesPeriod && matchesSearch && matchesStatus;
  });

  const statuses = ["all", "request_sent", "clicked", "review_completed", "no_response"];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sent", value: filtered.filter(c => c.status !== "pending_request").length, color: "text-primary" },
          { label: "Clicked", value: filtered.filter(c => c.status === "clicked").length, color: "text-purple-600" },
          { label: "Reviewed", value: filtered.filter(c => c.status === "review_completed").length, color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-muted/40 px-4 py-3 text-center">
            <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["this_month", "last_month", "all_time", "custom"] as PeriodKey[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn("px-3 py-1 rounded-full text-[12px] font-medium border transition-colors", period === p ? "bg-selected text-selected-foreground border-selected" : "border-border text-muted-foreground hover:bg-accent")}>
              {periodLabel(p)}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2 w-full">
            <Input type="date" className="h-8 text-sm flex-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-[12px] text-muted-foreground flex-shrink-0">to</span>
            <Input type="date" className="h-8 text-sm flex-1" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors", statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-accent")}>
              {s === "all" ? "All Statuses" : (statusConfig[s]?.label || s)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Send className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No customers match these filters.</p>
          </div>
        ) : filtered.map(c => {
          const hasFeedback = privateFeedback.some(f => f.customerId === c.id);
          const responseRequired = c.status === "no_response" && hasFeedback;
          const badge = responseRequired
            ? { label: "Response Required", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
            : statusConfig[c.status] || { label: c.status, color: "bg-muted text-muted-foreground" };
          return (
          <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card hover:bg-accent cursor-pointer transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium">{c.name}</p>
              <p className="text-[12px] text-muted-foreground">{c.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", badge.color)}>
                {badge.label}
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:block">
                {reviewRequests.filter(r => r.customerId === c.id && r.sentAt).length} sent
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:block">{format(new Date(c.createdAt), "MMM d")}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW: Pending
// ─────────────────────────────────────────────
function PendingView({ customers = [] }: { customers: Customer[] }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sendTo, setSendTo] = useState<Customer | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("all_time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fromDate = customFrom ? new Date(customFrom) : undefined;
  const toDate = customTo ? new Date(customTo) : undefined;

  const pending = customers.filter(c => c.status === "request_sent" && !c.doNotContact && inPeriod(new Date(c.createdAt), period, fromDate, toDate));
  const filtered = pending.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  const sendMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/customers/${id}/send-request`, { channel: "email", delay: "now" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Follow-up sent" });
      setSendTo(null);
    },
    onError: () => toast({ title: "Failed to send follow-up", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 px-5 py-4">
        <div className="text-3xl font-bold text-amber-600">{pending.length}</div>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {pending.length === 1 ? "customer is" : "customers are"} waiting to hear from you
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all_time", "this_month", "last_month", "custom"] as PeriodKey[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn("px-3 py-1 rounded-full text-[12px] font-medium border transition-colors", period === p ? "bg-selected text-selected-foreground border-selected" : "border-border text-muted-foreground hover:bg-accent")}>
              {periodLabel(p)}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" className="h-8 text-sm flex-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-[12px] text-muted-foreground flex-shrink-0">to</span>
            <Input type="date" className="h-8 text-sm flex-1" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{search ? "No matches found." : "No customers pending — all caught up!"}</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
              <p className="text-[13.5px] font-medium">{c.name}</p>
              <p className="text-[12px] text-muted-foreground">{c.email}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">Requested {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <Button size="sm" variant="outline" className="h-7 text-[12px] px-2.5" onClick={() => navigate(`/customers/${c.id}`)}>
                View
              </Button>
              <Button size="sm" className="h-7 text-[12px] px-2.5 gap-1" onClick={() => setSendTo(c)}>
                <Send className="w-3 h-3" />Follow-up
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm follow-up dialog */}
      {sendTo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-border shadow-lg p-5 max-w-sm w-full space-y-4">
            <div>
              <p className="font-semibold text-[15px]">Send follow-up to {sendTo.name}?</p>
              <p className="text-sm text-muted-foreground mt-1">This will send a follow-up review request via email.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setSendTo(null)}>Cancel</Button>
              <Button size="sm" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate(sendTo.id)}>
                {sendMutation.isPending ? "Sending..." : "Send Follow-up"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW: Reviews
// ─────────────────────────────────────────────
function ReviewsView({ reviews = [], customers = [] }: { reviews: Review[]; customers: Customer[] }) {
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [starFilter, setStarFilter] = useState(0);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fromDate = customFrom ? new Date(customFrom) : undefined;
  const toDate = customTo ? new Date(customTo) : undefined;

  const platforms = ["all", ...Array.from(new Set(reviews.map(r => r.platform)))];

  const filtered = reviews.filter(r => {
    const d = new Date(r.createdAt);
    const customer = customers.find(c => c.id === r.customerId);
    return (
      inPeriod(d, period, fromDate, toDate) &&
      (starFilter === 0 || r.stars === starFilter) &&
      (platformFilter === "all" || r.platform === platformFilter) &&
      (!search || customer?.name.toLowerCase().includes(search.toLowerCase()) || r.reviewText.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const avg = filtered.length > 0 ? (filtered.reduce((s, r) => s + r.stars, 0) / filtered.length).toFixed(1) : "—";

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-green-600">{filtered.length}</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">Reviews</div>
        </div>
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-amber-500">{avg}</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">Avg Stars</div>
        </div>
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-primary">{filtered.filter(r => r.stars >= 4).length}</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">4–5 Stars</div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search name or review text..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["this_month", "last_month", "all_time", "custom"] as PeriodKey[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn("px-3 py-1 rounded-full text-[12px] font-medium border transition-colors", period === p ? "bg-selected text-selected-foreground border-selected" : "border-border text-muted-foreground hover:bg-accent")}>
              {periodLabel(p)}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" className="h-8 text-sm flex-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-[12px] text-muted-foreground flex-shrink-0">to</span>
            <Input type="date" className="h-8 text-sm flex-1" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {[0, 5, 4, 3, 2, 1].map(s => (
            <button key={s} onClick={() => setStarFilter(s)} className={cn("px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors", starFilter === s ? "bg-amber-500 text-white border-amber-500" : "border-border text-muted-foreground hover:bg-accent")}>
              {s === 0 ? "All Stars" : `${s}★`}
            </button>
          ))}
          {platforms.length > 1 && platforms.map(p => (
            <button key={p} onClick={() => setPlatformFilter(p)} className={cn("px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors capitalize", platformFilter === p ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-accent")}>
              {p === "all" ? "All Platforms" : p}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No reviews match these filters.</p>
          </div>
        ) : filtered.map(r => {
          const customer = customers.find(c => c.id === r.customerId);
          return (
            <div key={r.id} className="p-3 rounded-lg border border-border/60 bg-card space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] font-medium">{customer?.name || "Customer"}</span>
                <StarRating stars={r.stars} />
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">{r.platform}</Badge>
                <span className="text-[11px] text-muted-foreground ml-auto">{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
              </div>
              {r.reviewText && <p className="text-[12.5px] text-muted-foreground">{r.reviewText}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW: Response Rate
// ─────────────────────────────────────────────
function ResponseRateView({ customers = [], reviews = [] }: { customers: Customer[]; reviews: Review[] }) {
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [, navigate] = useLocation();

  const fromDate = customFrom ? new Date(customFrom) : undefined;
  const toDate = customTo ? new Date(customTo) : undefined;

  const periodCustomers = customers.filter(c => inPeriod(new Date(c.createdAt), period, fromDate, toDate));
  const sent = periodCustomers.filter(c => c.status !== "pending_request").length;
  const clicked = periodCustomers.filter(c => c.status === "clicked" || c.status === "review_completed").length;
  const reviewed = periodCustomers.filter(c => c.status === "review_completed").length;
  const rate = sent > 0 ? Math.round((reviewed / sent) * 100) : 0;

  const steps = [
    { label: "Requests Sent", value: sent, color: "bg-primary", pct: 100 },
    { label: "Link Clicked", value: clicked, color: "bg-purple-500", pct: sent > 0 ? Math.round((clicked / sent) * 100) : 0 },
    { label: "Review Left", value: reviewed, color: "bg-green-500", pct: sent > 0 ? Math.round((reviewed / sent) * 100) : 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div className="rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/30 px-5 py-4">
        <div className="text-4xl font-bold text-purple-600">{rate}%</div>
        <p className="text-[13px] text-muted-foreground mt-0.5">of requests resulted in a review</p>
      </div>

      {/* Period filter */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {(["this_month", "last_month", "all_time", "custom"] as PeriodKey[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn("px-3 py-1 rounded-full text-[12px] font-medium border transition-colors", period === p ? "bg-selected text-selected-foreground border-selected" : "border-border text-muted-foreground hover:bg-accent")}>
              {periodLabel(p)}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" className="h-8 text-sm flex-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-[12px] text-muted-foreground flex-shrink-0">to</span>
            <Input type="date" className="h-8 text-sm flex-1" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className="space-y-3">
        {steps.map(s => (
          <div key={s.label} className="space-y-1">
            <div className="flex justify-between text-[13px]">
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground">{s.value} <span className="text-[11px]">({s.pct}%)</span></span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", s.color)} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/stat/pending")}>
          <Clock className="w-3.5 h-3.5" />View Pending ({customers.filter(c => c.status === "request_sent" && !c.doNotContact).length})
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/analytics")}>
          <BarChart2 className="w-3.5 h-3.5" />Full Analytics
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW: Avg Rating
// ─────────────────────────────────────────────
function AvgRatingView({ reviews = [], customers = [] }: { reviews: Review[]; customers: Customer[] }) {
  const [period, setPeriod] = useState<PeriodKey>("all_time");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [, navigate] = useLocation();

  const fromDate = customFrom ? new Date(customFrom) : undefined;
  const toDate = customTo ? new Date(customTo) : undefined;

  const platforms = ["all", ...Array.from(new Set(reviews.map(r => r.platform)))];

  const filtered = reviews.filter(r =>
    inPeriod(new Date(r.createdAt), period, fromDate, toDate) &&
    (platformFilter === "all" || r.platform === platformFilter)
  );

  const avg = filtered.length > 0 ? (filtered.reduce((s, r) => s + r.stars, 0) / filtered.length).toFixed(1) : "—";

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 px-5 py-4">
        <div className="text-4xl font-bold text-amber-500">{avg}★</div>
        <p className="text-[13px] text-muted-foreground mt-0.5">average across {filtered.length} review{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(["this_month", "last_month", "all_time", "custom"] as PeriodKey[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn("px-3 py-1 rounded-full text-[12px] font-medium border transition-colors", period === p ? "bg-selected text-selected-foreground border-selected" : "border-border text-muted-foreground hover:bg-accent")}>
              {periodLabel(p)}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" className="h-8 text-sm flex-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-[12px] text-muted-foreground flex-shrink-0">to</span>
            <Input type="date" className="h-8 text-sm flex-1" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        {platforms.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {platforms.map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)} className={cn("px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors capitalize", platformFilter === p ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-accent")}>
                {p === "all" ? "All Platforms" : p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Star breakdown */}
      <div className="space-y-2.5">
        {[5, 4, 3, 2, 1].map(star => {
          const count = filtered.filter(r => r.stars === star).length;
          const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-10 flex-shrink-0">
                <span className="text-[13px] font-medium">{star}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </div>
              <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[12px] text-muted-foreground w-14 text-right">{count} ({pct}%)</span>
            </div>
          );
        })}
      </div>

      {/* Recent reviews */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] font-semibold">Recent Reviews</p>
          {filtered.slice(0, 5).map(r => {
            const customer = customers.find(c => c.id === r.customerId);
            return (
              <div key={r.id} className="p-3 rounded-lg border border-border/60 bg-card">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[13px] font-medium">{customer?.name || "Customer"}</span>
                  <StarRating stars={r.stars} />
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">{r.platform}</Badge>
                  <span className="text-[11px] text-muted-foreground ml-auto">{format(new Date(r.createdAt), "MMM d")}</span>
                </div>
                {r.reviewText && <p className="text-[12px] text-muted-foreground">{r.reviewText}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/stat/reviews")}>
        <Star className="w-3.5 h-3.5" />View All Reviews
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
const viewConfig: Record<string, { title: string; icon: typeof Send; iconColor: string }> = {
  requests: { title: "Requests This Month", icon: Send, iconColor: "text-primary" },
  pending: { title: "Pending Response", icon: Clock, iconColor: "text-amber-600" },
  reviews: { title: "Reviews", icon: Star, iconColor: "text-green-600" },
  "response-rate": { title: "Response Rate", icon: TrendingUp, iconColor: "text-purple-600" },
  "avg-rating": { title: "Avg. Star Rating", icon: Star, iconColor: "text-amber-500" },
};

export default function StatDetail() {
  const [, params] = useRoute("/stat/:view");
  const [, navigate] = useLocation();
  const view = params?.view || "";

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({ queryKey: ["/api/reviews"] });
  const { data: reviewRequests = [] } = useQuery<ReviewRequest[]>({ queryKey: ["/api/review-requests"] });
  const { data: privateFeedback = [] } = useQuery<PrivateFeedback[]>({ queryKey: ["/api/private-feedback"] });

  const config = viewConfig[view];
  const isLoading = customersLoading || reviewsLoading;

  if (!config) {
    navigate("/");
    return null;
  }

  const Icon = config.icon;

  return (
    <div className="px-6 py-7 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/")} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-full", view === "requests" ? "bg-primary/10" : view === "pending" ? "bg-amber-100 dark:bg-amber-900/20" : view === "reviews" ? "bg-green-100 dark:bg-green-900/20" : view === "response-rate" ? "bg-purple-100 dark:bg-purple-900/20" : "bg-amber-50 dark:bg-amber-900/20")}>
            <Icon className={cn("w-4 h-4", config.iconColor)} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{config.title}</h1>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <>
          {view === "requests" && <RequestsView customers={customers} reviewRequests={reviewRequests} privateFeedback={privateFeedback} />}
          {view === "pending" && <PendingView customers={customers} />}
          {view === "reviews" && <ReviewsView reviews={reviews} customers={customers} />}
          {view === "response-rate" && <ResponseRateView customers={customers} reviews={reviews} />}
          {view === "avg-rating" && <AvgRatingView reviews={reviews} customers={customers} />}
        </>
      )}
    </div>
  );
}
