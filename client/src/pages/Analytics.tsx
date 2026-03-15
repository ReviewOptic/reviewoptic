import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Send, Eye, Star, TrendingUp, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

interface AnalyticsData {
  daily: Array<{ date: string; requests: number; reviews: number }>;
  funnel: { sent: number; clicked: number; completed: number };
  channelBreakdown: { email: number; sms: number; whatsapp: number };
  starBreakdown: Array<{ stars: number; count: number }>;
  summary: { sent: number; reviews: number; avgRating: number; responseRate: number };
}

const CHANNEL_COLORS: Record<string, string> = {
  Email: "hsl(217 91% 60%)",
  SMS: "hsl(142 60% 45%)",
  WhatsApp: "hsl(142 60% 35%)",
};
const STAR_COLORS = ["hsl(0 72% 55%)", "hsl(22 90% 55%)", "hsl(45 95% 55%)", "hsl(100 60% 50%)", "hsl(142 60% 45%)"];

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

export default function Analytics() {
  const [period, setPeriod] = useState<"7" | "30" | "60" | "90" | "custom">("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState("all");

  const queryParams = period === "custom" && from && to
    ? `from=${from}&to=${to}&channel=${channel}`
    : `days=${period}&channel=${channel}`;

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?${queryParams}`);
      return res.json();
    },
  });

  const { sent = 0, reviews = 0, avgRating = 0, responseRate = 0 } = data?.summary || {};
  const { sent: fSent = 0, clicked = 0, completed = 0 } = data?.funnel || {};
  const clickRate = fSent > 0 ? Math.round((clicked / fSent) * 100) : 0;
  const completeRate = clicked > 0 ? Math.round((completed / clicked) * 100) : 0;

  const dailyForChart = (data?.daily || []).map(d => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  const channelData = [
    { name: "Email", value: data?.channelBreakdown.email || 0 },
    { name: "SMS", value: data?.channelBreakdown.sms || 0 },
    { name: "WhatsApp", value: data?.channelBreakdown.whatsapp || 0 },
  ].filter(d => d.value > 0);

  const starData = (data?.starBreakdown || []).map(s => ({
    name: `${s.stars}★`,
    count: s.count,
  }));

  const summaryCards = [
    { label: "Requests Sent", value: sent, icon: <Send className="w-4 h-4" />, color: "text-blue-500" },
    { label: "Reviews Received", value: reviews, icon: <Star className="w-4 h-4" />, color: "text-green-500" },
    { label: "Response Rate", value: `${responseRate}%`, icon: <TrendingUp className="w-4 h-4" />, color: "text-purple-500" },
    { label: "Avg Rating", value: avgRating > 0 ? `${avgRating}★` : "—", icon: <Eye className="w-4 h-4" />, color: "text-amber-500" },
  ];

  return (
    <div className="px-6 py-7 max-w-6xl mx-auto space-y-5">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Track your review request performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period pills */}
          <div className="flex gap-1">
            {(["7", "30", "60", "90", "custom"] as const).map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-medium border transition-colors ${period === d ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {d === "custom" ? "Custom" : `${d}d`}
              </button>
            ))}
          </div>
          {/* Custom date range */}
          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-[12px] w-36" />
              <span className="text-[12px] text-muted-foreground">to</span>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-[12px] w-36" />
            </div>
          )}
          {/* Channel filter */}
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-8 w-32 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(c => (
          <Card key={c.label} className="border-card-border">
            <CardContent className="p-4">
              <div className={`flex items-center gap-1.5 mb-1 ${c.color}`}>{c.icon}<span className="text-[11.5px] font-medium text-muted-foreground">{c.label}</span></div>
              <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line chart */}
      <Card className="border-card-border">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-[14px] font-semibold">Requests vs Reviews Over Time</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {isLoading ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyForChart} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(dailyForChart.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="requests" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Requests Sent" />
                <Line type="monotone" dataKey="reviews" stroke="hsl(142 60% 45%)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Reviews Received" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Funnel | Channel | Stars — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Funnel */}
        <Card className="border-card-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-[14px] font-semibold">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            {isLoading ? <Skeleton className="h-32 w-full" /> : fSent === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <BarChart2 className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p className="text-[12px]">No data yet</p>
              </div>
            ) : (
              [{label: "Sent", value: fSent, pct: null, color: "hsl(217 91% 60%)"},
               {label: "Clicked", value: clicked, pct: clickRate, color: "hsl(262 80% 60%)"},
               {label: "Reviewed", value: completed, pct: completeRate, color: "hsl(142 60% 45%)"}
              ].map(row => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}{row.pct !== null && <span className="text-muted-foreground font-normal ml-1">({row.pct}%)</span>}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${fSent > 0 ? Math.max(4, Math.round((row.value / fSent) * 100)) : 0}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Channel donut */}
        <Card className="border-card-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-[14px] font-semibold">By Channel</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {isLoading ? <Skeleton className="h-32 w-full" /> : channelData.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-[12px]">No channel data</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={channelData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                      {channelData.map((d, i) => <Cell key={i} fill={CHANNEL_COLORS[d.name] || "hsl(217 91% 60%)"} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-1">
                  {channelData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[d.name] }} />
                      <span className="text-[11.5px] text-muted-foreground">{d.name}: <strong className="text-foreground">{d.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Star distribution */}
        <Card className="border-card-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-[14px] font-semibold">Star Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {isLoading ? <Skeleton className="h-32 w-full" /> : reviews === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p className="text-[12px]">No reviews yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={starData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Reviews">
                    {starData.map((_, i) => <Cell key={i} fill={STAR_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
