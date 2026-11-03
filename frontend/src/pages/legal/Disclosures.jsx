import LegalLayout, { LegalSection } from "./LegalLayout";

const SECTIONS = [
  { id: "about", label: "About FinEdge Bank" },
  { id: "regulatory", label: "Regulatory status" },
  { id: "deposit-insurance", label: "Deposit insurance, explained honestly" },
  { id: "interest-fees", label: "Interest rates and fees" },
  { id: "simulated", label: "What is simulated on this platform" },
  { id: "market-products", label: "Market-linked products" },
  { id: "third-party", label: "Third-party products and links" },
  { id: "forward-looking", label: "Projections and illustrations" },
];

export default function Disclosures() {
  return (
    <LegalLayout
      title="Disclosures"
      subtitle="The things a trustworthy bank should say out loud: what FinEdge is, what is real on this platform, what is simulated, and where the risks in each kind of product actually sit."
      sections={SECTIONS}
    >
      <LegalSection id="about" title="1. About FinEdge Bank">
        <p>
          FinEdge Bank is a demonstration banking brand created for an
          industry training project, presented as a complete retail bank —
          accounts, loans, cards and investments — so that the full shape of
          a modern banking platform can be studied and evaluated. Its brand,
          product names, rates and content are original to this project and
          are not affiliated with, endorsed by, or copied from any existing
          bank.
        </p>
      </LegalSection>

      <LegalSection id="regulatory" title="2. Regulatory status">
        <p>
          A licensed Indian bank would state here the authority under which
          it carries on banking business, its registration particulars and
          the regulator's public disclaimers. FinEdge holds no banking
          licence and issues none of those particulars: rather than print
          plausible-looking registration facts, we state plainly that
          FinEdge Bank is a demonstration brand and no account opened on
          this platform is an account with a real financial institution. No
          real money is held, moved or lent through this platform.
        </p>
        <p>
          The regulatory structures this platform models — know-your-customer
          verification, grievance escalation up to the Banking Ombudsman,
          fair lending practice, deposit-insurance concepts — follow the
          frameworks that genuinely apply to Indian banks, so that the
          journeys behave the way real ones do.
        </p>
      </LegalSection>

      <LegalSection id="deposit-insurance" title="3. Deposit insurance, explained honestly">
        <p>
          In the real Indian banking system, deposits with a licensed bank
          are insured by the Deposit Insurance and Credit Guarantee
          Corporation (DICGC) up to ₹5,00,000 per depositor per bank,
          covering principal and interest across all accounts held in the
          same capacity. That protection exists because the institution is
          licensed and supervised.
        </p>
        <p>
          FinEdge balances are simulated figures inside a training
          platform; they are not deposits and are not covered by DICGC or
          any other insurer. We describe the scheme because a real bank must,
          and because understanding it is part of judging any bank — not
          because it applies here.
        </p>
      </LegalSection>

      <LegalSection id="interest-fees" title="4. Interest rates and fees">
        <p>
          Every rate shown on this website — savings slabs, fixed and
          recurring deposit tenures, loan starting rates, card charges — is
          an original, illustrative figure set for this demonstration
          platform, drawn from our own product configuration rather than
          from any real bank's published rates. Rates are labelled
          "illustrative" where they appear, the Schedule of Charges carries
          the same note, and all figures exclude goods and services tax
          where a real charge would attract it. If FinEdge were a
          licensed bank, these pages would state the exact effective dates
          and the regulator-prescribed disclosures beside each rate; the
          structure shown here models that placement.
        </p>
      </LegalSection>

      <LegalSection id="simulated" title="5. What is simulated on this platform">
        <ul>
          <li>
            <strong>Payment rails:</strong> transfers labelled NEFT, IMPS and
            UPI are executed by a simulated settlement engine inside the
            platform. No instruction reaches the real payment systems.
          </li>
          <li>
            <strong>Identity verification:</strong> KYC review is performed
            by a simulation of an officer workflow; no document is checked
            against any government database.
          </li>
          <li>
            <strong>Credit assessment:</strong> loan eligibility and card
            decisions are produced by demonstration rules, not by a credit
            bureau enquiry.
          </li>
          <li>
            <strong>Market data:</strong> any fund values, growth charts or
            returns shown for investment products are generated
            illustrations, not live market prices.
          </li>
          <li>
            <strong>People:</strong> customer names, account numbers and
            transaction histories in the demonstration data are fictional
            and generated for this platform.
          </li>
        </ul>
        <p>
          Simulation is labelled at the point of use — in the transfer
          flow, the KYC flow and the investment pages — not only on
          this page.
        </p>
      </LegalSection>

      <LegalSection id="market-products" title="6. Market-linked products">
        <p>
          Systematic investment plans and other market-linked products carry
          risk that deposits do not: the value of an investment can fall as
          well as rise, past performance does not predict future returns, and
          no return on a market-linked product is guaranteed by the bank, by
          any insurer, or by the government. Deposit products and
          market-linked products are presented in separate sections of this
          website, with the risk disclosure beside the product's figures —
          never beneath a deposit-style assurance. Government savings schemes
          modelled here, such as the Sukanya Samriddhi Yojana, are real
          schemes administered through authorised institutions; accounts in
          them can only be opened with an authorised institution, not on
          this demonstration platform.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="7. Third-party products and links">
        <p>
          Where this website refers to payment networks, card schemes,
          government schemes or external resources, those names belong to
          their owners and the references are descriptive only. Following an
          external link takes you outside FinEdge's channels; we are not
          responsible for the content, security or privacy practices of
          external sites, and an external reference is never an endorsement.
        </p>
      </LegalSection>

      <LegalSection id="forward-looking" title="8. Projections and illustrations">
        <p>
          Calculators on this website produce illustrations from the figures
          you enter and the rates you select. An illustration is not a
          promise: actual deposit interest follows the rate in force at
          booking, actual loan cost follows your sanction terms, and actual
          investment outcomes follow markets. Where a calculator's result
          would change materially under a different assumption — for example
          tax deducted at source on deposit interest — the calculator says
          so next to the result.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
