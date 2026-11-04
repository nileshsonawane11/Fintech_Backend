/**
 * Reveal — Module 19 scroll-animation system.
 *
 * Architecture
 * ─────────────
 * One shared IntersectionObserver for the entire page (created once, never
 * duplicated). CSS does all the visual work (transition on `data-revealed`
 * attribute change). React's only job is to add / remove attribute and keep
 * a ref registered with the shared observer.
 *
 * Armed-only hiding
 * ─────────────────
 * Elements are hidden only when `<html>` carries the class `js-reveal-armed`.
 * That class is added by the observer setup — if JS never runs (or IO is
 * unavailable, or prefers-reduced-motion is set) the class is never added
 * and everything stays visible. All content is present in the DOM from the
 * first paint; opacity/transform are the only things that move.
 *
 * Treatments (data-reveal-treatment)
 * ────────────────────────────────────
 * A  header-sequence  eyebrow hairline + H2 rise + description rise
 * B  rise-stagger     cards / items: rise + fade, stagger via CSS var
 * C  divider-cascade  list rows: fade + top border draws scaleX
 * D  curtain          visuals: overlay slides up, image settles from scale(1.04)
 * E  underline        stat figures: rise + fade + gold 2px underline scaleX after landing
 *
 * Props
 * ─────
 * treatment   A | B | C | D | E   (default "B")
 * staggerIndex  number             CSS --stagger-index custom prop (0-based)
 * as          element tag          wrapper tag (default "div")
 * className   string
 * children    ReactNode
 *
 * All other props are forwarded to the wrapper element.
 */

import React, { useEffect, useRef } from 'react';

/* ── Shared single observer ────────────────────────────────────────────── */

let _observer = null;
let _armed = false;

function getObserver() {
  if (_observer) return _observer;

  // Graceful degrade: no IO → never arm, always visible
  if (typeof IntersectionObserver === 'undefined') return null;

  // Respect reduced-motion: never arm → always visible
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return null;
  }

  // Arm hiding — only after we know IO is available and motion is ok
  if (!_armed) {
    document.documentElement.classList.add('js-reveal-armed');
    _armed = true;
  }

  _observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting || entry.boundingClientRect.bottom < window.innerHeight * 0.92) {
          const el = entry.target;
          el.setAttribute('data-revealed', '');
          // Remove will-change after the transition finishes to free GPU layer
          el.addEventListener(
            'transitionend',
            () => {
              el.style.willChange = '';
            },
            { once: true },
          );
          setTimeout(() => {
            if (el) el.style.willChange = '';
          }, 1100);
          _observer.unobserve(el);
        }
      }
    },
    {
      threshold: 0.05,
      rootMargin: '0px 0px -4% 0px',
    },
  );

  return _observer;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function Reveal({
  children,
  treatment = 'B',
  staggerIndex,
  as: Tag = 'div',
  className = '',
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const io = getObserver();

    if (!io) {
      // No animation: ensure element is fully visible
      el.setAttribute('data-revealed', '');
      return undefined;
    }

    // Elements hidden on current viewport (e.g. hidden md:block on mobile)
    if (window.getComputedStyle(el).display === 'none') {
      el.setAttribute('data-revealed', '');
      return undefined;
    }

    // Scrolled-past elements (Fix 5: deep-link arrival e.g. /#faq, restored scroll position)
    // Any element already above the viewport or scrolled to on load settles immediately
    const rect = el.getBoundingClientRect();
    if (rect.bottom < window.innerHeight * 0.92 && (window.scrollY > 80 || rect.bottom < 0)) {
      el.setAttribute('data-revealed', '');
      return undefined;
    }

    // Hint GPU compositor for elements about to animate
    el.style.willChange = 'opacity, transform';
    io.observe(el);

    return () => io.unobserve(el);
    // intentionally empty dep array — element ref is stable for the component's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style =
    staggerIndex !== undefined
      ? { '--stagger-index': staggerIndex }
      : undefined;

  return (
    <Tag
      ref={ref}
      data-reveal={treatment}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </Tag>
  );
}
