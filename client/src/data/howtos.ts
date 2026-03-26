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
      { text: "Use the tabs at the top to switch between Email, SMS, and WhatsApp templates — each channel has its own set." },
      { text: "Each channel has fixed slots: After 4–5★ Rating (shown in the pop-up after a high rating), After 1–3★ Rating (shown after a low rating), and Follow-up 1, 2, and 3 (automatic reminders). Click Edit on any slot to customise it." },
      { text: "Use {{first_name}}, {{business_name}}, and {{service_type}} to personalise messages automatically for each customer." },
      { text: "For SMS follow-ups, keep your message body under 86 characters — a short rating link and 'Reply STOP' opt-out are added automatically after it." },
      { text: "SMS and WhatsApp messages include an opt-out automatically. If a customer replies STOP, they are set to Do Not Contact and no further messages are sent." },
      { text: "Click Test next to any template to send a preview to your own email or phone — so you can see exactly what your customer will receive before sending it for real." },
      { text: "Use Generate with AI to create a fresh variation of any template. For SMS, the AI keeps within the character limit automatically." },
      { text: "Click Save when you're happy. Your next send will use the updated template." },
    ],
  },
  {
    title: "How to set up follow-ups",
    steps: [
      { text: "Go to Settings and open the Follow-up tab.", link: "/settings", linkText: "Settings" },
      { text: "Enable automatic follow-ups and set your delays. All delays are measured from the original send date — so if Follow-up 1 is set to 3 days and Follow-up 2 to 7 days, they fire 3 and 7 days after the first request was sent." },
      { text: "Optionally set a Default send time (e.g. 10:00). When set, the send dialog will automatically pre-select that time so requests go out at your preferred hour every day." },
      { text: "Set Maximum Follow-Ups to 1, 2, or 3. Customers who haven't responded after the maximum are automatically marked as No Response." },
      { text: "For customers who rated 4–5 stars but haven't clicked a review platform link, follow-ups send a personalised message thanking them for their rating and asking them to share it publicly." },
      { text: "For customers who haven't rated at all, follow-ups send a standard reminder asking them to rate their experience." },
      { text: "Customers who rated 1–3 stars are never sent a follow-up — they go into the private feedback track instead." },
      { text: "If a customer replies STOP to an SMS or WhatsApp follow-up, they are automatically set to Do Not Contact and no further messages are sent." },
      { text: "You can track follow-up status in real time on the Customers page — look for the Follow-up 1 Sent, Follow-up 2 Sent, or Follow-up 3 Sent badges." },
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
      { text: "Find the customer you want to contact and click 'Send Request' (or 'Send New Request' for a repeat customer) from the menu next to their name." },
      { text: "Choose your channel — Email is available if the customer has an email address saved; SMS and WhatsApp are available if they have a phone number saved." },
      { text: "The customer receives a message with a link. When they tap it, they land on your branded rating page where they can select 1–5 stars and confirm their rating." },
      { text: "If they rate 4–5 stars, they're shown your review platform links and invited to leave a public review. You can optionally choose to also show them a voice note or video at this point — select 'Voice note' or 'Video' under 'After 4–5★ rating, show'. This works for Email, SMS, and WhatsApp." },
      { text: "If they rate 1–3 stars, they're shown a private feedback form instead — you'll see their feedback in your dashboard for you to respond and follow up with." },
      { text: "SMS messages automatically include a short opt-out at the end. If a customer replies STOP, they are set to Do Not Contact immediately." },
      { text: "To send to multiple customers at once, tick the checkboxes next to their names and click 'Send Requests' in the bar that appears at the bottom." },
      { text: "Hit Send — the request is delivered instantly and tracked automatically." },
    ],
  },
  {
    title: "Understanding customer statuses",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Each customer also shows their latest star rating (if they've rated) under their status badge — so you can see at a glance how they felt." },
      { text: "Pending Request — the customer has been added but no review request has been sent yet." },
      { text: "Request Sent — the initial review request has been sent and we're waiting for a response." },
      { text: "Follow-up 1 Sent / Follow-up 2 Sent / Follow-up 3 Sent — automatic follow-up reminders have been sent. Customers who rated 4–5★ but haven't clicked a platform link get a personalised reminder; unrated customers get a standard follow-up." },
      { text: "Clicked — the customer clicked a review platform link (e.g. Google, Trustpilot). This counts as a conversion." },
      { text: "No Response — the customer did not respond after all follow-ups were exhausted. This is set automatically." },
      { text: "Do Not Contact — no further messages will ever be sent to this customer. This is set manually, or automatically if the customer replies STOP to an SMS or WhatsApp message, or clicks Unsubscribe in an email." },
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
      { text: "The summary cards show: Requests Sent, Links Clicked, Click Rate, No Response count, Avg. Star Rating, Private Feedback, and Avg. Response Time." },
      { text: "The Customer Pipeline chart shows where customers currently sit in the follow-up sequence — how many are at each stage (Request Sent, Follow-up 1, 2, 3, Clicked, No Response)." },
      { text: "Follow-up Effectiveness shows click rates broken down by how many follow-ups a customer received (none, 1, 2, or 3). Use this to see if more follow-ups are actually converting." },
      { text: "Check your click rate — if it's below 20%, focus on improving your templates or timing." },
      { text: "The 'Where Reviews Are Going' chart shows which review platform links (Google, Facebook, etc.) customers actually clicked." },
      { text: "The 'Best Day to Send' chart shows which days of the week customers are most likely to click. Use it to time your sends better." },
      { text: "The 'Content Type Performance' chart shows platform click rates broken down by what you showed customers after their high rating — Text only, Voice note, or Video. Use it to see which content type converts best." },
      { text: "You can drag charts to reorder them, or hide charts you don't need using the Layout button." },
      { text: "Use the CSV or PDF export buttons to download your data for reporting or record-keeping." },
    ],
  },
  {
    title: "How to mark a customer as Do Not Contact",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Click on the customer's name to open their profile." },
      { text: "Toggle the 'Do Not Contact' switch — this immediately stops any further review requests or follow-ups being sent to them." },
      { text: "The customer will remain in your list for your records but will never be contacted again through ReviewOptic." },
      { text: "Do Not Contact is also set automatically if a customer replies STOP to an SMS or WhatsApp, or clicks Unsubscribe in an email." },
    ],
  },
  {
    title: "How to archive and restore a customer",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Find the customer you want to archive and open their profile by clicking their name." },
      { text: "Click the Archive button. The customer will be hidden from your main customer list but their data is kept." },
      { text: "To view archived customers, click the 'Archived' button in the top-right of the Customers page." },
      { text: "To restore a customer, open their archived profile and click Restore — they'll return to your active customer list." },
    ],
  },
  {
    title: "How to export your customer data",
    steps: [
      { text: "Go to the Customers page.", link: "/customers", linkText: "Customers page" },
      { text: "Use the search and status filters to narrow down the list if needed — the export includes whatever is currently visible." },
      { text: "Click the Export button (next to Import). A CSV file downloads to your device." },
      { text: "The file includes: Name, Email, Phone, Channel, Status, Star Rating, Date Sent, and Date Clicked — one row per customer." },
      { text: "Use this for reporting, record-keeping, or sharing data with your team." },
    ],
  },
  {
    title: "How to set up your website widget",
    steps: [
      { text: "Go to Settings and open the Widget tab.", link: "/settings", linkText: "Settings" },
      { text: "Configure your widget: choose the minimum star rating to display (4 stars and above, or 5 stars only), how many ratings to show (3–10), and the layout (grid or carousel)." },
      { text: "Copy the embed code and paste it anywhere in your website's HTML — for example, on your homepage or a testimonials page." },
      { text: "Change data-theme to 'dark' if your website has a dark background." },
      { text: "The widget shows rating cards with customer name (first name and last initial), star rating, and date. It pulls live data from your account, so it updates automatically as new ratings come in." },
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
