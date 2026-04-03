export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <img src="/logo.png" alt="ReviewOptic" className="h-28 mb-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <h1 className="text-3xl font-bold tracking-tight mb-2">Terms and Conditions</h1>
          <p className="text-muted-foreground text-sm">Last updated: 3 April 2026</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-lg font-semibold mb-2">1. About these terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms and Conditions ("Terms") govern your use of ReviewOptic, a software-as-a-service
              platform operated by ReviewOptic Limited, registered in England and Wales under company number
              17134444, with its registered office at hello@reviewoptic.com ("we", "us", "our").
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              By creating an account or using ReviewOptic, you agree to these Terms in full. If you do not
              agree, you must not use the service. These Terms are governed by the laws of England and Wales,
              and any disputes will be subject to the exclusive jurisdiction of the English courts. Users may
              access the platform from any country, but do so at their own risk and must comply with their
              local laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. The service</h2>
            <p className="text-muted-foreground leading-relaxed">
              ReviewOptic provides tools that allow businesses ("you", "the user") to send review requests
              and follow-up messages to their customers, collect feedback, and manage their online reputation.
              We reserve the right to modify, suspend, or discontinue any part of the service at any time
              with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Account registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate and complete information when creating an account. You are responsible
              for maintaining the confidentiality of your login credentials and for all activity that occurs
              under your account. You must notify us immediately at hello@reviewoptic.com if you suspect any
              unauthorised access to your account. You must be at least 18 years old to use this service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Subscription and billing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              ReviewOptic is offered on a paid subscription basis. By subscribing, you authorise us to
              charge your payment method automatically at the start of each billing period (monthly or
              annual, as selected at sign-up).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Monthly billing:</strong> charged every 30 days from the date your trial ends</li>
              <li><strong className="text-foreground">Annual billing:</strong> charged once per year from the date your trial ends, at a discounted rate</li>
              <li>Subscription fees are non-refundable except where required by law or as stated in our refund policy below</li>
              <li>If a payment fails, we will notify you and may suspend access to the service until payment is resolved</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Price guarantee</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We believe in rewarding loyalty. As long as your subscription remains active and uninterrupted,
              the price you pay will never increase — even if we raise prices for new customers.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Your locked-in price applies to the plan and billing period you are currently on</li>
              <li>Switching to a different plan (e.g. from Standard to Pro, or from monthly to annual) will apply the price current at the time of switching</li>
              <li>If you cancel your subscription and later re-subscribe, the price current at the time of re-subscribing will apply</li>
              <li>This guarantee does not apply where pricing changes are required by law (e.g. changes in VAT rates)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Free trial</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              New accounts are offered a 14-day free trial. During the trial you have full access to all
              features included in your chosen plan. A valid payment method is required to start your trial.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Only one free trial is permitted per person or business</li>
              <li>At the end of the 14-day trial, your payment method will be charged automatically for your chosen plan (monthly or annual) unless you cancel before the trial ends</li>
              <li>You may cancel at any time during the trial and will not be charged</li>
              <li>We reserve the right to modify or withdraw the free trial offer at any time for new sign-ups</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Cancellation and account deletion</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You may cancel your subscription at any time through your Billing settings or by contacting
              us at hello@reviewoptic.com. Upon cancellation, you will retain full access to the service
              until the end of your current billing period. After that, you can still log in and view your
              account, but you will not be able to send new review requests.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you wish to permanently delete your account, you may do so from your Billing settings.
              You will be asked to confirm twice before deletion is scheduled. Once confirmed, your account
              and all associated data — including customers, review requests, templates, analytics, and
              recordings — will be permanently deleted after 30 days. This action cannot be undone.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for exporting any data you wish to keep before requesting deletion.
              We do not provide refunds for unused portions of a billing period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              Subscription fees are generally non-refundable. If you believe you have been charged in
              error, contact us at hello@reviewoptic.com within 14 days of the charge and we will review
              your case. Nothing in these Terms affects your statutory rights under UK consumer law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Acceptable use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree to use ReviewOptic only for lawful purposes and in accordance with these Terms.
              You must not use the service to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Send unsolicited bulk messages (spam) to any person</li>
              <li>Use the star rating pre-screen to suppress or discourage negative public reviews — the feature is intended solely for service recovery, and customers are informed on the feedback form that this does not affect their right to leave a public review</li>
              <li>Contact individuals without a lawful basis to do so under applicable marketing laws (including UK PECR and GDPR)</li>
              <li>Operate or promote an illegal business or activity</li>
              <li>Harass, threaten, or harm any person</li>
              <li>Infringe the intellectual property rights of any third party</li>
              <li>Attempt to gain unauthorised access to any system or network</li>
              <li>Use the service in any way that could damage, disable, or impair it</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We reserve the right to suspend or terminate accounts that violate these rules without
              notice and without refund.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Your content and your customers</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are solely responsible for all messages, content, and communications sent through
              ReviewOptic to your customers. We act as a technology platform only and do not review,
              endorse, or take responsibility for the content you send. You warrant that any messages
              sent via our platform comply with all applicable laws, including data protection and
              electronic marketing legislation. We accept no liability for any claims, complaints, or
              regulatory action arising from communications you send using the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Data and privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our collection and use of personal data is described in our{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                Privacy Policy
              </a>
              , which forms part of these Terms. By using ReviewOptic, you also agree to our Privacy Policy.
              You remain the data controller for your customers' personal data. We process it only on your
              behalf and in accordance with your instructions as a data processor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">12. Intellectual property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All intellectual property rights in the ReviewOptic platform, including its software, design,
              and content, belong to us. You are granted a limited, non-exclusive, non-transferable licence
              to use the service during your subscription. You must not copy, modify, distribute, or
              reverse-engineer any part of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">13. Disclaimer of warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              ReviewOptic is provided "as is" and "as available". We do not guarantee that the service
              will be uninterrupted, error-free, or meet your specific requirements. We make no warranty
              that using the service will result in an increase in reviews, ratings, or revenue.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">14. Limitation of liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, we shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of profits, revenue, data, or
              goodwill, arising from your use of or inability to use the service. Our total liability to
              you for any claim arising out of or relating to these Terms shall not exceed the total
              subscription fees paid by you in the three months preceding the claim. Nothing in these
              Terms limits our liability for death or personal injury caused by negligence, fraud, or
              any other liability that cannot be excluded by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">15. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time if you breach these Terms, fail to
              pay subscription fees, or if we reasonably believe your use of the service poses a risk
              to us, other users, or third parties. Upon termination, your right to access the service
              ceases immediately. Sections 9, 11, 12, 13, and 15 survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">16. Governing law and disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of England and Wales. Any dispute arising out of or
              in connection with these Terms shall be subject to the exclusive jurisdiction of the courts
              of England and Wales. If you are a consumer based in another jurisdiction, you may also
              have rights under your local law that these Terms do not override.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">17. Changes to these terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by
              email or in-app notice at least 14 days before they take effect. Continued use of the
              service after that date constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">18. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any questions about these Terms, contact us at:<br />
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
