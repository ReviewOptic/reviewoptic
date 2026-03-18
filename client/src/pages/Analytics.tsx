import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Send, Eye, Star, TrendingUp, BarChart2, Download, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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
import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface AnalyticsData {
  daily: Array<{ date: string; requests: number; reviews: number }>;
  dailyByChannel: Array<{ date: string; email: number; sms: number; whatsapp: number; emailReviews: number; smsReviews: number; whatsappReviews: number }>;
  funnel: { sent: number; clicked: number; completed: number };
  channelBreakdown: { email: number; sms: number; whatsapp: number };
  starBreakdown: Array<{ stars: number; count: number }>;
  summary: { sent: number; reviews: number; avgRating: number; responseRate: number };
  byUser?: Array<{ name: string; email: string; role: string; requestsSent: number; responses: number }>;
}

const CHANNELS = ["email", "sms", "whatsapp"] as const;
type Channel = typeof CHANNELS[number];

function ChannelToggle({ active, onChange }: { active: Channel[]; onChange: (c: Channel[]) => void }) {
  const labels: Record<Channel, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
  const toggle = (ch: Channel) => {
    onChange(active.includes(ch) ? active.filter(c => c !== ch) : [...active, ch]);
  };
  return (
    <div className="flex gap-1">
      {CHANNELS.map(ch => (
        <button key={ch} onClick={() => toggle(ch)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${active.includes(ch) || active.length === 0 ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
          {labels[ch]}
        </button>
      ))}
    </div>
  );
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
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [period, setPeriod] = useState<"7" | "30" | "60" | "custom">("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [reqVsRevChannels, setReqVsRevChannels] = useState<Channel[]>([]);
  const [channelChartChannels, setChannelChartChannels] = useState<Channel[]>([]);
  const [channel, setChannel] = useState("all");
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: teamData } = useQuery<Array<{ id: string; first_name: string; last_name: string; email: string; role: string }>>({
    queryKey: ["/api/team"],
    enabled: !!user,
  });

  const baseParams = period === "custom" && from && to
    ? `from=${from}&to=${to}`
    : `days=${period}`;
  const queryParams = userFilter !== "all" ? `${baseParams}&userId=${userFilter}` : baseParams;

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?${queryParams}`);
      return res.json();
    },
  });

  const { data: settings } = useQuery<{ businessName: string; ownerName: string }>({ queryKey: ["/api/settings"] });
  const businessName = settings?.businessName || "";
  const ownerDisplayName = settings?.ownerName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "You";

  const { sent = 0, reviews = 0, avgRating = 0, responseRate = 0 } = data?.summary || {};
  const { sent: fSent = 0, clicked = 0, completed = 0 } = data?.funnel || {};
  const clickRate = fSent > 0 ? Math.round((clicked / fSent) * 100) : 0;
  const completeRate = clicked > 0 ? Math.round((completed / clicked) * 100) : 0;

  const dailyForChart = (data?.daily || []).map(d => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  const channelDailyForChart = (data?.dailyByChannel || []).map(d => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));
  const activeChannels = channelChartChannels.length > 0
    ? channelChartChannels
    : CHANNELS.filter(ch => (data?.channelBreakdown[ch] || 0) > 0);

  const channelData = [
    { name: "Email", value: data?.channelBreakdown.email || 0 },
    { name: "SMS", value: data?.channelBreakdown.sms || 0 },
    { name: "WhatsApp", value: data?.channelBreakdown.whatsapp || 0 },
  ].filter(d => d.value > 0);

  const starData = (data?.starBreakdown || []).map(s => ({
    name: `${s.stars}★`,
    count: s.count,
  }));

  async function exportPDF() {
    if (!contentRef.current) return;
    setIsExportingPDF(true);
    // Temporarily show the period label
    const label = contentRef.current.querySelector(".pdf-period-label") as HTMLElement | null;
    if (label) label.classList.remove("hidden");
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 24;
      const titleFontSize = 16;
      const subtitleFontSize = 11;
      const periodLabel = period === "custom" ? `${from} – ${to}` : `Last ${period} days`;

      // Add title header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(titleFontSize);
      pdf.text(businessName ? `${businessName} — Analytics Report` : "Analytics Report", margin, margin + titleFontSize);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(subtitleFontSize);
      pdf.setTextColor(120, 120, 120);
      pdf.text(periodLabel, margin, margin + titleFontSize + 14);
      pdf.setTextColor(0, 0, 0);

      const imgY = margin + titleFontSize + 30;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let yOffset = 0;
      while (yOffset < imgHeight) {
        if (yOffset > 0) {
          pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, margin - yOffset, imgWidth, imgHeight);
        } else {
          pdf.addImage(imgData, "PNG", margin, imgY, imgWidth, imgHeight);
        }
        yOffset += pageHeight - (yOffset === 0 ? imgY : margin);
      }
      const fileLabel = period === "custom" ? `${from}-to-${to}` : `last-${period}-days`;
      pdf.save(`analytics-${fileLabel}.pdf`);
    } finally {
      if (label) label.classList.add("hidden");
      setIsExportingPDF(false);
    }
  }

  function exportCSV() {
    const lines: string[] = [];
    const periodLabel = period === "custom" ? `${from} to ${to}` : `Last ${period} days`;

    lines.push("Analytics Export");
    if (businessName) lines.push(`Business,${businessName}`);
    lines.push(`Period,${periodLabel}`);
    lines.push(`Channel,All`);
    lines.push("");

    lines.push("Summary");
    lines.push("Metric,Value");
    lines.push(`Requests Sent,${sent}`);
    lines.push(`Reviews Received,${reviews}`);
    lines.push(`Response Rate,${responseRate}%`);
    lines.push(`Avg Rating,${avgRating > 0 ? avgRating : "N/A"}`);
    lines.push("");

    lines.push("Daily Breakdown");
    lines.push("Date,Requests Sent,Reviews Received");
    (data?.daily || []).forEach(d => lines.push(`${d.date},${d.requests},${d.reviews}`));
    lines.push("");

    lines.push("Channel Breakdown");
    lines.push("Channel,Count");
    lines.push(`Email,${data?.channelBreakdown.email || 0}`);
    lines.push(`SMS,${data?.channelBreakdown.sms || 0}`);
    lines.push(`WhatsApp,${data?.channelBreakdown.whatsapp || 0}`);
    lines.push("");

    lines.push("Star Distribution");
    lines.push("Stars,Count");
    (data?.starBreakdown || []).forEach(s => lines.push(`${s.stars},${s.count}`));
    lines.push("");

    lines.push("Conversion Funnel");
    lines.push("Stage,Count");
    lines.push(`Sent,${fSent}`);
    lines.push(`Clicked,${clicked}`);
    lines.push(`Reviewed,${completed}`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${periodLabel.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          {businessName && <p className="text-[14px] font-medium mt-0.5">{businessName}</p>}
          <p className="text-[13px] text-muted-foreground mt-0.5">Track your review request performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period pills */}
          <div className="flex gap-1">
            {(["7", "30", "60", "custom"] as const).map(d => (
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
          {/* Team member filter (owner only) */}
          {isOwner && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-8 w-36 text-[12px]">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {user && (
                  <SelectItem value={user.id}>
                    {ownerDisplayName} (you)
                  </SelectItem>
                )}
                {teamData?.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.email.split("@")[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5" onClick={exportCSV} disabled={isLoading || !data}>
              <Download className="w-3.5 h-3.5" />CSV
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5" onClick={exportPDF} disabled={isLoading || !data || isExportingPDF}>
              <FileText className="w-3.5 h-3.5" />{isExportingPDF ? "Exporting..." : "PDF"}
            </Button>
          </div>
        </div>
      </div>

      {/* PDF export target */}
      <div ref={contentRef} className="space-y-5">
      {/* Period label — hidden normally, shown when capturing for PDF */}
      <p className="text-[13px] font-medium text-muted-foreground hidden pdf-period-label">
        {period === "custom" ? `${from} – ${to}` : `Last ${period} days`}{channel !== "all" ? ` · ${channel[0].toUpperCase() + channel.slice(1)}` : ""}
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(c => (
          <Card key={c.label} className="border-card-border">
            <CardContent className="p-4">
              <div className={`flex items-center gap-1.5 mb-1 ${c.color}`}>{c.icon}<span className="text-[11.5px] font-medium text-muted-foreground">{c.label}</span></div>
              <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-12" /> : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line chart */}
      <Card className="border-card-border">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-[14px] font-semibold">Requests vs Reviews</CardTitle>
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

      {/* Channel over time chart */}
      <Card className="border-card-border">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-[14px] font-semibold">Requests by Channel</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {isLoading ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={channelDailyForChart} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(channelDailyForChart.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {activeChannels.includes("email") && <Line type="monotone" dataKey="email" stroke={CHANNEL_COLORS["Email"]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Email" />}
                {activeChannels.includes("sms") && <Line type="monotone" dataKey="sms" stroke={CHANNEL_COLORS["SMS"]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="SMS" />}
                {activeChannels.includes("whatsapp") && <Line type="monotone" dataKey="whatsapp" stroke={CHANNEL_COLORS["WhatsApp"]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="WhatsApp" />}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By User bar chart — owner only */}
      {isOwner && (
        <Card className="border-card-border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-[14px] font-semibold">Requests by Team Member</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {isLoading ? <Skeleton className="h-52 w-full" /> : !data?.byUser || data.byUser.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-[12px]">No team data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, data.byUser.length * 52)}>
                <BarChart data={data.byUser} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="requestsSent" name="Requests Sent" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} barSize={14} />
                  <Bar dataKey="responses" name="Reviews Received" fill="hsl(142 60% 45%)" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

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
      </div>{/* end pdf export target */}
    </div>
  );
}
