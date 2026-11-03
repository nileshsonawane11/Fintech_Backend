import LegalLayout, { LegalSection, LegalTable } from "./LegalLayout";

const SECTIONS = [
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-collect", label: "Information we collect" },
  { id: "how-we-use", label: "How we use it" },
  { id: "consent", label: "Consent and lawful use" },
  { id: "sharing", label: "When we share information" },
  { id: "cookies", label: "Cookies and similar tools" },
  { id: "retention", label: "How long we keep it" },
  { id: "security", label: "How we protect it" },
  { id: "your-rights", label: "Your rights" },
  { id: "minors", label: "Minor and student accounts" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact and grievances" },
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How FinEdge Bank collects, uses, stores and shares your personal information when you open an account or use our digital banking channels — written in plain language, without legal padding."
      sections={SECTIONS}
    >
      <LegalSection id="who-we-are" title="1. Who we are">
        <p>
          FinEdge Bank ("FinEdge", "we", "us") provides savings, current,
          salary, student and minor accounts, loans, cards and investment
          services through its branches and digital channels. This policy
          explains our handling of personal information across all of those
          channels. It applies to customers, joint holders, nominees,
          guardians, authorised signatories and anyone who applies for a
          product with us, whether or not the application is completed.
        </p>
        <p>
          We treat the information you entrust to us as a responsibility, not
          an asset. We collect only what a banking relationship genuinely
          requires, we use it for the purposes described below, and we do not
          sell personal information to anyone, for any purpose, ever.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="2. Information we collect">
        <p>
          The information we hold depends on the products you use. The main
          categories are:
        </p>
        <LegalTable
          head={["Category", "Examples", "Why we need it"]}
          rows={[
            [
              "Identity and KYC information",
              "Full name, date of birth, PAN, Aadhaar details (where you choose Aadhaar-based e-KYC), photograph, signature, address proof",
              "To verify your identity, open accounts and meet know-your-customer obligations",
            ],
            [
              "Contact information",
              "Mobile number, email address, residential and mailing addresses",
              "To send statements, alerts and one-time passwords, and to reach you about your accounts",
            ],
            [
              "Account and transaction information",
              "Account numbers, balances, transaction history, beneficiaries, mandates, loan and card records",
              "To operate your accounts, process payments and prepare statements",
            ],
            [
              "Financial profile",
              "Occupation, employer, income range, tax residency declarations, credit history obtained with your consent",
              "To assess eligibility for loans and cards and to meet regulatory reporting duties",
            ],
            [
              "Digital usage information",
              "Device identifiers, IP address, login times, app and browser type, pages visited",
              "To secure your session, detect fraud and improve our channels",
            ],
            [
              "Communications",
              "Call recordings, emails, chat transcripts and complaint records",
              "To service your requests, train our teams and resolve disputes",
            ],
          ]}
        />
        <p>
          We collect information directly from you (application forms, our app
          and internet banking), from your use of our services, and — only
          with your consent or as the law permits — from third parties such as
          credit information companies, KYC registries and your employer for
          salary accounts.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How we use it">
        <ul>
          <li>
            <strong>To run your banking relationship:</strong> opening and
            operating accounts, executing transfers, servicing loans and
            cards, and issuing statements and certificates.
          </li>
          <li>
            <strong>To keep you and the bank safe:</strong> verifying
            identity, monitoring for fraud and unauthorised access, and
            screening transactions as required by anti-money-laundering law.
          </li>
          <li>
            <strong>To meet legal duties:</strong> regulatory reporting, tax
            withholding and reporting, responding to lawful orders, and
            maintaining records for the periods the law prescribes.
          </li>
          <li>
            <strong>To improve our services:</strong> understanding how our
            channels are used, fixing problems and designing clearer
            journeys — using aggregated or anonymised data wherever the
            purpose allows.
          </li>
          <li>
            <strong>To tell you about products:</strong> only where you have
            opted in, and never as a condition of holding an account. Every
            marketing message carries a working opt-out.
          </li>
        </ul>
        <p>
          We do not use your information for automated decisions that produce
          a legal effect on you — such as declining a loan — without a human
          review path, and you may always ask us to reconsider an automated
          outcome.
        </p>
      </LegalSection>

      <LegalSection id="consent" title="4. Consent and lawful use">
        <p>
          Where a use of your information rests on consent — Aadhaar-based
          e-KYC, credit bureau enquiries, marketing, sharing details with an
          employer for a salary account — we ask for that consent explicitly,
          in a separate, unticked control, at the moment it is needed. Consent
          is never bundled into a general acceptance of terms, and a consent
          you have not given is never recorded as given.
        </p>
        <p>
          You may withdraw consent at any time through internet banking, the
          app or any branch. Withdrawal does not affect processing already
          completed, and some information must still be retained where the
          law requires it; we explain that at the point of withdrawal.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="5. When we share information">
        <p>We share personal information only in these situations:</p>
        <ul>
          <li>
            <strong>Service providers</strong> who process data strictly on
            our instructions — card networks and printers, payment
            processors, statement and SMS providers, cloud and IT vendors —
            under contracts that require them to protect it and use it only
            for the service they provide.
          </li>
          <li>
            <strong>Regulators and authorities</strong> where the law
            requires it — tax authorities, KYC registries, credit information
            companies (for credit products), and courts or law-enforcement
            agencies acting under lawful authority.
          </li>
          <li>
            <strong>Payment counterparties</strong> — the limited details a
            transfer must carry (such as your name and account reference) so
            the receiving bank can credit the right person.
          </li>
          <li>
            <strong>With your explicit consent</strong> — for example, an
            income confirmation to a lender or a reference to another
            institution.
          </li>
        </ul>
        <p>
          If we ever transfer information outside India, we do so only to
          jurisdictions and under safeguards permitted by Indian law, and we
          will describe that transfer in this policy.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="6. Cookies and similar tools">
        <p>
          Our website and internet banking use strictly necessary cookies to
          keep you signed in securely and to remember choices such as text
          size. With your permission we also use analytics cookies that tell
          us, in aggregate, which pages are used and where journeys break
          down. We do not use advertising trackers, and we do not build
          profiles of your browsing on other websites. You can refuse
          non-essential cookies without losing access to any banking
          function; the cookie banner's "essential only" option does exactly
          that.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="7. How long we keep it">
        <p>
          We keep information for as long as your relationship with us lasts
          and for the periods banking and tax law require afterwards. Our
          standard retention is:
        </p>
        <LegalTable
          head={["Record", "Retention"]}
          rows={[
            [
              "Account and transaction records",
              "At least 10 years after the account is closed or the transaction completed",
            ],
            [
              "KYC documents and identity records",
              "At least 10 years after the end of the banking relationship",
            ],
            [
              "Loan documents",
              "At least 10 years after the loan is fully repaid or closed",
            ],
            [
              "Complaints and communications",
              "At least 5 years after the matter is closed",
            ],
            [
              "Unsuccessful applications",
              "Up to 2 years, then deleted unless you apply again or the law requires longer",
            ],
            [
              "Website and app logs",
              "Up to 12 months for security logs; analytics in anonymised form",
            ],
          ]}
        />
        <p>
          When a retention period ends, records are deleted or irreversibly
          anonymised. If you ask for deletion earlier, we delete what we
          lawfully can and tell you plainly what must be kept, and why.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. How we protect it">
        <p>
          Access to customer information inside FinEdge is role-based and
          logged: a staff member sees only the records their job requires,
          and access to sensitive identifiers is masked by default. Data is
          encrypted in transit and at rest, credentials are stored only as
          salted hashes, and administrative actions on customer records are
          written to an audit trail that officers cannot alter. We review
          access rights periodically and test our systems' defences on a
          schedule.
        </p>
        <p>
          Your part matters too: we will never ask for your password, PIN or
          a one-time code by phone, email or message. If someone does, it is
          not us — report it through the channels in our Grievance
          Redressal page.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="9. Your rights">
        <ul>
          <li>
            <strong>Access:</strong> ask what personal information we hold
            about you and receive a copy in a readable format.
          </li>
          <li>
            <strong>Correction:</strong> have inaccurate or outdated details
            corrected — many can be updated directly in internet banking with
            supporting documents where identity proof is needed.
          </li>
          <li>
            <strong>Erasure:</strong> request deletion of information we are
            not legally required to retain.
          </li>
          <li>
            <strong>Consent withdrawal:</strong> withdraw any consent, as
            described in section 4.
          </li>
          <li>
            <strong>Nomination and guardianship:</strong> review and update
            the nominees recorded on your accounts at any time.
          </li>
          <li>
            <strong>Grievance:</strong> complain about how your information
            has been handled and have it reviewed by an officer who was not
            involved in the original decision.
          </li>
        </ul>
        <p>
          We respond to rights requests within 30 days. If a request will
          take longer, we tell you before the deadline, with the reason.
        </p>
      </LegalSection>

      <LegalSection id="minors" title="10. Minor and student accounts">
        <p>
          Minor accounts are operated by a parent or legal guardian, and the
          guardian's information is processed under this policy alongside the
          minor's. We collect only the minor's details a bank account
          requires, we never market products to minors, and when the account
          holder turns 18 we invite them to convert the account and set their
          own privacy choices — the guardian's access ends unless the
          now-adult customer renews it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to this policy">
        <p>
          When this policy changes in a way that affects how your information
          is used, we will tell you through internet banking, the app and
          email at least 30 days before the change takes effect, and the new
          version will be published here with its date. Changes that are
          purely clarifying are published here without individual notice.
          Continuing to use your account after a notified change takes
          effect means the updated policy applies; if you do not accept a
          change, you may close your account without penalty charges arising
          from the change itself.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact and grievances">
        <p>
          For any privacy question or request, contact us through the
          in-app support centre, any branch, or the customer care channels
          listed on our Support page. If you are not satisfied with the
          response, our Grievance Redressal page sets out the escalation
          levels, ending with the Banking Ombudsman — an independent
          authority — if we cannot resolve the matter within 30 days.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
