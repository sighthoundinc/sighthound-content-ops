"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppIcon, type AppIconName } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * <OnboardingTour /> — one-time first-run walkthrough.
 *
 * Scaffold implementation uses localStorage as the "has-been-seen" flag
 * so it can roll out before the `profiles.onboarded_at` migration lands.
 * Skippable, resumable, respects reduced-motion (the drawer uses CSS
 * transitions which naturally collapse under motion-reduce).
 *
 * Non-goal: anchored element tooltips. The first iteration shows a small
 * floating panel in the lower-right with next-step navigation. A future
 * iteration can anchor to nav items when the tour is expanded.
 */

const ONBOARDING_STORAGE_KEY = "onboarding:completed-v1";

type TourStep = {
  title: string;
  description: string;
  icon: AppIconName;
  href?: string;
  actionLabel?: string;
};

const STEPS: TourStep[] = [
  {
    title: "Welcome to Content Relay",
    description:
      "Plan, write, and publish content across Sighthound and Redactor from a single workspace.",
    icon: "home",
  },
  {
    title: "Capture an idea",
    description:
      "Start on the Ideas page. Drop in a headline and convert it to a blog or social post when it’s ready.",
    icon: "idea",
    href: "/ideas",
    actionLabel: "Open Ideas",
  },
  {
    title: "Write and submit",
    description:
      "Open the Blogs page to track writing, add the Google Doc, and submit for review.",
    icon: "writing",
    href: "/blogs",
    actionLabel: "Open Blogs",
  },
  {
    title: "Schedule and publish",
    description:
      "Once approved, add the live URL and scheduled date. The calendar shows everything in flight.",
    icon: "calendar",
    href: "/calendar",
    actionLabel: "Open Calendar",
  },
];

function hasCompletedTour(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

function markTourCompleted() {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } catch (error) {
    console.warn("onboarding tour save failed", error);
  }
}

export function OnboardingTour({ initiallyOpen }: { initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (initiallyOpen) {
      setIsOpen(true);
      return;
    }
    if (!hasCompletedTour()) {
      setIsOpen(true);
    }
  }, [initiallyOpen]);

  if (!isOpen) {
    return null;
  }

  const step = STEPS[stepIndex];
  if (!step) {
    return null;
  }

  const finishTour = () => {
    markTourCompleted();
    setIsOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Content Relay onboarding"
      className={cn(
        "fixed bottom-6 right-6 z-[260] w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl",
        "motion-reduce:transition-none transition-transform"
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Getting started · {stepIndex + 1} / {STEPS.length}
        </span>
        <button
          type="button"
          onClick={finishTour}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Skip onboarding"
        >
          <AppIcon name="close" boxClassName="h-4 w-4" size={12} />
        </button>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3">
        <AppIcon
          name={step.icon}
          className="text-slate-600"
          boxClassName="h-10 w-10 rounded-lg bg-slate-50"
          size={20}
        />
        <div>
          <p className="subsection-label text-slate-900">{step.title}</p>
          <p className="body-text mt-1 text-slate-600">{step.description}</p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={finishTour}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            ) : null}
            {step.href && step.actionLabel ? (
              <Link
                href={step.href}
                onClick={() => {
                  if (stepIndex === STEPS.length - 1) {
                    finishTour();
                  } else {
                    setStepIndex((i) => i + 1);
                  }
                }}
                className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {step.actionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (stepIndex === STEPS.length - 1) {
                    finishTour();
                  } else {
                    setStepIndex((i) => i + 1);
                  }
                }}
                className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {stepIndex === STEPS.length - 1 ? "Done" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Imperatively reset the onboarding state. Useful for testing or a
 * Settings → "Replay onboarding" entry point.
 */
export function resetOnboardingTour() {
  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch (error) {
    console.warn("onboarding reset failed", error);
  }
}
