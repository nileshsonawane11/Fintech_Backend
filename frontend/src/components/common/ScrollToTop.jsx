import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

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
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
