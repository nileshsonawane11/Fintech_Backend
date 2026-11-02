import LegalLayout, { LegalSection } from "./LegalLayout";

const SECTIONS = [
  { id: "acceptance", label: "Acceptance of these terms" },
  { id: "definitions", label: "Words we use" },
  { id: "eligibility", label: "Eligibility and account opening" },
  { id: "digital-banking", label: "Digital banking channels" },
  { id: "credentials", label: "Your credentials, your responsibility" },
  { id: "transactions", label: "Transactions, limits and cut-offs" },
  { id: "fees-interest", label: "Fees, charges and interest" },
  { id: "statements", label: "Statements and records" },
  { id: "dormancy", label: "Dormant and unclaimed accounts" },
  { id: "liability", label: "Liability — ours and yours" },
  { id: "suspension", label: "Suspension and closure" },
  { id: "amendments", label: "Changes to these terms" },
  { id: "governing-law", label: "Governing law" },
];

export default function TermsAndConditions() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      subtitle="The agreement between you and FinEdge Bank for accounts, cards, loans and digital banking. These terms work alongside the Schedule of Charges and your product-specific documents, which prevail if they ever conflict."
      sections={SECTIONS}
    >
      <LegalSection id="acceptance" title="1. Acceptance of these terms">
        <p>
          By opening an account, applying for a product, or using FinEdge
          Bank's website, mobile app or internet banking, you agree to these
          terms. If you do not agree, please do not open an account or use
          the digital channels — paper and branch banking remain available
          under the account-specific terms you sign at account opening.
        </p>
        <p>
          Where a product has its own terms (a loan agreement, cardmember
          terms, a deposit receipt), those terms sit alongside these. Nothing
          in these terms limits any right you hold under Indian consumer or
          banking law.
        </p>
      </LegalSection>

      <LegalSection id="definitions" title="2. Words we use">
        <ul>
          <li>
            <strong>"Account"</strong> — any savings, current, salary,
            student, minor, deposit or loan account held with us.
          </li>
          <li>
            <strong>"Digital channels"</strong> — our website, mobile app,
            internet banking and any authenticated messaging channel we
            officially operate.
          </li>
          <li>
            <strong>"Business day"</strong> — a day on which our branches and
            the relevant payment system (NEFT, IMPS, RTGS, UPI) are working;
            Sundays and bank holidays are not business days except where a
            payment system itself operates continuously.
          </li>
          <li>
            <strong>"You"</strong> — the account holder, and where relevant a
            joint holder, guardian, nominee or authorised signatory acting
            within their documented authority.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="eligibility" title="3. Eligibility and account opening">
        <p>
          Accounts are opened after know-your-customer (KYC) verification as
          required by law. You must provide accurate information at account
          opening and update us when it changes — address, contact details,
          occupation, tax residency. Accounts for minors are opened and
          operated by a parent or legal guardian until the minor turns 18.
          Student accounts require proof of enrolment at conversion or the
          account converts to a regular savings account on the terms then
          applicable, with notice to you first.
        </p>
        <p>
          We may decline an application without assigning a reason where the
          law permits, but we will tell you the outcome. A declined
          application does not create an account, a charge, or a record
          beyond the application record itself.
        </p>
      </LegalSection>

      <LegalSection id="digital-banking" title="4. Digital banking channels">
        <p>
          Digital banking lets you view accounts, transfer funds, pay, apply
          for products and service your accounts. Instructions given through
          digital channels after successful authentication are treated as
          your instructions. Some services have daily limits, cut-off times
          and cooling periods (for example, newly added beneficiaries);
          these are shown in the channel before you confirm, and the figure
          on the confirmation screen is the figure that applies.
        </p>
        <p>
          We may schedule maintenance that makes digital channels briefly
          unavailable. Planned maintenance is announced in the channels in
          advance wherever practicable; urgent security maintenance may occur
          without notice, and we will restore service as quickly as we can.
        </p>
      </LegalSection>

      <LegalSection id="credentials" title="5. Your credentials, your responsibility">
        <ul>
          <li>
            Keep your password, PIN and one-time codes to yourself. FinEdge
            staff will never ask for them — anyone who does is not us.
          </li>
          <li>
            You are responsible for transactions authenticated with your
            credentials unless you reported them compromised before the
            transaction, or the loss resulted from our systems or staff.
          </li>
          <li>
            Tell us immediately — through the app, customer care or any
            branch — if you lose a device, suspect unauthorised access, or
            receive an alert for a transaction you did not make. Blocking a
            card in the app takes effect at once.
          </li>
          <li>
            After repeated failed login attempts your access locks for your
            protection. Unlocking requires identity verification; it is never
            done on the strength of a phone request alone.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="transactions" title="6. Transactions, limits and cut-offs">
        <p>
          A transfer is executed when it is confirmed on screen and a
          reference number is shown; until then it can be cancelled. IMPS and
          UPI transfers are processed immediately, around the clock. NEFT
          transfers settle in batches on business days; instructions given
          after the day's cut-off settle in the next available batch, and
          the app shows the expected settlement time before you confirm.
        </p>
        <p>
          If a transfer fails after your account is debited, the amount is
          returned to your account automatically within the timelines the
          payment system's rules prescribe, and the failed transaction is
          marked as such in your statement — you never need to claim a
          failed debit back. Charges for each rail are in the Schedule of
          Charges and are shown before confirmation; a charge is never
          applied to a transaction type the Schedule lists as free.
        </p>
      </LegalSection>

      <LegalSection id="fees-interest" title="7. Fees, charges and interest">
        <p>
          Fees and charges are those published in the Schedule of Charges on
          the day a service is used. Interest on savings accounts is computed
          on daily balances at the rate applicable to your balance slab and
          credited quarterly unless your product documents state otherwise.
          Deposit and loan rates are those displayed for the product at the
          time of booking or sanction. If we change a fee or a variable rate,
          we give at least 30 days' notice through the channels described in
          section 12 before the change applies to you.
        </p>
      </LegalSection>

      <LegalSection id="statements" title="8. Statements and records">
        <p>
          Your statement in digital banking is the authoritative record of
          your transactions, and downloadable statements are generated from
          the same record. Review your statements promptly: if you spot an
          entry you do not recognise, raise it within 30 days so we can
          investigate while records and counterparty evidence are fresh.
          Raising it later does not forfeit your rights, but early reporting
          materially helps recovery.
        </p>
      </LegalSection>

      <LegalSection id="dormancy" title="9. Dormant and unclaimed accounts">
        <p>
          An account with no customer-initiated transaction for 24 months is
          classified inoperative; we notify you before the classification
          and again before any transfer of long-unclaimed balances to the
          statutory depositor protection fund, which happens after 10 years
          of inoperation as the law requires. Reactivating an inoperative
          account requires a fresh KYC check; your money remains yours
          throughout, and amounts transferred to the statutory fund can be
          claimed back through us with proof of identity and account
          ownership.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="10. Liability — ours and yours">
        <p>
          We are liable for losses caused by our systems, our staff or our
          failure to follow your instructions. You bear losses only as
          described in section 5 — transactions authenticated with your
          credentials before you reported a compromise, or where you shared
          your credentials or acted fraudulently. Where an unauthorised
          transaction is reported promptly and the loss is not attributable
          to you, our liability follows the customer-protection framework
          applicable to banks in India, including zero-liability cases where
          the breach was ours or a third party's and you reported it within
          the prescribed window.
        </p>
        <p>
          Neither of us is liable for delays caused by events genuinely
          beyond reasonable control — payment-system outages, natural
          disasters, or actions of public authorities — but we remain
          responsible for returning your money where a transaction did not
          complete.
        </p>
      </LegalSection>

      <LegalSection id="suspension" title="11. Suspension and closure">
        <p>
          You may close an account at any time; we settle the balance and any
          accrued interest, less any amounts lawfully due, and confirm
          closure in writing. We may suspend or close an account where the
          law requires it, where KYC cannot be completed or refreshed, or
          where an account is used for fraud — and, except where the law
          forbids notice or fraud is established, we give you notice and an
          opportunity to respond before closure. Suspension never changes
          ownership of your funds.
        </p>
      </LegalSection>

      <LegalSection id="amendments" title="12. Changes to these terms">
        <p>
          We may amend these terms as products, law and payment systems
          evolve. Material changes are notified at least 30 days in advance
          through internet banking, the app, email and this page, and the
          version published here always shows its last-updated date. If a
          change disadvantages you materially, you may close the affected
          account before it takes effect without closure charges.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="13. Governing law">
        <p>
          These terms are governed by the laws of India. Disputes are subject
          to the jurisdiction of the courts at the place of the branch where
          your account is maintained, without limiting your right to approach
          the Banking Ombudsman or any consumer forum available to you under
          law. Our Grievance Redressal page explains those routes and the
          order in which they are ordinarily used.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
