export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: 3 April 2026</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-lg font-semibold mb-2">1. Who we are</h2>
            <p className="text-muted-foreground leading-relaxed">
              ReviewOptic is operated by ReviewOptic Limited (company number 17134444), registered in England and Wales.
              If you have any questions about this policy, contact us at hello@reviewoptic.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. What data we collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following information:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Account data:</strong> your name, email address, and company name when you sign up</li>
              <li><strong className="text-foreground">Customer data:</strong> names, email addresses, and phone numbers of customers you add to the platform</li>
              <li><strong className="text-foreground">Review data:</strong> star ratings submitted by your customers through the platform</li>
              <li><strong className="text-foreground">Private feedback:</strong> written feedback submitted by customers who give a low rating (1–3 stars), which is shared only with the business that sent the review request</li>
              <li><strong className="text-foreground">Usage data:</strong> how you interact with the app (e.g. pages visited, features used)</li>
              <li><strong className="text-foreground">Communication data:</strong> emails and messages sent through the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. How we use your data</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use your data to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Provide and operate the ReviewOptic service</li>
              <li>Send review request emails and SMS messages on your behalf to your customers</li>
              <li>Send you account-related emails (verification, password reset, billing)</li>
              <li>Improve and develop the platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Legal basis for processing (UK/EU users)</h2>
            <p className="text-muted-foreground leading-relaxed">
              We process your personal data on the following legal bases under UK GDPR:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-3">
              <li><strong className="text-foreground">Contract:</strong> processing necessary to provide the service you signed up for</li>
              <li><strong className="text-foreground">Legitimate interests:</strong> improving our service and preventing fraud</li>
              <li><strong className="text-foreground">Legal obligation:</strong> where required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Who we share data with</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell your data. We share it only with trusted third-party services required to operate the platform:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Resend</strong> — used to send transactional and marketing emails on our behalf. Your email address is shared with Resend solely for this purpose. Resend is GDPR-compliant and we have a Data Processing Agreement in place with Resend.</li>
              <li><strong className="text-foreground">Stripe</strong> — used to process payments and manage subscriptions. Card and billing data is handled directly by Stripe and is never stored on our servers. Stripe is GDPR-compliant and we have a Data Processing Agreement in place with Stripe.</li>
              <li><strong className="text-foreground">Neon (PostgreSQL)</strong> — used to store all platform data securely. Neon is GDPR-compliant and we have a Data Processing Agreement in place with Neon.</li>
              <li><strong className="text-foreground">Twilio</strong> — used to send SMS and WhatsApp messages on your behalf to your customers. Customer phone numbers are shared with Twilio solely for this purpose. Twilio is GDPR-compliant and we have a Data Processing Agreement in place with Twilio.</li>
              <li><strong className="text-foreground">Sentry</strong> — used for error monitoring to help us identify and fix technical issues. Error data may include technical information such as IP addresses. Sentry is GDPR-compliant and we have a Data Processing Agreement in place with Sentry.</li>
              <li><strong className="text-foreground">Meta (Facebook)</strong> — if you connect your Facebook Page for auto-posting</li>
              <li><strong className="text-foreground">LinkedIn</strong> — if you connect your LinkedIn account</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              All third-party providers are required to handle your data securely and in accordance with applicable data protection law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Your customers' data</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you add your customers to ReviewOptic, you are the data controller for their personal information.
              ReviewOptic acts as a data processor on your behalf. You are responsible for ensuring you have a
              lawful basis to contact your customers and that doing so complies with applicable marketing laws
              (including UK PECR and GDPR). We will only use your customers' data to provide the service to you.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Where a customer submits private feedback via the star rating pre-screen, that feedback is stored
              securely and shared only with the business that sent the review request. Customers are informed
              on the feedback form that this does not affect their right to leave a public review.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Data retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active. If you delete your account,
              we will delete your personal data within 30 days, except where we are required to retain it
              for legal or financial reasons. You can delete your account at any time through your Billing settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take reasonable technical and organisational measures to protect your data, including encrypted
              passwords and secure HTTPS connections. No system is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Your rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under UK/EU GDPR, you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict how we process your data</li>
              <li>Request a copy of your data in a portable format</li>
              <li>Withdraw consent at any time (where processing is based on consent)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Account deletion can be done directly through your Billing settings. For all other rights requests, email us at hello@reviewoptic.com. You also have the right to
              lodge a complaint with the UK Information Commissioner's Office (ICO) at ico.org.uk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use a session cookie to keep you logged in. This cookie is strictly necessary for the
              service to function and does not track you across other websites. We do not use advertising
              or analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Changes to this policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy from time to time. We will notify you of significant changes
              by email or by a notice in the app. Continued use of the service after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any privacy-related questions or requests, contact us at:<br />
              <strong className="text-foreground">ReviewOptic Limited</strong><br />
              Company number: 17134444<br />
              hello@reviewoptic.com
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
