import { Link, useLocation, useSearch } from "wouter";
import { HOWTOS } from "@/data/howtos";
import { LayoutDashboard, Users, FileText, BarChart3, Settings, Menu, X, LogOut, Shield, CreditCard, AlertTriangle, MessageSquarePlus, BookOpen, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { PrivateFeedback } from "@shared/schema";
import ChatWidget from "@/components/ChatWidget";
import { useToast } from "@/hooks/use-toast";

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
  const { data: settings } = useQuery<{ logoUrl: string; businessName: string }>({ queryKey: ["/api/settings"] });
  const [imgFailed, setImgFailed] = useState(false);

  const logoSrc = settings?.logoUrl || "";

  const src = (logoSrc && !imgFailed) ? logoSrc : "/logo.png";
  return <img src={src} alt="logo" className="w-full max-w-[200px] h-auto object-contain" onError={() => setImgFailed(true)} />;
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
      <div className="flex items-center justify-center px-5 py-5 border-b border-sidebar-border">
        <LogoOrText />
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
        <div className="text-[11px] text-muted-foreground/70 truncate mb-2">{user?.email}</div>
        {!user?.isAdmin && user?.role !== "member" && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[12px] h-7 px-2 text-muted-foreground hover:text-foreground mb-1"
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
            className="w-full justify-start gap-2 text-[12px] h-7 px-2 text-muted-foreground hover:text-foreground mb-1"
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
            className="w-full justify-start gap-2 text-[12px] h-7 px-2 text-muted-foreground hover:text-foreground mb-1"
            onClick={() => setShowFeedback(true)}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Feedback & Feature Requests
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-[12px] h-7 px-2 text-muted-foreground hover:text-foreground"
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
    <div className="bg-red-600 text-white text-sm px-4 py-2.5 flex items-center justify-between flex-shrink-0 gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Your subscription has ended. You can view analytics but all other features are locked.</span>
      </div>
      <button onClick={() => navigate("/billing")} className="underline font-semibold whitespace-nowrap hover:text-white/80">
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
  const [stepsOpen, setStepsOpen] = useState(false);
  const params = new URLSearchParams(search);
  if (params.get("back") !== "tutorial") return null;
  const tab = params.get("tab") || "howtos";
  const howtoIndex = parseInt(params.get("howto") || "-1", 10);
  const howto = howtoIndex >= 0 ? HOWTOS[howtoIndex] : null;
  return (
    <div className="px-6 pt-4 space-y-2">
      <button
        onClick={() => navigate(`/tutorial?tab=${tab}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tutorials &amp; Guides
      </button>
      {howto && (
        <div className="border border-border rounded-xl overflow-hidden max-w-xl">
          <button
            onClick={() => setStepsOpen(!stepsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <span className="text-sm font-medium">{howto.title}</span>
            {stepsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
          </button>
          {stepsOpen && (
            <div className="px-4 py-3 space-y-2 bg-background">
              {howto.steps.map((step, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <ErrorBoundary>
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ImpersonationBanner />
        <CancelledBanner />
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <LogoOrText />
          <div className="w-8" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <BackToTutorial />
          {children}
        </main>
      </div>
      {!user?.isImpersonating && <ChatWidget />}
    </div>
    </ErrorBoundary>
  );
}
