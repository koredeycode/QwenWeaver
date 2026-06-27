import React, { useState, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/index.js';
import { getCanvasNodeScreenCoords } from './getCanvasNodeScreenCoords.js';
import type { TourStep, TourTarget, SpotlightBox } from './types.js';

/* ------------------------------------------------------------------ */
/*  Coordinate calculation                                             */
/* ------------------------------------------------------------------ */

function resolveSingleTarget(target: TourTarget): SpotlightBox | null {
  if (target.type === 'dom_selector') {
    const el = document.querySelector(target.value);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    return {
      x: rect.x - pad,
      y: rect.y - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    };
  }
  return getCanvasNodeScreenCoords(target.value);
}

/**
 * Resolve all targets for a step and return the combined bounding box plus
 * every individual rect. If no targets resolve, returns null.
 */
function computeCombinedSpotlight(
  step: TourStep,
): { combined: SpotlightBox; individual: SpotlightBox[] } | null {
  const individual: SpotlightBox[] = [];

  for (const t of step.targets) {
    const box = resolveSingleTarget(t);
    if (box) individual.push(box);
  }

  if (individual.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of individual) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }

  const pad = 12;
  const combined: SpotlightBox = {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };

  return { combined, individual };
}

/* ------------------------------------------------------------------ */
/*  Tooltip positioning with collision detection                        */
/* ------------------------------------------------------------------ */

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipPos {
  left: number;
  top: number;
  side: TooltipSide;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeTooltipPosition(
  box: SpotlightBox,
  tw: number,
  th: number,
  gap: number,
  viewW: number,
  viewH: number,
): TooltipPos {
  const fits = (l: number, t: number) => l >= 0 && t >= 0 && l + tw <= viewW && t + th <= viewH;

  // prettier-ignore
  const sides: { left: number; top: number; side: TooltipSide }[] = [
    { left: box.x + box.width / 2 - tw / 2, top: box.y + box.height + gap, side: 'bottom' },
    { left: box.x + box.width / 2 - tw / 2, top: box.y - th - gap,        side: 'top'    },
    { left: box.x + box.width + gap,         top: box.y + box.height / 2 - th / 2, side: 'right' },
    { left: box.x - tw - gap,                top: box.y + box.height / 2 - th / 2, side: 'left'  },
  ];

  for (const s of sides) {
    if (fits(s.left, s.top)) return s;
  }

  // Fallback – centre on screen but keep within bounds
  return {
    left: clamp((viewW - tw) / 2, 8, viewW - tw - 8),
    top: clamp((viewH - th) / 2, 8, viewH - th - 8),
    side: 'bottom',
  };
}

/* ------------------------------------------------------------------ */
/*  Animation helpers (cubic ease-out)                                  */
/* ------------------------------------------------------------------ */

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerpBox(a: SpotlightBox, b: SpotlightBox, t: number): SpotlightBox {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
  };
}

/* ------------------------------------------------------------------ */
/*  SpotlightOverlay                                                    */
/* ------------------------------------------------------------------ */

export const SpotlightOverlay = () => {
  const isTourActive = useStore((s) => s.isTourActive);
  const currentStepIndex = useStore((s) => s.currentStepIndex);
  const steps = useStore((s) => s.steps);
  const nextStep = useStore((s) => s.nextStep);
  const prevStep = useStore((s) => s.prevStep);
  const endTour = useStore((s) => s.endTour);

  const activeStep: TourStep | undefined = steps[currentStepIndex];

  const [spotlight, setSpotlight] = useState<{
    combined: SpotlightBox;
    individual: SpotlightBox[];
  } | null>(null);
  const animRef = useRef<SpotlightBox | null>(null);
  const rafId = useRef(0);

  /* ---- compute target box & animate spotlight ---- */
  useLayoutEffect(() => {
    if (!isTourActive || !activeStep) {
      setSpotlight(null);
      animRef.current = null;
      return;
    }

    const resolved = computeCombinedSpotlight(activeStep);
    if (!resolved) {
      animRef.current = null;
      setSpotlight(null);
      return;
    }
    const target = resolved.combined;
    const start = animRef.current ?? target;

    if (!start) {
      animRef.current = target;
      setSpotlight(resolved);
      return;
    }

    const DURATION = 400;
    const t0 = performance.now();
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const p = Math.min((now - t0) / DURATION, 1);
      const cur = lerpBox(start, target, easeOutCubic(p));
      animRef.current = cur;
      setSpotlight({ combined: cur, individual: resolved.individual });
      if (p < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        animRef.current = target;
      }
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId.current);
    };
  }, [activeStep, isTourActive]);

  /* ---- recalc on resize / scroll ---- */
  const recalc = useCallback(() => {
    if (!isTourActive || !activeStep) return;
    const resolved = computeCombinedSpotlight(activeStep);
    if (resolved) {
      animRef.current = resolved.combined;
      setSpotlight(resolved);
    } else {
      animRef.current = null;
      setSpotlight(null);
    }
  }, [activeStep, isTourActive]);

  useLayoutEffect(() => {
    if (!isTourActive) return;
    recalc();

    const ro = new ResizeObserver(recalc);
    ro.observe(document.body);

    const handleScroll = () => recalc();
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      ro.disconnect();
      document.removeEventListener('scroll', handleScroll);
    };
  }, [isTourActive, recalc]);

  /* ---- tooltip position ---- */
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const TOOLTIP_W = 300;
  const TOOLTIP_H = 200;

  const tooltip = useMemo<TooltipPos & { isCentered: boolean }>(() => {
    if (!spotlight) {
      return {
        left: clamp((viewW - TOOLTIP_W) / 2, 8, viewW - TOOLTIP_W - 8),
        top: clamp((viewH - TOOLTIP_H) / 2, 8, viewH - TOOLTIP_H - 8),
        side: 'bottom',
        isCentered: true,
      };
    }
    return {
      ...computeTooltipPosition(spotlight.combined, TOOLTIP_W, TOOLTIP_H, 14, viewW, viewH),
      isCentered: false,
    };
  }, [spotlight, viewW, viewH]);

  /* ---- render ---- */
  if (!isTourActive || !activeStep) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* ---------- SVG spotlight mask + dark overlay ---------- */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        {spotlight && !tooltip.isCentered && (
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {spotlight.individual.map((r, i) => (
                <rect
                  key={i}
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  fill="black"
                  rx="6"
                />
              ))}
            </mask>
          </defs>
        )}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask={spotlight && !tooltip.isCentered ? 'url(#tour-spotlight-mask)' : undefined}
        />
      </svg>

      {/* ---------- backdrop blur (CSS mask referencing SVG mask) ---------- */}
      <div
        className="absolute inset-0"
        style={{
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          mask: spotlight && !tooltip.isCentered ? 'url(#tour-spotlight-mask)' : undefined,
          WebkitMask: spotlight && !tooltip.isCentered ? 'url(#tour-spotlight-mask)' : undefined,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
        }}
      />

      {/* ---------- Tooltip card ---------- */}
      <div
        className="absolute bg-white border border-[#cbd5e1] shadow-xl"
        style={{
          width: TOOLTIP_W,
          left: tooltip.left,
          top: tooltip.top,
          pointerEvents: 'auto',
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pb-0 pt-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <button
            onClick={endTour}
            className="border border-slate-200 p-1 text-slate-400 hover:text-slate-700"
            aria-label="Dismiss tour"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pb-3 pt-1.5">
          <h3 className="mb-1 text-sm font-bold text-slate-900">{activeStep.title}</h3>
          <p className="text-xs leading-relaxed text-slate-600">{activeStep.description}</p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5">
          <button
            onClick={prevStep}
            disabled={isFirst}
            className="border border-slate-200 bg-white px-3 py-1 font-mono text-xs font-bold text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Previous
          </button>
          {isLast ? (
            <button
              onClick={endTour}
              className="bg-[#ea580c] px-4 py-1 font-mono text-xs font-bold text-white hover:bg-orange-700"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="bg-[#f97316] px-4 py-1 font-mono text-xs font-bold text-white hover:bg-orange-600"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
