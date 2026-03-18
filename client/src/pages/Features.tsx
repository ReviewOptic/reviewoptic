import { Check } from "lucide-react";

const FEATURES = [
  {
    category: "Review Requests",
    items: [
      "Unlimited review requests via email, SMS & WhatsApp",
      "Request reviews by text message, video message or voice note",
      "Send to individual customers or in bulk",
      "Works with Google, Trustpilot, Facebook, Checkatrade, TripAdvisor, MyBuilder & more",
    ],
  },
  {
    category: "Automation",
    items: [
      "Automatic follow-up messages if a customer doesn't respond",
      "AI-generated personalised messages for every customer",
      "Custom message templates for every channel",
      "Set your own follow-up timing and limits",
    ],
  },
  {
    category: "Analytics & Reporting",
    items: [
      "Full analytics dashboard",
      "Track conversion rate, average star rating & best-performing channels",
      "Export reports as PDF or CSV",
      "Weekly AI insight email with personalised tips",
      "Requests by channel over time chart",
    ],
  },
  {
    category: "Customer Management",
    items: [
      "Manage your full customer list in one place",
      "Track request status per customer",
      "Private feedback capture — catch unhappy customers before they go public",
      "Activity log for every customer",
    ],
  },
  {
    category: "Marketing & Integrations",
    items: [
      "Embeddable review widget for your website",
      "Auto-post 4 & 5-star reviews to Facebook, Instagram, LinkedIn & X",
      "AI chat assistant for review management advice",
      "Custom branding with your logo",
    ],
  },
  {
    category: "Account",
    items: [
      "Multiple users per account",
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
