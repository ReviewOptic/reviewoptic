import { Check } from "lucide-react";

const FEATURES = [
  {
    category: "Review Requests",
    items: [
      "Review requests via email, SMS & WhatsApp",
      "Lite plan: up to 10 requests per month · Pro plan: unlimited",
      "Send to individual customers or in bulk",
      "Works with Google, Trustpilot, Facebook, Checkatrade, TripAdvisor, MyBuilder & more",
      "Choose which review platforms to send each customer",
      "Personalised messages using customer name and service type",
    ],
  },
  {
    category: "Voice & Video Messages",
    items: [
      "Record a personal voice note or video message from you",
      "Embed your recording directly into email review requests",
      "Customers hear or see you personally asking — dramatically increases response rates",
      "Record once, reuse across all your requests",
    ],
  },
  {
    category: "Templates & AI",
    items: [
      "Multiple named message templates per channel (email, SMS, WhatsApp)",
      "AI-generated personalised messages for every customer",
      "Generate templates instantly with AI — one click per channel",
      "Edit and customise any template before sending",
      "Use templates or generate with AI directly from the send dialog",
    ],
  },
  {
    category: "Analytics & Reporting",
    items: [
      "Full analytics dashboard",
      "Track conversion rate, response rate, and average star rating",
      "Best day to send, time to review, and follow-up effectiveness insights",
      "Template performance tracking",
      "Review platform breakdown",
      "Per-channel and per-team-member performance",
      "Filter by date range, channel, or team member",
      "Export reports as PDF or CSV",
    ],
  },
  {
    category: "Insight Emails",
    items: [
      "Automated insight emails with personalised performance tips",
      "Choose your frequency — weekly or monthly",
      "Opt out any time from Settings",
      "Highlights your best day to send, top channel, and response rate trends",
    ],
  },
  {
    category: "Customer Management",
    items: [
      "Manage your full customer list in one place",
      "Track request status per customer (pending, sent, clicked, reviewed)",
      "Private feedback capture — catch unhappy customers before they go public",
      "Activity log for every customer interaction",
      "Customer detail page with full history",
    ],
  },
  {
    category: "Marketing & Integrations",
    items: [
      "Embeddable review widget for your website",
      "Auto-post 4 & 5-star reviews to Facebook & LinkedIn",
      "AI chat assistant for review management advice",
      "Custom branding with your logo",
      "Logo position control (left, centre, right)",
    ],
  },
  {
    category: "Team & Account",
    items: [
      "Invite team members to your account",
      "Deactivate or reactivate team members any time",
      "Per-member analytics — see who's driving the most reviews",
      "Role-based access — members can't access billing or team settings",
      "No contracts — cancel anytime",
      "Email & password authentication with verification",
      "Secure billing via Stripe",
    ],
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <img src="/logo.png" alt="ReviewOptic" className="h-20 mx-auto mb-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Everything included in Standard</h1>
          <p className="text-gray-500 text-lg">One plan. Every feature. No hidden extras.</p>
        </div>

        <div className="space-y-8">
          {FEATURES.map(section => (
            <div key={section.category} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wide text-xs">{section.category}</h2>
              <ul className="space-y-3">
                {section.items.map(item => (
                  <li key={item} className="flex items-start gap-3 text-gray-700 text-sm">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          <a href="/pricing" className="text-blue-600 hover:underline">Back to pricing</a>
        </p>
      </div>
    </div>
  );
}
