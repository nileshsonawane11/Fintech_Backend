import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WHY_FINEDGE_SLIDES = [
  {
    id: 'advisory',
    caption: 'Advisory, in person',
    alt: 'Bank advisor consulting with a client across a desk with paperwork and laptop',
    src: '/images/slider-advisory-1200.webp',
    srcSet: '/images/slider-advisory-400.webp 400w, /images/slider-advisory-800.webp 800w, /images/slider-advisory-1200.webp 1200w, /images/slider-advisory-1600.webp 1600w',
    thumb: '/images/slider-advisory-thumb.webp',
    width: 1200,
    height: 800,
  },
  {
    id: 'branch',
    caption: 'Built for walk-ins',
    alt: 'Modern bank branch interior with open walk-in service counters and consultation seating',
    src: '/images/slider-branch-1200.webp',
    srcSet: '/images/slider-branch-400.webp 400w, /images/slider-branch-800.webp 800w, /images/slider-branch-1200.webp 1200w, /images/slider-branch-1600.webp 1600w',
    thumb: '/images/slider-branch-thumb.webp',
    width: 1200,
    height: 800,
  },
  {
    id: 'advisor',
    caption: 'People who know your file',
    alt: 'Financial advisor reviewing client portfolio documentation at an office desk',
    src: '/images/slider-advisor-1200.webp',
    srcSet: '/images/slider-advisor-400.webp 400w, /images/slider-advisor-800.webp 800w, /images/slider-advisor-1200.webp 1200w, /images/slider-advisor-1600.webp 1600w',
    thumb: '/images/slider-advisor-thumb.webp',
    width: 1200,
    height: 800,
  },
  {
    id: 'support',
    caption: 'Help that answers · 1800 267 4100',
    alt: 'Customer support operations team at workstations assisting callers with headsets',
    src: '/images/slider-support-1200.webp',
    srcSet: '/images/slider-support-400.webp 400w, /images/slider-support-800.webp 800w, /images/slider-support-1200.webp 1200w, /images/slider-support-1600.webp 1600w',
    thumb: '/images/slider-support-thumb.webp',
    width: 1200,
    height: 800,
  },
  {
    id: 'app',
    caption: 'The app, as it is.',
    alt: 'FinEdge NetBanking mobile application interface with account balances and card controls',
    src: '/images/slider-app-1200.webp',
    srcSet: '/images/slider-app-400.webp 400w, /images/slider-app-800.webp 800w, /images/slider-app-1200.webp 1200w, /images/slider-app-1600.webp 1600w',
    thumb: '/images/slider-app-thumb.webp',
    width: 1200,
    height: 900,
  },
];

export function PhotoSlider({ slides = WHY_FINEDGE_SLIDES, className = '' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const touchStartRef = useRef(null);
  const sliderRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(media.matches);
    const listener = (e) => setIsReducedMotion(e.matches);
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, []);

  const total = slides.length;

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  }, [total]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  const handlePointerDown = (e) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Must be predominantly horizontal swipe > 36px
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const currentSlide = slides[activeIndex];

  return (
    <div
      ref={sliderRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Why FinEdge photography showcase"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`group relative flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 rounded-2xl ${className}`}
    >
      {/* Visual Frame */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink-100 bg-midnight-950 shadow-card select-none touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div className="relative h-full w-full" aria-live="polite">
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${idx + 1} of ${total}: ${slide.caption}`}
                aria-hidden={!isActive}
                className={`absolute inset-0 h-full w-full ${
                  isReducedMotion
                    ? isActive
                      ? 'opacity-100 z-10'
                      : 'opacity-0 pointer-events-none z-0'
                    : `transition-all duration-240 ease-out ${
                        isActive
                          ? 'opacity-100 scale-100 z-10 pointer-events-auto'
                          : 'opacity-0 scale-[1.02] z-0 pointer-events-none'
                      }`
                }`}
              >
                <picture className="block h-full w-full">
                  <source
                    type="image/webp"
                    srcSet={slide.srcSet}
                    sizes="(min-width: 1024px) 580px, 100vw"
                  />
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    width={slide.width}
                    height={slide.height}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="h-full w-full object-cover object-center"
                  />
                </picture>

                {/* Subtle bottom vignette to ensure caption contrast */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-midnight-950/85 via-midnight-950/40 to-transparent"
                  aria-hidden="true"
                />

                {/* Honest caption line */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-3 text-porcelain-50">
                  <p className="text-xs sm:text-sm font-medium tracking-wide drop-shadow-sm text-porcelain-100">
                    {slide.caption}
                  </p>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-midnight-900/80 backdrop-blur-xs border border-porcelain-50/20 text-porcelain-200">
                    {idx + 1} / {total}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prev / Next Round Buttons */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous photograph"
          className="cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-midnight-950/70 text-porcelain-50 backdrop-blur-sm border border-porcelain-50/15 shadow-sm transition-all duration-160 hover:bg-midnight-900 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-gold-500"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next photograph"
          className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-midnight-950/70 text-porcelain-50 backdrop-blur-sm border border-porcelain-50/15 shadow-sm transition-all duration-160 hover:bg-midnight-900 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-gold-500"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation Controls: Dots + Thumbnail Strip */}
      <div className="mt-3 flex items-center justify-between gap-4">
        {/* Indicator Dots */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slide dots">
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1}: ${slide.caption}`}
                onClick={() => setActiveIndex(idx)}
                className={`cursor-pointer rounded-full transition-all duration-180 focus-visible:outline-2 focus-visible:outline-gold-500 ${
                  isActive
                    ? 'h-2 w-6 bg-gold-500'
                    : 'h-2 w-2 bg-ink-300 hover:bg-ink-400'
                }`}
              />
            );
          })}
        </div>

        {/* Thumbnail Preview Strip (Desktop fine pointer) */}
        <div className="hidden sm:flex items-center gap-2" aria-hidden="true">
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                tabIndex={-1}
                onClick={() => setActiveIndex(idx)}
                className={`cursor-pointer relative h-9 w-14 overflow-hidden rounded-md border transition-all duration-160 ${
                  isActive
                    ? 'border-gold-500 ring-2 ring-gold-500/30 shadow-xs'
                    : 'border-ink-200 opacity-60 hover:opacity-100 hover:border-ink-400'
                }`}
              >
                <img
                  src={slide.thumb}
                  alt=""
                  width="56"
                  height="36"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PhotoSlider;
