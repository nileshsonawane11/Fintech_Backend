import { Clock, TriangleAlert } from "lucide-react";

/**
 * LegalLayout — shared shell for every Legal & Trust page.
 *
 * Gives each document the same furniture: a pine title band with the
 * document name and last-updated line, a sticky section index on the
 * left, a ~70ch reading measure for the prose, and the standing
 * demonstration-brand notice at the foot. Pages supply their sections
 * as <LegalSection> blocks and pass the same list (id + label) as the
 * `sections` prop so the index always matches the document.
 */
export default function LegalLayout({
  title,
  subtitle,
  updated = "31 October 2026",
  sections = [],
  children,
}) {
  return (
    <main className="bg-porcelain-100">
      {/* ── Title band ─────────────────────────────────────────── */}
      <div className="bg-midnight-900 text-porcelain-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">
            FinEdge Bank · Legal &amp; Trust
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-porcelain-50 sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-[70ch] text-[15px] leading-7 text-porcelain-200">
              {subtitle}
            </p>
          ) : null}
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-midnight-700 bg-midnight-800 px-3 py-1.5 text-xs font-medium text-porcelain-200">
            <Clock className="h-3.5 w-3.5 text-gold-300" aria-hidden />
            Last updated: {updated}
          </p>
        </div>
      </div>

      {/* ── Body: section index + document ─────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav
              aria-label="On this page"
              className="sticky top-24 rounded-card border border-ink-200 bg-porcelain-50 p-4 shadow-card"
            >
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                On this page
              </p>
              <ul className="mt-3 space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-md px-2 py-1.5 text-sm text-ink-700 transition-colors hover:bg-midnight-50 hover:text-midnight-800"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0">
            <div className="max-w-[70ch]">{children}</div>

            {/* Standing honesty notice — registration facts a licensed
                bank would print here are deliberately NOT invented. */}
            <div className="mt-12 flex max-w-[70ch] gap-3 rounded-card border border-gold-300 bg-gold-50 p-4">
              <TriangleAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-gold-700"
                aria-hidden
              />
              <div className="text-sm leading-6 text-ink-700">
                <p className="font-semibold text-ink-900">
                  Demonstration brand notice
                </p>
                <p className="mt-1">
                  FinEdge Bank is a demonstration brand built for an
                  industry training project. It is not a licensed bank, and
                  details a licensed institution would publish here — such
                  as a corporate identity number, a banking licence number
                  or named regulatory officers — are intentionally left
                  unstated rather than invented. Balances, rates and
                  transactions shown on this platform are simulated.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

/**
 * LegalSection — one numbered-feeling document section with an anchor
 * id that the layout's index links to. Prose inside inherits a calm
 * reading style (15px / relaxed leading, styled lists and emphasis).
 */
export function LegalSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28 pt-9 first:pt-0">
      <h2 className="font-display text-[22px] font-semibold leading-snug text-midnight-900">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink-700 [&_li]:leading-7 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/**
 * LegalTable — the one table treatment for legal documents (charges,
 * retention periods, timelines). Horizontally scrollable on small
 * screens so figures never clip.
 */
export function LegalTable({ caption, head, rows }) {
  return (
    <figure className="my-5">
      {caption ? (
        <figcaption className="mb-2 text-sm font-semibold text-ink-900">
          {caption}
        </figcaption>
      ) : null}
      <div className="overflow-x-auto rounded-card border border-ink-200 bg-porcelain-50 shadow-card">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-midnight-800 text-left text-porcelain-50">
              {head.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-porcelain-50" : "bg-porcelain-100"}
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`border-t border-ink-100 px-4 py-3 align-top leading-6 ${
                      j === 0 ? "font-medium text-ink-900" : "text-ink-700"
                    } ${typeof cell === "string" && cell.startsWith("₹") ? "tnum whitespace-nowrap" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
