"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TOUR_STEPS, type TourStep } from "@/lib/onboarding/tour-steps";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingState {
  first_login_completed: boolean;
  tour_completed: boolean;
  tour_step: number;
  checklist_dismissed: boolean;
}

interface Props {
  initialState: OnboardingState | null;
  userId: string;
}

export function TourController({ initialState, userId }: Props) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(initialState?.tour_step ?? 0);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const rafRef = useRef<number>(0);

  const currentStep = TOUR_STEPS[stepIndex] as TourStep | undefined;

  const persist = useCallback(async (updates: Partial<OnboardingState>) => {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {
      // Fail silently — localStorage fallback is handled by the client
    }
  }, []);

  const positionTooltip = useCallback(() => {
    if (!currentStep || !active) return;
    const el = document.querySelector(currentStep.selector);
    if (!el) {
      setPosition(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    });
  }, [currentStep, active]);

  useEffect(() => {
    if (!active) return;
    positionTooltip();
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(positionTooltip);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, positionTooltip]);

  // Expose start method globally so help menu / welcome modal can trigger it
  useEffect(() => {
    (window as any).__startForgeTour = () => {
      setStepIndex(0);
      setActive(true);
      persist({ tour_step: 0 });
    };
    return () => {
      delete (window as any).__startForgeTour;
    };
  }, [persist]);

  const advance = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= TOUR_STEPS.length) {
      setActive(false);
      persist({ tour_completed: true, tour_step: next });
      return;
    }
    setStepIndex(next);
    persist({ tour_step: next });
  }, [stepIndex, persist]);

  const skip = useCallback(() => {
    setActive(false);
    persist({ first_login_completed: true, tour_step: stepIndex });
  }, [stepIndex, persist]);

  if (!active || !currentStep) return null;

  const tooltipSide = currentStep.position ?? "bottom";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/30 transition-opacity" onClick={skip} />

      {/* Highlight cutout */}
      {position && (
        <div
          className="fixed z-[9999] rounded-md ring-2 ring-primary/60 pointer-events-none transition-all duration-300"
          style={{
            top: position.top - 4,
            left: position.left - 4,
            width: position.width + 8,
            height: position.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      {position && (
        <div
          className="fixed z-[10000] w-[300px] bg-popover border rounded-lg shadow-lg p-4 transition-all duration-300"
          style={{
            top: tooltipSide === "bottom" ? position.top + position.height + 12 : position.top - 12,
            left: Math.max(12, position.left + position.width / 2 - 150),
            ...(tooltipSide === "top" ? { transform: "translateY(-100%)" } : {}),
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Step {stepIndex + 1} of {TOUR_STEPS.length}
              </p>
              <h4 className="text-sm font-semibold">{currentStep.title}</h4>
            </div>
            <button
              onClick={skip}
              className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {currentStep.description}
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={skip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip tour
            </button>
            <Button size="sm" className="h-7 text-xs" onClick={advance}>
              {currentStep.ctaLabel ?? "Next"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
