import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Send, Eye, Star, Mail, MessageSquare, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, FunnelChart, Funnel, Cell
} from "recharts";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface AnalyticsData {
  daily: Array<{ date: string; requests: number; reviews: number }>;
  funnel: { sent: number; clicked: number; completed: number };
  channelBreakdown: { email: number; sms: number; whatsapp: number };
}

const FUNNEL_COLORS = ["hsl(217 91% 60%)", "hsl(262 80% 60%)", "hsl(142 60% 45%)"];

function FunnelBar({ label, value, max, color, icon, pct }: {
  label: string; value: number; max: number; color: string; icon: React.ReactNode; pct?: number;
}) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </div>
        <div className="text-right">
          <span className="text-[13px] font-bold">{value}</span>
          {pct !== undefined && <span className="text-[11px] text-muted-foreground ml-1">({pct}%)</span>}
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?days=${days}`);
      return res.json();
    },
  });

  const dailyForChart = data?.daily.map(d => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  })) || [];

  const { sent = 0, clicked = 0, completed = 0 } = data?.funnel || {};
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
  const completionRate = clicked > 0 ? Math.round((completed / clicked) * 100) : 0;

  const channelData = [
    { name: "Email", value: data?.channelBreakdown.email || 0 },
    { name: "SMS", value: data?.channelBreakdown.sms || 0 },
    { name: "WhatsApp", value: data?.channelBreakdown.whatsapp || 0 },
  ].filter(d => d.value > 0);

  const CHANNEL_COLORS = ["hsl(217 91% 60%)", "hsl(142 60% 45%)", "hsl(142 60% 35%)"];

  return (
    <div className="px-6 py-7 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">Track your review request performance</p>
        </div>
        <div className="flex gap-1.5">
          {[30, 60, 90].map(d => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              className="h-8 text-[12.5px] px-3"
              onClick={() => setDays(d)}
              data-testid={`filter-days-${d}`}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {/* Line Chart - Requests vs Reviews */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] font-semibold">Requests vs Reviews (Last {days} Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyForChart} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(dailyForChart.length / 6)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Requests Sent"
                />
                <Line
                  type="monotone"
                  dataKey="reviews"
                  stroke="hsl(142 60% 45%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Reviews Received"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Funnel */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <>
                <FunnelBar
                  label="Requests Sent"
                  value={sent}
                  max={sent}
                  color="hsl(217 91% 60%)"
                  icon={<Send className="w-4 h-4" />}
                />
                <FunnelBar
                  label="Link Clicked"
                  value={clicked}
                  max={sent}
                  color="hsl(262 80% 60%)"
                  icon={<Eye className="w-4 h-4" />}
                  pct={clickRate}
                />
                <FunnelBar
                  label="Review Completed"
                  value={completed}
                  max={sent}
                  color="hsl(142 60% 45%)"
                  icon={<Star className="w-4 h-4" />}
                  pct={completionRate}
                />
                {sent === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <BarChart2 className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <p className="text-[12.5px]">No data yet. Send review requests to see funnel data.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold">Requests by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : channelData.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="w-7 h-7 mx-auto mb-2 opacity-40" />
                <p className="text-[12.5px]">No channel data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={channelData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Requests">
                    {channelData.map((_, i) => (
                      <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {channelData.length > 0 && (
              <div className="flex gap-4 justify-center mt-3">
                {channelData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[i] }} />
                    <span className="text-[12px] text-muted-foreground">{d.name}: <strong className="text-foreground">{d.value}</strong></span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
