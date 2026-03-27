export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <img src="/logo.png" alt="ReviewOptic" className="h-16 mb-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: [DATE]</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-lg font-semibold mb-2">1. Who we are</h2>
            <p className="text-muted-foreground leading-relaxed">
              ReviewOptic is operated by [COMPANY NAME], registered at [REGISTERED ADDRESS], [COUNTRY].
              If you have any questions about this policy, contact us at [CONTACT EMAIL].
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. What data we collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following information:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Account data:</strong> your name, email address, and company name when you sign up</li>
              <li><strong className="text-foreground">Customer data:</strong> names, email addresses, and phone numbers of customers you add to the platform</li>
              <li><strong className="text-foreground">Review data:</strong> reviews and feedback submitted by your customers through the platform</li>
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
              <li><strong className="text-foreground">Resend</strong> — email delivery service</li>
              <li><strong className="text-foreground">Neon (PostgreSQL)</strong> — secure data storage</li>
              <li><strong className="text-foreground">Meta (Facebook/Instagram)</strong> — if you connect your social accounts</li>
              <li><strong className="text-foreground">LinkedIn</strong> — if you connect your LinkedIn account</li>
              <li><strong className="text-foreground">Stripe</strong> — for billing and subscription management</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              All third-party providers are required to handle your data securely and in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Your customers' data</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you add your customers to ReviewOptic, you are the data controller for their personal information.
              ReviewOptic acts as a data processor on your behalf. You are responsible for ensuring you have a
              lawful basis to contact your customers and that doing so complies with applicable marketing laws
              (including UK PECR and GDPR). We will only use your customers' data to provide the service to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Data retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active. If you delete your account,
              we will delete your personal data within [X] days, except where we are required to retain it
              for legal or financial reasons. You can request deletion at any time by contacting [CONTACT EMAIL].
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
              To exercise any of these rights, contact us at [CONTACT EMAIL]. You also have the right to
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
              <strong className="text-foreground">[CONTACT EMAIL]</strong><br />
              [COMPANY NAME]<br />
              [REGISTERED ADDRESS]
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
