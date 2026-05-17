"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import SpiderChart, { type SpiderAxis } from "./components/SpiderChart";

type Session = {
  id: string;
  timestamp: number;
  mode: "off-the-cuff";
  category: string;
  take?: string;
  promptText: string;
  transcript: string;
  speakingDurationSeconds: number;
  wordCount: number;
  fillerCount: number;
  wpm: number;
  overallScore: number;
  axes: {
    pace: number;
    evidence: number;
    confidence: number;
    clarity: number;
    fillerWords: number;
  };
  powerWords: string[];
  weakWords: string[];
  structure: { hasOpening: boolean; hasBody: boolean; hasClosing: boolean };
  summary: string;
  sentenceTips: Array<{ sentenceText: string; tip: string; category: string }>;
};

type ModeCard = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

const MODES: ModeCard[] = [
  {
    title: "Off The Cuff",
    description: "Impromptu speaking practice",
    href: "/off-the-cuff",
  },
  {
    title: "Tongue Twisters",
    description: "Diction warm-ups",
    comingSoon: true,
  },
  {
    title: "Pen Speaking",
    description: "Enunciation practice",
    comingSoon: true,
  },
  {
    title: "Daily Warm-Up",
    description: "10-minute voice routine",
    comingSoon: true,
  },
];

const SESSION_HISTORY_STORAGE_KEY = "articulate-history";
const MAX_RECENT_SESSIONS = 30;
const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const AXIS_LABELS: Array<{ key: keyof Session["axes"]; label: string }> = [
  { key: "pace", label: "Pace" },
  { key: "evidence", label: "Evidence" },
  { key: "confidence", label: "Confidence" },
  { key: "clarity", label: "Clarity" },
  { key: "fillerWords", label: "Fillers" },
];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseSession = (value: unknown): Session | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<Session>;
  if (
    typeof data.id !== "string" ||
    !isFiniteNumber(data.timestamp) ||
    data.mode !== "off-the-cuff" ||
    typeof data.category !== "string" ||
    typeof data.promptText !== "string" ||
    typeof data.transcript !== "string" ||
    !isFiniteNumber(data.speakingDurationSeconds) ||
    !isFiniteNumber(data.wordCount) ||
    !isFiniteNumber(data.fillerCount) ||
    !isFiniteNumber(data.wpm) ||
    !isFiniteNumber(data.overallScore) ||
    !data.axes ||
    !isFiniteNumber(data.axes.pace) ||
    !isFiniteNumber(data.axes.evidence) ||
    !isFiniteNumber(data.axes.confidence) ||
    !isFiniteNumber(data.axes.clarity) ||
    !isFiniteNumber(data.axes.fillerWords) ||
    !Array.isArray(data.powerWords) ||
    !data.powerWords.every((word) => typeof word === "string") ||
    !Array.isArray(data.weakWords) ||
    !data.weakWords.every((word) => typeof word === "string") ||
    !data.structure ||
    typeof data.structure.hasOpening !== "boolean" ||
    typeof data.structure.hasBody !== "boolean" ||
    typeof data.structure.hasClosing !== "boolean" ||
    typeof data.summary !== "string" ||
    !Array.isArray(data.sentenceTips) ||
    !data.sentenceTips.every(
      (tip) =>
        tip &&
        typeof tip.sentenceText === "string" &&
        typeof tip.tip === "string" &&
        typeof tip.category === "string"
    )
  ) {
    return null;
  }

  return {
    id: data.id,
    timestamp: data.timestamp,
    mode: "off-the-cuff",
    category: data.category,
    take: typeof data.take === "string" ? data.take : undefined,
    promptText: data.promptText,
    transcript: data.transcript,
    speakingDurationSeconds: data.speakingDurationSeconds,
    wordCount: data.wordCount,
    fillerCount: data.fillerCount,
    wpm: data.wpm,
    overallScore: data.overallScore,
    axes: data.axes,
    powerWords: data.powerWords,
    weakWords: data.weakWords,
    structure: data.structure,
    summary: data.summary,
    sentenceTips: data.sentenceTips,
  };
};

const writeSessionHistory = (sessions: Session[]) => {
  try {
    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event("articulate-history-updated"));
  } catch (error) {
    console.error("Failed to write session history", error);
  }
};

const subscribeToHistoryChanges = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener("articulate-history-updated", handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("articulate-history-updated", handleChange);
  };
};

const getHistorySnapshot = () => {
  if (typeof window === "undefined") {
    return "[]";
  }
  try {
    return localStorage.getItem(SESSION_HISTORY_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

const getHistoryServerSnapshot = () => "[]";

const formatSessionDate = (timestamp: number) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(new Date(timestamp));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("weekday")}, ${get("month")} ${get("day")} · ${get("hour")}:${get("minute")} ${get("dayPeriod")}`;
};

const getScoreClass = (score: number) => {
  if (score >= 7) return "bg-emerald-500/20 text-emerald-200";
  if (score >= 4) return "bg-amber-500/20 text-amber-200";
  return "bg-rose-500/20 text-rose-200";
};

const getScoreBandColor = (score: number) => {
  if (score >= 7) {
    return {
      stroke: "#34d399",
      glow: "drop-shadow(0 0 8px rgba(52, 211, 153, 0.45))",
    };
  }
  if (score >= 4) {
    return {
      stroke: "#fbbf24",
      glow: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.45))",
    };
  }
  return {
    stroke: "#fb7185",
    glow: "drop-shadow(0 0 8px rgba(251, 113, 133, 0.45))",
  };
};

export default function Home() {
  const historySnapshot = useSyncExternalStore(
    subscribeToHistoryChanges,
    getHistorySnapshot,
    getHistoryServerSnapshot
  );
  const sessions = useMemo(() => {
    try {
      const parsed = JSON.parse(historySnapshot) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(parseSession).filter((session): session is Session => session !== null);
    } catch {
      return [];
    }
  }, [historySnapshot]);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = "Dashboard";
  }, []);

  const hasSessions = sessions.length > 0;
  const recentSessions = sessions.slice(0, MAX_RECENT_SESSIONS);

  const aggregateStats = useMemo(() => {
    if (!sessions.length) return null;
    const totalSessions = sessions.length;
    const averageScore =
      sessions.reduce((total, session) => total + session.overallScore, 0) / totalSessions;
    const bestScore = sessions.reduce(
      (best, session) => Math.max(best, session.overallScore),
      Number.NEGATIVE_INFINITY
    );
    const averageWpm = sessions.reduce((total, session) => total + session.wpm, 0) / totalSessions;
    const averageFillerPercent =
      sessions.reduce((total, session) => {
        if (session.wordCount <= 0) return total;
        return total + (session.fillerCount / session.wordCount) * 100;
      }, 0) / totalSessions;
    const averageAxes: SpiderAxis[] = AXIS_LABELS.map(({ key, label }) => ({
      axis: label,
      value: sessions.reduce((total, session) => total + session.axes[key], 0) / totalSessions,
    }));

    return {
      totalSessions,
      averageScore,
      bestScore,
      averageWpm,
      averageFillerPercent,
      averageAxes,
    };
  }, [sessions]);

  const chartData = useMemo(() => {
    const chartSessions = [...sessions].slice(0, MAX_RECENT_SESSIONS).reverse();
    return chartSessions.map((session, index) => ({
      order: index + 1,
      score: Number(session.overallScore.toFixed(2)),
      label: formatSessionDate(session.timestamp),
    }));
  }, [sessions]);

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessionIds((previous) => ({
      ...previous,
      [sessionId]: !previous[sessionId],
    }));
  };

  const deleteSession = (sessionId: string) => {
    const confirmed = window.confirm("Delete this session?");
    if (!confirmed) return;
    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    writeSessionHistory(nextSessions);
  };

  const clearAllHistory = () => {
    const confirmed = window.confirm(
      `This will delete all ${sessions.length} sessions. This cannot be undone.`
    );
    if (!confirmed) return;
    setExpandedSessionIds({});
    writeSessionHistory([]);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <section className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Dashboard</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-300 md:text-lg">
              Your speaking practice over time.
            </p>
          </div>
        </div>

        {!hasSessions ? (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-100">No sessions yet</h2>
            <p className="mt-2 text-slate-300">
              Complete your first speaking session to start tracking your progress.
            </p>
            <Link
              href="/off-the-cuff"
              className="mt-6 inline-flex rounded-xl bg-sky-500 px-5 py-2.5 font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Start your first session
            </Link>
          </div>
        ) : (
          <>
            {aggregateStats ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:p-6">
                <div className="grid gap-6 md:grid-cols-2 md:items-center">
                  <div className="flex flex-col items-center justify-center">
                    {(() => {
                      const normalizedScore = Math.max(0, Math.min(aggregateStats.averageScore, 10));
                      const progress = normalizedScore / 10;
                      const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
                      const ringColor = getScoreBandColor(aggregateStats.averageScore);
                      return (
                        <>
                          <div className="relative h-40 w-40 md:h-52 md:w-52">
                            <svg viewBox="0 0 100 100" className="h-full w-full">
                              <circle
                                cx="50"
                                cy="50"
                                r={RING_RADIUS}
                                fill="none"
                                stroke="rgba(30, 41, 59, 1)"
                                strokeWidth="14"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r={RING_RADIUS}
                                fill="none"
                                stroke={ringColor.stroke}
                                strokeWidth="14"
                                strokeLinecap="round"
                                strokeDasharray={RING_CIRCUMFERENCE}
                                strokeDashoffset={dashOffset}
                                transform="rotate(-90 50 50)"
                                style={{
                                  transition: "stroke-dashoffset 600ms ease-out",
                                  filter: ringColor.glow,
                                }}
                              />
                            </svg>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                              <div className="flex items-end gap-1">
                                <span className="text-5xl font-semibold tabular-nums text-slate-100 md:text-6xl">
                                  {aggregateStats.averageScore.toFixed(1)}
                                </span>
                                <span className="pb-1 text-sm text-slate-400">/ 10</span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Average Score
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <SpiderChart axes={aggregateStats.averageAxes} height={240} />
                    <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-left">
                      Average Profile
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 md:gap-3">
                  {[
                    { label: "Total Sessions", value: aggregateStats.totalSessions.toString() },
                    { label: "Best Score", value: aggregateStats.bestScore.toFixed(1) },
                    { label: "Avg WPM", value: Math.round(aggregateStats.averageWpm).toString() },
                    {
                      label: "Avg Filler %",
                      value: `${aggregateStats.averageFillerPercent.toFixed(1)}%`,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="min-w-[8.5rem] flex-1 rounded-xl bg-slate-800/40 p-3 text-center"
                    >
                      <p className="text-xl font-semibold tabular-nums text-slate-200">{stat.value}</p>
                      <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 md:text-xs">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {sessions.length >= 2 ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:p-5">
                <h2 className="text-lg font-semibold text-slate-100">Score trend</h2>
                <div className="mt-4 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="order"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
                        label={{
                          value: "Session order (oldest to newest)",
                          position: "insideBottom",
                          offset: -5,
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#0ea5e9"
                        fill="url(#scoreFill)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={(props: { cx?: number; cy?: number; payload?: { score?: number } }) => {
                          const { cx, cy, payload } = props;
                          if (
                            typeof cx !== "number" ||
                            typeof cy !== "number" ||
                            typeof payload?.score !== "number"
                          ) {
                            return null;
                          }
                          return (
                            <g>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill="#0ea5e9"
                                stroke="#e0f2fe"
                                strokeWidth={1}
                              />
                              <text
                                x={cx}
                                y={cy - 12}
                                textAnchor="middle"
                                fill="#e0f2fe"
                                fontSize={12}
                                fontWeight={600}
                              >
                                {payload.score.toFixed(1)}
                              </text>
                            </g>
                          );
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}

            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-100">Practice modes</h2>
                <Link
                  href="/off-the-cuff"
                  className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-sky-400 hover:shadow-xl hover:shadow-sky-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Start a new session
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {MODES.map((mode) => {
                  const cardContent = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-semibold text-slate-100">{mode.title}</h3>
                        {mode.comingSoon ? (
                          <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                            Coming soon
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">
                        {mode.description}
                      </p>
                    </>
                  );

                  if (mode.href) {
                    return (
                      <Link
                        key={mode.title}
                        href={mode.href}
                        className="rounded-2xl border border-sky-500/70 bg-slate-800/50 p-6 shadow-[0_0_30px_rgba(14,165,233,0.08)] transition-all duration-150 ease-out hover:scale-[1.02] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        {cardContent}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={mode.title}
                      className="rounded-2xl border border-slate-800 bg-slate-800/30 p-6 opacity-70"
                    >
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-100">Recent sessions</h2>
              <div className="mt-4 space-y-4">
                {recentSessions.map((session) => {
                  const fillerPercent =
                    session.wordCount > 0 ? (session.fillerCount / session.wordCount) * 100 : 0;
                  const sessionAxes: SpiderAxis[] = AXIS_LABELS.map(({ key, label }) => ({
                    axis: label,
                    value: session.axes[key],
                  }));
                  const isExpanded = Boolean(expandedSessionIds[session.id]);
                  return (
                    <article
                      key={session.id}
                      className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:bg-slate-900/70"
                    >
                      <button
                        type="button"
                        onClick={() => deleteSession(session.id)}
                        className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        aria-label="Delete session"
                      >
                        ×
                      </button>

                      <div className="flex items-start justify-between gap-3 pr-8">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm text-slate-300">
                              {formatSessionDate(session.timestamp)}
                            </p>
                            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
                              {session.category}
                            </span>
                            {session.category === "Opinion" && session.take ? (
                              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
                                {session.take}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">
                            {session.promptText}
                          </p>
                        </div>
                        <div
                          className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold tabular-nums ${getScoreClass(
                            session.overallScore
                          )}`}
                        >
                          {session.overallScore.toFixed(1)}
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-slate-400 md:text-sm">
                        {session.wordCount} words • {fillerPercent.toFixed(1)}% fillers •{" "}
                        {Math.round(session.wpm)} WPM
                      </p>

                      <button
                        type="button"
                        onClick={() => toggleExpanded(session.id)}
                        className="mt-4 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        {isExpanded ? "Hide details" : "Details"}
                      </button>

                      {isExpanded ? (
                        <div className="mt-4 space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Transcript
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                              {session.transcript || "No transcript captured."}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Axis scores
                            </p>
                            <div className="mt-3 grid gap-4 md:grid-cols-2 md:items-center">
                              <SpiderChart axes={sessionAxes} height={200} />
                              <div className="grid grid-cols-2 gap-2 text-sm text-slate-200 sm:grid-cols-3 md:grid-cols-2">
                                <span className="rounded-lg bg-slate-800/60 px-2 py-1">
                                  Pace: {session.axes.pace.toFixed(1)}
                                </span>
                                <span className="rounded-lg bg-slate-800/60 px-2 py-1">
                                  Evidence: {session.axes.evidence.toFixed(1)}
                                </span>
                                <span className="rounded-lg bg-slate-800/60 px-2 py-1">
                                  Confidence: {session.axes.confidence.toFixed(1)}
                                </span>
                                <span className="rounded-lg bg-slate-800/60 px-2 py-1">
                                  Clarity: {session.axes.clarity.toFixed(1)}
                                </span>
                                <span className="rounded-lg bg-slate-800/60 px-2 py-1 sm:col-span-2 md:col-span-1">
                                  Fillers: {session.axes.fillerWords.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Claude summary
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-200">
                              {session.summary}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Sentence tips
                            </p>
                            {session.sentenceTips.length ? (
                              <div className="mt-2 space-y-2">
                                {session.sentenceTips.map((tip, index) => (
                                  <div
                                    key={`${session.id}-tip-${index}`}
                                    className="rounded-lg border border-slate-800 bg-slate-800/40 p-2.5"
                                  >
                                    <p className="text-sm text-slate-200">{tip.sentenceText}</p>
                                    <p className="mt-1 text-xs text-sky-300">{tip.tip}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-400">No sentence tips.</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pb-2">
              <button
                type="button"
                onClick={clearAllHistory}
                className="text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Clear all history
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
