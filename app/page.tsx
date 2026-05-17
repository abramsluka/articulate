"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import SpiderChart, { type SpiderAxis } from "./components/SpiderChart";
import { BADGES } from "./data/badges";
import type {
  DailyWarmUpSession,
  OffTheCuffSession,
  PenSpeakingSession,
  Session,
  TongueTwisterSession,
} from "./types/session";
import { parseSession } from "./types/session";

type ModeCard = {
  modeId: "off-the-cuff" | "tongue-twisters" | "pen-speaking" | "daily-warm-up";
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

const MODES: ModeCard[] = [
  {
    modeId: "off-the-cuff",
    title: "Off The Cuff",
    description: "Impromptu speaking practice",
    href: "/off-the-cuff",
  },
  {
    modeId: "tongue-twisters",
    title: "Tongue Twisters",
    description: "Diction warm-ups",
    href: "/tongue-twisters",
  },
  {
    modeId: "pen-speaking",
    title: "Pen Speaking",
    description: "Enunciation practice",
    href: "/pen-speaking",
  },
  {
    modeId: "daily-warm-up",
    title: "Daily Warm-Up",
    description: "10-minute voice routine",
    href: "/daily-warm-up",
  },
];

const MODE_CARD_STYLES: Record<
  ModeCard["modeId"],
  { border: string; glow: string; hoverBorder: string; focusRing: string }
> = {
  "off-the-cuff": {
    border: "border-sky-500/70",
    glow: "shadow-[0_0_30px_rgba(14,165,233,0.08)]",
    hoverBorder: "hover:border-sky-400/70",
    focusRing: "focus-visible:ring-sky-300",
  },
  "tongue-twisters": {
    border: "border-emerald-500/70",
    glow: "shadow-[0_0_30px_rgba(52,211,153,0.08)]",
    hoverBorder: "hover:border-emerald-400/70",
    focusRing: "focus-visible:ring-emerald-300",
  },
  "pen-speaking": {
    border: "border-violet-500/70",
    glow: "shadow-[0_0_30px_rgba(167,139,250,0.08)]",
    hoverBorder: "hover:border-violet-400/70",
    focusRing: "focus-visible:ring-violet-300",
  },
  "daily-warm-up": {
    border: "border-amber-500/70",
    glow: "shadow-[0_0_30px_rgba(251,191,36,0.08)]",
    hoverBorder: "hover:border-amber-400/70",
    focusRing: "focus-visible:ring-amber-300",
  },
};

const SESSION_HISTORY_STORAGE_KEY = "articulate-history";
const MAX_RECENT_SESSIONS = 30;
const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const AXIS_LABELS: Array<{ key: keyof OffTheCuffSession["axes"]; label: string }> = [
  { key: "pace", label: "Pace" },
  { key: "evidence", label: "Evidence" },
  { key: "confidence", label: "Confidence" },
  { key: "clarity", label: "Clarity" },
  { key: "fillerWords", label: "Fillers" },
];
type ByModeChartPoint = {
  order: number;
};

const MODE_SERIES = [
  {
    key: "offTheCuff",
    mode: "off-the-cuff",
    label: "Off The Cuff",
    color: "#0ea5e9",
    legendDotClass: "bg-sky-400",
    activeTextColor: "#e0f2fe",
    activeStrokeColor: "#e0f2fe",
  },
  {
    key: "tongueTwisters",
    mode: "tongue-twisters",
    label: "Tongue Twisters",
    color: "#34d399",
    legendDotClass: "bg-emerald-400",
    activeTextColor: "#d1fae5",
    activeStrokeColor: "#d1fae5",
  },
  {
    key: "penSpeaking",
    mode: "pen-speaking",
    label: "Pen Speaking",
    color: "#a78bfa",
    legendDotClass: "bg-violet-400",
    activeTextColor: "#ede9fe",
    activeStrokeColor: "#ede9fe",
  },
  {
    key: "dailyWarmUp",
    mode: "daily-warm-up",
    label: "Daily Warm-Up",
    color: "#fbbf24",
    legendDotClass: "bg-amber-300",
    activeTextColor: "#fef3c7",
    activeStrokeColor: "#fef3c7",
  },
] as const satisfies ReadonlyArray<{
  key: string;
  mode: Session["mode"];
  label: string;
  color: string;
  legendDotClass: string;
  activeTextColor: string;
  activeStrokeColor: string;
}>;

type ModeSeriesKey = (typeof MODE_SERIES)[number]["key"];
type ByModeChartDataPoint = ByModeChartPoint & Record<ModeSeriesKey, number | null>;

type ActiveDotProps = {
  cx?: number;
  cy?: number;
  value?: number;
  payload?: Record<string, number | string | null | undefined>;
};

const createInlineActiveDot = (
  options: { color: string; textColor?: string; strokeColor?: string; radius?: number },
  dataKey?: string
) => {
  const InlineActiveDot = (props: ActiveDotProps) => {
    const { color, textColor = options.color, strokeColor = "#e2e8f0", radius = 4 } = options;
    const { cx, cy, value, payload } = props;
    if (typeof cx !== "number" || typeof cy !== "number") return null;

    let score = typeof value === "number" ? value : undefined;
    if (score === undefined && dataKey && typeof payload?.[dataKey] === "number") {
      score = payload[dataKey] as number;
    }
    if (typeof score !== "number" || !Number.isFinite(score)) return null;

    return (
      <g>
        <circle cx={cx} cy={cy} r={radius} fill={color} stroke={strokeColor} strokeWidth={1} />
        <text x={cx} y={cy - 12} textAnchor="middle" fill={textColor} fontSize={12} fontWeight={600}>
          {score.toFixed(1)}
        </text>
      </g>
    );
  };

  InlineActiveDot.displayName = dataKey
    ? `InlineActiveDot(${dataKey})`
    : "InlineActiveDot";

  return InlineActiveDot;
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
  if (typeof window === "undefined") return () => {};
  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener("articulate-history-updated", handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("articulate-history-updated", handleChange);
  };
};

const getHistorySnapshot = () => {
  if (typeof window === "undefined") return "[]";
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

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const getScoreClass = (score: number) => {
  if (score >= 7) return "bg-emerald-500/20 text-emerald-200";
  if (score >= 4) return "bg-amber-500/20 text-amber-200";
  return "bg-rose-500/20 text-rose-200";
};

const getScoreBandColor = (score: number) => {
  if (score >= 7) return { stroke: "#34d399", glow: "drop-shadow(0 0 8px rgba(52, 211, 153, 0.45))" };
  if (score >= 4) return { stroke: "#fbbf24", glow: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.45))" };
  return { stroke: "#fb7185", glow: "drop-shadow(0 0 8px rgba(251, 113, 133, 0.45))" };
};

const getDifficultyClass = (difficulty: TongueTwisterSession["difficulty"] | PenSpeakingSession["difficulty"]) => {
  if (difficulty === "easy") return "bg-emerald-500/20 text-emerald-200";
  if (difficulty === "medium") return "bg-amber-500/20 text-amber-200";
  return "bg-rose-500/20 text-rose-200";
};

const getModeBadgeClass = (mode: Session["mode"]) => {
  if (mode === "off-the-cuff") return "bg-sky-500/20 text-sky-200";
  if (mode === "tongue-twisters") return "bg-emerald-500/20 text-emerald-200";
  if (mode === "daily-warm-up") return "bg-amber-500/20 text-amber-200";
  return "bg-violet-500/20 text-violet-200";
};

const getModeLabel = (mode: Session["mode"]) => {
  if (mode === "off-the-cuff") return "Off The Cuff";
  if (mode === "tongue-twisters") return "Tongue Twisters";
  if (mode === "daily-warm-up") return "Daily Warm-Up";
  return "Pen Speaking";
};

const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(
    2,
    "0"
  )}`;

const parseDayKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const computeStreak = (sessions: Session[]) => {
  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, practicedToday: false };
  }

  const daysWithSessions = new Set(
    sessions.map((session) => {
      const day = new Date(session.timestamp);
      return toDayKey(day);
    })
  );
  const today = new Date();
  const todayKey = toDayKey(today);
  const practicedToday = daysWithSessions.has(todayKey);

  let currentStreak = 0;
  const cursor = new Date(today);
  if (!practicedToday) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const dayKey = toDayKey(cursor);
    if (!daysWithSessions.has(dayKey)) break;
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortedDayKeys = [...daysWithSessions].sort();
  let longestStreak = 0;
  let run = 0;
  let previousKey: string | null = null;
  for (const dayKey of sortedDayKeys) {
    if (!previousKey) {
      run = 1;
    } else {
      const previousDay = parseDayKey(previousKey);
      previousDay.setDate(previousDay.getDate() + 1);
      run = toDayKey(previousDay) === dayKey ? run + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, run);
    previousKey = dayKey;
  }

  return { currentStreak, longestStreak, practicedToday };
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
      if (!Array.isArray(parsed)) return [];
      return parsed.map(parseSession).filter((session): session is Session => session !== null);
    } catch {
      return [];
    }
  }, [historySnapshot]);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});
  const [chartMode, setChartMode] = useState<"combined" | "byMode">("combined");

  useEffect(() => {
    document.title = "Dashboard";
  }, []);

  const hasSessions = sessions.length > 0;
  const offTheCuffSessions = useMemo(
    () => sessions.filter((session): session is OffTheCuffSession => session.mode === "off-the-cuff"),
    [sessions]
  );
  const recentSessions = sessions.slice(0, MAX_RECENT_SESSIONS);
  const streakStats = useMemo(() => computeStreak(sessions), [sessions]);
  const longestStreak = streakStats.longestStreak;
  const earnedBadgeIds = useMemo(() => {
    return new Set(
      BADGES
        .filter((badge) => badge.isEarned(sessions, longestStreak))
        .map((badge) => badge.id)
    );
  }, [sessions, longestStreak]);
  const earnedCount = earnedBadgeIds.size;

  const aggregateStats = useMemo(() => {
    if (!sessions.length) return null;
    const totalSessions = sessions.length;
    const averageScore =
      sessions.reduce((total, session) => total + session.overallScore, 0) / totalSessions;
    const bestScore = sessions.reduce(
      (best, session) => Math.max(best, session.overallScore),
      Number.NEGATIVE_INFINITY
    );
    return { totalSessions, averageScore, bestScore };
  }, [sessions]);

  const offTheCuffAggregate = useMemo(() => {
    if (!offTheCuffSessions.length) return null;
    const totalSessions = offTheCuffSessions.length;
    const averageScore =
      offTheCuffSessions.reduce((total, session) => total + session.overallScore, 0) / totalSessions;
    const averageWpm =
      offTheCuffSessions.reduce((total, session) => total + session.wpm, 0) / totalSessions;
    const averageAxes: SpiderAxis[] = AXIS_LABELS.map(({ key, label }) => ({
      axis: label,
      value:
        offTheCuffSessions.reduce((total, session) => total + session.axes[key], 0) / totalSessions,
    }));
    return { averageScore, averageWpm, averageAxes };
  }, [offTheCuffSessions]);

  const chartData = useMemo(() => {
    const chartSessions = [...sessions].slice(0, MAX_RECENT_SESSIONS).reverse();
    return chartSessions.map((session, index) => ({
      order: index + 1,
      score: Number(session.overallScore.toFixed(2)),
      label: formatSessionDate(session.timestamp),
    }));
  }, [sessions]);
  const byModeChartData = useMemo<ByModeChartDataPoint[]>(() => {
    const scoresBySeries = MODE_SERIES.reduce(
      (accumulator, series) => {
        accumulator[series.key] = sessions
          .filter((session) => session.mode === series.mode)
          .slice(0, MAX_RECENT_SESSIONS)
          .reverse()
          .map((session) => Number(session.overallScore.toFixed(2)));
        return accumulator;
      },
      {} as Record<ModeSeriesKey, number[]>
    );

    const maxLen = MODE_SERIES.reduce(
      (maximum, series) => Math.max(maximum, scoresBySeries[series.key].length),
      0
    );
    const data: ByModeChartDataPoint[] = [];
    for (let index = 0; index < maxLen; index++) {
      const point = { order: index + 1 } as ByModeChartDataPoint;
      MODE_SERIES.forEach((series) => {
        point[series.key] = scoresBySeries[series.key][index] ?? null;
      });
      data.push(point);
    }
    return data;
  }, [sessions]);

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessionIds((previous) => ({ ...previous, [sessionId]: !previous[sessionId] }));
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

  const badgesSection = (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Badges</h2>
        <p className="text-sm font-medium text-slate-400">
          {earnedCount} of {BADGES.length} earned
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {BADGES.map((badge) => {
          const isEarned = earnedBadgeIds.has(badge.id);
          return (
            <div
              key={badge.id}
              className={`group rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-center transition-opacity hover:opacity-100 ${
                isEarned ? "opacity-100" : "opacity-40"
              }`}
            >
              <div
                className={`text-4xl ${isEarned ? "" : "grayscale"} transition-[filter] group-hover:grayscale-0`}
              >
                {badge.emoji}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-100">{badge.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{badge.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );

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
          <>
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
            {badgesSection}
          </>
        ) : (
          <>
            {offTheCuffAggregate ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:p-6">
                <div className="grid gap-6 md:grid-cols-2 md:items-center">
                  <div className="flex flex-col items-center justify-center">
                    {(() => {
                      const normalizedScore = Math.max(0, Math.min(offTheCuffAggregate.averageScore, 10));
                      const progress = normalizedScore / 10;
                      const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
                      const ringColor = getScoreBandColor(offTheCuffAggregate.averageScore);
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
                                style={{ transition: "stroke-dashoffset 600ms ease-out", filter: ringColor.glow }}
                              />
                            </svg>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                              <div className="flex items-end gap-1">
                                <span className="text-5xl font-semibold tabular-nums text-slate-100 md:text-6xl">
                                  {offTheCuffAggregate.averageScore.toFixed(1)}
                                </span>
                                <span className="pb-1 text-sm text-slate-400">/ 10</span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Off The Cuff Average
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <SpiderChart axes={offTheCuffAggregate.averageAxes} height={240} />
                    <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 md:text-left">
                      Off The Cuff Profile
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 md:p-6">
                <p className="text-sm text-slate-300 md:text-base">
                  Complete an Off The Cuff session to see your speaking profile.
                </p>
              </div>
            )}

            {aggregateStats ? (
              <div className="mt-6 flex flex-wrap gap-2 md:gap-3">
                {[
                  { label: "Total Sessions", value: aggregateStats.totalSessions.toString() },
                  {
                    label: "Day streak",
                    value: (
                      <>
                        {streakStats.currentStreak} <span aria-hidden="true">🔥</span>
                      </>
                    ),
                    title: `Longest streak: ${streakStats.longestStreak} ${
                      streakStats.longestStreak === 1 ? "day" : "days"
                    }`,
                  },
                  { label: "Best Score", value: aggregateStats.bestScore.toFixed(1) },
                  { label: "Avg Score", value: aggregateStats.averageScore.toFixed(1) },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    title={stat.title}
                    className="min-w-[9rem] flex-1 rounded-xl bg-slate-800/50 p-4 text-center"
                  >
                    <p className="text-2xl font-semibold tabular-nums text-slate-100">{stat.value}</p>
                    <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400 md:text-xs">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {sessions.length >= 2 ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:p-5">
                <h2 className="text-lg font-semibold text-slate-100">Score trend</h2>
                <div className="mb-3 mt-4 inline-flex rounded-lg border border-slate-800 bg-slate-900/70 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartMode("combined")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      chartMode === "combined"
                        ? "bg-slate-700 text-slate-100"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Combined
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode("byMode")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      chartMode === "byMode"
                        ? "bg-slate-700 text-slate-100"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    By mode
                  </button>
                </div>
                <div className="mt-4 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartMode === "combined" ? (
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
                          activeDot={createInlineActiveDot(
                            { color: "#0ea5e9", textColor: "#e0f2fe", strokeColor: "#e0f2fe" },
                            "score"
                          )}
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={byModeChartData}>
                        <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="4 4" />
                        <XAxis
                          dataKey="order"
                          tick={{ fill: "#94a3b8", fontSize: 12 }}
                          tickLine={false}
                          axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
                          label={{
                            value: "Session number (per mode)",
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
                        {MODE_SERIES.map((series) => (
                          <Line
                            key={series.key}
                            type="monotone"
                            dataKey={series.key}
                            name={series.label}
                            stroke={series.color}
                            strokeWidth={2}
                            connectNulls
                            dot={{ r: 3, fill: series.color, stroke: series.color, strokeWidth: 0 }}
                            activeDot={createInlineActiveDot(
                              {
                                color: series.color,
                                textColor: series.activeTextColor,
                                strokeColor: series.activeStrokeColor,
                                radius: 5,
                              },
                              series.key
                            )}
                          />
                        ))}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
                {chartMode === "byMode" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {MODE_SERIES.map((series) => (
                      <span
                        key={series.key}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-xs text-slate-300"
                      >
                        <span className={`h-2 w-2 rounded-full ${series.legendDotClass}`} />
                        {series.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div id="practice-modes" className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-100">Practice modes</h2>
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
                      <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">{mode.description}</p>
                    </>
                  );

                  if (mode.href) {
                    const cardStyles = MODE_CARD_STYLES[mode.modeId];
                    return (
                      <Link
                        key={mode.title}
                        href={mode.href}
                        className={`rounded-2xl border bg-slate-800/50 p-6 transition-all duration-150 ease-out hover:scale-[1.02] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${cardStyles.border} ${cardStyles.glow} ${cardStyles.hoverBorder} ${cardStyles.focusRing}`}
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

            {badgesSection}

            <div className="mt-10">
              <h2 className="text-lg font-semibold text-slate-100">Recent sessions</h2>
              <div className="mt-4 space-y-4">
                {recentSessions.map((session) => {
                  const isExpanded = Boolean(expandedSessionIds[session.id]);
                  if (session.mode === "off-the-cuff") {
                    const fillerPercent = session.wordCount > 0 ? (session.fillerCount / session.wordCount) * 100 : 0;
                    const sessionAxes: SpiderAxis[] = AXIS_LABELS.map(({ key, label }) => ({
                      axis: label,
                      value: session.axes[key],
                    }));
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
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getModeBadgeClass(
                                  session.mode
                                )}`}
                              >
                                {getModeLabel(session.mode)}
                              </span>
                              <p className="text-sm text-slate-300">{formatSessionDate(session.timestamp)}</p>
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
                              <p className="mt-2 text-sm leading-relaxed text-slate-200">{session.summary}</p>
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
                  }

                  if (session.mode === "pen-speaking") {
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
                              <p className="text-sm text-slate-300">{formatSessionDate(session.timestamp)}</p>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getModeBadgeClass(
                                  session.mode
                                )}`}
                              >
                                {getModeLabel(session.mode)}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${getDifficultyClass(
                                  session.difficulty
                                )}`}
                              >
                                {session.difficulty}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-slate-400 md:text-base">
                              {session.passageText}
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
                          Accuracy {session.accuracyScore.toFixed(1)} · Clarity {session.clarityScore.toFixed(1)} ·
                          Coverage {session.coverageScore.toFixed(1)}
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
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Full passage
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-200">{session.passageText}</p>
                              </div>
                              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Transcript
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                                  {session.transcript || "No transcript captured."}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Mispronounced or skipped words
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {session.mispronouncedWords.length ? (
                                  session.mispronouncedWords.map((word) => (
                                    <span
                                      key={`${session.id}-${word}`}
                                      className="rounded-full bg-rose-500/20 px-3 py-1 text-sm text-rose-200"
                                    >
                                      {word}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">None.</span>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Feedback
                              </p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-200">{session.feedback}</p>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  }

                  if (session.mode === "daily-warm-up") {
                    const warmUpSession = session as DailyWarmUpSession;
                    return (
                      <article
                        key={warmUpSession.id}
                        className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:bg-slate-900/70"
                      >
                        <button
                          type="button"
                          onClick={() => deleteSession(warmUpSession.id)}
                          className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                          aria-label="Delete session"
                        >
                          ×
                        </button>

                        <div className="flex items-start justify-between gap-3 pr-8">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm text-slate-300">
                                {formatSessionDate(warmUpSession.timestamp)}
                              </p>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getModeBadgeClass(
                                  warmUpSession.mode
                                )}`}
                              >
                                {getModeLabel(warmUpSession.mode)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">
                              10-minute speaking routine
                            </p>
                          </div>
                          <div
                            className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold tabular-nums ${getScoreClass(
                              warmUpSession.overallScore
                            )}`}
                          >
                            {warmUpSession.overallScore.toFixed(1)}
                          </div>
                        </div>

                        <p className="mt-4 text-xs text-slate-400 md:text-sm">
                          {warmUpSession.stepsCompleted}/{warmUpSession.totalSteps} steps ·{" "}
                          {formatDuration(warmUpSession.durationSeconds)}
                        </p>

                        <button
                          type="button"
                          onClick={() => toggleExpanded(warmUpSession.id)}
                          className="mt-4 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          {isExpanded ? "Hide details" : "Details"}
                        </button>

                        {isExpanded ? (
                          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                            <p className="text-sm leading-relaxed text-slate-200">
                              Completed {warmUpSession.stepsCompleted} of {warmUpSession.totalSteps} steps in{" "}
                              {formatDuration(warmUpSession.durationSeconds)}.
                            </p>
                          </div>
                        ) : null}
                      </article>
                    );
                  }

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
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getModeBadgeClass(
                                session.mode
                              )}`}
                            >
                              {getModeLabel(session.mode)}
                            </span>
                            <p className="text-sm text-slate-300">{formatSessionDate(session.timestamp)}</p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${getDifficultyClass(
                                session.difficulty
                              )}`}
                            >
                              {session.difficulty}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">
                            {session.twisterText}
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
                        Accuracy {session.accuracyScore.toFixed(1)} · Speed {session.speedScore.toFixed(1)} · Clarity{" "}
                        {session.clarityScore.toFixed(1)}
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
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transcript</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                              {session.transcript || "No transcript captured."}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Mispronounced or missed words
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {session.mispronouncedWords.length ? (
                                session.mispronouncedWords.map((word) => (
                                  <span
                                    key={`${session.id}-${word}`}
                                    className="rounded-full bg-rose-500/20 px-3 py-1 text-sm text-rose-200"
                                  >
                                    {word}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-400">None.</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Feedback</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-200">{session.feedback}</p>
                          </div>

                          <p className="text-sm text-slate-300">
                            Actual WPM{" "}
                            <span className="font-semibold text-slate-100">{session.actualWpm.toFixed(1)}</span> ·
                            Target WPM{" "}
                            <span className="font-semibold text-slate-100">{session.targetWpm.toFixed(1)}</span>
                          </p>
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
