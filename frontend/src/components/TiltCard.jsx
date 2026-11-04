import React, { useRef, useEffect, useCallback } from 'react';

// Global registry of cards that have performed entry sweep (prevents replaying on re-scroll or tab switches)
const sweptCardKeys = new Set();

/**
 * TiltCard — high-performance 3D card interaction for cursor hover & touch drag.
 *
 * Performance Contract (Module 15 & Module 25):
 * - ZERO React state in animation paths (no re-renders at 60-120Hz).
 * - Pointer handlers write to refs; single rAF loop updates DOM styles directly.
 * - rAF loop runs ONLY while active/hovered and terminates completely on rest (0 idle rAF).
 * - Pauses automatically when offscreen via IntersectionObserver.
 * - touch-action: pan-y preserves vertical page scrolling without fighting.
 * - Drag engages on predominantly horizontal movement (>8px), suppressing synthetic click on release.
 * - Entry sweep (touch devices only): gentle 600ms rotateY -5° -> 0° once per card per page load.
 * - Tap pulse: quick 250ms tilt (~4°) acknowledgement without delaying click.
 * - prefers-reduced-motion strictly disables all animations.
 */
export function TiltCard({
  children,
  className = '',
  maxTilt = 10,
  perspective = 900,
  lerpFactor = 0.12,
  enableFloat = false,
  glare = true,
  shadow = true,
  shadowBaseY = 16,
  shadowFactor = 1.8,
  shadowBlur = 24,
  borderRadius = '1rem',
  overlay = null,
  role = 'presentation',
  'aria-hidden': ariaHidden = true,
  sweepKey = null,
}) {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  const rectRef = useRef(null);

  const isHoveredRef = useRef(false);
  const isIntersectingRef = useRef(true);
  const rafId = useRef(null);
  const sweepRafId = useRef(null);
  const pulseRafId = useRef(null);

  // Touch tracking refs
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchTrackingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const hasSweptRef = useRef(false);

  // Physics LERP state kept in refs
  const targetRef = useRef({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
  });

  const currentRef = useRef({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
  });

  const isReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const isCoarsePointer = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches
    );
  }, []);

  // Animation frame loop
  const step = useCallback(() => {
    if (!isIntersectingRef.current) {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      return;
    }

    const cur = currentRef.current;
    const tgt = targetRef.current;

    cur.rotateX += (tgt.rotateX - cur.rotateX) * lerpFactor;
    cur.rotateY += (tgt.rotateY - cur.rotateY) * lerpFactor;
    cur.glareX += (tgt.glareX - cur.glareX) * lerpFactor;
    cur.glareY += (tgt.glareY - cur.glareY) * lerpFactor;
    cur.glareOpacity += (tgt.glareOpacity - cur.glareOpacity) * lerpFactor;

    // Check if motion has settled to resting flat state
    const isSettled =
      !isHoveredRef.current &&
      Math.abs(cur.rotateX) < 0.05 &&
      Math.abs(cur.rotateY) < 0.05 &&
      cur.glareOpacity < 0.008;

    if (isSettled) {
      cur.rotateX = 0;
      cur.rotateY = 0;
      cur.glareOpacity = 0;

      // Apply resting styles directly to DOM
      if (cardRef.current) {
        cardRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
        cardRef.current.style.willChange = 'auto';
        cardRef.current.style.zIndex = '1';
        if (shadow) {
          cardRef.current.style.boxShadow =
            '0 12px 28px -6px rgba(10, 30, 53, 0.3), 0 4px 10px -2px rgba(10, 30, 53, 0.15)';
        }
      }
      if (glareRef.current) {
        glareRef.current.style.opacity = '0';
      }

      rafId.current = null;
      return; // Stop rAF loop: 0 overhead while resting
    }

    // Direct DOM write for 60-120fps performance
    if (cardRef.current) {
      cardRef.current.style.transform = `rotateX(${cur.rotateX.toFixed(2)}deg) rotateY(${cur.rotateY.toFixed(2)}deg)`;
      cardRef.current.style.willChange = 'transform';
      cardRef.current.style.zIndex = '25';

      if (shadow) {
        const shadowX = -cur.rotateY * shadowFactor;
        const shadowY = shadowBaseY + cur.rotateX * shadowFactor;
        cardRef.current.style.boxShadow = `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px ${shadowBlur}px rgba(10, 30, 53, 0.4)`;
      }
    }

    if (glare && glareRef.current) {
      glareRef.current.style.opacity = cur.glareOpacity > 0.005 ? cur.glareOpacity.toFixed(3) : '0';
      glareRef.current.style.background = `radial-gradient(circle 240px at ${cur.glareX.toFixed(1)}% ${cur.glareY.toFixed(1)}%, rgba(255, 255, 255, 0.35), transparent 75%)`;
    }

    rafId.current = requestAnimationFrame(step);
  }, [glare, lerpFactor, shadow, shadowBaseY, shadowBlur, shadowFactor]);

  const startLoop = useCallback(() => {
    if (!rafId.current && isIntersectingRef.current) {
      rafId.current = requestAnimationFrame(step);
    }
  }, [step]);

  // Touch Entry Sweep (~600ms, rotateY -5° -> 0°, single glare pass)
  const runEntrySweep = useCallback(() => {
    if (isReducedMotion() || !isCoarsePointer() || !cardRef.current) return;

    const startTime = performance.now();
    const duration = 600;

    const sweepStep = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const rY = -5 * (1 - ease);
      const gX = 25 + 50 * ease;
      const gOpacity = 0.28 * Math.sin(progress * Math.PI);

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateX(0deg) rotateY(${rY.toFixed(2)}deg)`;
        cardRef.current.style.willChange = 'transform';
        if (shadow) {
          const shadowX = -rY * shadowFactor;
          const shadowY = shadowBaseY;
          cardRef.current.style.boxShadow = `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px ${shadowBlur}px rgba(10, 30, 53, 0.4)`;
        }
      }

      if (glare && glareRef.current) {
        glareRef.current.style.opacity = gOpacity.toFixed(3);
        glareRef.current.style.background = `radial-gradient(circle 240px at ${gX.toFixed(1)}% 50%, rgba(255, 255, 255, 0.35), transparent 75%)`;
      }

      if (progress < 1) {
        sweepRafId.current = requestAnimationFrame(sweepStep);
      } else {
        sweepRafId.current = null;
        if (cardRef.current) {
          cardRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
          cardRef.current.style.willChange = 'auto';
          if (shadow) {
            cardRef.current.style.boxShadow =
              '0 12px 28px -6px rgba(10, 30, 53, 0.3), 0 4px 10px -2px rgba(10, 30, 53, 0.15)';
          }
        }
        if (glareRef.current) {
          glareRef.current.style.opacity = '0';
        }
      }
    };

    sweepRafId.current = requestAnimationFrame(sweepStep);
  }, [glare, isCoarsePointer, isReducedMotion, shadow, shadowBaseY, shadowBlur, shadowFactor]);

  // Touch Tap Pulse (~250ms, tilt to ~4° and back)
  const runTapPulse = useCallback(() => {
    if (isReducedMotion() || !cardRef.current) return;

    const startTime = performance.now();
    const duration = 250;

    const pulseStep = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const pulse = Math.sin(progress * Math.PI);

      const rY = 4 * pulse;
      const rX = -1.5 * pulse;
      const gOpacity = 0.22 * pulse;

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateX(${rX.toFixed(2)}deg) rotateY(${rY.toFixed(2)}deg)`;
        cardRef.current.style.willChange = 'transform';
        if (shadow) {
          const shadowX = -rY * shadowFactor;
          const shadowY = shadowBaseY + rX * shadowFactor;
          cardRef.current.style.boxShadow = `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px ${shadowBlur}px rgba(10, 30, 53, 0.4)`;
        }
      }

      if (glare && glareRef.current) {
        glareRef.current.style.opacity = gOpacity.toFixed(3);
        glareRef.current.style.background = `radial-gradient(circle 240px at 50% 50%, rgba(255, 255, 255, 0.35), transparent 75%)`;
      }

      if (progress < 1) {
        pulseRafId.current = requestAnimationFrame(pulseStep);
      } else {
        pulseRafId.current = null;
        if (cardRef.current) {
          cardRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
          cardRef.current.style.willChange = 'auto';
          if (shadow) {
            cardRef.current.style.boxShadow =
              '0 12px 28px -6px rgba(10, 30, 53, 0.3), 0 4px 10px -2px rgba(10, 30, 53, 0.15)';
          }
        }
        if (glareRef.current) {
          glareRef.current.style.opacity = '0';
        }
      }
    };

    pulseRafId.current = requestAnimationFrame(pulseStep);
  }, [glare, isReducedMotion, shadow, shadowBaseY, shadowBlur, shadowFactor]);

  // Pause when offscreen via IntersectionObserver & Trigger Entry Sweep on touch
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isIntersectingRef.current = entry.isIntersecting;
          if (!entry.isIntersecting) {
            if (rafId.current) {
              cancelAnimationFrame(rafId.current);
              rafId.current = null;
            }
            if (sweepRafId.current) {
              cancelAnimationFrame(sweepRafId.current);
              sweepRafId.current = null;
            }
            if (pulseRafId.current) {
              cancelAnimationFrame(pulseRafId.current);
              pulseRafId.current = null;
            }
          } else {
            // Check entry sweep on coarse-pointer (touch) devices
            const key = sweepKey || el;
            if (
              isCoarsePointer() &&
              !isReducedMotion() &&
              !hasSweptRef.current &&
              !sweptCardKeys.has(key) &&
              el.offsetParent !== null
            ) {
              hasSweptRef.current = true;
              sweptCardKeys.add(key);
              runEntrySweep();
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isCoarsePointer, isReducedMotion, runEntrySweep, sweepKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (sweepRafId.current) cancelAnimationFrame(sweepRafId.current);
      if (pulseRafId.current) cancelAnimationFrame(pulseRafId.current);
    };
  }, []);

  // Desktop Pointer Handlers (Fine-pointer / mouse hover)
  const handlePointerEnter = (e) => {
    if (isReducedMotion() || e.pointerType === 'touch') return;
    if (!containerRef.current) return;

    rectRef.current = containerRef.current.getBoundingClientRect();
    isHoveredRef.current = true;

    if (cardRef.current && enableFloat) {
      cardRef.current.classList.remove('animate-card-float');
    }

    startLoop();
  };

  const handlePointerMove = (e) => {
    if (isReducedMotion()) return;
    if (e.pointerType === 'touch') {
      handleTouchMove(e);
      return;
    }
    if (!rectRef.current && containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect();
      isHoveredRef.current = true;
    }
    if (!rectRef.current) return;

    const rect = rectRef.current;
    if (rect.width === 0 || rect.height === 0) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const px = Math.max(-1, Math.min(1, (x - centerX) / centerX));
    const py = Math.max(-1, Math.min(1, (y - centerY) / centerY));

    targetRef.current.rotateY = px * maxTilt;
    targetRef.current.rotateX = -py * maxTilt;
    targetRef.current.glareX = (x / rect.width) * 100;
    targetRef.current.glareY = (y / rect.height) * 100;
    targetRef.current.glareOpacity = 0.32;

    startLoop();
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType === 'touch') return;
    isHoveredRef.current = false;

    targetRef.current.rotateX = 0;
    targetRef.current.rotateY = 0;
    targetRef.current.glareOpacity = 0;

    if (cardRef.current && enableFloat) {
      cardRef.current.classList.add('animate-card-float');
    }

    startLoop();
  };

  // Touch Pointer Handlers (Press-and-drag tilt + tap pulse)
  const handlePointerDown = (e) => {
    if (isReducedMotion() || e.pointerType !== 'touch') return;

    if (sweepRafId.current) {
      cancelAnimationFrame(sweepRafId.current);
      sweepRafId.current = null;
    }
    if (pulseRafId.current) {
      cancelAnimationFrame(pulseRafId.current);
      pulseRafId.current = null;
    }

    if (!containerRef.current) return;
    rectRef.current = containerRef.current.getBoundingClientRect();

    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
    };
    touchTrackingRef.current = true;
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!touchTrackingRef.current || !rectRef.current) return;

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;

    if (!isDraggingRef.current) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Horizontal swipe threshold: 8px and predominantly horizontal
      if (absDx >= 8 && absDx > absDy) {
        isDraggingRef.current = true;
        isHoveredRef.current = true;
        try {
          e.target.setPointerCapture?.(e.pointerId);
        } catch (_) {}
      } else if (absDy >= 8 && absDy > absDx) {
        // Vertical page scroll — cancel touch tracking immediately so scroll is free and unhindered
        touchTrackingRef.current = false;
        return;
      } else {
        return;
      }
    }

    // Drag is active — tilt follows finger
    const rect = rectRef.current;
    if (rect.width === 0 || rect.height === 0) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const px = Math.max(-1, Math.min(1, (x - centerX) / centerX));
    const py = Math.max(-1, Math.min(1, (y - centerY) / centerY));

    targetRef.current.rotateY = px * maxTilt;
    targetRef.current.rotateX = -py * (maxTilt * 0.75);
    targetRef.current.glareX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    targetRef.current.glareY = Math.max(0, Math.min(100, (y / rect.height) * 100));
    targetRef.current.glareOpacity = 0.35;

    startLoop();
  };

  const handlePointerUp = (e) => {
    if (e.pointerType !== 'touch') return;
    if (!touchTrackingRef.current && !isDraggingRef.current) return;

    const wasDragging = isDraggingRef.current;
    const duration = performance.now() - touchStartRef.current.time;

    touchTrackingRef.current = false;
    isDraggingRef.current = false;
    isHoveredRef.current = false;

    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch (_) {}

    if (wasDragging) {
      // Suppress synthetic click when dragged beyond threshold
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 120);

      // Ease back to flat with existing settle logic
      targetRef.current.rotateX = 0;
      targetRef.current.rotateY = 0;
      targetRef.current.glareOpacity = 0;
      startLoop();
    } else if (duration < 280) {
      // Tap pulse: small acknowledgement ~4° and back over ~250ms
      runTapPulse();
    }
  };

  const handlePointerCancel = (e) => {
    if (e.pointerType !== 'touch') return;
    touchTrackingRef.current = false;
    isDraggingRef.current = false;
    isHoveredRef.current = false;

    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch (_) {}

    targetRef.current.rotateX = 0;
    targetRef.current.rotateY = 0;
    targetRef.current.glareOpacity = 0;
    startLoop();
  };

  const handleClickCapture = (e) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[400/252] w-full select-none touch-pan-y ${className}`}
      style={{ perspective: `${perspective}px`, touchAction: 'pan-y' }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      role={role}
      aria-hidden={ariaHidden}
    >
      <div
        ref={cardRef}
        className={`relative w-full h-full ${enableFloat ? 'animate-card-float' : ''}`}
        style={{
          transform: 'rotateX(0deg) rotateY(0deg)',
          transformStyle: 'preserve-3d',
          borderRadius,
          boxShadow: shadow
            ? '0 12px 28px -6px rgba(10, 30, 53, 0.3), 0 4px 10px -2px rgba(10, 30, 53, 0.15)'
            : 'none',
          transition: 'box-shadow 0.3s ease-out',
        }}
      >
        {/* Tilting card contents */}
        {children}

        {/* Glare Layer — sweeps with pointer */}
        {glare && (
          <div
            ref={glareRef}
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
            style={{
              borderRadius,
              opacity: 0,
              mixBlendMode: 'screen',
              transition: 'opacity 0.15s ease-out',
            }}
          />
        )}

        {/* Optional pop-out overlay layer (e.g. hero chip on translateZ) */}
        {overlay}
      </div>
    </div>
  );
}

export default TiltCard;
