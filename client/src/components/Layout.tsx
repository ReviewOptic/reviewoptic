import { Link, useLocation, useSearch } from "wouter";
import { HOWTOS } from "@/data/howtos";
import { LayoutDashboard, Users, FileText, BarChart3, Settings, Menu, X, LogOut, Shield, CreditCard, AlertTriangle, MessageSquarePlus, BookOpen, ArrowLeft, Home, ChevronDown, ChevronUp, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { PrivateFeedback } from "@shared/schema";
import ChatWidget from "@/components/ChatWidget";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center flex-col gap-4 text-sm text-muted-foreground">
          <p>Something went wrong. <button className="underline" onClick={() => window.location.reload()}>Reload</button></p>
        </div>
      );
    }
    return this.props.children;
  }
}

function LogoOrText() {
  return <img src="/logo.png" alt="ReviewOptic" className="w-full max-w-[200px] h-auto object-contain" />;
}

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/templates", icon: FileText, label: "Templates" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/tutorial", icon: BookOpen, label: "Tutorials & Guides" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function NavItem({ item, active, onClick }: { item: typeof navItems[0]; active: boolean; onClick?: () => void }) {
  return (
    <Link href={item.href}>
      <div
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors cursor-pointer relative select-none",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {item.label}
      </div>
    </Link>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const [location] = useLocation();
  const { data: feedback } = useQuery<PrivateFeedback[]>({ queryKey: ["/api/private-feedback"] });
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [showFeedback, setShowFeedback] = useState(false);
  const unrespondedFeedback = feedback?.filter(f => !f.responded).length || 0;

  return (
    <>
      <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
        <LogoOrText />
        <div className="ml-2 shrink-0">
          <NotificationBell buttonClassName="text-white/70 hover:bg-white/10 hover:text-white" />
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.filter(item => !(user?.isAdmin && item.href === "/tutorial")).map((item) => {
          const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
          return (
            <div key={item.href} className="relative">
              <NavItem item={item} active={active} onClick={onNavClick} />
              {item.label === "Dashboard" && unrespondedFeedback > 0 && !active && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Badge className="text-[10px] h-4 px-1.5 min-w-[16px]" variant="destructive">
                    {unrespondedFeedback}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-sidebar-border">
        <div className="text-[11px] text-white/60 truncate mb-2">{user?.email}</div>
        {!user?.isAdmin && user?.role !== "member" && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[12px] h-7 px-2 text-white/75 hover:text-white hover:bg-white/10 mb-1"
            onClick={() => { navigate("/billing"); onNavClick?.(); }}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Billing
          </Button>
        )}
        {user?.isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[12px] h-7 px-2 text-white/75 hover:text-white hover:bg-white/10 mb-1"
            onClick={() => { navigate("/admin"); onNavClick?.(); }}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin panel
          </Button>
        )}
        {!user?.isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[12px] h-7 px-2 text-white/75 hover:text-white hover:bg-white/10 mb-1"
            onClick={() => setShowFeedback(true)}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Feedback & Feature Requests
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-[12px] h-7 px-2 text-white/75 hover:text-white hover:bg-white/10"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </Button>
      </div>
      <FeedbackDialog open={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
}

// ─── NOTIFICATION BELL ───────────────────────────────────────────────────────
type Notification = { id: string; type: string; title: string; body: string; link: string; read: boolean; created_at: string };

function NotificationBell({ buttonClassName }: { buttonClassName?: string } = {}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  // Register push subscription once on mount
  useEffect(() => {
    async function registerPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const { key } = await apiRequest("GET", "/api/push/vapid-public-key").then((r: any) => r.json());
        if (!key) return;
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) { await apiRequest("POST", "/api/push/subscribe", existing.toJSON()); return; }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await apiRequest("POST", "/api/push/subscribe", sub.toJSON());
      } catch { /* push not supported */ }
    }
    registerPush();
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = useMutation({
    mutationFn: (ids: string[]) => apiRequest("POST", "/api/notifications/mark-read", { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    setOpen(v => !v);
    if (unread > 0) markRead.mutate([]);
  }

  function handleNotifClick(notif: Notification) {
    setOpen(false);
    navigate(notif.link || "/customers");
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={cn("h-10 w-10 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground relative", buttonClassName)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={() => markRead.mutate([])} className="text-xs text-muted-foreground hover:text-foreground">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-accent transition-colors",
                    !n.read && "bg-blue-50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", !n.read && "font-semibold")}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const SUBJECTS = [
  "Feature Request",
  "General Feedback",
  "Bug Report",
  "Other",
];

function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState([user?.firstName, user?.lastName].filter(Boolean).join(" "));
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to send");
      toast({ title: "Feedback sent!", description: "Thank you — we'll review your message and be in touch." });
      setMessage("");
      onClose();
    } catch (err: any) {
      toast({ title: "Could not send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900">Feedback & Feature Requests</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>
        <p className="text-[13px] text-gray-500">We read every message. Let us know what you think or what you'd love to see.</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[12px] font-medium text-gray-700">Your name</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-gray-50 text-gray-500 cursor-not-allowed"
                value={name} readOnly
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[12px] font-medium text-gray-700">Email address</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-gray-50 text-gray-500 cursor-not-allowed"
                value={email} readOnly
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-gray-700">Subject</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={subject} onChange={e => setSubject(e.target.value)}
            >
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-gray-700">Message</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4} value={message} onChange={e => setMessage(e.target.value)} required
              placeholder="Tell us what you'd like to see, or anything on your mind…"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={sending}
              className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-[13px] hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send message"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-300 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CancelledBanner() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  if (user?.planType !== "cancelled") return null;
  return (
    <div className="bg-amber-500 text-white text-sm px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between flex-shrink-0 gap-2 sm:gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Your subscription has ended — you can still view your account but cannot send new review requests.</span>
      </div>
      <button onClick={() => navigate("/billing")} className="underline font-semibold whitespace-nowrap hover:text-white/80 self-start sm:self-auto">
        Reactivate
      </button>
    </div>
  );
}

function ImpersonationBanner() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  if (!user?.isImpersonating) return null;

  const stop = async () => {
    await fetch("/api/admin/stop-impersonation", { method: "POST", credentials: "include" });
    await refreshUser();
    queryClient.clear();
    navigate("/admin");
  };

  return (
    <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between flex-shrink-0">
      <span className="font-medium">Viewing as <strong>{user.email}</strong> — <span className="bg-amber-600 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wide">READ ONLY</span></span>
      <button onClick={stop} className="underline font-semibold text-sm hover:text-white/80">Exit view</button>
    </div>
  );
}

function BackToTutorial() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState({ x: Math.max(8, window.innerWidth - 304), y: Math.max(8, window.innerHeight - 280) });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    }
    function onMouseUp() { dragging.current = false; }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  const params = new URLSearchParams(search);
  if (params.get("back") !== "tutorial") return null;
  const tab = params.get("tab") || "howtos";
  const howtoIndex = parseInt(params.get("howto") || "-1", 10);
  const howto = howtoIndex >= 0 ? HOWTOS[howtoIndex] : null;

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  return (
    <div
      className="fixed z-50 w-72 bg-background border border-border rounded-xl shadow-lg overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 py-2.5 bg-muted/60 cursor-grab active:cursor-grabbing select-none"
      >
        <button
          onClick={() => navigate(`/tutorial?tab=${tab}`)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          onMouseDown={e => e.stopPropagation()}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Tutorials &amp; Guides
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground ml-2 shrink-0" onMouseDown={e => e.stopPropagation()}>
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && howto && (
        <div className="px-3 py-3 space-y-2.5 max-h-72 overflow-y-auto">
          <p className="text-xs font-semibold text-foreground mb-1">{howto.title}</p>
          {howto.steps.map((step, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Mobile overlay (shared across all layouts)
function MobileOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <aside
        className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-3 right-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <SidebarContent onNavClick={onClose} />
      </aside>
    </div>
  );
}

// ─── CLASSIC LAYOUT ──────────────────────────────────────────────────────────
// Left sidebar 240px, current design
function ClassicLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const isHome = location === "/";
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background overflow-hidden">
        <aside className="hidden md:flex flex-col w-60 bg-sidebar border-r border-sidebar-border flex-shrink-0">
          <SidebarContent />
        </aside>
        <MobileOverlay open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ImpersonationBanner />
          <CancelledBanner />
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
            <div className="flex items-center gap-1">
              {isHome ? (
                <button className="h-12 w-12 flex items-center justify-center rounded-md hover:bg-accent" onClick={() => setMobileOpen(true)}>
                  <Menu className="w-7 h-7" />
                </button>
              ) : (
                <>
                  <button onClick={() => navigate("/")} className="h-12 w-12 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground" aria-label="Go to dashboard">
                    <Home className="w-6 h-6" />
                  </button>
                  <button onClick={() => window.history.back()} className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground" aria-label="Go back">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            <LogoOrText />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        {!user?.isImpersonating && <ChatWidget />}
        <BackToTutorial />
      </div>
    </ErrorBoundary>
  );
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
export default function Layout({ children }: { children: ReactNode }) {
  return <ClassicLayout>{children}</ClassicLayout>;
}
