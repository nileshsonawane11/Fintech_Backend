import LegalLayout, { LegalSection } from "./LegalLayout";

const SECTIONS = [
  { id: "our-commitment", label: "Our commitment" },
  { id: "applications", label: "Applications, decided fairly and on time" },
  { id: "transparency", label: "Transparency before you sign" },
  { id: "pricing", label: "Pricing and changes to pricing" },
  { id: "no-discrimination", label: "No discrimination" },
  { id: "assessment", label: "How we assess a loan" },
  { id: "disbursal-changes", label: "Disbursal and changes after sanction" },
  { id: "recovery", label: "If repayment becomes difficult" },
  { id: "repossession", label: "Repossession, as a last resort" },
  { id: "privacy-conduct", label: "Privacy and staff conduct" },
  { id: "review", label: "How this code is kept honest" },
];

export default function FairPracticeCode() {
  return (
    <LegalLayout
      title="Fair Practice Code"
      subtitle="How FinEdge lends and deals with borrowers — the standards our staff are trained on, audited against, and answerable for. This code follows the fair-lending framework that applies to banks in India, written here in our own words."
      sections={SECTIONS}
    >
      <LegalSection id="our-commitment" title="1. Our commitment">
        <p>
          We lend money; we do not sell debt. That means we would rather
          decline a loan a customer cannot afford than sanction one that
          will distress them, we explain every cost before a signature is
          taken, and we treat a borrower in difficulty with the same
          courtesy as a borrower in good standing. This code binds every
          FinEdge employee and every agent who acts for us, and a breach
          of it is a disciplinary matter — not a customer problem to be
          argued about.
        </p>
      </LegalSection>

      <LegalSection id="applications" title="2. Applications, decided fairly and on time">
        <ul>
          <li>
            Every loan application is acknowledged with a reference number
            and the date it was received, whether it is made in a branch or
            digitally.
          </li>
          <li>
            The documents we need are listed in one checklist given at the
            start. If something more is genuinely required later, we say why.
          </li>
          <li>
            We decide straightforward applications within the timelines
            published on each product's page, and we tell you if yours will
            take longer, with the reason.
          </li>
          <li>
            If we decline, we say so in writing with the principal reason —
            a credit-history factor, an affordability gap, documentation —
            in terms specific enough for you to act on. "Bank's discretion"
            is not a reason we give.
          </li>
          <li>
            Application and processing charges, and whether any part is
            refundable at each stage, are stated on the product page and in
            the Schedule of Charges before you apply.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="transparency" title="3. Transparency before you sign">
        <p>
          Before a loan is sanctioned, you receive a Key Facts Statement in
          plain language showing: the amount, the annualised interest rate
          (APR) including all charges expressed as a rate, the equated
          monthly instalment, the total amount payable over the full tenure,
          every fee, and the conditions for prepayment and foreclosure.
          The figures in the Key Facts Statement are the figures in your
          loan agreement — if they ever differ, the lower cost to you is
          the one that applies until we correct and re-issue the statement.
        </p>
        <p>
          Loan documents are available in English and, on request, explained
          to you in a language you are comfortable with before signing. You
          may take documents home unsigned and return to sign later; no
          FinEdge officer may pressure you to sign on the spot, and blank
          or partly blank documents are never taken from a borrower.
        </p>
      </LegalSection>

      <LegalSection id="pricing" title="4. Pricing and changes to pricing">
        <ul>
          <li>
            Interest is charged on the reducing balance, computed daily —
            never on the original principal for the whole tenure.
          </li>
          <li>
            On a floating-rate loan, a change in the reference rate changes
            your EMI or tenure only as your agreement describes, and we
            notify you before the first changed EMI is presented, with the
            revised amortisation schedule available in digital banking.
          </li>
          <li>
            Penal charges, where an agreement provides for them, apply only
            to the amount overdue, are not capitalised into principal, and
            follow a board-approved policy applied uniformly — they are a
            deterrent to default, not a revenue line.
          </li>
          <li>
            No charge exists unless it appears in the Schedule of Charges or
            your sanction letter. An officer cannot invent, waive for a fee,
            or negotiate a charge privately.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="no-discrimination" title="5. No discrimination">
        <p>
          Credit decisions rest on documented, relevant criteria: identity,
          income and its stability, existing obligations, credit history,
          and the security offered. We do not decline or price applications
          on the basis of religion, caste, gender, marital status,
          disability, place of origin, or any other characteristic the law
          protects. Applications from single women, senior citizens and
          persons with disabilities receive the same product range, the
          same timelines and assisted-digital support where it helps.
          Decision audits sample declined applications specifically to test
          that this standard held.
        </p>
      </LegalSection>

      <LegalSection id="assessment" title="6. How we assess a loan">
        <p>
          We assess affordability on your total obligations, not on the EMI
          of our loan alone: as a rule we will not sanction where all
          instalments together would take more than a sustainable share of
          verified income, and we will tell you when an application fails on
          that ground and what amount would pass. Security or collateral
          supports a loan; it never substitutes for affordability. For
          business and agriculture loans we assess the activity's cash
          flows, and seasonal repayment structures are offered where the
          activity's income is seasonal.
        </p>
      </LegalSection>

      <LegalSection id="disbursal-changes" title="7. Disbursal and changes after sanction">
        <p>
          Disbursal follows the sanction terms exactly; a change to the
          amount, rate, tenure or any condition after sanction requires your
          written or digitally recorded acceptance before it takes effect.
          For construction-linked and staged loans, each tranche's release
          conditions are listed in the sanction letter, and a stage
          verification is completed within the stated timeline so your
          project is not stalled by our process. If we delay a disbursal
          that was due, interest for the delay period is not charged to you.
        </p>
      </LegalSection>

      <LegalSection id="recovery" title="8. If repayment becomes difficult">
        <ul>
          <li>
            <strong>Talk to us first.</strong> Restructuring, a tenure
            extension or a short moratorium can often be arranged before an
            account slips; asking for help never worsens your treatment.
          </li>
          <li>
            Reminders are factual and courteous — the amount, the date, the
            consequence — and are sent at reasonable hours through your
            registered channels.
          </li>
          <li>
            Recovery agents acting for us identify themselves and the bank
            they represent, carry authorisation you can verify with us, and
            may not use intimidation, abusive language, public shaming, or
            calls at unreasonable hours. A complaint about an agent is
            investigated with the agent's work for us suspended meanwhile.
          </li>
          <li>
            We report repayment behaviour to credit information companies
            accurately — including improvements. If we have reported anything
            wrongly, we correct it and confirm the correction to you in
            writing.
          </li>
          <li>
            Legal recovery is a last resort after engagement has failed, and
            even then settlement conversations remain open until a court or
            tribunal decides otherwise.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="repossession" title="9. Repossession, as a last resort">
        <p>
          Where a secured asset is repossessed under law, we give the notice
          the law and your agreement require, the inventory of anything
          taken is recorded and shared with you, the asset is valued
          transparently before sale, and any surplus after settling dues and
          reasonable costs is returned to you with a full statement. You may
          redeem the asset by settling dues at any point before its sale is
          concluded.
        </p>
      </LegalSection>

      <LegalSection id="privacy-conduct" title="10. Privacy and staff conduct">
        <p>
          Your loan information is shared only as our Privacy Policy
          describes. In particular, we do not discuss your borrowing with
          your employer, family or neighbours — including during recovery —
          except a guarantor or co-applicant on the same facility, or as the
          law compels. Staff may not accept gifts or hospitality from
          applicants, and any offer of a bribe solicited by anyone claiming
          to act for FinEdge should be reported through the grievance
          channels: solicitation is a dismissal offence.
        </p>
      </LegalSection>

      <LegalSection id="review" title="11. How this code is kept honest">
        <p>
          This code is approved at board level, reviewed at least once a
          year, and tested in practice through complaint analysis, declined-
          application audits and recovery-conduct reviews. If you believe we
          have breached it, raise the matter through our Grievance
          Redressal page and cite this code — complaints that cite the code
          are tagged and reviewed by the grievance desk against the specific
          commitment involved.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
