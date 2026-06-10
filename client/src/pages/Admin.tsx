import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, LogIn, CheckCircle2, XCircle, Trash2, ShieldCheck, ShieldOff, Ban,
  Users, BarChart3, TrendingUp, TrendingDown, AlertTriangle, AlertCircle,
  CheckCircle, RefreshCw, Download, Zap, Target, Activity, Printer, Mail, Wrench, Radio,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface AdminUser {
  id: string; email: string; accountId: string; isAdmin: boolean;
  emailVerified: boolean; planType: string; emailUnsubscribed: boolean; isSuspended: boolean; customerCount: number; reviewRequestCount: number; lastActive: string | null;
}

interface Metrics {
  userMetrics: { total: number; newThisWeek: number; newLastWeek: number; pctChange: number | null; activeThisWeek: number; activeToday: number; planBreakdown: { planType: string; planPeriod: string; count: number }[]; };
  requestMetrics: { total: number; thisWeek: number; lastWeek: number; pctChange: number | null; today: number; avgPerUser: number; recentFeed: any[]; };
  retentionMetrics: { day1Rate: number; week1Rate: number; atRisk: any[]; reactivated: any[]; avgDaysToReactivate: number | null; };
  funnelMetrics: { signups: number; firstAction: number; returnVisit: number; powerUsers: number; };
  featureUsage: { type: string; count: string }[];
  topUsers: { email: string; signup_date: string; action_count: string; last_active: string }[];
  timeToFirstAction: number;
  alerts: { severity: string; message: string }[];
  geography: { country: string; count: number }[];
  devices: { type: string; count: number }[];
  browsers: { browser: string; count: number }[];
  charts: {
    usersLast30Days: { date: string; count: string }[];
    requestsLast30Days: { date: string; count: string }[];
    activityByDayOfWeek: { day: string; count: number }[];
    activityByHour: { hour: string; count: number }[];
  };
}

function StatCard({ label, value, sub, trend, color = "default" }: {
  label: string; value: string | number; sub?: string; trend?: number | null; color?: "default" | "green" | "blue" | "purple" | "orange";
}) {
  const colors = { default: "bg-card", green: "bg-green-50 dark:bg-green-950/20", blue: "bg-blue-50 dark:bg-blue-950/20", purple: "bg-purple-50 dark:bg-purple-950/20", orange: "bg-orange-50 dark:bg-orange-950/20" };
  return (
    <div className={`${colors[color]} border border-border rounded-xl p-5`}>
      <p className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {trend !== null && trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-[11.5px] font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend >= 0 ? "+" : ""}{trend}%
            </span>
          )}
          {sub && <span className="text-[11.5px] text-muted-foreground">{sub}</span>}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}

function PlaceholderCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-6 text-center col-span-full">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{message}</p>
    </div>
  );
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [tab, setTab] = useState<"metrics" | "users" | "cancelled" | "deleted" | "emails" | "tools" | "tracking">("metrics");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [tracking, setTracking] = useState({ meta_pixel_id: "", google_tag_id: "", tiktok_pixel_id: "" });
  const [trackingLoaded, setTrackingLoaded] = useState(false);
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [trackingSaved, setTrackingSaved] = useState(false);
  useEffect(() => {
    if (tab === "tracking" && !trackingLoaded) {
      fetch("/api/admin/tracking", { credentials: "include" }).then(r => r.json()).then(d => { setTracking(d); setTrackingLoaded(true); });
    }
  }, [tab, trackingLoaded]);
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [period, setPeriod] = useState("30");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [log, setLog] = useState<{ id: string; adminEmail: string; targetEmail: string; createdAt: string }[]>([]);
  const [insightStats, setInsightStats] = useState<{ totalSent: number; totalOpened: number; openRate: number; optOuts: number; recentEmails: any[] } | null>(null);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [resendingVerification, setResendingVerification] = useState<string | null>(null);
  const [cancelledAccounts, setCancelledAccounts] = useState<any[]>([]);
  const [deletedAccounts, setDeletedAccounts] = useState<any[]>([]);
  const [emailSending, setEmailSending] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<Record<string, "sent" | "error">>({});
  const [emailTemplates, setEmailTemplates] = useState<{ type: string; label: string; subject: string; body: string; variables: string[]; customised: boolean }[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<{ type: string; label: string; subject: string; body: string; variables: string[] } | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const loadInsightStats = () => fetch("/api/admin/insight-stats", { credentials: "include" })
    .then(r => r.ok ? r.json().catch(() => null) : null)
    .then(d => { if (d) setInsightStats(d); })
    .catch(() => {});
  const loadPendingUsers = () => fetch("/api/admin/pending-users", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setPendingUsers).catch(() => {});
  const loadCancelledAccounts = () => fetch("/api/admin/cancelled-accounts", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setCancelledAccounts).catch(() => {});
  const loadDeletedAccounts = () => fetch("/api/admin/deleted-accounts", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setDeletedAccounts).catch(() => {});
  const loadUsers = () => fetch("/api/admin/users", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setUsers);
  const loadLog = () => fetch("/api/admin/impersonation-log", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setLog);
  const loadMetrics = useCallback(() => {
    setMetricsLoading(true);
    let url = "/api/admin/metrics";
    if (period === "custom" && fromDate && toDate) {
      url += `?from=${fromDate}&to=${toDate}`;
    } else if (period !== "custom") {
      const to = new Date().toISOString().split("T")[0];
      const from = new Date(Date.now() - parseInt(period) * 86400000).toISOString().split("T")[0];
      url += `?from=${from}&to=${to}`;
    }
    fetch(url, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setMetrics(d); setLastRefresh(new Date()); } })
      .finally(() => setMetricsLoading(false));
  }, [period, fromDate, toDate]);

  const loadEmailTemplates = () =>
    fetch("/api/admin/email-templates", { credentials: "include" })
      .then(r => r.ok ? r.json() : []).then(setEmailTemplates).catch(() => {});

  useEffect(() => {
    if (!user?.isAdmin) { navigate("/"); return; }
    loadUsers().finally(() => setLoading(false));
    loadPendingUsers();
    loadInsightStats();
    loadCancelledAccounts();
    loadDeletedAccounts();
    loadEmailTemplates();
  }, [user]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000);
    return () => clearInterval(interval);
  }, [loadMetrics, user]);

  const exportPDF = () => window.print();

  const impersonate = async (userId: string) => {
    const r = await fetch(`/api/admin/impersonate/${userId}`, { method: "POST", credentials: "include" });
    if (!r.ok) return;
    queryClient.clear(); await refreshUser(); navigate("/");
  };
  const verifyUser = async (userId: string) => { const r = await fetch(`/api/admin/verify-user/${userId}`, { method: "POST", credentials: "include" }); if (r.ok) await loadUsers(); };
  const grantAccess = async (userId: string) => { const r = await fetch(`/api/admin/grant-access/${userId}`, { method: "POST", credentials: "include" }); if (r.ok) { await loadUsers(); await loadPendingUsers(); } };
  const toggleAdmin = async (userId: string) => { const r = await fetch(`/api/admin/toggle-admin/${userId}`, { method: "POST", credentials: "include" }); if (r.ok) await loadUsers(); };
  const toggleSuspend = async (userId: string) => { const r = await fetch(`/api/admin/toggle-suspend/${userId}`, { method: "POST", credentials: "include" }); if (r.ok) await loadUsers(); };
  const deleteUser = async (userId: string) => { const r = await fetch(`/api/admin/user/${userId}`, { method: "DELETE", credentials: "include" }); if (r.ok) { setConfirmDelete(null); await loadUsers(); await loadPendingUsers(); } };
  const fmtDate = (d: string | null) => { if (!d) return "Never"; return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
  const fmtDateTime = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Loading…</div>;

  const openEdit = (t: typeof emailTemplates[0]) => {
    setEditingTemplate(t);
    setEditSubject(t.subject);
    setEditBody(t.body);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    setSavingTemplate(true);
    try {
      await fetch(`/api/admin/email-templates/${editingTemplate.type}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      await loadEmailTemplates();
      setEditingTemplate(null);
    } finally {
      setSavingTemplate(false);
    }
  };

  const resetTemplate = async (type: string) => {
    await fetch(`/api/admin/email-templates/${type}`, { method: "DELETE", credentials: "include" });
    await loadEmailTemplates();
    setEditingTemplate(null);
  };

  const sendTestEmail = async (type: string) => {
    setEmailSending(type);
    try {
      const r = await fetch("/api/admin/test-email", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      setEmailResult(prev => ({ ...prev, [type]: r.ok ? "sent" : "error" }));
    } catch {
      setEmailResult(prev => ({ ...prev, [type]: "error" }));
    } finally {
      setEmailSending(null);
    }
  };

  const tabs = [
    { id: "users", label: "Users", icon: Users },
    { id: "cancelled", label: "Cancelled", icon: AlertTriangle },
    { id: "deleted", label: "Deleted", icon: Trash2 },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
    { id: "emails", label: "Emails", icon: Zap },
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "tracking", label: "Tracking", icon: Radio },
  ] as const;

  const alertIcon = (s: string) => s === "green" ? <CheckCircle className="w-4 h-4 text-green-500" /> : s === "red" ? <AlertCircle className="w-4 h-4 text-red-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  const alertBg = (s: string) => s === "green" ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300" : s === "red" ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300" : "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-300";

  const featureLabels: Record<string, string> = {
    request_sent: "Review Request Sent", customer_added: "Customer Added", link_clicked: "Review Link Clicked",
    review_received: "Review Received", follow_up_sent: "Follow-up Sent", feedback_received: "Private Feedback",
  };

  // Fill in missing days for charts based on selected range
  const fillDays = (data: { date: string; count: string }[]) => {
    const map = Object.fromEntries(data.map(d => [d.date, parseInt(d.count)]));
    const result = [];
    let start: Date, end: Date;
    if (period === "custom" && fromDate && toDate) {
      start = new Date(fromDate); end = new Date(toDate);
    } else {
      const days = parseInt(period) || 30;
      end = new Date(); start = new Date(Date.now() - days * 86400000);
    }
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().split("T")[0];
      result.push({ date: key.slice(5), count: map[key] || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <Button size="sm" variant="outline" className="ml-4 text-purple-700 border-purple-400 hover:bg-purple-50" onClick={async () => {
            if (!confirm("Reset and reseed demo@reviewoptic.com with fresh demo data?")) return;
            const r = await fetch("/api/admin/seed-demo", { method: "POST", credentials: "include" });
            const d = await r.json();
            if (d.success) alert(`Demo account ready!\nEmail: ${d.email}\nPassword: ${d.password}`);
            else alert("Failed to seed demo account");
          }}>Seed Demo Account</Button>
        </div>
        {tab === "metrics" && (
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Select value={period} onValueChange={v => { setPeriod(v); setFromDate(""); setToDate(""); }}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 w-36 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 w-36 text-xs" />
              </>
            )}
            <span className="text-[11px] text-muted-foreground hidden sm:block">Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            <Button size="sm" variant="outline" onClick={loadMetrics} disabled={metricsLoading} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (!metrics) return;
              exportCSV([
                { section: "User Metrics", metric: "Total Users", value: metrics.userMetrics.total },
                { section: "User Metrics", metric: "New This Week", value: metrics.userMetrics.newThisWeek },
                { section: "User Metrics", metric: "Active This Week", value: metrics.userMetrics.activeThisWeek },
                { section: "User Metrics", metric: "Active Today", value: metrics.userMetrics.activeToday },
                { section: "Review Requests", metric: "Total All Time", value: metrics.requestMetrics.total },
                { section: "Review Requests", metric: "This Week", value: metrics.requestMetrics.thisWeek },
                { section: "Review Requests", metric: "Today", value: metrics.requestMetrics.today },
                { section: "Review Requests", metric: "Avg Per User", value: metrics.requestMetrics.avgPerUser },
                { section: "Retention", metric: "Day 1 Retention %", value: metrics.retentionMetrics.day1Rate },
                { section: "Retention", metric: "Week 1 Retention %", value: metrics.retentionMetrics.week1Rate },
                { section: "Retention", metric: "Time to First Action (hrs)", value: metrics.timeToFirstAction },
                { section: "Funnel", metric: "Signups", value: metrics.funnelMetrics.signups },
                { section: "Funnel", metric: "First Action", value: metrics.funnelMetrics.firstAction },
                { section: "Funnel", metric: "Return Visit", value: metrics.funnelMetrics.returnVisit },
                { section: "Funnel", metric: "Power Users", value: metrics.funnelMetrics.powerUsers },
                ...metrics.featureUsage.map(f => ({ section: "Feature Usage", metric: f.type, value: f.count })),
                ...metrics.topUsers.map((u, i) => ({ section: "Top Users", metric: `#${i + 1} ${u.email}`, value: u.action_count })),
              ], "admin-metrics.csv");
            }} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center sm:flex-nowrap sm:justify-start gap-1 bg-muted p-1 rounded-lg sm:w-fit mb-6 print:hidden">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`basis-[31%] sm:basis-auto px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── METRICS TAB ── */}
      {tab === "metrics" && (
        <div className="space-y-8">

          {/* Alerts */}
          {metrics?.alerts && (
            <div className="space-y-2">
              {metrics.alerts.map((a, i) => (
                <div key={i} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium ${alertBg(a.severity)}`}>
                  {alertIcon(a.severity)}{a.message}
                </div>
              ))}
            </div>
          )}

          {/* User Metrics */}
          <div>
            <SectionTitle icon={Users} title="User Metrics" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={metrics?.userMetrics.total ?? "—"} color="blue" />
              <StatCard label="New This Week" value={metrics?.userMetrics.newThisWeek ?? "—"} trend={metrics?.userMetrics.pctChange} sub="vs last week" color="blue" />
              <StatCard label="Active This Week" value={metrics?.userMetrics.activeThisWeek ?? "—"} sub="unique accounts" color="blue" />
              <StatCard label="Active Today" value={metrics?.userMetrics.activeToday ?? "—"} sub="unique accounts" color="blue" />
            </div>

            {/* Plan breakdown */}
            {metrics && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Standard — Monthly", planType: "lite", planPeriod: "monthly" },
                  { label: "Standard — Annual",  planType: "lite", planPeriod: "annual"  },
                  { label: "Pro — Monthly",  planType: "pro",  planPeriod: "monthly" },
                  { label: "Pro — Annual",   planType: "pro",  planPeriod: "annual"  },
                ].map(({ label, planType, planPeriod }) => {
                  const row = metrics.userMetrics.planBreakdown?.find(
                    r => r.planType === planType && r.planPeriod === planPeriod
                  );
                  return <StatCard key={label} label={label} value={row?.count ?? 0} sub="paid users" color="purple" />;
                })}
                {(() => {
                  const cancelled = metrics.userMetrics.planBreakdown?.filter(r => r.planType === "cancelled").reduce((s, r) => s + r.count, 0) ?? 0;
                  return <StatCard label="Cancelled" value={cancelled} sub="unsubscribed" color="orange" />;
                })()}
              </div>
            )}
          </div>

          {/* Review Requests */}
          <div>
            <SectionTitle icon={Zap} title="Review Requests" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard label="All Time" value={metrics?.requestMetrics.total ?? "—"} color="green" />
              <StatCard label="This Week" value={metrics?.requestMetrics.thisWeek ?? "—"} trend={metrics?.requestMetrics.pctChange} sub="vs last week" color="green" />
              <StatCard label="Today" value={metrics?.requestMetrics.today ?? "—"} color="green" />
              <StatCard label="Avg Per User" value={metrics?.requestMetrics.avgPerUser ?? "—"} color="green" />
            </div>
          </div>

          {/* Charts */}
          <div>
            <SectionTitle icon={TrendingUp} title="Charts" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-medium mb-4">New Users — {period === "custom" ? `${fromDate} to ${toDate}` : `Last ${period} Days`}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={metrics ? fillDays(metrics.charts.usersLast30Days) : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-medium mb-4">Review Requests — {period === "custom" ? `${fromDate} to ${toDate}` : `Last ${period} Days`}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={metrics ? fillDays(metrics.charts.requestsLast30Days) : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-medium mb-4">Activity by Day of Week</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={metrics?.charts.activityByDayOfWeek || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-medium mb-4">Activity by Hour of Day</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={metrics?.charts.activityByHour || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill="#ea580c" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Retention & Engagement */}
          <div>
            <SectionTitle icon={Activity} title="Retention & Engagement" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard label="Day 1 Retention" value={`${metrics?.retentionMetrics.day1Rate ?? 0}%`} sub="return next day" color="purple" />
              <StatCard label="Week 1 Retention" value={`${metrics?.retentionMetrics.week1Rate ?? 0}%`} sub="return within 7 days" color="purple" />
              <StatCard label="Time to First Action" value={metrics?.timeToFirstAction ? `${metrics.timeToFirstAction}h` : "—"} sub="avg after signup" color="purple" />
              <StatCard label="Reactivated" value={metrics?.retentionMetrics.reactivated?.length ?? 0} sub="returned after cancelling" color="green" />
              <StatCard label="Avg. Days to Reactivate" value={metrics?.retentionMetrics.avgDaysToReactivate != null ? `${metrics.retentionMetrics.avgDaysToReactivate}d` : "—"} sub="cancelled → resubscribed" color="green" />
            </div>
            {(metrics?.retentionMetrics.reactivated?.length ?? 0) > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden mt-4">
                <p className="text-sm font-medium px-4 py-3 border-b border-border bg-muted/40">Reactivated Users</p>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Cancelled</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Reactivated</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Days Away</th>
                  </tr></thead>
                  <tbody>
                    {metrics!.retentionMetrics.reactivated.map((u: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-[12.5px]">{u.email}</td>
                        <td className="px-4 py-2.5 text-[12.5px] text-muted-foreground">{fmtDate(u.cancelled_at)}</td>
                        <td className="px-4 py-2.5 text-[12.5px] text-muted-foreground">{fmtDate(u.reactivated_at)}</td>
                        <td className="px-4 py-2.5 text-[12.5px] text-muted-foreground">{u.days_away} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Conversion Funnel */}
          <div>
            <SectionTitle icon={Target} title="Conversion Funnel" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Signed Up" value={metrics?.funnelMetrics.signups ?? "—"} sub="total accounts" color="blue" />
              <StatCard label="First Action" value={metrics?.funnelMetrics.firstAction ?? "—"} sub="used the app" color="blue" />
              <StatCard label="Return Visit" value={metrics?.funnelMetrics.returnVisit ?? "—"} sub="came back again" color="blue" />
              <StatCard label="Power Users" value={metrics?.funnelMetrics.powerUsers ?? "—"} sub="10+ actions" color="blue" />
            </div>
          </div>

          {/* Feature Usage */}
          <div>
            <SectionTitle icon={BarChart3} title="Feature Usage" />
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Feature</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Total Uses</th>
                  <th className="px-4 py-2.5" />
                </tr></thead>
                <tbody>
                  {(metrics?.featureUsage || []).map((f, i) => {
                    const max = Math.max(...(metrics?.featureUsage || []).map(x => parseInt(x.count)));
                    const pct = max > 0 ? Math.round((parseInt(f.count) / max) * 100) : 0;
                    return (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium text-[12.5px]">{featureLabels[f.type] || f.type}</td>
                        <td className="px-4 py-2.5 text-[12.5px] text-muted-foreground">{f.count}</td>
                        <td className="px-4 py-2.5 w-40">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Power Users */}
          <div>
            <SectionTitle icon={Zap} title="Top 10 Most Active This Week" />
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {(metrics?.topUsers.length ?? 0) === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No activity recorded this week yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Joined</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions This Week</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Last Active</th>
                  </tr></thead>
                  <tbody>
                    {(metrics?.topUsers || []).map((u, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-muted-foreground text-[12.5px]">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-[12.5px]">{u.email}</td>
                        <td className="px-4 py-2.5 text-[12.5px] text-muted-foreground">{fmtDate(u.signup_date)}</td>
                        <td className="px-4 py-2.5 font-bold text-[12.5px]">{u.action_count}</td>
                        <td className="px-4 py-2.5 text-[12.5px] text-muted-foreground">{fmtDateTime(u.last_active)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Revenue & Payments */}
          <div>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold">Revenue & Payments</h2>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 print:hidden" onClick={() => exportCSV([], "revenue.csv")}>
                <Download className="w-3.5 h-3.5" />Export CSV
              </Button>
            </div>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <StatCard label="Total Revenue" value="—" sub="awaiting integration" />
              <StatCard label="This Month" value="—" />
              <StatCard label="This Week" value="—" />
              <StatCard label="Paying Customers" value="—" />
              <StatCard label="ARPU" value="—" sub="avg revenue per user" />
            </div>
            {/* Transactions table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <p className="text-sm font-medium">Recent Transactions & Refunds</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <p className="text-sm text-muted-foreground font-medium">No payment data yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Connect a payment provider to populate this section.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Insight Emails */}
          <div>
            <SectionTitle icon={Activity} title="Insight Emails" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard label="Total Sent" value={insightStats?.totalSent ?? "—"} color="blue" />
              <StatCard label="Total Opened" value={insightStats?.totalOpened ?? "—"} color="green" />
              <StatCard label="Open Rate" value={insightStats ? `${insightStats.openRate}%` : "—"} color="green" />
              <StatCard label="Opt-Outs" value={insightStats?.optOuts ?? "—"} color="orange" />
            </div>
            {(insightStats?.recentEmails.length ?? 0) > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <p className="text-sm font-medium px-4 py-3 border-b border-border bg-muted/40">Last 20 Sent</p>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Business</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Sent</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Opened</th>
                  </tr></thead>
                  <tbody>
                    {insightStats!.recentEmails.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-[12.5px] font-medium">{r.business_name || "—"}</td>
                        <td className="px-4 py-2.5 text-[12.5px] text-muted-foreground">{r.email}</td>
                        <td className="px-4 py-2.5 text-[12.5px] text-muted-foreground">{fmtDate(r.sent_at)}</td>
                        <td className="px-4 py-2.5 text-[12.5px]">
                          {r.opened_at ? (
                            <span className="text-green-600 font-medium">Yes · {fmtDate(r.opened_at)}</span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Geography & Devices */}
          <div>
            <SectionTitle icon={Activity} title="Geography & Devices" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Countries */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <p className="text-sm font-medium px-4 py-3 border-b border-border bg-muted/40">Users by Country</p>
                {(metrics?.geography.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-5">No country data yet — users need to set their country in Settings.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {metrics!.geography.map((r, i) => {
                      const max = metrics!.geography[0].count;
                      const pct = Math.round((r.count / max) * 100);
                      return (
                        <div key={i} className="px-4 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">{r.country}</span>
                            <span className="text-sm font-semibold">{r.count}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Devices */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <p className="text-sm font-medium px-4 py-3 border-b border-border bg-muted/40">Device Type</p>
                {(metrics?.devices.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-5">No device data yet — logged on each login.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {metrics!.devices.map((r, i) => {
                      const total = metrics!.devices.reduce((s, d) => s + d.count, 0);
                      const pct = Math.round((r.count / total) * 100);
                      return (
                        <div key={i} className="px-4 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm capitalize">{r.type}</span>
                            <span className="text-sm font-semibold">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Browsers */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <p className="text-sm font-medium px-4 py-3 border-b border-border bg-muted/40">Browser</p>
                {(metrics?.browsers.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-5">No browser data yet — logged on each login.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {metrics!.browsers.map((r, i) => {
                      const total = metrics!.browsers.reduce((s, b) => s + b.count, 0);
                      const pct = Math.round((r.count / total) * 100);
                      return (
                        <div key={i} className="px-4 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">{r.browser}</span>
                            <span className="text-sm font-semibold">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── CANCELLED TAB ── */}
      {tab === "cancelled" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <div>
              <p className="text-sm font-semibold">{cancelledAccounts.length} cancelled account{cancelledAccounts.length !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground mt-0.5">These users have cancelled their subscription. Contact them to reactivate.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 self-start sm:self-auto" onClick={() => exportCSV(cancelledAccounts, "cancelled-accounts.csv")}>
              <Download className="w-3.5 h-3.5" />Export CSV
            </Button>
          </div>
          {cancelledAccounts.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No cancelled accounts yet.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Customers</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Requests</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {cancelledAccounts.map((a, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-[12.5px]">{a.email}</td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground hidden sm:table-cell">{[a.first_name, a.last_name].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground hidden sm:table-cell">{a.company_name || "—"}</td>
                      <td className="px-4 py-3 text-[12.5px]">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                          {a.plan_type === "lite" ? "Standard" : a.plan_type} — {a.plan_period}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground hidden md:table-cell">{a.customer_count}</td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground hidden md:table-cell">{a.request_count}</td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{a.cancelled_at ? fmtDate(a.cancelled_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DELETED TAB ── */}
      {tab === "deleted" && (
        <div>
          <div className="mb-4">
            <p className="text-sm font-semibold">{deletedAccounts.length} account{deletedAccounts.length !== 1 ? "s" : ""} scheduled for deletion</p>
            <p className="text-xs text-muted-foreground mt-0.5">Personal details are not shown. These accounts will be fully purged 30 days after deletion was requested.</p>
          </div>
          {deletedAccounts.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No deleted accounts on record.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deletion Requested</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scheduled Purge Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedAccounts.map((a, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{a.cancelled_at ? fmtDate(a.cancelled_at) : "—"}</td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{a.deletion_scheduled_at ? fmtDate(a.deletion_scheduled_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EMAILS TAB ── */}
      {tab === "emails" && (
        <div>
          {/* Edit modal */}
          {editingTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
                <h3 className="text-base font-semibold mb-1">{editingTemplate.label}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {editingTemplate.type.startsWith("dialog_")
                    ? "Changes apply to all customers who submit a rating from this point forward."
                    : "Changes apply to all future emails of this type, for all users."}
                </p>

                <div className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                    {editingTemplate.type.startsWith("dialog_") ? "Title" : "Subject line"}
                  </label>
                  <input
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                  />
                </div>

                <div className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Body text</label>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={8}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-y font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Use blank lines to separate paragraphs.</p>
                </div>

                {editingTemplate.variables.length > 0 && (
                  <div className="mb-4 bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Available variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {editingTemplate.variables.map(v => (
                        <code key={v} className="text-xs bg-background border border-border rounded px-1.5 py-0.5">{v}</code>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => resetTemplate(editingTemplate.type)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Reset to default
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingTemplate(null)} className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={saveTemplate} disabled={savingTemplate} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {savingTemplate ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System emails section */}
          <div className="mb-5">
            <p className="text-sm font-semibold mb-0.5">System emails</p>
            <p className="text-xs text-muted-foreground">Emails sent by ReviewOptic to your users. Click Edit to update subject and body. Use Test to preview in your inbox.</p>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
            {emailTemplates.filter(e => !e.type.startsWith("dialog_") && !e.adminOnly).map((e, i, arr) => (
              <div key={e.type} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{e.label}</p>
                    {e.customised && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 flex-shrink-0">Edited</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.subject}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(e)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">Edit</button>
                  <button
                    onClick={() => sendTestEmail(e.type)}
                    disabled={emailSending === e.type}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      emailResult[e.type] === "sent" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                      emailResult[e.type] === "error" ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                      "bg-primary text-primary-foreground hover:bg-primary/90"
                    } disabled:opacity-50`}
                  >
                    {emailSending === e.type ? "Sending…" : emailResult[e.type] === "sent" ? "✓ Sent" : emailResult[e.type] === "error" ? "✗ Failed" : "Test"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ReviewOptic admin-only templates */}
          <div className="mb-5">
            <p className="text-sm font-semibold mb-0.5">ReviewOptic admin templates</p>
            <p className="text-xs text-muted-foreground">These templates are used only by the ReviewOptic admin account — not sent to end users of the platform. Edit to customise the message ReviewOptic sends to its own subscribers.</p>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
            {emailTemplates.filter(e => e.adminOnly).map((e, i, arr) => (
              <div key={e.type} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{e.label}</p>
                    {e.customised && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 flex-shrink-0">Edited</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.subject}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(e)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">Edit</button>
                  <button
                    onClick={() => sendTestEmail(e.type)}
                    disabled={emailSending === e.type}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      emailResult[e.type] === "sent" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                      emailResult[e.type] === "error" ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                      "bg-primary text-primary-foreground hover:bg-primary/90"
                    } disabled:opacity-50`}
                  >
                    {emailSending === e.type ? "Sending…" : emailResult[e.type] === "sent" ? "✓ Sent" : emailResult[e.type] === "error" ? "✗ Failed" : "Test"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Post-rating dialogue boxes section */}
          <div className="mb-5">
            <p className="text-sm font-semibold mb-0.5">Post-rating dialogue boxes</p>
            <p className="text-xs text-muted-foreground">These are not emails — they are the pop-up messages shown to a customer after they submit a star rating. The title and body text are editable here.</p>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {emailTemplates.filter(e => e.type.startsWith("dialog_")).map((e, i, arr) => (
              <div key={e.type} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{e.label}</p>
                    {e.customised && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 flex-shrink-0">Edited</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.subject}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(e)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">{users.filter(u => u.email !== "hello@reviewoptic.com" && (planFilter === "all" || u.planType === planFilter)).length} user{users.filter(u => u.email !== "hello@reviewoptic.com" && (planFilter === "all" || u.planType === planFilter)).length !== 1 ? "s" : ""}</p>
              {users.some(u => u.emailUnsubscribed) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                  {users.filter(u => u.emailUnsubscribed).length} unsubscribed
                </span>
              )}
              <div className="flex flex-wrap gap-1">
                {["all", "lite", "pro", "complimentary", "cancelled"].map(p => (
                  <button key={p} onClick={() => setPlanFilter(p)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors capitalize ${planFilter === p ? "bg-selected text-selected-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {p === "all" ? "All" : p === "lite" ? "Standard" : p}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 self-start sm:self-auto" onClick={() => exportCSV(users, "users.csv")}>
              <Download className="w-3.5 h-3.5" />Export CSV
            </Button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">Custs</th>
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">Reqs</th>
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Last Active</th>
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Ver.</th>
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.email !== "hello@reviewoptic.com" && (planFilter === "all" || u.planType === planFilter)).map(u => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium">{u.email}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        u.planType === "pro" ? "bg-blue-100 text-blue-700" :
                        u.planType === "lite" ? "bg-indigo-100 text-indigo-700" :
                        u.planType === "complimentary" ? "bg-green-100 text-green-700" :
                        u.planType === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{u.planType === "lite" ? "standard" : u.planType}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{u.customerCount}</td>
                    <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{u.reviewRequestCount}</td>
                    <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(u.lastActive)}</td>
                    <td className="px-3 py-3 hidden sm:table-cell">{u.emailVerified ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      {u.isAdmin ? <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span> : <span className="text-xs text-muted-foreground">User</span>}
                      {u.emailUnsubscribed && <span className="ml-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Unsub</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {!u.emailVerified && <Button size="sm" variant="outline" onClick={() => verifyUser(u.id)} title="Verify email"><CheckCircle2 className="w-3.5 h-3.5" /></Button>}
                        {!u.isAdmin && u.planType === "free" && <Button size="sm" variant="outline" onClick={() => grantAccess(u.id)} title="Grant full access (bypass payment)" className="border-green-400 text-green-700 hover:bg-green-50"><ShieldCheck className="w-3.5 h-3.5" /></Button>}
                        {u.id !== user?.id && !u.isAdmin && <Button size="sm" variant="outline" onClick={() => toggleSuspend(u.id)} title={u.isSuspended ? "Unsuspend account" : "Suspend account"} className={u.isSuspended ? "border-orange-400 text-orange-600" : ""}><Ban className="w-3.5 h-3.5" /></Button>}
                        {u.id !== user?.id && <Button size="sm" variant="outline" onClick={() => toggleAdmin(u.id)} title={u.isAdmin ? "Remove admin" : "Make admin"}>{u.isAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}</Button>}
                        {u.id !== user?.id && <Button size="sm" variant="outline" onClick={() => impersonate(u.id)} title="Impersonate"><LogIn className="w-3.5 h-3.5" /></Button>}
                        {u.id !== user?.id && !u.isAdmin && (confirmDelete === u.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id)}>Confirm</Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(u.id)} title="Delete account"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending registrations — registered but haven't paid */}
          {pendingUsers.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-muted-foreground mb-2">Pending registrations ({pendingUsers.length}) — registered but not yet paid</p>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Registered</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{u.name}</td>
                        <td className="px-3 py-2 font-medium">{u.email}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{fmtDate(u.createdAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 justify-end">
                            {!u.emailVerified && (
                              <Button size="sm" variant="outline" title="Resend verification email"
                                disabled={resendingVerification === u.id}
                                onClick={async () => {
                                  setResendingVerification(u.id);
                                  await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email: u.email }) });
                                  setResendingVerification(null);
                                }}>
                                <Mail className="w-3.5 h-3.5 text-blue-500" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => grantAccess(u.id)} title="Grant full access (bypass payment)" className="border-green-400 text-green-700 hover:bg-green-50"><ShieldCheck className="w-3.5 h-3.5" /></Button>
                            {confirmDelete === u.id ? (
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id)}>Confirm</Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(u.id)} title="Delete account"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "tools" && (
        <div className="space-y-4 p-4">
          <div className="border border-border rounded-xl p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold">Clear Test Data</p>
              <p className="text-xs text-muted-foreground mt-1">Deletes all review requests, activity, and private feedback from your admin account. Your customer list is kept — only test activity is cleared.</p>
            </div>
            {!resetConfirm ? (
              <Button variant="destructive" size="sm" onClick={() => setResetConfirm(true)}>Clear test data</Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" disabled={resetLoading} onClick={async () => {
                  setResetLoading(true);
                  await fetch("/api/admin/reset-own-data", { method: "DELETE", credentials: "include" });
                  setResetLoading(false);
                  setResetConfirm(false);
                  queryClient.invalidateQueries();
                }}>
                  {resetLoading ? "Clearing…" : "Yes, clear it"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setResetConfirm(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "tracking" && (
        <div className="space-y-4 p-4 max-w-xl">
          <div className="border border-border rounded-xl p-5 space-y-5">
            <div>
              <p className="text-sm font-semibold">Tracking Pixels</p>
              <p className="text-xs text-muted-foreground mt-1">Paste your pixel/tag IDs below. Leave blank to disable. Changes take effect on next page load.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium">Meta Pixel ID</label>
              <p className="text-[11px] text-muted-foreground">Found in Meta Events Manager → your pixel → Settings. Format: 15–16 digit number e.g. <span className="font-mono">1234567890123456</span></p>
              <Input placeholder="e.g. 1234567890123456" value={tracking.meta_pixel_id} onChange={e => setTracking(t => ({ ...t, meta_pixel_id: e.target.value }))} className="text-[13px] font-mono" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium">Google Tag Manager ID</label>
              <p className="text-[11px] text-muted-foreground">Found in GTM → your container → Admin. Format: <span className="font-mono">GTM-XXXXXXX</span>. Covers GA4 and Google Ads conversion tracking.</p>
              <Input placeholder="e.g. GTM-XXXXXXX" value={tracking.google_tag_id} onChange={e => setTracking(t => ({ ...t, google_tag_id: e.target.value }))} className="text-[13px] font-mono" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium">TikTok Pixel ID</label>
              <p className="text-[11px] text-muted-foreground">Found in TikTok Ads Manager → Assets → Events → your pixel. Format: <span className="font-mono">CXXXXXXXXXXXXXXXXXX</span></p>
              <Input placeholder="e.g. CXXXXXXXXXXXXXXXXXX" value={tracking.tiktok_pixel_id} onChange={e => setTracking(t => ({ ...t, tiktok_pixel_id: e.target.value }))} className="text-[13px] font-mono" />
            </div>

            <Button size="sm" disabled={trackingSaving} onClick={async () => {
              setTrackingSaving(true);
              await fetch("/api/admin/tracking", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(tracking) });
              setTrackingSaving(false);
              setTrackingSaved(true);
              setTimeout(() => setTrackingSaved(false), 3000);
            }}>
              {trackingSaving ? "Saving…" : trackingSaved ? "✓ Saved" : "Save Pixels"}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
