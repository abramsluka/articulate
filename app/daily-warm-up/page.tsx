"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TOTAL_WARM_UP_SECONDS, WARM_UP_STEPS } from "../data/warmUpSteps";
import { saveSession } from "../lib/supabase/sessions";
import type { DailyWarmUpSession } from "../types/session";

type Phase = "welcome" | "in-progress" | "complete";

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "requires-login" }
  | { kind: "error"; message: string };

const TOTAL_STEPS = WARM_UP_STEPS.length;

const formatDuration = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function DailyWarmUpPage() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(WARM_UP_STEPS[0]?.durationSeconds ?? 0);
  const [isPaused, setIsPaused] = useState(false);
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [hasSaved, setHasSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });

  const currentStep = WARM_UP_STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / TOTAL_STEPS) * 100;

  useEffect(() => {
    document.title = "Daily Warm-Up";
  }, []);

  const sectionOverview = useMemo(() => {
    const durations = new Map<string, number>();
    WARM_UP_STEPS.forEach((step) => {
      durations.set(step.sectionTitle, (durations.get(step.sectionTitle) ?? 0) + step.durationSeconds);
    });

    return [
      "Physical & Breath Warm-Up",
      "Articulation & Diction Drills",
      "Vocal Resonance & Projection",
      "Speaking Flow Drill",
    ].map((sectionTitle) => ({
      sectionTitle,
      durationSeconds: durations.get(sectionTitle) ?? 0,
    }));
  }, []);

  const persistCompletedSession = useCallback(
    async (completedSteps: number, durationSeconds: number) => {
      if (hasSaved) return;
      setHasSaved(true);
      const timestamp = Date.now();
      const cappedSteps = Math.min(completedSteps, TOTAL_STEPS);
      const overallScore = Math.round((cappedSteps / TOTAL_STEPS) * 10 * 10) / 10;
      const session: DailyWarmUpSession = {
        mode: "daily-warm-up",
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${timestamp}`,
        timestamp,
        durationSeconds,
        stepsCompleted: cappedSteps,
        totalSteps: TOTAL_STEPS,
        overallScore,
      };
      setSaveStatus({ kind: "saving" });
      const result = await saveSession(session);
      if (result.ok) {
        setSaveStatus({ kind: "saved" });
      } else if (result.requiresLogin) {
        setSaveStatus({ kind: "requires-login" });
      } else {
        setSaveStatus({ kind: "error", message: result.error });
      }
    },
    [hasSaved]
  );

  const completeCurrentStepAndMove = useCallback(() => {
    const completedCount = Math.min(stepsCompleted + 1, TOTAL_STEPS);
    setStepsCompleted(completedCount);

    if (currentStepIndex >= TOTAL_STEPS - 1) {
      const durationSeconds = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
      setTotalDurationSeconds(durationSeconds);
      setPhase("complete");
      void persistCompletedSession(completedCount, durationSeconds);
      return;
    }

    const nextStepIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextStepIndex);
    setSecondsRemaining(WARM_UP_STEPS[nextStepIndex].durationSeconds);
    setIsPaused(false);
  }, [currentStepIndex, persistCompletedSession, startedAt, stepsCompleted]);

  const finishSessionNow = useCallback(() => {
    const completedCount = Math.min(Math.max(stepsCompleted, currentStepIndex + 1), TOTAL_STEPS);
    setStepsCompleted(completedCount);
    const durationSeconds = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
    setTotalDurationSeconds(durationSeconds);
    setPhase("complete");
    void persistCompletedSession(completedCount, durationSeconds);
  }, [currentStepIndex, persistCompletedSession, startedAt, stepsCompleted]);

  useEffect(() => {
    if (phase !== "in-progress" || isPaused || secondsRemaining <= 0) return;

    const interval = window.setInterval(() => {
      setSecondsRemaining((previousSeconds) => {
        if (previousSeconds <= 1) {
          window.setTimeout(() => {
            completeCurrentStepAndMove();
          }, 0);
          return 0;
        }
        return previousSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [phase, isPaused, secondsRemaining, completeCurrentStepAndMove]);

  useEffect(() => {
    if (saveStatus.kind !== "saved") return;
    const timeoutId = window.setTimeout(() => {
      setSaveStatus((current) => (current.kind === "saved" ? { kind: "idle" } : current));
    }, 4000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveStatus]);

  if (phase === "welcome") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-6 md:py-10 lg:px-8 lg:py-12">
        <section className="mx-auto w-full max-w-3xl">
          <header className="mb-8 text-center md:mb-10">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-100 md:text-5xl">
              Daily Warm-Up
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-300 md:text-lg">
              Your 10-minute speaking routine.
            </p>
          </header>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Routine overview</h2>
            <ul className="mt-4 space-y-2">
              {sectionOverview.map((section) => (
                <li
                  key={section.sectionTitle}
                  className="flex items-center justify-between rounded-xl bg-slate-800/40 px-3 py-2 text-sm md:text-base"
                >
                  <span className="text-slate-200">{section.sectionTitle}</span>
                  <span className="font-semibold text-slate-300">
                    {Math.round(section.durationSeconds / 60)} min
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => {
              setPhase("in-progress");
              setCurrentStepIndex(0);
              setSecondsRemaining(WARM_UP_STEPS[0].durationSeconds);
              setIsPaused(false);
              setStepsCompleted(0);
              setStartedAt(Date.now());
              setTotalDurationSeconds(0);
              setHasSaved(false);
              setSaveStatus({ kind: "idle" });
            }}
            className="mt-6 w-full rounded-2xl bg-amber-400 px-5 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:mt-7 md:py-3.5 md:text-lg"
          >
            Start warm-up
          </button>
        </section>
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-6 md:py-10 lg:px-8 lg:py-12">
        <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center md:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-amber-200 md:text-4xl">
            Daily Warm-Up complete!
          </h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-800/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total time</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-100">
                {formatDuration(totalDurationSeconds)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Steps completed</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-100">
                {stepsCompleted} of {TOTAL_STEPS}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-slate-300 md:text-base">
            Nice — your voice is warm. Come back tomorrow to keep the streak going.
          </p>

          {saveStatus.kind === "saved" ? (
            <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
              Saved to your account ✓
            </div>
          ) : null}
          {saveStatus.kind === "requires-login" ? (
            <div className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-100">
              Log in to save this session.{" "}
              <Link href="/login" className="font-semibold text-rose-50 underline underline-offset-4 hover:text-white">
                Log in
              </Link>
            </div>
          ) : null}
          {saveStatus.kind === "error" ? (
            <div className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-100">
              Couldn&apos;t save: {saveStatus.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-xl bg-amber-400 px-4 py-2.5 font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Do another mode
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-6 md:py-8 lg:px-8 lg:py-10">
      <section className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:p-6">
        <div className="h-2 w-full rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-sm">
          Step {currentStepIndex + 1} of {TOTAL_STEPS} · {currentStep.sectionTitle}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">
          {currentStep.stepTitle}
        </h1>

        <p className="mt-4 text-center text-6xl font-semibold tabular-nums text-amber-200">
          {formatDuration(secondsRemaining)}
        </p>

        <ul className="mt-5 list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-200">
          {currentStep.instructions.map((instruction, index) => (
            <li key={`${currentStep.id}-${index}`} className={index === 0 ? "font-medium text-slate-100" : ""}>
              {instruction}
            </li>
          ))}
        </ul>

        {currentStep.notes ? <p className="mt-4 text-sm text-slate-400">{currentStep.notes}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsPaused((previous) => !previous)}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSecondsRemaining(currentStep.durationSeconds);
              setIsPaused(false);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Restart step
          </button>
          <button
            type="button"
            onClick={completeCurrentStepAndMove}
            className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={completeCurrentStepAndMove}
            className="ml-auto rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {currentStepIndex === TOTAL_STEPS - 1 ? "Done" : "Next"}
          </button>
        </div>
        <button
          type="button"
          onClick={finishSessionNow}
          className="mt-3 self-start text-xs font-medium text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Finish now
        </button>
      </section>
    </main>
  );
}
