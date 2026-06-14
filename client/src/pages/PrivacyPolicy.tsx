export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="mb-6 sm:mb-10">
          <img src="/logo.png" alt="ReviewOptic" className="h-16 sm:h-24 mb-4 sm:mb-6 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: 6 April 2026</p>
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
              <li><strong className="text-foreground">Voice and video recordings:</strong> voice notes and video attachments you upload when sending review requests</li>
              <li><strong className="text-foreground">AI chat messages:</strong> messages you send to the ReviewOptic AI assistant, stored to provide the service</li>
              <li><strong className="text-foreground">Billing data:</strong> subscription and payment history (payment card details are handled directly by Stripe and never stored by us)</li>
              <li><strong className="text-foreground">External review data:</strong> reviews and ratings imported from third-party platforms you connect (such as Google, Checkatrade, Trustpilot, TripAdvisor, and MyBuilder), stored so we can display them in your dashboard</li>
              <li><strong className="text-foreground">Connected account tokens:</strong> access tokens for any third-party accounts you connect (such as Google Business Profile or Facebook), stored securely and used only to fetch reviews or post on your behalf</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">We do not access or view your customers' data in the normal operation of the service. We may access data only where necessary to resolve a technical issue at your request, or where required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. How we use your data</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use your data to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Provide and operate the ReviewOptic service</li>
              <li>Send review request emails, SMS, and WhatsApp messages on your behalf to your customers — every message includes an unsubscribe link so your customers can opt out at any time</li>
              <li>Send you account-related emails (verification, password reset, billing, payment notifications, and subscription renewals)</li>
              <li>Notify you when a customer submits a star rating or private feedback</li>
              <li>Send you weekly or monthly performance reports and AI-generated insights about your reviews (you can opt out of these at any time from your Settings)</li>
              <li>Import and display reviews from external platforms you connect (Google, Checkatrade, Trustpilot, TripAdvisor, MyBuilder), refreshed automatically every 6 hours</li>
              <li>Generate shareable review card images and, if you enable it, automatically post them to your connected Facebook Page or Instagram account</li>
              <li>Send you occasional emails asking you to review ReviewOptic on Google, to help us grow our business — every such email includes an unsubscribe link so you can opt out at any time</li>
              <li>Improve and develop the platform</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
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
              <li><strong className="text-foreground">Resend</strong> — sends transactional and marketing emails on our behalf</li>
              <li><strong className="text-foreground">Stripe</strong> — processes payments and manages subscriptions. Card and billing data is handled directly by Stripe and never stored on our servers</li>
              <li><strong className="text-foreground">Neon (PostgreSQL)</strong> — stores all platform data securely</li>
              <li><strong className="text-foreground">Twilio</strong> — sends SMS and WhatsApp messages to your customers on your behalf</li>
              <li><strong className="text-foreground">Sentry</strong> — error monitoring to help us identify and fix technical issues</li>
              <li><strong className="text-foreground">OpenAI</strong> — powers AI features including template generation and the AI chat assistant</li>
              <li><strong className="text-foreground">ElevenLabs</strong> — powers voice cloning to personalise audio review requests</li>
              <li><strong className="text-foreground">Google</strong> — if you connect your Google Business Profile, we access your reviews via the Google Business Profile API. We also use the Google Places API to import publicly available reviews</li>
              <li><strong className="text-foreground">Meta (Facebook/Instagram)</strong> — if you connect your Facebook Page for auto-posting review cards or to import Facebook reviews</li>
              <li><strong className="text-foreground">Checkatrade, Trustpilot, TripAdvisor, MyBuilder</strong> — if you add links to these platforms, we fetch your publicly available reviews from them periodically</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              All third-party providers are GDPR-compliant. Where required, Data Processing Agreements are in place — either entered into directly by ReviewOptic as part of our service sign-up, or governed by each provider's standard DPA terms which form part of their service agreement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Your customers' data</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you add your customers to ReviewOptic, you are the data controller for their personal information.
              ReviewOptic acts as a data processor on your behalf. You are solely responsible for ensuring you have a
              lawful basis to contact your customers and that doing so complies with applicable marketing laws
              (including UK PECR and GDPR). We will only use your customers' data to provide the service to you.
              We do not access or view your customers' personal data in the normal operation of the service. We
              may access data only where necessary to resolve a technical issue at your request, or where required by law.
              We accept no liability for any regulatory action, fines, or claims arising from your failure to
              comply with applicable data protection or marketing laws when collecting or using your customers' data.
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
              We retain your account data for as long as your account exists. If you cancel your subscription,
              your account remains active in a read-only state and your data is retained. If you delete your account,
              we will delete your personal data within 30 days, except where we are required to retain it
              by law — for example, billing and financial records are retained for 7 years as required under
              UK law. You can cancel your subscription or delete your account at any time through your Billing settings.
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
              Account deletion can be done directly through your Billing settings. You can opt out of
              weekly/monthly insight emails from your Settings page. For all other rights requests,
              email us at hello@reviewoptic.com. We will respond to all valid requests within one month.
              We may need to verify your identity before processing your request. You also have the right
              to lodge a complaint with the UK Information Commissioner's Office (ICO) at ico.org.uk.
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
            <h2 className="text-lg font-semibold mb-2">11. Third-party links</h2>
            <p className="text-muted-foreground leading-relaxed">
              The ReviewOptic platform may contain links to third-party websites, portals, or services
              (such as Google, Facebook, or the Stripe billing portal). Clicking those links will take
              you away from our platform. We do not control those third-party services and are not
              responsible for their privacy practices. We encourage you to read the privacy policy of
              every third-party service you visit or use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">12. Business sale or transfer</h2>
            <p className="text-muted-foreground leading-relaxed">
              If ReviewOptic Limited is sold, merged, or transfers all or part of its business or assets
              to a third party, your personal data may be transferred to the new owner as part of that
              transaction. The new owner will be required to use your personal data in accordance with
              this privacy policy, or to notify you of any material changes before doing otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">13. Change of purpose</h2>
            <p className="text-muted-foreground leading-relaxed">
              We will only use your personal data for the purposes for which it was collected. If we
              reasonably need to use it for a different purpose, we will notify you and explain the
              legal basis that allows us to do so. We will not use your personal data for an unrelated
              purpose without notifying you first.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">14. International data transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Some of our third-party service providers are based outside the UK and European Economic Area,
              including in the United States (Neon, Resend, OpenAI, ElevenLabs, Sentry). Where your data
              is transferred outside the UK/EEA, we ensure appropriate safeguards are in place, including
              reliance on Standard Contractual Clauses or the UK International Data Transfer Agreement,
              or providers certified under equivalent data protection frameworks. By using ReviewOptic,
              you consent to these transfers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">15. Data breaches</h2>
            <p className="text-muted-foreground leading-relaxed">
              In the event of a personal data breach that is likely to result in a risk to your rights
              and freedoms, we will notify the UK Information Commissioner's Office (ICO) within 72 hours
              of becoming aware of the breach, as required by UK GDPR. Where the breach is likely to
              result in a high risk to you, we will also notify you directly without undue delay.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">16. Changes to this policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy from time to time. We will notify you of significant changes
              by email or by a notice in the app. Continued use of the service after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">17. Contact</h2>
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
