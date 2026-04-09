import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";

const FAQS = [
  {
    category: "Getting started",
    items: [
      {
        q: "What is ReviewOptic?",
        a: "ReviewOptic is a review management platform for local service businesses. You send review requests to customers via email, SMS, or WhatsApp, and ReviewOptic follows up on autopilot if they don't respond — helping you grow your reputation on Google, Trustpilot, Facebook, and more.",
      },
      {
        q: "How does the free trial work?",
        a: "Every new account gets a 30-day free trial with full access to all features on your chosen plan. You'll need to enter a payment method when you choose your plan, but you won't be charged anything until the 30 days are up. Cancel any time before then and you pay nothing. You'll receive a reminder email a few days before your trial ends so you're never caught off guard.",
      },
      {
        q: "Do I need a credit card to sign up?",
        a: "You don't need a card to create your account. You will need to enter payment details when you select your plan — but your card won't be charged until the 30-day trial ends.",
      },
      {
        q: "How do I get started?",
        a: "Create your account, choose a plan (Standard or Pro), then follow the setup checklist on your dashboard: add your business details, connect a review platform, add your first customer, and send your first request. ReviewOptic handles the follow-ups automatically from there.",
      },
    ],
  },
  {
    category: "Plans and pricing",
    items: [
      {
        q: "What's the difference between Standard and Pro?",
        a: "Standard allows up to 10 review requests per month and is a single-user account. Pro gives you unlimited review requests and includes team member access — you can invite your team to log in and send requests. All other features (templates, analytics, follow-ups, AI tools, website widget, QR code, Zapier integration) are included on both plans.",
      },
      {
        q: "Do follow-ups count toward my monthly limit on the Standard plan?",
        a: "No. Only the initial review request counts toward your 10 per month. Automatic follow-ups (up to 3 per customer) are sent on top of that at no extra cost.",
      },
      {
        q: "When does my monthly allowance reset on the Standard plan?",
        a: "Your allowance resets at the beginning of each billing cycle — on the same date each month as when you first subscribed.",
      },
      {
        q: "Can I switch between Standard and Pro?",
        a: "Yes, at any time from the Billing tab in your account settings. Upgrading or downgrading takes effect immediately via a new subscription at the current price.",
      },
      {
        q: "Can I switch from monthly to annual billing?",
        a: "Yes. You can switch to annual billing from the Billing tab. Paying annually gives you the equivalent of 1 month free — £319/year for Standard (vs £348 monthly) and £429/year for Pro (vs £468 monthly).",
      },
      {
        q: "Will my price ever go up?",
        a: "Not while you stay subscribed. We guarantee that your price will never increase as long as your subscription remains active. If we increase prices for new customers, your rate stays the same. This applies to the plan and billing period you're currently on. If you cancel and re-subscribe at a later date, the price current at that time will apply.",
      },
    ],
  },
  {
    category: "Sending review requests",
    items: [
      {
        q: "Which review platforms does ReviewOptic work with?",
        a: "Google, Trustpilot, Facebook, Checkatrade, TripAdvisor, MyBuilder, and more. You choose which platforms to include for each customer — or set a default.",
      },
      {
        q: "Which channels can I use to send requests?",
        a: "Email, SMS, and WhatsApp. You can set a preferred channel per customer or choose at send time.",
      },
      {
        q: "Can I schedule a review request to send on a future date?",
        a: "Yes. When adding a customer, toggle on 'Schedule review request' and pick the date you want it to go out — for example, the day after a job is completed. The request fires automatically on that date. This also works via Zapier so requests can be scheduled based on your booking system's job completion date.",
      },
      {
        q: "How do automatic follow-ups work?",
        a: "ReviewOptic runs two follow-up tracks depending on what the customer has done. If a customer hasn't rated at all, they receive up to 3 short, friendly nudges encouraging them to click a star. Once they've given a 4 or 5 star rating, follow-ups switch to your personalised Follow-up 1, 2, and 3 templates — reminding them to share their rating on a public review platform. Customers who rated 1–3 stars are never followed up automatically; their feedback goes privately to your dashboard instead. You control the timing and can turn follow-ups off entirely in Settings.",
      },
      {
        q: "How does service recovery work?",
        a: "When a customer clicks your review link, they first select a star rating. If they're happy (4 or 5 stars), they're shown your review platform links to share their experience publicly. If they're unhappy (1–3 stars), instead of sending them straight to Google to vent, they're shown a private feedback form — giving you the chance to understand what went wrong and make it right before it becomes a public complaint. The form makes clear this doesn't affect their right to leave a public review if they choose to.",
      },
      {
        q: "Can I send to multiple customers at once?",
        a: "Yes. Use the bulk send feature on the Customers page — select multiple customers and send in one go.",
      },
      {
        q: "Can I import my existing customer list?",
        a: "Yes. You can import customers via CSV from the Customers page. You can also connect ReviewOptic to your booking system via Zapier so new customers are added automatically — no manual importing needed. You can export your customer list at any time.",
      },
    ],
  },
  {
    category: "Features",
    items: [
      {
        q: "What analytics does ReviewOptic provide?",
        a: "The analytics dashboard shows requests sent, click rate, average star rating, best day to send, follow-up effectiveness, platform breakdown, per-channel performance, and more. You can export reports as PDF or CSV and filter by date range.",
      },
      {
        q: "What is private feedback?",
        a: "Private feedback is how ReviewOptic helps you recover unhappy customers before they leave a negative public review. When someone rates 1–3 stars, they're directed to a private form where they can tell you what went wrong. That feedback comes straight to your dashboard so you can reach out, apologise, and put things right. Many businesses find this turns a frustrated customer into a loyal one — and avoids a damaging public review in the process.",
      },
      {
        q: "What is the website review widget?",
        a: "A small snippet of code you can add to your website to display your recent reviews automatically. You control the minimum star rating shown, the number of reviews, and the layout (grid or carousel).",
      },
      {
        q: "What is the QR code and how do I use it?",
        a: "Every account has a unique QR code you can download from Settings → Integrations. Print it on receipts, business cards, or display it on a tablet at your premises. When a customer scans it, they're taken straight to your star-rating page — no name or contact details required. High ratings show your review platform buttons; low ratings show your private feedback form. It's ideal for walk-in or point-of-sale situations.",
      },
      {
        q: "Can I connect my booking system to automatically add customers?",
        a: "Yes, via Zapier. Go to Settings → Integrations to get your unique webhook URL, then create a Zap in Zapier connecting your booking app (Acuity, Calendly, Jobber, and many more) to ReviewOptic. Map your customer fields and optionally set a scheduled send date based on job completion. Once set up, every new booking is automatically added to ReviewOptic.",
      },
      {
        q: "Can I add team members to my account?",
        a: "Yes, on the Pro plan. You can invite team members from Settings → Team. They can send review requests and view customers but cannot access billing or account settings. Team members are not available on the Standard plan.",
      },
      {
        q: "What is the AI chat assistant?",
        a: "An in-app AI assistant that can answer questions about review management, help you craft messages, or give advice on improving your review performance.",
      },
    ],
  },
  {
    category: "Account and billing",
    items: [
      {
        q: "Can I cancel anytime?",
        a: "Yes. Cancel from the Billing tab in your account settings at any time — no contracts, no notice period. You'll keep full access until the end of your current billing period (or until your trial ends, if you're still in the trial). You won't be charged again after cancelling.",
      },
      {
        q: "If I cancel during my free trial, will I be charged?",
        a: "No. If you cancel before your 30-day trial ends, your subscription ends immediately and you will not be charged anything. You'll receive a confirmation email as soon as you cancel.",
      },
      {
        q: "What happens when my subscription ends?",
        a: "You'll receive a confirmation email on the day your subscription ends confirming that billing has stopped. Your account data is retained for 30 days after that. After 30 days it is permanently deleted. We recommend exporting your customer list (CSV) before your access ends if you want to keep a copy.",
      },
      {
        q: "What happens to my data if I cancel?",
        a: "Your account data is retained for 30 days after your access ends. After that it is permanently deleted. We recommend exporting your customer list (CSV) before cancelling if you want to keep a copy.",
      },
      {
        q: "Is my data secure?",
        a: "Yes. All data is stored securely, payments are processed by Stripe (a PCI-compliant payment provider), and we never sell your data to third parties. See our Privacy Policy for full details.",
      },
      {
        q: "How do I get support?",
        a: "Email us at hello@reviewoptic.com and we'll get back to you as soon as possible.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-medium text-gray-900">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
      </button>
      {open && (
        <p className="text-sm text-gray-600 leading-relaxed pb-4">{a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  usePageMeta(
    "FAQ — Common Questions About ReviewOptic",
    "Answers to common questions about ReviewOptic's review request software — pricing, setup, supported platforms, and how it works.",
    "/faq"
  );
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/pricing")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to pricing
        </button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Frequently asked questions</h1>
          <p className="text-gray-500">Can't find what you're looking for? Email us at{" "}
            <a href="mailto:hello@reviewoptic.com" className="text-blue-600 hover:underline">hello@reviewoptic.com</a>
          </p>
        </div>

        <div className="space-y-8">
          {FAQS.map(section => (
            <div key={section.category}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                {section.category}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 px-5">
                {section.items.map(item => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-600 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Ready to start collecting more reviews?</h2>
          <p className="text-blue-100 text-sm mb-6">Join businesses already growing their reputation with ReviewOptic. Start your 30-day free trial today.</p>
          <button
            onClick={() => navigate("/register")}
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm"
          >
            Start your free trial
          </button>
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Still have questions?{" "}
          <a href="mailto:hello@reviewoptic.com" className="text-blue-600 hover:underline">Get in touch</a>
        </p>
      </div>
    </div>
  );
}
