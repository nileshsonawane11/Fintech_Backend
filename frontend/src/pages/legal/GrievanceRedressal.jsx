import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CircleCheck,
  Headset,
  Landmark,
  Mail,
  MessageSquareText,
  Phone,
  Scale,
  TriangleAlert,
} from "lucide-react";
import LegalLayout, { LegalSection, LegalTable } from "./LegalLayout";
import { useAuth } from "../../context/AuthContext";
import { BRAND } from "../../data/products";
import { SUPPORT_CATEGORIES, getCategoryLabel } from "../../data/supportCategories";
import { raiseTicket } from "../../services/portalBridge";

const SECTIONS = [
  { id: "before-you-escalate", label: "Before you escalate" },
  { id: "levels", label: "The four levels" },
  { id: "timelines", label: "Timelines at a glance" },
  { id: "raise-complaint", label: "Raise a complaint now" },
  { id: "ombudsman", label: "The Banking Ombudsman" },
];

const LEVELS = [
  {
    n: "Level 1",
    title: "Customer Care & Branches",
    icon: Headset,
    body: "Start here — most matters end here. Raise the issue in the app's support centre, at any branch, or with customer care. You receive a complaint reference immediately, and a named team owns your case until it closes.",
    timeline: "Acknowledgement at once · Resolution target: 7 working days",
  },
  {
    n: "Level 2",
    title: "Grievance Redressal Desk",
    icon: MessageSquareText,
    body: "If Level 1 has not resolved your complaint within 10 working days, or you are not satisfied with its response, escalate to the Grievance Redressal Desk. Quote your Level 1 reference; the desk reviews the case afresh, with the original handling team out of the decision.",
    timeline: "Written response within 15 working days of escalation",
  },
  {
    n: "Level 3",
    title: "Principal Nodal Officer",
    icon: Scale,
    body: "If Level 2 does not resolve the matter, the Principal Nodal Officer — the bank's senior-most grievance authority — reviews it personally. This is the bank's final internal level, and its response states the reasons and the evidence relied on.",
    timeline: "Written response within 15 working days of escalation",
  },
  {
    n: "Level 4",
    title: "Banking Ombudsman (Reserve Bank of India)",
    icon: Landmark,
    body: "Independent of the bank and free of cost. If we have not replied within 30 days of your original complaint, or our final reply does not resolve it, you may approach the Banking Ombudsman under the Reserve Bank's Integrated Ombudsman Scheme — see section 5.",
    timeline: "File within 1 year of our final reply (plus the 30-day window)",
  },
];

export default function GrievanceRedressal() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.name || user?.fullName || "",
    email: user?.email || "",
    mobile: user?.phone || user?.mobile || "",
    accountRef: "",
    category: "",
    subject: "",
    description: "",
    consent: false,
  });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || user.name || user.fullName || "",
        email: f.email || user.email || "",
        mobile: f.mobile || user.phone || user.mobile || "",
      }));
    }
  }, [user]);

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | submitted | error
  const [reference, setReference] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const set = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate() {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Tell us your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address — our reply goes there.";
    if (!/^[6-9]\d{9}$/.test(form.mobile.replace(/\s/g, "")))
      next.mobile = "Enter a valid 10-digit Indian mobile number.";
    if (!form.category) next.category = "Pick the closest category.";
    if (form.subject.trim().length < 5)
      next.subject = "Give your complaint a short subject (5+ characters).";
    if (form.description.trim().length < 20)
      next.description =
        "A few details help us resolve faster — dates, amounts, and what went wrong (20+ characters).";
    if (!form.consent)
      next.consent =
        "We need your consent to look into account records for this complaint.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    setErrorMessage("");

    try {
      const ticket = await raiseTicket(user?.customerId || null, {
        customerId: user?.customerId || null,
        fullName: form.fullName.trim(),
        customerName: form.fullName.trim(),
        email: form.email.trim(),
        customerEmail: form.email.trim(),
        mobile: form.mobile.replace(/\s/g, ""),
        customerMobile: form.mobile.replace(/\s/g, ""),
        accountRef: form.accountRef.trim(),
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
        source: "public-grievance",
      });

      const issuedRef = ticket?.id || ticket?.ticketId || "TCK-RECORDED";
      setReference(issuedRef);
      setStatus("submitted");
    } catch (err) {
      setErrorMessage(err?.message || "We could not record your complaint just now.");
      setStatus("error");
    }
  }

  const handleReset = () => {
    setForm({
      fullName: user?.name || user?.fullName || "",
      email: user?.email || "",
      mobile: user?.phone || user?.mobile || "",
      accountRef: "",
      category: "",
      subject: "",
      description: "",
      consent: false,
    });
    setErrors({});
    setStatus("idle");
    setReference("");
    setErrorMessage("");
  };

  const inputCls = (hasError) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 ${
      hasError ? "border-danger-600 ring-1 ring-danger-600" : "border-ink-300 focus:border-midnight-800 focus:ring-1 focus:ring-midnight-800"
    }`;

  return (
    <LegalLayout
      title="Grievance Redressal"
      subtitle="If something has gone wrong, here is exactly who looks at it, in what order, and how long each step may take. Every complaint gets a reference number, an owner, and a written outcome — and if we cannot resolve it in 30 days, an independent Ombudsman can."
      sections={SECTIONS}
    >
      <LegalSection id="before-you-escalate" title="1. Before you escalate">
        <p>
          Escalation works best in order: each level reviews the level below
          with fresh eyes, and your complaint reference carries your full
          case history with it, so you never have to re-explain. For urgent
          matters — a lost card, a transaction you do not recognise, a
          suspected fraud — do not use this page first: block the card in
          the app and call customer care immediately. Speed matters more
          than sequence when money is at risk.
        </p>
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
          <a
            href="tel:18002674100"
            className="inline-flex items-center gap-2 font-medium text-midnight-900 hover:text-gold-700 transition-colors"
          >
            <Phone className="h-4 w-4 text-midnight-700" aria-hidden />
            <span>Toll-free 1800 267 4100 (Mon–Sat, 9 AM–7 PM IST)</span>
          </a>
          <a
            href={`mailto:${BRAND.support.email}`}
            className="inline-flex items-center gap-2 font-medium text-midnight-900 hover:text-gold-700 transition-colors"
          >
            <Mail className="h-4 w-4 text-midnight-700" aria-hidden />
            <span>{BRAND.support.email}</span>
          </a>
        </p>
      </LegalSection>

      <LegalSection id="levels" title="2. The four levels">
        <div className="space-y-4">
          {LEVELS.map((level, idx) => (
            <div
              key={level.n}
              style={{
                animationDelay: `${idx * 70}ms`,
                transitionDelay: `${idx * 70}ms`,
              }}
              className="reveal-schedule-row flex gap-4 rounded-card border border-ink-200 bg-porcelain-50 p-4 shadow-card transition-all duration-200 hover:border-midnight-300"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-midnight-800 text-porcelain-50">
                <level.icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">
                  {level.n}
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-ink-900">
                  {level.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-ink-700">
                  {level.body}
                </p>
                <p className="mt-2 text-xs font-medium text-midnight-700">
                  {level.timeline}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p>
          Officers are referred to by role, never by a name we have not
          earned the right to print: when your case reaches Level 2 or 3,
          the written acknowledgement names the actual officer handling it
          and how to reach their desk.
        </p>
      </LegalSection>

      <LegalSection id="timelines" title="3. Timelines at a glance">
        <LegalTable
          head={["Level", "When to use it", "Our commitment"]}
          rows={[
            [
              "1 · Customer Care & Branches",
              "Any issue, first contact",
              "Reference at once · resolution target 7 working days",
            ],
            [
              "2 · Grievance Redressal Desk",
              "Unresolved after 10 working days, or unhappy with Level 1",
              "Written response within 15 working days",
            ],
            [
              "3 · Principal Nodal Officer",
              "Unresolved at Level 2",
              "Written response within 15 working days",
            ],
            [
              "4 · Banking Ombudsman",
              "No reply in 30 days, or final reply unsatisfactory",
              "Independent review, free of cost",
            ],
          ]}
        />
        <p>
          If a timeline will slip, we tell you before it does — silence is
          never an answer we consider acceptable. If we miss the 30-day
          mark altogether, your right to approach the Ombudsman arises
          automatically; you do not need our permission or a closure letter
          from us.
        </p>
      </LegalSection>

      <LegalSection id="raise-complaint" title="4. Raise a complaint now">
        <p>
          This form opens a <strong>Level 1</strong> complaint. Keep your
          reference — quoting it at any branch, on any call, or in the app
          pulls up the whole case.
        </p>

        {status === "submitted" ? (
          <div className="animate-calc-fade-rise mt-4 rounded-card border border-success-600/40 bg-success-50 p-5">
            <div className="flex gap-3">
              <CircleCheck
                className="mt-0.5 h-6 w-6 shrink-0 text-success-600"
                aria-hidden
              />
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink-900">
                  Complaint recorded — Level 1
                </h3>
                <p className="text-sm leading-6 text-ink-700">
                  Your reference is{" "}
                  <strong className="tnum font-bold text-midnight-950 underline decoration-gold-500 underline-offset-2">
                    {reference}
                  </strong>
                  . A Level 1 acknowledgement has been issued, our resolution
                  target is 7 working days, and updates will go to the email
                  and mobile you provided. If we have not resolved it within
                  30 days, you may approach the Banking Ombudsman (section
                  5) — no further step with us is required first.
                </p>

                {user ? (
                  <p className="rounded-lg bg-white/70 p-3 text-xs leading-5 text-ink-800 border border-success-200">
                    Because you are signed in as{" "}
                    <strong>{user.name || user.fullName || "Customer"}</strong>,
                    this request has been linked to your account. You can track
                    responses and reply to staff directly in{" "}
                    <Link
                      to="/portal/support"
                      className="font-semibold text-midnight-900 underline hover:text-gold-700"
                    >
                      My Requests
                    </Link>
                    .
                  </p>
                ) : (
                  <p className="rounded-lg bg-white/70 p-3 text-xs leading-5 text-ink-800 border border-success-200">
                    Quote reference <strong>{reference}</strong> when contacting
                    customer care or visiting a branch. If you hold a FinEdge
                    account, you can also{" "}
                    <Link
                      to="/portal/login"
                      className="font-semibold text-midnight-900 underline hover:text-gold-700"
                    >
                      sign in to your portal
                    </Link>{" "}
                    to track this complaint online.
                  </p>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-lg border border-midnight-700 bg-white px-4 py-2 text-sm font-semibold text-midnight-800 transition-colors hover:bg-midnight-50 shadow-xs"
                  >
                    Raise another complaint
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-4 space-y-4 rounded-card border border-ink-200 bg-porcelain-50 p-5 shadow-card"
          >
            {status === "error" ? (
              <div className="flex gap-3 rounded-lg border border-danger-600/40 bg-danger-50 p-3">
                <TriangleAlert
                  className="mt-0.5 h-5 w-5 shrink-0 text-danger-600"
                  aria-hidden
                />
                <p className="text-sm leading-6 text-ink-700">
                  {errorMessage ||
                    "We could not record your complaint just now and nothing was submitted. Your text is still in the form — please try again, or raise it through customer care or any branch."}
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="grv-name"
                  className="mb-1.5 block text-sm font-medium text-ink-900"
                >
                  Full name
                </label>
                <input
                  id="grv-name"
                  type="text"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={set("fullName")}
                  placeholder="As on your account"
                  className={inputCls(errors.fullName)}
                />
                {errors.fullName ? (
                  <p className="mt-1 text-xs text-danger-600">{errors.fullName}</p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor="grv-mobile"
                  className="mb-1.5 block text-sm font-medium text-ink-900"
                >
                  Mobile number
                </label>
                <input
                  id="grv-mobile"
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  value={form.mobile}
                  onChange={set("mobile")}
                  placeholder="10-digit mobile"
                  className={inputCls(errors.mobile)}
                />
                {errors.mobile ? (
                  <p className="mt-1 text-xs text-danger-600">{errors.mobile}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="grv-email"
                  className="mb-1.5 block text-sm font-medium text-ink-900"
                >
                  Email address
                </label>
                <input
                  id="grv-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  className={inputCls(errors.email)}
                />
                {errors.email ? (
                  <p className="mt-1 text-xs text-danger-600">{errors.email}</p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor="grv-account"
                  className="mb-1.5 block text-sm font-medium text-ink-900"
                >
                  Account / card number{" "}
                  <span className="font-normal text-ink-500">(optional)</span>
                </label>
                <input
                  id="grv-account"
                  type="text"
                  value={form.accountRef}
                  onChange={set("accountRef")}
                  placeholder="e.g. …4821"
                  className={inputCls(false)}
                />
                <p className="mt-1 text-xs text-ink-500">
                  Last 4 digits are enough
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="grv-category"
                className="mb-1.5 block text-sm font-medium text-ink-900"
              >
                Category
              </label>
              <select
                id="grv-category"
                value={form.category}
                onChange={set("category")}
                className={inputCls(errors.category)}
              >
                <option value="">Select a category</option>
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p className="mt-1 text-xs text-danger-600">{errors.category}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="grv-subject"
                className="mb-1.5 block text-sm font-medium text-ink-900"
              >
                Subject
              </label>
              <input
                id="grv-subject"
                type="text"
                value={form.subject}
                onChange={set("subject")}
                placeholder="One line that sums up the problem"
                className={inputCls(errors.subject)}
              />
              {errors.subject ? (
                <p className="mt-1 text-xs text-danger-600">{errors.subject}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="grv-desc"
                className="mb-1.5 block text-sm font-medium text-ink-900"
              >
                What happened
              </label>
              <textarea
                id="grv-desc"
                rows={5}
                value={form.description}
                onChange={set("description")}
                placeholder="Dates, amounts, transaction references, and what you expected instead. Do not include your password, PIN or any one-time code."
                className={inputCls(errors.description)}
              />
              {errors.description ? (
                <p className="mt-1 text-xs text-danger-600">
                  {errors.description}
                </p>
              ) : null}
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink-700">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={set("consent")}
                  className="mt-1 h-4 w-4 shrink-0 accent-midnight-900"
                />
                <span>
                  I consent to FinEdge looking into the account records
                  relevant to this complaint and contacting me about it on
                  the email and mobile number above.
                </span>
              </label>
              {errors.consent ? (
                <p className="mt-1 text-xs text-danger-600">{errors.consent}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="rounded-lg bg-midnight-800 px-5 py-2.5 text-sm font-semibold text-porcelain-50 transition-colors hover:bg-midnight-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
            >
              {status === "submitting"
                ? "Recording your complaint…"
                : "Submit complaint — Level 1"}
            </button>
          </form>
        )}
      </LegalSection>

      <LegalSection id="ombudsman" title="5. The Banking Ombudsman">
        <p>
          The Banking Ombudsman is appointed by the Reserve Bank of India
          under its Integrated Ombudsman Scheme and is independent of every
          bank. The service is free. You may file a complaint with the
          Ombudsman if FinEdge has not replied within 30 days of your
          complaint, or if our final reply leaves the matter unresolved —
          provided you first complained to us in writing and file within one
          year of our reply (or, where we never replied, within one year and
          30 days of your original complaint).
        </p>
        <p>
          Complaints to the Ombudsman are filed on the Reserve Bank's
          complaint portal, <strong>cms.rbi.org.in</strong>, or through the
          Reserve Bank's contact centre. The Ombudsman may call for records
          from us, attempt a settlement by agreement, or pass an award —
          which binds us if you accept it. Nothing in this page limits any
          other remedy available to you, including consumer forums and the
          courts.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
