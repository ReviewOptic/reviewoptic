export type Step = { text: string; link?: string };
export type HowTo = { title: string; steps: Step[] };

export const HOWTOS: HowTo[] = [
  {
    title: "How to add a customer",
    steps: [
      { text: "Go to the Customers page from the sidebar.", link: "/customers" },
      { text: "Click 'Add Customer' in the top right." },
      { text: "Fill in their name, email or phone number, and the date of their last visit." },
      { text: "Click Save — they'll appear in your customer list, ready to receive a request." },
    ],
  },
  {
    title: "How to send a review request",
    steps: [
      { text: "Go to the Customers page from the sidebar.", link: "/customers" },
      { text: "Find the customer you want to contact and click 'Send Request' next to their name." },
      { text: "Choose your channel (Email, SMS, or WhatsApp) and select a template." },
      { text: "Hit Send — the request is delivered instantly and tracked automatically." },
    ],
  },
  {
    title: "How to set up follow-ups",
    steps: [
      { text: "Go to Settings and open the Follow-up tab.", link: "/settings" },
      { text: "Enable automatic follow-ups and choose your delay (e.g. 3 days after the first request)." },
      { text: "ReviewOptic will automatically send a second nudge to customers who haven't responded." },
      { text: "Most reviews come from the follow-up — don't skip this step." },
    ],
  },
  {
    title: "How to customise your templates",
    steps: [
      { text: "Go to Templates in the sidebar.", link: "/templates" },
      { text: "Click on any template to open the editor." },
      { text: "Edit the subject and body — use {{first_name}} and {{business_name}} to personalise automatically." },
      { text: "Click Save when you're happy. The next request you send will use your updated template." },
    ],
  },
  {
    title: "How to connect your review platforms",
    steps: [
      { text: "Go to Settings and open the Review Platforms tab.", link: "/settings" },
      { text: "Add links to your Google, Trustpilot, or other review profile pages." },
      { text: "These links are embedded automatically in every review request you send." },
      { text: "Make sure you test your links are correct before sending to customers." },
    ],
  },
  {
    title: "How to read your analytics",
    steps: [
      { text: "Go to Analytics in the sidebar.", link: "/analytics" },
      { text: "Use the date range filter to choose the period you want to review." },
      { text: "Check your response rate — if it's below 20%, focus on improving your templates or timing." },
      { text: "The 'Best Day to Send' chart shows when your customers are most likely to respond." },
    ],
  },
  {
    title: "How to mark a customer as Do Not Contact",
    steps: [
      { text: "Go to the Customers page from the sidebar.", link: "/customers" },
      { text: "Click on the customer's name to open their profile." },
      { text: "Toggle the 'Do Not Contact' switch — this immediately stops any further review requests or follow-ups being sent to them." },
      { text: "The customer will remain in your list for your records but will never be contacted again through ReviewOptic." },
    ],
  },
  {
    title: "How to update your business details and logo",
    steps: [
      { text: "Go to Settings in the sidebar.", link: "/settings" },
      { text: "Under the General tab, update your business name, email address, and any other details." },
      { text: "To upload a logo, click the upload area and select an image from your device. Your logo will appear in emails sent to customers." },
      { text: "Click Save when done. Changes take effect immediately." },
    ],
  },
  {
    title: "How to invite a team member",
    steps: [
      { text: "Go to Settings and open the Team tab.", link: "/settings" },
      { text: "Click 'Invite Team Member' and enter their email address." },
      { text: "They will receive an email invitation with a link to set up their account." },
      { text: "Once they accept, they will appear in your team list and can log in to ReviewOptic. They share your account but cannot change billing or account settings." },
    ],
  },
  {
    title: "Understanding customer statuses",
    steps: [
      { text: "Go to the Customers page from the sidebar.", link: "/customers" },
      { text: "Pending Request — the customer has been added but no review request has been sent yet." },
      { text: "Request Sent — a review request has been sent and we are waiting for a response." },
      { text: "Link Clicked — the customer clicked the review link in your message. They may have left a review." },
      { text: "Review Received — a review has been recorded for this customer." },
    ],
  },
  {
    title: "How to reset your password",
    steps: [
      { text: "Go to the ReviewOptic login page and click 'Forgot password?' below the sign-in form.", link: "/login" },
      { text: "Enter your email address and click Send. You will receive a password reset link by email." },
      { text: "Click the link in the email and enter your new password. It must be at least 8 characters." },
      { text: "Once reset, you will be taken back to the login page. Sign in with your new password." },
    ],
  },
];
