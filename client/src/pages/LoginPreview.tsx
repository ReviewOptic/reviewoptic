import { useState } from "react";
import { Star, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const tagline = "Turn happy customers into 5-star reviews";
const sub = "Send review requests, follow up automatically, and grow your reputation while you focus on the work.";
const features = [
  "Send review requests via email, SMS or WhatsApp",
  "Automated follow-ups — set it once and forget it",
  "Unhappy customers go to private feedback, not public reviews",
  "Track requests, clicks, and your average rating",
];

function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${dark ? "bg-white" : "bg-primary"}`}>
        <Star className={`w-4 h-4 fill-current ${dark ? "text-primary" : "text-primary-foreground"}`} />
      </div>
      <span className={`font-bold text-[15px] tracking-tight ${dark ? "text-white" : "text-foreground"}`}>ReviewOptic</span>
    </div>
  );
}

function FakeForm({ dark = false }) {
  const labelCls = dark ? "text-white/80 text-sm font-medium" : "";
  const inputCls = dark ? "bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-white/30" : "";
  return (
    <div className="space-y-4 w-full">
      <div className="space-y-1.5">
        <label className={`block text-sm font-medium ${dark ? "text-white/80" : "text-foreground"}`}>Email</label>
        <Input placeholder="you@example.com" className={inputCls} readOnly />
      </div>
      <div className="space-y-1.5">
        <label className={`block text-sm font-medium ${dark ? "text-white/80" : "text-foreground"}`}>Password</label>
        <Input type="password" placeholder="••••••••" className={inputCls} readOnly />
      </div>
      <Button className="w-full" variant={dark ? "secondary" : "default"}>Sign in</Button>
      <p className={`text-center text-xs ${dark ? "text-white/50" : "text-muted-foreground"}`}>
        No account? <span className={`font-medium ${dark ? "text-white/80" : "text-primary"}`}>Create one free</span>
      </p>
    </div>
  );
}

// Option 1: Centred card, nothing else
function Option1() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="bg-card border border-border rounded-xl p-7 shadow-sm">
          <h2 className="text-xl font-bold mb-5">Sign in</h2>
          <FakeForm />
        </div>
      </div>
    </div>
  );
}

// Option 2: Centred with tagline
function Option2() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">{tagline}</h1>
        <p className="text-muted-foreground text-sm mb-8">{sub}</p>
        <div className="bg-card border border-border rounded-xl p-7 shadow-sm text-left">
          <FakeForm />
        </div>
      </div>
    </div>
  );
}

// Option 3: Thin left strip
function Option3() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between bg-muted/50 border-r border-border p-8 w-64 flex-shrink-0">
        <Logo />
        <p className="text-muted-foreground text-sm leading-relaxed">{sub}</p>
        <span className="text-muted-foreground/40 text-xs">© 2026 ReviewOptic</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your account.</p>
          <FakeForm />
        </div>
      </div>
    </div>
  );
}

// Option 4: Top nav bar + centred form
function Option4() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center px-8 py-4 border-b border-border">
        <Logo />
      </nav>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Sign in</h2>
          <p className="text-muted-foreground text-sm mb-7">Enter your details to access your account.</p>
          <FakeForm />
        </div>
      </div>
    </div>
  );
}

// Option 5: Dark background, centred card
function Option5() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "#0f172a" }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo dark /></div>
        <div className="rounded-xl p-7 shadow-xl" style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-xl font-bold mb-5 text-white">Sign in</h2>
          <FakeForm dark />
        </div>
        <p className="text-center mt-6 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>© 2026 ReviewOptic</p>
      </div>
    </div>
  );
}

const options = [
  { label: "Option 1 — Minimal card", component: Option1 },
  { label: "Option 2 — Tagline above form", component: Option2 },
  { label: "Option 3 — Thin left strip", component: Option3 },
  { label: "Option 4 — Top nav bar", component: Option4 },
  { label: "Option 5 — Dark background", component: Option5 },
];

export default function LoginPreview() {
  const [current, setCurrent] = useState(0);
  const Active = options[current].component;

  return (
    <div className="relative">
      {/* Picker bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur text-white flex items-center justify-between px-4 py-2.5 gap-4 text-sm">
        <button
          onClick={() => setCurrent(i => Math.max(0, i - 1))}
          disabled={current === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        <div className="flex items-center gap-2">
          {options.map((o, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${i === current ? "bg-white text-black" : "bg-white/20 hover:bg-white/30 text-white"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrent(i => Math.min(options.length - 1, i + 1))}
          disabled={current === options.length - 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Label */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/70 backdrop-blur text-white text-xs font-medium px-4 py-2 rounded-full">
        {options[current].label}
      </div>

      {/* Preview */}
      <div className="pt-[44px]">
        <Active />
      </div>
    </div>
  );
}
