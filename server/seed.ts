import { storage } from "./storage";
import { randomUUID } from "crypto";

export async function seedDatabase() {
  const existing = await storage.getCustomers();
  if (existing.length > 0) return;

  console.log("[seed] Seeding database...");

  // Settings
  await storage.upsertSettings({
    businessName: "Clean Pro Services",
    businessEmail: "sarah@cleanproservices.com",
    googleReviewLink: "https://g.page/r/sample-review-link",
    facebookReviewLink: "https://www.facebook.com/cleanproservices/reviews",
    defaultChannel: "email",
    followUpEnabled: true,
    followUp1Days: 3,
    followUp2Days: 7,
    maxFollowUps: 2,
    widgetMinStars: 4,
    widgetCount: 5,
    widgetLayout: "grid",
  });

  // Templates
  const templates = [
    {
      name: "Initial Request (Email)",
      templateType: "initial_request",
      channel: "email",
      subject: "How did we do, {{customer_name}}? 🌟",
      body: `Hi {{customer_name}},

Thank you so much for choosing {{business_name}} for your {{service_type}}. It was a pleasure serving you!

We'd love to hear how your experience was. Would you take 30 seconds to share your thoughts?

{{review_link}}

Your feedback helps us improve and helps other customers find great service.

Warm regards,
The {{business_name}} Team`,
      isDefault: true,
    },
    {
      name: "Initial Request (SMS)",
      templateType: "initial_request",
      channel: "sms",
      subject: "",
      body: `Hi {{customer_name}}! Thanks for choosing {{business_name}}. How was your {{service_type}}? Leave a quick review: {{review_link}}`,
      isDefault: true,
    },
    {
      name: "Initial Request (WhatsApp)",
      templateType: "initial_request",
      channel: "whatsapp",
      subject: "",
      body: `Hi {{customer_name}} 👋 Thanks for choosing {{business_name}}! We hope you loved your {{service_type}}. Would you mind sharing your experience? It only takes 30 seconds and means a lot to us: {{review_link}}`,
      isDefault: true,
    },
    {
      name: "Follow-Up 1",
      templateType: "follow_up_1",
      channel: "email",
      subject: "Did we miss your feedback, {{customer_name}}?",
      body: `Hi {{customer_name}},

We recently completed your {{service_type}} and would still love to hear how we did!

If you have a moment, we'd really appreciate a quick review:

{{review_link}}

It only takes 30 seconds and helps us keep improving.

Thanks so much,
{{business_name}}`,
      isDefault: true,
    },
    {
      name: "Follow-Up 2",
      templateType: "follow_up_2",
      channel: "email",
      subject: "Last chance to share your feedback",
      body: `Hi {{customer_name}},

This is our last message — we promise! We'd still love to hear about your experience with {{business_name}}.

If you're happy with our service, a quick review would mean the world to us:

{{review_link}}

Thank you for your time,
The {{business_name}} Team`,
      isDefault: true,
    },
    {
      name: "Follow-Up 1 (SMS)",
      templateType: "follow_up_1",
      channel: "sms",
      subject: "",
      body: `Hi {{customer_name}}, just a friendly reminder from {{business_name}} — we'd love your review! {{review_link}}`,
      isDefault: true,
    },
  ];

  for (const t of templates) {
    await storage.createTemplate({ id: randomUUID(), ...t });
  }

  // Sample customers
  const customerData = [
    { name: "Maria Rodriguez", email: "maria.r@gmail.com", phone: "+1 555 234 5678", serviceType: "House Cleaning", serviceDate: "2026-03-08", notes: "Weekly cleaning, 3-bedroom home", status: "review_completed", channel: "email" },
    { name: "James Thompson", email: "james.t@outlook.com", phone: "+1 555 876 5432", serviceType: "Deep Clean", serviceDate: "2026-03-09", notes: "Move-out cleaning, very satisfied", status: "request_sent", channel: "email" },
    { name: "Aisha Patel", email: "aisha.p@yahoo.com", phone: "+1 555 345 6789", serviceType: "Office Cleaning", serviceDate: "2026-03-07", notes: "Monthly office clean, 10 desks", status: "clicked", channel: "sms" },
    { name: "Michael Chen", email: "mchen@icloud.com", phone: "+1 555 456 7890", serviceType: "Post-Renovation Clean", serviceDate: "2026-03-05", notes: "Dust and debris cleanup after kitchen reno", status: "no_response", channel: "email" },
    { name: "Sophie Williams", email: "sophie.w@gmail.com", phone: "+1 555 567 8901", serviceType: "House Cleaning", serviceDate: "2026-03-10", notes: "New customer — referred by Maria", status: "pending_request", channel: "whatsapp" },
    { name: "David Park", email: "dpark@hotmail.com", phone: "+1 555 678 9012", serviceType: "Carpet Cleaning", serviceDate: "2026-03-03", notes: "4 rooms, pet stains", status: "review_completed", channel: "sms" },
    { name: "Olivia Brown", email: "olivia.b@gmail.com", phone: "+1 555 789 0123", serviceType: "Window Cleaning", serviceDate: "2026-03-01", notes: "2-story home, 20 windows", status: "no_response", channel: "email" },
    { name: "Carlos Mendez", email: "cmendez@email.com", phone: "+1 555 890 1234", serviceType: "House Cleaning", serviceDate: "2026-02-28", notes: "", status: "request_sent", channel: "sms" },
  ];

  const createdCustomers: any[] = [];
  const dates: Date[] = [
    new Date("2026-03-10"), new Date("2026-03-09"), new Date("2026-03-09"),
    new Date("2026-03-07"), new Date("2026-03-10"), new Date("2026-03-05"),
    new Date("2026-03-02"), new Date("2026-02-28"),
  ];

  for (let i = 0; i < customerData.length; i++) {
    const c = await storage.createCustomer({ id: randomUUID(), ...customerData[i], doNotContact: false });
    createdCustomers.push({ ...c, createdAt: dates[i] });
  }

  // Reviews for completed customers
  const reviewsData = [
    {
      customer: createdCustomers[0],
      stars: 5,
      platform: "google",
      text: "Absolutely amazing service! Maria and her team left my home spotless. The attention to detail was incredible — they even cleaned behind the appliances. Will definitely book again!",
    },
    {
      customer: createdCustomers[5],
      stars: 5,
      platform: "google",
      text: "Our carpets look brand new. I was skeptical about the pet stain removal but they got everything out. Highly recommend Clean Pro Services!",
    },
  ];

  for (const r of reviewsData) {
    await storage.createReview({
      id: randomUUID(),
      customerId: r.customer.id,
      stars: r.stars,
      platform: r.platform,
      reviewText: r.text,
    });
  }

  // Private feedback for no-response customers
  await storage.createPrivateFeedback({
    id: randomUUID(),
    customerId: createdCustomers[3].id,
    stars: 2,
    message: "The cleaning was okay but the team left water marks on my new kitchen tiles. I expected better given the price.",
    responded: false,
  });

  // Activity log
  const activities = [
    { type: "review_received", customerId: createdCustomers[0].id, customerName: createdCustomers[0].name, message: `${createdCustomers[0].name} left a 5-star review on Google`, metadata: JSON.stringify({ stars: 5, platform: "google" }) },
    { type: "request_sent", customerId: createdCustomers[1].id, customerName: createdCustomers[1].name, message: `Review request sent to ${createdCustomers[1].name} via email`, metadata: "{}" },
    { type: "link_clicked", customerId: createdCustomers[2].id, customerName: createdCustomers[2].name, message: `${createdCustomers[2].name} clicked the review link`, metadata: "{}" },
    { type: "private_feedback", customerId: createdCustomers[3].id, customerName: createdCustomers[3].name, message: `${createdCustomers[3].name} left private feedback (2 stars)`, metadata: JSON.stringify({ stars: 2 }) },
    { type: "customer_added", customerId: createdCustomers[4].id, customerName: createdCustomers[4].name, message: `${createdCustomers[4].name} added as a customer`, metadata: "{}" },
    { type: "review_received", customerId: createdCustomers[5].id, customerName: createdCustomers[5].name, message: `${createdCustomers[5].name} left a 5-star review on Google`, metadata: JSON.stringify({ stars: 5, platform: "google" }) },
    { type: "request_sent", customerId: createdCustomers[7].id, customerName: createdCustomers[7].name, message: `Review request sent to ${createdCustomers[7].name} via sms`, metadata: "{}" },
  ];

  for (const a of activities) {
    await storage.createActivity({ id: randomUUID(), ...a });
  }

  // Review requests for sent/clicked statuses
  for (let i = 0; i < createdCustomers.length; i++) {
    const c = createdCustomers[i];
    if (["request_sent", "clicked", "no_response", "review_completed"].includes(c.status)) {
      const sentAt = new Date(dates[i].getTime() + 2 * 60 * 60 * 1000);
      const clickedAt = c.status === "clicked" || c.status === "review_completed"
        ? new Date(sentAt.getTime() + 4 * 60 * 60 * 1000)
        : undefined;
      await storage.createReviewRequest({
        id: randomUUID(),
        customerId: c.id,
        status: c.status === "review_completed" ? "completed" : c.status === "clicked" ? "clicked" : "sent",
        channel: c.channel,
        scheduledAt: sentAt,
        sentAt,
        clickedAt,
        followUpCount: c.status === "no_response" ? 1 : 0,
      });
    }
  }

  console.log("[seed] Database seeded successfully!");
}
