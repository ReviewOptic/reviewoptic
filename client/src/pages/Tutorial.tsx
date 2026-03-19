import { useState } from "react";
import { Play, BookOpen, Lightbulb, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

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
    title: "How to add a customer",
    description: "How to add customers to ReviewOptic and what happens once they're saved.",
    duration: "2 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to send a review request",
    description: "How to send a review request via email, SMS, or WhatsApp — and how to choose the right channel.",
    duration: "2 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to set up follow-ups",
    description: "How to enable automatic follow-up messages so no customer slips through the net.",
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
    title: "How to connect your review platforms",
    description: "How to add your Google, Trustpilot, or other review page links so customers know where to go.",
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
    title: "How to update your business details and logo",
    description: "How to keep your business name, email, and logo up to date in Settings.",
    duration: "1 min",
    url: "", // paste YouTube embed URL here
  },
  {
    title: "How to invite a team member",
    description: "How to give a colleague access to your ReviewOptic account.",
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
    title: "How to reset your password",
    description: "How to reset your password if you have forgotten it or need to change it.",
    duration: "1 min",
    url: "", // paste YouTube embed URL here
  },
];
// ───────────────────────────────────────────────────────────────────────────

const HOWTOS = [
  {
    title: "How to add a customer",
    steps: [
      "Go to the Customers page from the sidebar.",
      "Click 'Add Customer' in the top right.",
      "Fill in their name, email or phone number, and the date of their last visit.",
      "Click Save — they'll appear in your customer list, ready to receive a request.",
    ],
  },
  {
    title: "How to send a review request",
    steps: [
      "On the Customers page, find the customer you want to contact.",
      "Click 'Send Request' next to their name.",
      "Choose your channel (Email, SMS, or WhatsApp) and select a template.",
      "Hit Send — the request is delivered instantly and tracked automatically.",
    ],
  },
  {
    title: "How to set up follow-ups",
    steps: [
      "Go to Settings and open the Follow-up tab.",
      "Enable automatic follow-ups and choose your delay (e.g. 3 days after the first request).",
      "ReviewOptic will automatically send a second nudge to customers who haven't responded.",
      "Most reviews come from the follow-up — don't skip this step.",
    ],
  },
  {
    title: "How to customise your templates",
    steps: [
      "Go to Templates in the sidebar.",
      "Click on any template to open the editor.",
      "Edit the subject and body — use {{first_name}} and {{business_name}} to personalise automatically.",
      "Click Save when you're happy. The next request you send will use your updated template.",
    ],
  },
  {
    title: "How to connect your review platforms",
    steps: [
      "Go to Settings and open the Review Platforms tab.",
      "Add links to your Google, Trustpilot, or other review profile pages.",
      "These links are embedded automatically in every review request you send.",
      "Make sure you test your links are correct before sending to customers.",
    ],
  },
  {
    title: "How to read your analytics",
    steps: [
      "Go to Analytics in the sidebar.",
      "Use the date range filter to choose the period you want to review.",
      "Check your response rate — if it's below 20%, focus on improving your templates or timing.",
      "The 'Best Day to Send' chart shows when your customers are most likely to respond.",
    ],
  },
  {
    title: "How to mark a customer as Do Not Contact",
    steps: [
      "Go to the Customers page from the sidebar.",
      "Click on the customer's name to open their profile.",
      "Toggle the 'Do Not Contact' switch — this immediately stops any further review requests or follow-ups being sent to them.",
      "The customer will remain in your list for your records but will never be contacted again through ReviewOptic.",
    ],
  },
  {
    title: "How to update your business details and logo",
    steps: [
      "Go to Settings in the sidebar.",
      "Under the General tab, update your business name, email address, and any other details.",
      "To upload a logo, click the upload area and select an image from your device. Your logo will appear in emails sent to customers.",
      "Click Save when done. Changes take effect immediately.",
    ],
  },
  {
    title: "How to invite a team member",
    steps: [
      "Go to Settings and open the Team tab.",
      "Click 'Invite Team Member' and enter their email address.",
      "They will receive an email invitation with a link to set up their account.",
      "Once they accept, they will appear in your team list and can log in to ReviewOptic. They share your account but cannot change billing or account settings.",
    ],
  },
  {
    title: "Understanding customer statuses",
    steps: [
      "Pending Request — the customer has been added but no review request has been sent yet.",
      "Request Sent — a review request has been sent and we are waiting for a response.",
      "Link Clicked — the customer clicked the review link in your message. They may have left a review.",
      "Review Received — a review has been recorded for this customer.",
    ],
  },
  {
    title: "How to reset your password",
    steps: [
      "Go to the ReviewOptic login page and click 'Forgot password?' below the sign-in form.",
      "Enter your email address and click Send. You will receive a password reset link by email.",
      "Click the link in the email and enter your new password. It must be at least 8 characters and include a number and a symbol.",
      "Once reset, you will be taken back to the login page. Sign in with your new password.",
    ],
  },
];

const TIPS = [
  {
    tip: "Make it a daily habit",
    detail: "Add new customers every day, even just one or two. Consistency is what separates businesses with 10 reviews from those with 500. The platform works best when you work it.",
  },
  {
    tip: "The follow-up is where the magic happens",
    detail: "Research shows that the majority of reviews come from the second contact, not the first. Always have follow-ups enabled — customers often just need a gentle reminder.",
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
    detail: "Spending 5 minutes a week reviewing your stats tells you what's working and what isn't. Small adjustments — a different template, a different send time — can make a big difference to your results.",
  },
];

function VideoCard({ video }: { video: typeof VIDEOS[0] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {video.url ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={video.url}
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
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm">{video.title}</h3>
          <span className="text-xs text-muted-foreground shrink-0">{video.duration}</span>
        </div>
        <p className="text-sm text-muted-foreground">{video.description}</p>
      </div>
    </div>
  );
}

function HowToAccordion({ item }: { item: typeof HOWTOS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="font-medium text-sm">{item.title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-2.5">
          {item.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
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

export default function Tutorial() {
  const [activeTab, setActiveTab] = useState("videos");

  return (
    <div className="px-6 py-7 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tutorial & Help</h1>
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
            <VideoCard key={i} video={video} />
          ))}
        </div>
      )}

      {/* How-to's */}
      {activeTab === "howtos" && (
        <div className="space-y-3 max-w-2xl">
          {HOWTOS.map((item, i) => (
            <HowToAccordion key={i} item={item} />
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
