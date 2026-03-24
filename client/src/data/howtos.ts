export type Step = { text: string; link?: string; linkText?: string };
export type HowTo = { title: string; steps: Step[] };

export const HOWTOS: HowTo[] = [
  {
    title: "How to update your business details and logo",
    steps: [
      { text: "Go to Settings.", link: "/settings", linkText: "Settings" },
      { text: "Under the Business tab, update your business name, your name, and any other details." },
      { text: "To upload a logo, click the upload area and select an image from your device. Your logo will appear in emails sent to customers." },
      { text: "Changes save automatically." },
    ],
  },
  {
    title: "How to connect your review platforms",
    steps: [
      { text: "Go to Settings and open the Review Platforms tab.", link: "/settings", linkText: "Settings" },
      { text: "Add links to your Google, Trustpilot, or other review profile pages." },
      { text: "When sending a review request, you'll be able to choose which platform(s) to include — one, several, or all of them." },
      { text: "Make sure you test your links are correct before sending to customers." },
    ],
  },
  {
    title: "How to customise your templates",
    steps: [
      { text: "Go to Templates.", link: "/templates", linkText: "Templates" },
      { text: "Click on any template to open the editor." },
      { text: "Edit the subject and body — use {{first_name}} and {{business_name}} to personalise automatically." },
      { text: "Click Save when you're happy. The next request you send will use your updated template." },
    ],
  },
  {
    title: "How to set up follow-ups",
    steps: [
      { text: "Go to Settings and open the Follow-up tab.", link: "/settings", linkText: "Settings" },
      { text: "Enable automatic follow-ups and choose your delay (e.g. 3 days after the first request)." },
      { text: "ReviewOptic will automatically send a second nudge to customers who rated 4–5 stars but haven't yet left a public review." },
      { text: "Customers who rated 1–3 stars are never sent a follow-up — they go into the private feedback track instead." },
      { text: "Most reviews come from the follow-up — don't skip this step." },
    ],
  },
  {
    title: "How to add a customer",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Click 'Add Customer' in the top right." },
      { text: "Fill in their name, and at least one of: email address or phone number. Both must be in a valid format." },
      { text: "Optionally add the service type and date of their last visit." },
      { text: "Click Save — they'll appear in your customer list, ready to receive a request." },
    ],
  },
  {
    title: "How to send a review request",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Find the customer you want to contact and click 'Send Request' next to their name." },
      { text: "Choose your channel — Email is available if the customer has an email address saved; SMS and WhatsApp are available if they have a phone number saved." },
      { text: "The customer will receive a message asking them to rate their experience (1–5 stars). This is the sentiment pre-screen." },
      { text: "If they rate 4–5 stars, they're shown your review platform links and invited to leave a public review." },
      { text: "If they rate 1–3 stars, they're shown a private feedback form instead — you'll see their feedback in your dashboard for you to respond and follow up with." },
      { text: "Hit Send — the request is delivered instantly and tracked automatically." },
    ],
  },
  {
    title: "Understanding customer statuses",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Pending Request — the customer has been added but no review request has been sent yet." },
      { text: "Request Sent — a review request has been sent and we are waiting for a response." },
      { text: "Clicked — the customer clicked the link and submitted their star rating." },
      { text: "No Response — the customer did not respond within the expected timeframe." },
    ],
  },
  {
    title: "How to handle private feedback",
    steps: [
      { text: "Go to your Dashboard.", link: "/", linkText: "Dashboard" },
      { text: "If a customer rated 1–3 stars, their private feedback appears in the 'Private Feedback' card — it is never shown publicly." },
      { text: "Click on the feedback to open it and add a note about how you resolved it." },
      { text: "Once responded, it moves out of the 'Needs Response' list. Use this to track and close the loop with unhappy customers." },
      { text: "You'll also receive an email notification whenever private feedback is submitted." },
    ],
  },
  {
    title: "How to read your analytics",
    steps: [
      { text: "Go to Analytics.", link: "/analytics", linkText: "Analytics" },
      { text: "Use the date range filter to choose the period you want to review." },
      { text: "Your average star rating is shown on the Dashboard — this is based on the ratings customers give through the sentiment pre-screen." },
      { text: "Check your click rate — if it's below 20%, focus on improving your templates or timing." },
      { text: "The 'Best Day to Send' chart shows when your customers are most likely to respond." },
    ],
  },
  {
    title: "How to mark a customer as Do Not Contact",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Click on the customer's name to open their profile." },
      { text: "Toggle the 'Do Not Contact' switch — this immediately stops any further review requests or follow-ups being sent to them." },
      { text: "The customer will remain in your list for your records but will never be contacted again through ReviewOptic." },
    ],
  },
  {
    title: "How to record a voice note or video message (optional)",
    steps: [
      { text: "Go to Templates and open the Recordings tab.", link: "/templates", linkText: "Templates" },
      { text: "Under Voice Note or Video Message, click 'Start recording'. Your browser will ask for microphone or camera permission — click Allow." },
      { text: "Record your message (15–30 seconds is ideal). Speak naturally — something like: 'Hi, it's [your name] from [business] — could you spare a minute to leave us a review?'" },
      { text: "When you're done, click Stop. You can play it back before saving. If you're not happy, record again." },
      { text: "Give it a label (e.g. 'Standard voice note') and click Save. You can save up to 2 recordings per type." },
      { text: "When sending a WhatsApp review request, select your recording from the dropdown — you'll see a preview before you send." },
    ],
  },
  {
    title: "How to archive and restore a customer",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Find the customer you want to archive and open their profile by clicking their name." },
      { text: "Click the Archive button. The customer will be hidden from your main customer list but their data is kept." },
      { text: "To view archived customers, use the filter or archive toggle on the Customers page." },
      { text: "To restore a customer, open their archived profile and click Restore — they'll return to your active customer list." },
    ],
  },
  {
    title: "How to invite a team member (optional)",
    steps: [
      { text: "Go to Settings and open the Team tab.", link: "/settings", linkText: "Settings" },
      { text: "Click 'Invite Team Member' and enter their email address." },
      { text: "They will receive an email invitation with a link to set up their account." },
      { text: "Once they accept, they will appear in your team list and can log in to ReviewOptic. They share your account but cannot change billing or account settings." },
    ],
  },
];
