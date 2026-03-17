import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, BarChart3, Settings, Menu, X, LogOut, Shield, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { PrivateFeedback } from "@shared/schema";

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

  if (logoSrc && !imgFailed) {
    return <img src={logoSrc} alt="logo" className="h-24 w-auto max-w-[220px] object-contain" onError={() => setImgFailed(true)} />;
  }
  return <span className="font-semibold text-sidebar-foreground text-[15px] tracking-tight">ReviewOptic</span>;
}

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/templates", icon: FileText, label: "Templates" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
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
  const unrespondedFeedback = feedback?.filter(f => !f.responded).length || 0;

  return (
    <>
      <div className="flex items-center justify-center px-5 py-5 border-b border-sidebar-border">
        <LogoOrText />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
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
        {!user?.isAdmin && (
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
    </>
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

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <LogoOrText />
          <div className="w-8" />
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}
