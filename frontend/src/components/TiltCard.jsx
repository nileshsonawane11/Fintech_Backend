import React, { useRef, useEffect, useCallback } from 'react';

/**
 * TiltCard — high-performance cursor-tracked 3D card interaction.
 *
 * Performance Contract (Fix 1):
 * - ZERO React state in animation paths (no re-renders at 60-120Hz).
 * - Pointer handlers write to refs; single rAF loop updates DOM styles directly.
 * - rAF loop runs ONLY while active/hovered and terminates completely on rest (0 idle rAF).
 * - Pauses automatically when offscreen via IntersectionObserver.
 * - Cached bounding rect on pointer-enter (no layout thrashing / getBoundingClientRect in move).
 * - will-change: transform applied ONLY while actively tilting, removed on rest.
 * - Touch & reduced-motion strictly disabled.
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
}) {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  const rectRef = useRef(null);

  const isHoveredRef = useRef(false);
  const isIntersectingRef = useRef(true);
  const rafId = useRef(null);

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

  // Check if pointer or accessibility constraints disable motion
  const isMovementDisabled = useCallback(() => {
    if (typeof window === 'undefined') return true;
    const isCoarse =
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches;
    const isReduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return isCoarse || isReduced;
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

  // Pause when offscreen via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isIntersectingRef.current = entry.isIntersecting;
          if (!entry.isIntersecting && rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
          }
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, []);

  const handlePointerEnter = (e) => {
    if (isMovementDisabled()) return;
    if (e.pointerType === 'touch') return;
    if (!containerRef.current) return;

    // Cache bounding box once on enter (Fix 5: No layout thrashing during move)
    rectRef.current = containerRef.current.getBoundingClientRect();
    isHoveredRef.current = true;

    if (cardRef.current && enableFloat) {
      cardRef.current.classList.remove('animate-card-float');
    }

    startLoop();
  };

  const handlePointerMove = (e) => {
    if (isMovementDisabled()) return;
    if (e.pointerType === 'touch') return;
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

  const handlePointerLeave = () => {
    isHoveredRef.current = false;

    // Smooth return to resting flat state
    targetRef.current.rotateX = 0;
    targetRef.current.rotateY = 0;
    targetRef.current.glareOpacity = 0;

    if (cardRef.current && enableFloat) {
      cardRef.current.classList.add('animate-card-float');
    }

    startLoop();
  };

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[400/252] w-full select-none ${className}`}
      style={{ perspective: `${perspective}px` }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
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
