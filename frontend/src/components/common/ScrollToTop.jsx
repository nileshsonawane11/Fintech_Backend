import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop — Module 35 Fix 1: Route continuity scroll behavior.
 * - Forward navigation (PUSH / REPLACE) scrolls to (0, 0) instantly.
 * - Back/forward navigation (POP) preserves the prior scroll position.
 * - Hash anchors (#target) scroll smoothly to the target element with highlight.
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '');
      const scrollToTarget = () => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.remove('target-pulse-highlight');
          // Force reflow for re-triggering animation if already clicked
          void element.offsetWidth;
          element.classList.add('target-pulse-highlight');
          setTimeout(() => {
            element.classList.remove('target-pulse-highlight');
          }, 1200);
          return true;
        }
        return false;
      };

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (scrollToTarget() || attempts >= 8) {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      // For POP (history navigation), preserve the previous scroll position
      if (navType !== 'POP') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }
  }, [pathname, hash, navType]);

  return null;
};

export default ScrollToTop;
