"use client";

import { useState, useEffect, useCallback } from "react";
import { WelcomeModal } from "./welcome-modal";
import { TourController } from "./tour-controller";
import { ChecklistWidget, type ChecklistItem } from "./checklist-widget";

interface OnboardingState {
  first_login_completed: boolean;
  tour_completed: boolean;
  tour_step: number;
  checklist_dismissed: boolean;
}

interface Props {
  userId: string;
  builder: {
    username?: string | null;
    avatar_url?: string | null;
    github_username?: string | null;
    forge_score?: number;
    last_scored_at?: string | null;
  };
  hasDeliveries: boolean;
  hasProjects: boolean;
  hasInvitesSent: boolean;
}

const STORAGE_KEY = "forge_onboarding";

function readLocal(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function OnboardingOrchestrator({ userId, builder, hasDeliveries, hasProjects, hasInvitesSent }: Props) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    const cached = readLocal();
    if (cached && cached.first_login_completed) {
      setState(cached);
      setLoading(false);
    }

    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        setState(data);
        writeLocal(data);
        if (!data.first_login_completed && !data.tour_completed) {
          setShowWelcome(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cached) {
          setState({
            first_login_completed: false,
            tour_completed: false,
            tour_step: 0,
            checklist_dismissed: false,
          });
        }
        setLoading(false);
      });
  }, []);

  const persist = useCallback(async (updates: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev!, ...updates };
      writeLocal(next);
      return next;
    });
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {}
  }, []);

  const handleStartTour = useCallback(() => {
    setShowWelcome(false);
    setTourActive(true);
    persist({ first_login_completed: true, tour_step: 0 });
    setTimeout(() => {
      (window as any).__startForgeTour?.();
    }, 100);
  }, [persist]);

  const handleSkip = useCallback(() => {
    setShowWelcome(false);
    persist({ first_login_completed: true });
  }, [persist]);

  const handleDismissChecklist = useCallback(() => {
    persist({ checklist_dismissed: true });
  }, [persist]);

  if (loading || !state) return null;

  const checklistItems: ChecklistItem[] = [
    {
      id: "username",
      label: "Choose username & add profile photo",
      href: `/profile/${userId}`,
      completed: !!(builder.username && builder.avatar_url),
    },
    {
      id: "github",
      label: "Connect GitHub",
      href: `/profile/${userId}`,
      completed: !!builder.github_username,
    },
    {
      id: "score",
      label: "Generate Forge Score",
      href: `/profile/${userId}`,
      completed: (builder.forge_score ?? 0) > 0 || !!builder.last_scored_at,
    },
    {
      id: "delivery",
      label: "Verify first delivery",
      href: `/profile/${userId}`,
      completed: hasDeliveries,
    },
    {
      id: "project",
      label: "Post first project",
      href: "/projects/new",
      completed: hasProjects,
      optional: true,
    },
    {
      id: "invite",
      label: "Invite 1 builder",
      href: "/projects",
      completed: hasInvitesSent,
      optional: true,
    },
  ];

  const showChecklist =
    !state.checklist_dismissed &&
    !state.tour_completed &&
    state.first_login_completed &&
    checklistItems.some((i) => !i.completed);

  const allDone = checklistItems.every((i) => i.completed || i.optional);

  return (
    <>
      {showWelcome && <WelcomeModal onStartTour={handleStartTour} onSkip={handleSkip} />}

      <TourController initialState={state} userId={userId} />

      {showChecklist && !allDone && (
        <div className="fixed bottom-4 right-4 z-50 w-[320px]">
          <ChecklistWidget items={checklistItems} onDismiss={handleDismissChecklist} />
        </div>
      )}
    </>
  );
}
