import { Info } from "lucide-react";
import LegalLayout, { LegalSection, LegalTable } from "./LegalLayout";
import { ACCOUNTS } from "../../data/products.js";
import { getContent } from "../../services/api.js";
import { formatINRWhole } from "../../lib/format.js";

const SECTIONS = [
  { id: "accounts", label: "Account maintenance & balances" },
  { id: "cards", label: "Debit and credit cards" },
  { id: "payments", label: "Payments — NEFT, IMPS, UPI, ATM" },
  { id: "cheques-dd", label: "Cheques, demand drafts & documents" },
  { id: "loans", label: "Loans" },
  { id: "notes", label: "Notes that apply to every charge" },
];

export default function ScheduleOfCharges() {
  const contentCharges = typeof getContent === 'function' ? getContent('charges') : null;
  const accountServicesRows = (contentCharges?.accountServices ? contentCharges.accountServices.map(r => [r.service || r.item, r.charge]) : null);
  const debitCardMiscRows = (contentCharges?.debitCardMisc ? contentCharges.debitCardMisc.map(r => [r.service || r.item, r.charge]) : null);
  const paymentsMiscRows = (contentCharges?.paymentsMisc ? contentCharges.paymentsMisc.map(r => [r.channel || r.service, r.appFee || r.charge, r.branchFee || r.note]) : null);
  const atmCashMiscRows = (contentCharges?.atmCashMisc ? contentCharges.atmCashMisc.map(r => [r.item || r.service, r.charge]) : null);
  const chequesDdMiscRows = (contentCharges?.chequesDdMisc ? contentCharges.chequesDdMisc.map(r => [r.item || r.service, r.charge]) : null);
  return (
    <LegalLayout
      title="Schedule of Charges"
      subtitle="Every standard fee FinEdge charges, in one place, in rupees. If a service is not listed here, it is free. Charges are shown before you confirm any transaction that attracts one — a fee is never a surprise on a statement."
      sections={SECTIONS}
    >
      <div className="mb-2 flex gap-3 rounded-card border border-gold-300 bg-gold-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" aria-hidden />
        <p className="text-sm leading-6 text-ink-700">
          <strong className="text-ink-900">Illustrative figures:</strong>{" "}
          FinEdge is a demonstration bank, so every amount in this schedule
          is an original, illustrative figure set for this platform — not
          copied from any real bank's tariff. In a live schedule, each charge
          would additionally show goods and services tax (GST) as applicable;
          figures below are stated exclusive of GST unless marked otherwise.
        </p>
      </div>

      <LegalSection id="accounts" title="1. Account maintenance & balances">
        <LegalTable
          caption="Average monthly balance (AMB) requirements and account charges"
          head={["Account", "AMB required", "Non-maintenance charge", "Debit card annual fee"]}
          rows={ACCOUNTS.map((a) => [
            a.name,
            a.amb.amount === 0 ? "Zero balance" : (a.amb.nonMetroAmount && a.amb.nonMetroAmount !== a.amb.amount ? `${formatINRWhole(a.amb.amount)} (${formatINRWhole(a.amb.nonMetroAmount)} non-metro)` : formatINRWhole(a.amb.amount)),
            a.amb.penaltyPerMonth ? `${formatINRWhole(a.amb.penaltyPerMonth)} per month` : "Nil",
            a.fees.debitCardAnnual === 0 ? "Nil" : `${formatINRWhole(a.fees.debitCardAnnual)}/yr`,
          ])}
        />
        <LegalTable
          caption="Account services"
          head={["Service", "Charge"]}
          rows={accountServicesRows || [
            ["Account opening (all account types)", "Nil"],
            ["Passbook / account welcome kit", "Nil"],
            ["SMS and email transaction alerts", "Nil"],
            ["Mobile and internet banking", "Nil"],
            ["Account closure within 30 days of opening", "Nil"],
            ["Account closure after 30 days and within 12 months", "₹400"],
            ["Reactivation of an inoperative account", "Nil"],
            ["Standing instruction set-up / amendment (digital)", "Nil"],
            ["Standing instruction set-up at a branch", "₹50 per instruction"],
            ["Failed standing instruction / auto-debit (insufficient funds)", "₹250 per instance"],
          ]}
        />
      </LegalSection>

      <LegalSection id="cards" title="2. Debit and credit cards">
        <LegalTable
          caption="Debit cards"
          head={["Item", "Charge"]}
          rows={debitCardMiscRows || [
            ["Issuance — first card on an account", "Nil"],
            ["Annual fee — FinEdge Classic Debit Card (Savings)", "₹199"],
            ["Annual fee — FinEdge Business Debit Card (Current)", "₹299"],
            ["Annual fee — FinEdge Edge Gold Debit Card (Premium)", "₹599"],
            ["Replacement of a lost or damaged card", "₹150"],
            ["PIN regeneration (branch request)", "₹50 (Nil in the app)"],
            ["International usage activation", "Nil"],
            ["Charge slip / transaction retrieval request", "₹100 per slip"],
          ]}
        />
        <LegalTable
          caption="Credit cards (illustrative tariff by card family)"
          head={["Item", "FinEdge Edge Cashback Card", "FinEdge Edge Voyage Card", "FinEdge Edge Assured Card"]}
          rows={[
            ["Joining fee", "₹499 (waived on ₹2,00,000 spend in year 1)", "₹2,999", "Nil"],
            ["Annual fee", "₹499 (waived on ₹2,00,000 annual spend)", "₹2,999 (waived on ₹6,00,000 annual spend)", "Nil"],
            ["Interest on revolving credit (APR)", "3.3% per month (39.6% p.a.)", "3.1% per month (37.2% p.a.)", "2.85% per month (34.2% p.a.)"],
            ["Cash advance fee", "2.5% of the amount, minimum ₹500", "2.5% of the amount, minimum ₹500", "2.5% of the amount, minimum ₹400"],
            ["Late payment fee", "₹300–₹1,200 by outstanding slab", "₹500–₹1,500 by outstanding slab", "₹250–₹1,000 by outstanding slab"],
            ["Foreign currency mark-up", "3.5%", "1.99%", "3.5%"],
            ["Over-limit fee", "₹500", "₹600", "₹400 (limit fixed by deposit)"],
          ]}
        />
      </LegalSection>

      <LegalSection id="payments" title="3. Payments — NEFT, IMPS, UPI, ATM">
        <LegalTable
          caption="Fund transfers"
          head={["Channel", "In the app / internet banking", "At a branch"]}
          rows={paymentsMiscRows || [
            ["Between your own FinEdge accounts", "Nil", "Nil"],
            ["To another FinEdge account", "Nil", "₹25"],
            ["UPI", "Nil", "Not offered at branches"],
            ["IMPS up to ₹25,00,000", "₹3", "₹5"],
            ["IMPS ₹25,001 – ₹1,00,000", "₹6", "₹10"],
            ["IMPS ₹1,00,001 – ₹5,00,000", "₹12", "₹15"],
            ["NEFT up to ₹10,000", "Nil", "₹2.50"],
            ["NEFT ₹10,001 – ₹1,00,000", "Nil", "₹5"],
            ["NEFT ₹1,00,001 – ₹2,00,000", "Nil", "₹15"],
            ["NEFT above ₹2,00,000", "Nil", "₹25"],
            ["Returned transfer (beneficiary bank rejection, not our error)", "Nil — the full amount returns to your account", "Nil"],
          ]}
        />
        <LegalTable
          caption="ATM and cash"
          head={["Item", "Charge"]}
          rows={atmCashMiscRows || [
            ["FinEdge ATMs — financial and non-financial transactions", "Nil, unlimited"],
            ["Other-bank ATMs — first 5 transactions a month (metro: 3)", "Nil"],
            ["Other-bank ATM cash withdrawal beyond the free limit", "₹20 per transaction"],
            ["Other-bank ATM balance enquiry beyond the free limit", "₹8 per transaction"],
            ["International ATM cash withdrawal", "₹125 + 3% currency conversion"],
            ["Cash deposit — Savings accounts", "Free up to ₹2,00,000 per month; ₹3 per ₹1,000 thereafter"],
            ["Cash deposit — Current accounts", "Free up to ₹10,00,000 per month; ₹2.50 per ₹1,000 thereafter"],
          ]}
        />
      </LegalSection>

      <LegalSection id="cheques-dd" title="4. Cheques, demand drafts & documents">
        <LegalTable
          head={["Item", "Charge"]}
          rows={chequesDdMiscRows || [
            ["Cheque book — first 25 leaves a year (savings)", "Nil"],
            ["Cheque book — additional leaves", "₹4 per leaf"],
            ["Cheque book — current accounts (50 leaves)", "₹150 per book"],
            ["Stop-payment instruction (per cheque)", "₹100 in the app, ₹150 at a branch"],
            ["Cheque returned — insufficient funds", "₹350 per instance"],
            ["Cheque returned — technical reasons on our side", "Nil"],
            ["Outstation cheque collection", "₹50 + actual courier/postal cost"],
            ["Demand draft / pay order up to ₹10,000", "₹40"],
            ["Demand draft / pay order above ₹10,000", "₹4 per ₹1,000, maximum ₹1,500"],
            ["DD cancellation / revalidation / duplicate", "₹100"],
            ["Duplicate account statement (printed at branch)", "₹50 per statement (digital banking: Nil)"],
            ["Balance / interest / no-dues certificate", "₹150 per certificate"],
            ["Signature verification / attestation for outside use", "₹150"],
          ]}
        />
      </LegalSection>

      <LegalSection id="loans" title="5. Loans">
        <LegalTable
          head={["Item", "Charge"]}
          rows={[
            ["Home loan processing fee", "0.40% of the sanctioned amount, minimum ₹5,000, maximum ₹25,000"],
            ["Vehicle loan processing fee", "0.50% of the sanctioned amount, minimum ₹2,500, maximum ₹15,000"],
            ["Education loan processing fee", "0.50% of the sanctioned amount, maximum ₹10,000 (waived up to ₹20,00,000)"],
            ["Gold loan processing fee", "0.30% of the sanctioned amount, minimum ₹500, maximum ₹5,000"],
            ["Business Growth loan processing fee", "1.00% of the sanctioned amount, minimum ₹10,000 (no upper cap)"],
            ["Krishi Agriculture loan processing fee", "0.25% of the sanctioned amount, maximum ₹2,500 (waived up to ₹3,00,000)"],
            ["Loan Against Property processing fee", "0.75% of the sanctioned amount, minimum ₹10,000, maximum ₹50,000"],
            ["Part-prepayment — floating-rate loans to individuals", "Nil"],
            ["Foreclosure — floating-rate loans to individuals", "Nil"],
            ["EMI presentation failure (insufficient funds)", "₹400 per instance"],
            ["Duplicate loan statement / amortisation schedule", "Nil in digital banking; ₹200 printed at a branch"],
          ]}
        />
        <p>
          Penal charges for delayed EMI payment, where a loan agreement
          provides for them, are stated in that agreement as a rate on the
          overdue amount only — never on the entire outstanding — and are
          never capitalised into the principal.
        </p>
      </LegalSection>

      <LegalSection id="notes" title="6. Notes that apply to every charge">
        <ul>
          <li>
            <strong>Shown before you pay:</strong> any charge a transaction
            attracts is displayed on its confirmation screen and itemised on
            your statement under its own narration — never bundled into the
            transaction amount.
          </li>
          <li>
            <strong>Changes give notice:</strong> a new charge, or an increase
            to an existing one, is notified at least 30 days before it takes
            effect, on this page and through digital banking.
          </li>
          <li>
            <strong>Errors are reversed:</strong> a charge applied in error —
            including one caused by our systems — is refunded in full to the
            same account, and you do not need to claim it for us to correct
            it once identified.
          </li>
          <li>
            <strong>No charge for our failures:</strong> failed transactions,
            our processing errors and downtime on our channels never attract
            a fee.
          </li>
          <li>
            <strong>GST:</strong> charges are exclusive of goods and services
            tax where it applies, except where a figure is expressly marked
            inclusive.
          </li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
