import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Play, BookOpen, Lightbulb, ChevronDown, ChevronUp, CheckCircle2, CheckCircle } from "lucide-react";
import { HOWTOS } from "@/data/howtos";

// ─── Replace these with your real YouTube embed URLs ───────────────────────
// Format: "https://www.youtube.com/embed/YOUR_VIDEO_ID"
const VIDEOS = [
  {
    title: "Welcome to ReviewOptic",
    description: "An overview of what ReviewOptic does and how to get the most out of it from day one.",
    duration: "3 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to update your business details and logo",
    description: "How to keep your business name, email, and logo up to date in Settings.",
    duration: "1 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to connect your review platforms",
    description: "How to add your Google, Trustpilot, or other review page links so customers know where to go.",
    duration: "2 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to customise your templates",
    description: "How to edit your message templates so they sound like you, not a generic message.",
    duration: "3 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to set up follow-ups",
    description: "How to enable automatic follow-ups, set delays for up to 3 reminders, and understand how rated-but-not-clicked customers get a personalised reminder instead of the generic follow-up.",
    duration: "2 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to add a customer",
    description: "How to add customers to ReviewOptic and what happens once they're saved.",
    duration: "2 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to send a review request",
    description: "How to send a review request via email, SMS, or WhatsApp — and how to attach a voice note or video for customers who give a high rating.",
    duration: "2 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "Understanding customer statuses",
    description: "What each customer status means and what action, if any, you need to take.",
    duration: "2 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to read your analytics",
    description: "How to use your analytics dashboard to understand what's working and improve your results.",
    duration: "3 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to mark a customer as Do Not Contact",
    description: "How to stop review requests being sent to a specific customer.",
    duration: "1 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to invite a team member (optional)",
    description: "How to give a colleague access to your ReviewOptic account.",
    duration: "2 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to archive and restore a customer",
    description: "How to hide a customer from your active list without deleting their data, and how to restore them if needed.",
    duration: "1 min",
    url: "", // paste YouTube embed URL here
  },
];
// ───────────────────────────────────────────────────────────────────────────


const TIPS = [
  {
    tip: "Make it a daily habit",
    detail: "Add new customers every day, even just one or two. Consistency is what separates businesses with 10 reviews from those with 500. The platform works best when you work it.",
  },
  {
    tip: "The follow-up is where the magic happens",
    detail: "Research shows that the majority of reviews come from the second or third contact, not the first. Always have follow-ups enabled with at least 2 reminders. Customers who rated 4–5★ automatically get a personalised reminder — not a generic nudge — which converts far better.",
  },
  {
    tip: "Sound like yourself, not a template",
    detail: "Edit your templates to use your natural voice. Customers can tell when a message is robotic. A personal-sounding message gets far more responses than a generic one.",
  },
  {
    tip: "Timing matters more than you think",
    detail: "Send review requests within 24–48 hours of a customer's visit or completed service while the experience is still fresh in their mind. Check your Best Day to Send chart in Analytics to find your sweet spot.",
  },
  {
    tip: "You get out what you put in",
    detail: "ReviewOptic automates the hard part — but it works on your behalf, not instead of you. The more customers you add and the more consistently you use it, the faster your reviews grow. Treat it like a daily routine, not a one-off task.",
  },
  {
    tip: "Use all available channels",
    detail: "Not every customer checks email. Some respond better to SMS, others to WhatsApp. Try different channels for different customers and watch which gets the best response rate in your analytics.",
  },
  {
    tip: "Check in with your analytics weekly",
    detail: "Spending 5 minutes a week on Analytics tells you what's working. Check the Customer Pipeline to see how many people are stuck awaiting follow-ups, the Follow-up Effectiveness chart to see if extra reminders are converting, and the Content Type Performance chart to see whether a voice note or video is outperforming plain text.",
  },
  {
    tip: "Private feedback is a gift — use it",
    detail: "When a customer rates 1–3 stars, they're giving you something most businesses never get: an honest reason to improve before it becomes a public complaint. Read every piece of private feedback and act on it. Customers who feel heard often become your biggest advocates.",
  },
  {
    tip: "Google is usually the priority",
    detail: "If you only focus on one platform, make it Google. It's the first thing people see when they search for your business and has the biggest impact on trust and discoverability. Once your Google score is strong, broaden out to Trustpilot or others.",
  },
  {
    tip: "Don't wait until the end of the week",
    detail: "It's tempting to batch your customer adds up on a Friday — but requests sent mid-week typically get higher response rates than those sent on weekends. Add customers as you complete jobs and let the timing work in your favour.",
  },
  {
    tip: "A good subject line opens the door",
    detail: "For email requests, the subject line determines whether the email gets opened at all. Personalise it with the customer's first name or your business name. Test different versions and check your click rate to see what lands best.",
  },
  {
    tip: "WhatsApp gets the highest response rates",
    detail: "Of all three channels, WhatsApp messages feel the most personal and are read almost immediately. If a customer has given a phone number, WhatsApp is often worth trying first. For all channels, try attaching a voice note or video for customers who rate highly — a personal message from you before they leave a review can make a real difference.",
  },
  {
    tip: "Keep your review platforms up to date",
    detail: "If you move your Google Business page, change your Trustpilot URL, or join a new platform, update your links in Settings straight away. A broken review link means lost reviews — check your links are working every few months.",
  },
  {
    tip: "Your star rating is a sales tool",
    detail: "The average star rating shown on your dashboard reflects how customers are experiencing your service right now. Share milestones with your team — a rising average is a sign your standards are improving and worth celebrating.",
  },
];

function VideoCard({ video, index, watched, onMarkWatched }: { video: typeof VIDEOS[0]; index: number; watched: boolean; onMarkWatched: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!video.url || watched) return;
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube state 1 = playing
        if (data.event === "onStateChange" && data.info === 1) onMarkWatched();
      } catch {}
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [watched, video.url]);

  return (
    <div className={`bg-card border rounded-xl overflow-hidden ${watched ? "border-green-400" : "border-border"}`}>
      <div className="relative">
        {video.url ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              ref={iframeRef}
              src={`${video.url}?enablejsapi=1`}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video w-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
            </div>
            <span className="text-white/40 text-sm">Coming soon</span>
          </div>
        )}
        {watched && (
          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-0.5">
            <CheckCircle className="w-4 h-4 text-white" fill="white" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm"><span className="text-muted-foreground mr-1">{index + 1}.</span>{video.title}</h3>
          <span className="text-xs text-muted-foreground shrink-0">{video.duration}</span>
        </div>
        <p className="text-sm text-muted-foreground">{video.description}</p>
      </div>
    </div>
  );
}

function StepText({ step, onNavigate }: { step: typeof HOWTOS[0]["steps"][0]; onNavigate?: () => void }) {
  if (!step.link || !step.linkText) {
    return <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>;
  }
  const [before, after] = step.text.split(step.linkText);
  return (
    <p className="text-sm text-muted-foreground leading-relaxed">
      {before}
      <button onClick={onNavigate} className="text-primary hover:underline font-medium">{step.linkText}</button>
      {after}
    </p>
  );
}

function HowToAccordion({ item, index }: { item: typeof HOWTOS[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="font-medium text-sm"><span className="text-muted-foreground mr-1">{index + 1}.</span>{item.title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-2.5">
          {item.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </div>
              <StepText
                step={step}
                onNavigate={step.link ? () => navigate(`${step.link}?back=tutorial&tab=howtos&howto=${index}`) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TipCard({ tip }: { tip: typeof TIPS[0] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex gap-4">
      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-sm mb-1">{tip.tip}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{tip.detail}</p>
      </div>
    </div>
  );
}

const TABS = [
  { id: "videos", label: "Videos", icon: Play },
  { id: "howtos", label: "How-to's", icon: BookOpen },
  { id: "tips", label: "Top Tips", icon: Lightbulb },
];

const WATCHED_KEY = "reviewoptic_watched_videos";

export default function Tutorial() {
  const search = useSearch();
  const initialTab = new URLSearchParams(search).get("tab") || "videos";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [watched, setWatched] = useState<Set<number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCHED_KEY) || "[]");
      return new Set(saved);
    } catch { return new Set(); }
  });

  function toggleWatched(index: number) {
    setWatched(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      localStorage.setItem(WATCHED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <div className="px-6 py-7 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tutorials &amp; Guides</h1>
        <p className="text-muted-foreground text-sm mt-1">Everything you need to get the most out of ReviewOptic.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Videos */}
      {activeTab === "videos" && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((video, i) => (
            <VideoCard key={i} video={video} index={i} watched={watched.has(i)} onMarkWatched={() => toggleWatched(i)} />
          ))}
        </div>
      )}

      {/* How-to's */}
      {activeTab === "howtos" && (
        <div className="space-y-3 max-w-2xl">
          {HOWTOS.map((item, i) => (
            <HowToAccordion key={i} item={item} index={i} />
          ))}
        </div>
      )}

      {/* Top Tips */}
      {activeTab === "tips" && (
        <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
          {TIPS.map((tip, i) => (
            <TipCard key={i} tip={tip} />
          ))}
        </div>
      )}
    </div>
  );
}
