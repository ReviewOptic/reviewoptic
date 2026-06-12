import { useQuery } from "@tanstack/react-query";
import { useState, CSSProperties } from "react";
import { Send, Eye, EyeOff, TrendingUp, BarChart2, Download, FileText, Palette, Star, MessageSquare, Clock, GripVertical, LayoutGrid } from "lucide-react";
import { Reorder } from "framer-motion";
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

// ── Chart colour system ───────────────────────────────────────────────────
const COLOR_THEMES: Record<string, { label: string; requests: string; reviews: string; email: string; sms: string; whatsapp: string; positive: string; negative: string; rating: string }> = {
  classic:  { label: "Classic",  requests: "#4f86f7", reviews: "#4caf82", email: "#4f86f7", sms: "#4caf82",  whatsapp: "#2d7a56", positive: "#22c55e", negative: "#ef4444", rating: "#f59e0b" },
  sunset:   { label: "Sunset",   requests: "#f7794f", reviews: "#f74f8a", email: "#f7794f", sms: "#f74f8a",  whatsapp: "#c73d6e", positive: "#fb923c", negative: "#e11d48", rating: "#fbbf24" },
  ocean:    { label: "Ocean",    requests: "#0bc5ea", reviews: "#0ed9b3", email: "#0bc5ea", sms: "#0ed9b3",  whatsapp: "#0891b2", positive: "#0ed9b3", negative: "#ef4444", rating: "#fbbf24" },
  candy:    { label: "Candy",    requests: "#c084fc", reviews: "#f472b6", email: "#c084fc", sms: "#f472b6",  whatsapp: "#a855f7", positive: "#4ade80", negative: "#fb7185", rating: "#fcd34d" },
  fire:     { label: "Fire",     requests: "#ef4444", reviews: "#f97316", email: "#ef4444", sms: "#f97316",  whatsapp: "#dc2626", positive: "#f97316", negative: "#dc2626", rating: "#fbbf24" },
  midnight: { label: "Midnight", requests: "#818cf8", reviews: "#34d399", email: "#818cf8", sms: "#34d399",  whatsapp: "#6366f1", positive: "#34d399", negative: "#f87171", rating: "#fbbf24" },
};
type ChartColors = typeof COLOR_THEMES["classic"];

function useChartColors() {
  const stored = (() => { try { return JSON.parse(localStorage.getItem("chartColors") || "null"); } catch { return null; } })();
  const [colors, setColors] = useState<ChartColors>(stored ? { ...COLOR_THEMES.classic, ...stored } : COLOR_THEMES.classic);
  const applyTheme = (themeKey: string) => {
    const t = COLOR_THEMES[themeKey];
    setColors(t);
    localStorage.setItem("chartColors", JSON.stringify(t));
  };
  const updateColor = (key: keyof ChartColors, value: string) => {
    if (key === "label") return;
    const next = { ...colors, [key]: value };
    setColors(next);
    localStorage.setItem("chartColors", JSON.stringify(next));
  };
  return { colors, applyTheme, updateColor };
}

// ── Chart layout system ───────────────────────────────────────────────────
const CHART_IDS = [
  "requests_vs_clicks", "requests_by_channel", "team", "funnel_channel",
  "best_day", "follow_up", "pipeline", "platform_clicks", "review_sources", "template_perf", "content_type", "sentiment", "rating_over_time",
] as const;
type ChartId = typeof CHART_IDS[number];

const CHART_LABELS: Record<ChartId, string> = {
  requests_vs_clicks: "Requests vs Clicks",
  requests_by_channel: "Requests vs Clicks by Channel",
  team: "Team Performance",
  funnel_channel: "Conversion Funnel & Channel Breakdown",
  best_day: "Best Day to Send",
  follow_up: "Follow-up Effectiveness",
  pipeline: "Customer Pipeline",
  platform_clicks: "Where Reviews Are Going",
  review_sources: "Reviews by Platform",
  template_perf: "Template Performance",
  content_type: "Content Type Performance",
  sentiment: "Sentiment Split & Star Ratings",
  rating_over_time: "Average Star Rating Over Time",
};

function useChartLayout() {
  const stored = (() => { try { return JSON.parse(localStorage.getItem("analyticsLayout") || "null"); } catch { return null; } })();
  const mergedOrder = stored?.order
    ? [...stored.order.filter((id: string) => (CHART_IDS as readonly string[]).includes(id)),
       ...(CHART_IDS as readonly string[]).filter(id => !stored.order.includes(id))]
    : [...CHART_IDS];
  const [order, setOrder] = useState<ChartId[]>(mergedOrder as ChartId[]);
  const [hidden, setHidden] = useState<Set<ChartId>>(new Set(stored?.hidden || []));
  const save = (o: ChartId[], h: Set<ChartId>) =>
    localStorage.setItem("analyticsLayout", JSON.stringify({ order: o, hidden: Array.from(h) }));
  const updateOrder = (o: ChartId[]) => { setOrder(o); save(o, hidden); };
  const toggleHidden = (id: ChartId) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id); else next.add(id);
    setHidden(next);
    save(order, next);
  };
  const resetLayout = () => {
    setOrder([...CHART_IDS] as ChartId[]);
    setHidden(new Set());
    localStorage.removeItem("analyticsLayout");
  };
  return { order, hidden, updateOrder, toggleHidden, resetLayout };
}

interface AnalyticsData {
  daily: Array<{ date: string; requests: number; clicks: number }>;
  dailyByChannel: Array<{ date: string; email: number; sms: number; whatsapp: number; emailClicks: number; smsClicks: number; whatsappClicks: number }>;
  funnel: { sent: number; clicked: number };
  channelBreakdown: { email: number; sms: number; whatsapp: number };
  summary: { sent: number; clicks: number; clickRate: number };
  byUser?: Array<{ name: string; email: string; role: string; requestsSent: number; clicked: number }>;
  bestDayData?: Array<{ day: string; clicked: number }>;
  followUpData?: Array<{ bucket: string; customers: number; clicked: number; clickRate: number }>;
  templatePerformance?: Array<{ name: string; sent: number; clicked: number; clickRate: number }>;
  averageRating?: number | null;
  ratingDistribution?: Array<{ stars: number; count: number }>;
  sentimentSplit?: { positive: number; negative: number; positiveRate: number };
  ratingOverTime?: Array<{ date: string; avg: number; count: number }>;
  privateFeedbackCount?: number;
  avgResponseTimeHours?: number | null;
  platformClicks?: Array<{ platform: string; count: number }>;
  reviewSources?: Array<{ platform: string; count: number }>;
  pipelineData?: Array<{ status: string; label: string; count: number }>;
  contentTypeData?: Array<{ type: string; label: string; sent: number; platformClicked: number; clickRate: number }>;
}

const CHANNELS = ["email", "sms", "whatsapp"] as const;
type Channel = typeof CHANNELS[number];

function ChannelToggle({ active, onChange, activeStyle }: { active: Channel[]; onChange: (c: Channel[]) => void; activeStyle: CSSProperties }) {
  const labels: Record<Channel, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
  const toggle = (ch: Channel) => {
    onChange(active.includes(ch) ? active.filter(c => c !== ch) : [...active, ch]);
  };
  return (
    <div className="flex gap-1">
      {CHANNELS.map(ch => {
        const isActive = active.includes(ch) || active.length === 0;
        return (
          <button key={ch} onClick={() => toggle(ch)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${isActive ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground"}`}
            style={isActive ? activeStyle : {}}>
            {labels[ch]}
          </button>
        );
      })}
    </div>
  );
}


const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

export default function Analytics() {
  const { user } = useAuth();
  const isOwner = user?.role !== "member";
  const { colors, applyTheme, updateColor } = useChartColors();
  const activeStyle: CSSProperties = { backgroundColor: colors.requests, borderColor: colors.requests, color: "#fff" };
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [customising, setCustomising] = useState(false);
  const { order, hidden, updateOrder, toggleHidden, resetLayout } = useChartLayout();
  const [period, setPeriod] = useState<"7" | "30" | "60" | "all" | "custom">("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [reqVsRevChannels, setReqVsRevChannels] = useState<Channel[]>([]);
  const [channelChartChannels, setChannelChartChannels] = useState<Channel[]>([]);
  const [memberFilter, setMemberFilter] = useState("all");
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: teamData } = useQuery<Array<{ id: string; first_name: string; last_name: string; email: string; role: string }>>({
    queryKey: ["/api/team"],
    enabled: !!user,
  });

  const baseParams = period === "custom" && from && to
    ? `from=${from}&to=${to}`
    : `days=${period === "all" ? "all" : period}`;
  const queryParams = userFilter !== "all" ? `${baseParams}&userId=${userFilter}` : baseParams;

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?${queryParams}`);
      return res.json();
    },
  });

  const { data: settings } = useQuery<{ businessName: string; ownerName: string; logoUrl?: string; websiteUrl?: string }>({ queryKey: ["/api/settings"] });
  const businessName = settings?.businessName || "";
  const ownerDisplayName = settings?.ownerName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "You";

  const { sent = 0, clicks = 0, clickRate = 0 } = data?.summary || {};
  const { sent: fSent = 0, clicked = 0 } = data?.funnel || {};
  const fClickRate = fSent > 0 ? Math.round((clicked / fSent) * 100) : 0;

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

  // Grouped bar data: one entry per channel with requests + clicks
  const channelClickTotals = {
    email: (data?.dailyByChannel || []).reduce((s, d) => s + (d.emailClicks || 0), 0),
    sms: (data?.dailyByChannel || []).reduce((s, d) => s + (d.smsClicks || 0), 0),
    whatsapp: (data?.dailyByChannel || []).reduce((s, d) => s + (d.whatsappClicks || 0), 0),
  };
  const channelBarData = [
    { channel: "Email", key: "email", requests: data?.channelBreakdown.email || 0, clicks: channelClickTotals.email },
    { channel: "SMS", key: "sms", requests: data?.channelBreakdown.sms || 0, clicks: channelClickTotals.sms },
    { channel: "WhatsApp", key: "whatsapp", requests: data?.channelBreakdown.whatsapp || 0, clicks: channelClickTotals.whatsapp },
  ].filter(d => activeChannels.includes(d.key as Channel));

  const channelData = [
    { name: "Email", value: data?.channelBreakdown.email || 0 },
    { name: "SMS", value: data?.channelBreakdown.sms || 0 },
    { name: "WhatsApp", value: data?.channelBreakdown.whatsapp || 0 },
  ].filter(d => d.value > 0);


  async function exportPDF() {
    if (!contentRef.current) return;
    setIsExportingPDF(true);
    const label = contentRef.current.querySelector(".pdf-period-label") as HTMLElement | null;
    if (label) label.classList.remove("hidden");
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const blobToDataUrl = (blob: Blob) => new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Load logos in parallel
      const logoMaxW = 150;
      const [logoDataUrl, userLogoResult] = await Promise.all([
        fetch("/logo.png").then(r => r.blob()).then(blobToDataUrl),
        settings?.logoUrl ? (async () => {
          const src = settings.logoUrl.startsWith("http") ? settings.logoUrl : `${window.location.origin}${settings.logoUrl}`;
          try { return { url: await fetch(src).then(r => r.blob()).then(blobToDataUrl), src }; } catch { return null; }
        })() : Promise.resolve(null),
      ]);

      const measureImg = (src: string): Promise<{ w: number; h: number }> =>
        new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve({ w: img.width, h: img.height });
          img.onerror = () => resolve({ w: 1, h: 1 });
          img.src = src;
        });

      const [logoSize, userLogoSize] = await Promise.all([
        measureImg("/logo.png"),
        userLogoResult ? measureImg(userLogoResult.src) : Promise.resolve(null),
      ]);

      const logoH = logoSize.w ? (logoSize.h / logoSize.w) * logoMaxW : 40;
      const userLogoDataUrl = userLogoResult?.url ?? null;
      const userLogoH = userLogoSize && userLogoSize.w ? (userLogoSize.h / userLogoSize.w) * logoMaxW : logoH;

      const sections = Array.from(contentRef.current.querySelectorAll(".pdf-section")) as HTMLElement[];

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const footerH = 28;
      const periodLabel = period === "custom" ? `${from} – ${to}` : `Last ${period} days`;

      pdf.addImage(logoDataUrl, "PNG", margin, margin, logoMaxW, logoH);
      if (userLogoDataUrl) {
        pdf.addImage(userLogoDataUrl, "PNG", pageWidth - margin - logoMaxW, margin, logoMaxW, userLogoH);
      }
      const headerH = Math.max(logoH, userLogoDataUrl ? userLogoH : 0);
      const titleY = margin + headerH + 16;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(businessName ? `${businessName} — Analytics Report` : "Analytics Report", margin, titleY);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(120, 120, 120);
      pdf.text(periodLabel, margin, titleY + 14);
      pdf.setTextColor(0, 0, 0);

      const addFooter = () => {
        const fy = pageHeight - 14;
        pdf.setFontSize(8);
        pdf.setTextColor(160, 160, 160);
        pdf.textWithLink("Powered by ReviewOptic", pageWidth / 2 - pdf.getTextWidth("Powered by ReviewOptic") / 2, fy, { url: "https://www.reviewoptic.com" });
        pdf.setTextColor(0, 0, 0);
      };

      const imgWidth = pageWidth - margin * 2;
      const usableBottom = pageHeight - footerH;
      const sectionGap = 10;

      // Capture each section individually — prevents charts ever being split across pages
      const imgY = titleY + 30;
      let cursorY = imgY;

      for (const section of sections) {
        const sCanvas = await html2canvas(section, { scale: 1.5, useCORS: true, backgroundColor: "#ffffff" });
        const sImgData = sCanvas.toDataURL("image/png");
        const sH = (sCanvas.height * imgWidth) / sCanvas.width;

        // Start a new page if section doesn't fit in remaining space
        if (cursorY + sH > usableBottom) {
          addFooter();
          pdf.addPage();
          cursorY = margin;
        }

        pdf.addImage(sImgData, "PNG", margin, cursorY, imgWidth, sH);
        cursorY += sH + sectionGap;
      }

      addFooter();

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
    lines.push(`Links Clicked,${clicks}`);
    lines.push(`Click Rate,${clickRate}%`);
    lines.push("");

    lines.push("Daily Breakdown");
    lines.push("Date,Requests Sent,Links Clicked");
    (data?.daily || []).forEach(d => lines.push(`${d.date},${d.requests},${d.clicks}`));
    lines.push("");

    lines.push("Channel Breakdown");
    lines.push("Channel,Count");
    lines.push(`Email,${data?.channelBreakdown.email || 0}`);
    lines.push(`SMS,${data?.channelBreakdown.sms || 0}`);
    lines.push(`WhatsApp,${data?.channelBreakdown.whatsapp || 0}`);
    lines.push("");

    lines.push("Conversion Funnel");
    lines.push("Stage,Count");
    lines.push(`Sent,${fSent}`);
    lines.push(`Clicked,${clicked}`);
    lines.push("");
    lines.push("Powered by ReviewOptic — https://www.reviewoptic.com");

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${periodLabel.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const avgRating = data?.averageRating;
  const avgResponseHrs = data?.avgResponseTimeHours;
  const avgResponseLabel = avgResponseHrs == null ? "—"
    : avgResponseHrs < 1 ? `${Math.round(avgResponseHrs * 60)}m`
    : avgResponseHrs < 24 ? `${avgResponseHrs.toFixed(1)}h`
    : `${(avgResponseHrs / 24).toFixed(1)}d`;

  const noResponseCount = data?.pipelineData?.find(d => d.status === "no_response")?.count ?? "—";

  const summaryCards = [
    { label: "Requests Sent", value: sent, icon: <Send className="w-4 h-4" />, color: "text-blue-500" },
    { label: "Click Rate", value: `${clickRate}%`, icon: <TrendingUp className="w-4 h-4" />, color: "text-purple-500" },
    { label: "No Response", value: noResponseCount, icon: <Clock className="w-4 h-4" />, color: "text-orange-500" },
    { label: "Avg. Star Rating", value: avgRating != null ? avgRating.toFixed(1) : "—", icon: <Star className="w-4 h-4" />, color: "text-amber-500" },
    { label: "Private Feedback", value: data?.privateFeedbackCount ?? "—", icon: <MessageSquare className="w-4 h-4" />, color: "text-orange-400" },
    { label: "Avg. Response Time", value: avgResponseLabel, icon: <Clock className="w-4 h-4" />, color: "text-teal-500" },
  ];

  return (
    <>
      <div className="px-6 h-28 flex flex-col justify-center border-b" style={{ backgroundColor: "#0E679D", borderColor: "#0a527e" }}>
        <h1 className="text-2xl font-bold tracking-tight text-white">Analytics</h1>
        <p className="text-[13px] text-white/70 mt-0.5">{businessName ? `${businessName} · ` : ""}Track your review request performance</p>
      </div>
      <div className="px-6 pt-5 max-w-7xl mx-auto space-y-5">

      {/* Controls bar */}
      <div className="space-y-2">
        {/* Row 1: action buttons */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 px-2" onClick={exportCSV} disabled={isLoading || !data}>
            <Download className="w-3 h-3" />CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 px-2" onClick={exportPDF} disabled={isLoading || !data || isExportingPDF}>
            <FileText className="w-3 h-3" />{isExportingPDF ? "…" : "PDF"}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 px-2" style={showColorPanel ? activeStyle : {}} onClick={() => setShowColorPanel(v => !v)}>
            <Palette className="w-3 h-3" />Colours
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 px-2" style={customising ? activeStyle : {}} onClick={() => setCustomising(v => !v)}>
            <LayoutGrid className="w-3 h-3" />Layout
          </Button>
        </div>
        {/* Row 2: period pills + team filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {(["7", "30", "60", "all", "custom"] as const).map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${period === d ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground"}`}
              style={period === d ? activeStyle : {}}
            >
              {d === "custom" ? "Custom" : d === "all" ? "All time" : `${d}d`}
            </button>
          ))}
          {isOwner && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-8 w-28 text-[11px] shrink-0">
                <SelectValue placeholder="Whole team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Whole team</SelectItem>
                {user && <SelectItem value={user.id}>{ownerDisplayName} (you)</SelectItem>}
                {teamData?.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.email.split("@")[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {/* Row 3: custom date inputs */}
        {period === "custom" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-[11px] w-full sm:w-36" />
            <span className="text-[11px] text-muted-foreground hidden sm:inline">–</span>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-[11px] w-full sm:w-36" />
          </div>
        )}
      </div>

      {/* Colour customiser panel */}
      {showColorPanel && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Themes</p>
            <button onClick={() => setShowColorPanel(false)} className="text-[12px] font-semibold text-primary hover:underline">Done</button>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                <button key={key} onClick={() => applyTheme(key)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[12px] font-medium hover:border-primary transition-colors"
                  style={{ borderColor: colors.requests === theme.requests && colors.reviews === theme.reviews && colors.positive === theme.positive ? theme.requests : undefined }}>
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: theme.requests }} />
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: theme.reviews }} />
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: theme.positive }} />
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Custom colours</p>
            <div className="flex flex-wrap gap-4">
              {([
                { key: "requests" as const, label: "Requests Sent" },
                { key: "reviews" as const, label: "Links Clicked" },
                { key: "email" as const, label: "Email" },
                { key: "sms" as const, label: "SMS" },
                { key: "whatsapp" as const, label: "WhatsApp" },
                { key: "positive" as const, label: "Positive" },
                { key: "negative" as const, label: "Negative" },
                { key: "rating" as const, label: "Star Rating" },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer text-[12px]">
                  <input type="color" value={colors[key]} onChange={e => updateColor(key, e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-border p-0.5 bg-transparent" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Layout customiser panel */}
      {customising && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold">Customise Layout</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Drag to reorder · click the eye to show or hide</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resetLayout} className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-2">Reset</button>
              <Button size="sm" className="h-8 text-[12px]" onClick={() => setCustomising(false)}>Done</Button>
            </div>
          </div>
          <Reorder.Group axis="y" values={order} onReorder={updateOrder} className="space-y-1.5">
            {order.map(id => (
              <Reorder.Item key={id} value={id} className="list-none">
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-background select-none ${hidden.has(id) ? "opacity-40" : ""}`}>
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                  <span className="flex-1 text-[13px] font-medium">{CHART_LABELS[id]}</span>
                  <button onClick={() => toggleHidden(id)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {hidden.has(id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}

      {/* PDF export target */}
      <div ref={contentRef} className="space-y-5">
      {/* Period label — hidden normally, shown when capturing for PDF */}
      <p className="text-[13px] font-medium text-muted-foreground hidden pdf-period-label">
        {period === "custom" ? `${from} – ${to}` : `Last ${period} days`}
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pdf-section">
        {summaryCards.map(c => (
          <Card key={c.label} className="border-card-border">
            <CardContent className="p-4">
              <div className={`flex items-center gap-1.5 mb-1 ${c.color}`}>{c.icon}<span className="text-[11.5px] font-medium text-muted-foreground">{c.label}</span></div>
              <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-12" /> : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(() => {
        const PLATFORM_COLORS: Record<string, string> = {
          google: "#4285F4", facebook: "#1877F2", trustpilot: "#00B67A",
          tripadvisor: "#34E0A1", checkatrade: "#1B5EA6", mybuilder: "#F26522", trustist: "#7C3AED",
        };

        function renderChart(id: ChartId) {
          switch (id) {
            case "requests_vs_clicks":
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-[14px] font-semibold">Requests vs Clicks</CardTitle></CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-52 w-full" /> : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={dailyForChart} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(dailyForChart.length / 6) - 1)} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Line type="monotone" dataKey="requests" stroke={colors.requests} strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Requests Sent" />
                          <Line type="monotone" dataKey="clicks" stroke={colors.reviews} strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Links Clicked" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            case "requests_by_channel":
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-[14px] font-semibold">Requests vs Clicks by Channel</CardTitle>
                      <ChannelToggle active={channelChartChannels} onChange={setChannelChartChannels} activeStyle={activeStyle} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-40 w-full" /> : channelBarData.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground"><p className="text-[12px]">No channel data</p></div>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={channelBarData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="channel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Bar dataKey="requests" name="Requests Sent" fill={colors.requests} radius={[4, 4, 0, 0]} barSize={28} />
                          <Bar dataKey="clicks" name="Links Clicked" fill={colors.reviews} radius={[4, 4, 0, 0]} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            case "team":
              if (!isOwner || !data?.byUser?.some(u => u.role === "member")) return null;
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-[14px] font-semibold">Requests vs Clicks by Team Member</CardTitle>
                      {data?.byUser && data.byUser.length > 0 && (
                        <Select value={memberFilter} onValueChange={setMemberFilter}>
                          <SelectTrigger className="h-7 w-36 text-[11px]"><SelectValue placeholder="All members" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All members</SelectItem>
                            {data.byUser.map(m => <SelectItem key={m.email} value={m.email}>{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-40 w-full" /> : (() => {
                      const filtered = memberFilter === "all" ? data.byUser! : data.byUser!.filter(m => m.email === memberFilter);
                      return (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={filtered} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            <Bar dataKey="requestsSent" name="Requests Sent" fill={colors.requests} radius={[4, 4, 0, 0]} barSize={28} />
                            <Bar dataKey="clicked" name="Links Clicked" fill={colors.reviews} radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            case "funnel_channel":
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-card-border">
                    <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-[14px] font-semibold">Conversion Funnel</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-4 space-y-3">
                      {isLoading ? <Skeleton className="h-32 w-full" /> : fSent === 0 ? (
                        <div className="text-center py-6 text-muted-foreground"><BarChart2 className="w-6 h-6 mx-auto mb-1 opacity-40" /><p className="text-[12px]">No data yet</p></div>
                      ) : (
                        [{label: "Sent", value: fSent, pct: null, color: colors.requests},
                         {label: "Clicked", value: clicked, pct: fClickRate, color: colors.reviews}].map(row => (
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
                  <Card className="border-card-border">
                    <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-[14px] font-semibold">By Channel</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-4">
                      {isLoading ? <Skeleton className="h-32 w-full" /> : channelData.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground"><p className="text-[12px]">No channel data</p></div>
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height={130}>
                            <PieChart>
                              <Pie data={channelData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                                {channelData.map(d => <Cell key={d.name} fill={d.name === "Email" ? colors.email : d.name === "SMS" ? colors.sms : colors.whatsapp} />)}
                              </Pie>
                              <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-3 justify-center mt-1">
                            {channelData.map(d => (
                              <div key={d.name} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.name === "Email" ? colors.email : d.name === "SMS" ? colors.sms : colors.whatsapp }} />
                                <span className="text-[11.5px] text-muted-foreground">{d.name}: <strong className="text-foreground">{d.value}</strong></span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            case "best_day":
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-[14px] font-semibold">Best Day to Send</CardTitle></CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-48 w-full" /> : !data?.bestDayData || data.bestDayData.every(d => d.clicked === 0) ? (
                      <div className="text-center py-6 text-muted-foreground"><p className="text-[12px]">No click data yet — check back once customers start clicking</p></div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data.bestDayData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Links Clicked"]} />
                          <Bar dataKey="clicked" name="Links Clicked" fill={colors.reviews} radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            case "follow_up":
              if (!data?.followUpData?.some(d => d.customers > 0)) return null;
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-[14px] font-semibold">Follow-up Effectiveness</CardTitle>
                    <p className="text-[12px] text-muted-foreground">Click rate by how many follow-ups a customer received</p>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-40 w-full" /> : (
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={data!.followUpData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [v, name === "clicked" ? "Clicked link" : "Customers"]} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Bar dataKey="customers" name="Customers" fill={colors.requests} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="clicked" name="Clicked link" fill={colors.reviews} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            case "pipeline": {
              if (!data?.pipelineData?.length) return null;
              const PIPELINE_COLORS: Record<string, string> = {
                request_sent: colors.requests,
                follow_up_1_sent: colors.email,
                follow_up_2_sent: colors.sms,
                follow_up_3_sent: colors.whatsapp,
                clicked: colors.positive,
                no_response: colors.negative,
              };
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-[14px] font-semibold">Customer Pipeline</CardTitle>
                    <p className="text-[12px] text-muted-foreground">Where customers currently stand in the follow-up sequence</p>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-40 w-full" /> : (
                      <ResponsiveContainer width="100%" height={Math.max(120, data!.pipelineData!.length * 44)}>
                        <BarChart data={data!.pipelineData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} width={120} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Customers"]} />
                          <Bar dataKey="count" name="Customers" radius={[0, 4, 4, 0]} barSize={22} label={{ position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}>
                            {data!.pipelineData!.map((entry, i) => <Cell key={i} fill={PIPELINE_COLORS[entry.status] || colors.requests} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            }
            case "platform_clicks":
              if (!data?.platformClicks?.length) return null;
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-[14px] font-semibold">Where Reviews Are Going</CardTitle>
                    <p className="text-[12px] text-muted-foreground">Which review platform links customers clicked</p>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-40 w-full" /> : (() => {
                      const palette = [colors.requests, colors.reviews, colors.positive, colors.email, colors.sms, colors.rating, colors.negative, colors.whatsapp];
                      const chartData = data.platformClicks!.map((p, i) => ({
                        platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
                        count: p.count,
                        fill: palette[i % palette.length],
                      }));
                      return (
                        <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 44)}>
                          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="platform" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} width={80} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Clicks"]} />
                            <Bar dataKey="count" name="Clicks" radius={[0, 4, 4, 0]} barSize={22} label={{ position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}>
                              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            case "review_sources":
              if (!data?.reviewSources?.length) return null;
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-[14px] font-semibold">Reviews by Platform</CardTitle>
                    <p className="text-[12px] text-muted-foreground">Where your external reviews are coming from</p>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-40 w-full" /> : (() => {
                      const palette = [colors.requests, colors.reviews, colors.positive, colors.email, colors.sms, colors.rating, colors.negative, colors.whatsapp];
                      const chartData = data.reviewSources!.map((p, i) => ({
                        platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
                        count: p.count,
                        fill: palette[i % palette.length],
                      }));
                      return (
                        <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 44)}>
                          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="platform" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} width={90} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Reviews"]} />
                            <Bar dataKey="count" name="Reviews" radius={[0, 4, 4, 0]} barSize={22} label={{ position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}>
                              {chartData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            case "template_perf":
              if (!data?.templatePerformance?.length) return null;
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-[14px] font-semibold">Template Performance</CardTitle></CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-40 w-full" /> : (
                      <ResponsiveContainer width="100%" height={Math.max(120, data.templatePerformance.length * 40)}>
                        <BarChart data={data.templatePerformance} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={120} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Click Rate"]} />
                          <Bar dataKey="clickRate" name="Click Rate" fill={colors.reviews} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            case "content_type": {
              const ctData = data?.contentTypeData;
              if (!ctData?.length || ctData.every(d => d.sent === 0)) return null;
              const ctColors: Record<string, string> = { text: colors.requests, voice: colors.sms, video: colors.positive };
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-[14px] font-semibold">Content Type Performance</CardTitle>
                    <p className="text-[12px] text-muted-foreground">Platform click rate by what customers see after rating 4–5★</p>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-40 w-full" /> : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={ctData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v, _name, props) => {
                            const p = props.payload;
                            if (p?.sent === 0) return ["No requests sent yet", ""];
                            return [`${v}% click rate (${p?.platformClicked ?? 0} of ${p?.sent ?? 0} sent)`, "Platform clicks"];
                          }} />
                          <Bar dataKey="clickRate" name="Click rate" radius={[4, 4, 0, 0]} maxBarSize={80} minPointSize={2}>
                            {ctData.map((entry) => (
                              <Cell key={entry.type} fill={entry.sent === 0 ? "hsl(var(--border))" : (ctColors[entry.type] || colors.requests)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            }
            case "sentiment":
              if (!data?.sentimentSplit || (data.sentimentSplit.positive + data.sentimentSplit.negative) === 0) return null;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Card className="border-card-border">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-[14px] font-semibold">Sentiment Split</CardTitle>
                      <p className="text-[12px] text-muted-foreground">4–5 stars vs 1–3 stars</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                      {isLoading ? <Skeleton className="h-48 w-full" /> : (
                        <div className="space-y-4">
                          <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                              <Pie data={[
                                { name: "Positive (4–5★)", value: data.sentimentSplit!.positive },
                                { name: "Negative (1–3★)", value: data.sentimentSplit!.negative },
                              ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                                <Cell fill={colors.positive} /><Cell fill={colors.negative} />
                              </Pie>
                              <Tooltip contentStyle={tooltipStyle} />
                              <Legend wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex justify-around text-center">
                            <div>
                              <div className="text-2xl font-bold" style={{ color: colors.positive }}>{data.sentimentSplit!.positiveRate}%</div>
                              <div className="text-[11.5px] text-muted-foreground">Positive</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold" style={{ color: colors.negative }}>{100 - data.sentimentSplit!.positiveRate}%</div>
                              <div className="text-[11.5px] text-muted-foreground">Negative</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-card-border">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-[14px] font-semibold">Star Rating Distribution</CardTitle>
                      <p className="text-[12px] text-muted-foreground">How customers rated their experience</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                      {isLoading ? <Skeleton className="h-48 w-full" /> : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={data?.ratingDistribution || []} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="stars" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}★`} />
                            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Responses"]} labelFormatter={l => `${l} star${l !== 1 ? "s" : ""}`} />
                            <Bar dataKey="count" name="Responses" radius={[4, 4, 0, 0]} barSize={28}>
                              {(data?.ratingDistribution || []).map(entry => (
                                <Cell key={entry.stars} fill={entry.stars >= 4 ? colors.positive : entry.stars === 3 ? colors.rating : colors.negative} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            case "rating_over_time":
              if (!data?.ratingOverTime || data.ratingOverTime.length <= 1) return null;
              return (
                <Card className="border-card-border">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-[14px] font-semibold">Average Star Rating Over Time</CardTitle>
                    <p className="text-[12px] text-muted-foreground">Daily average across all rated responses</p>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    {isLoading ? <Skeleton className="h-48 w-full" /> : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={data.ratingOverTime.map(d => ({ ...d, label: format(parseISO(d.date), "MMM d") }))} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                          <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}★`} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [Number(v).toFixed(1), "Avg Rating"]} />
                          <Line type="monotone" dataKey="avg" name="Avg Rating" stroke={colors.rating} strokeWidth={2} dot={{ r: 3, fill: colors.rating }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            default:
              return null;
          }
        }

        return order.filter(id => !hidden.has(id)).map(id => {
          const chart = renderChart(id);
          if (!chart) return null;
          return <div key={id} className="pdf-section">{chart}</div>;
        });
      })()}

      </div>{/* end pdf export target */}
      </div>
    </>
  );
}
