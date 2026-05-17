import type { Session } from "../types/session";

export type Badge = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  isEarned: (sessions: Session[], longestStreak: number) => boolean;
};

export const BADGES: Badge[] = [
  {
    id: "first-session",
    name: "First Step",
    description: "Complete your first session.",
    emoji: "🎤",
    isEarned: (s) => s.length >= 1,
  },
  {
    id: "ten-sessions",
    name: "Getting Serious",
    description: "Complete 10 total sessions.",
    emoji: "📈",
    isEarned: (s) => s.length >= 10,
  },
  {
    id: "fifty-sessions",
    name: "Devoted",
    description: "Complete 50 total sessions.",
    emoji: "📚",
    isEarned: (s) => s.length >= 50,
  },
  {
    id: "quad",
    name: "Well-Rounded",
    description: "Complete at least one session in every mode.",
    emoji: "🌟",
    isEarned: (s) => new Set(s.map((session) => session.mode)).size >= 4,
  },
  {
    id: "high-score",
    name: "Sharpshooter",
    description: "Score 9.0 or higher in any session.",
    emoji: "🎯",
    isEarned: (s) => s.some((session) => session.overallScore >= 9),
  },
  {
    id: "perfect",
    name: "Flawless",
    description: "Score a perfect 10 in any session.",
    emoji: "💯",
    isEarned: (s) => s.some((session) => session.overallScore >= 10),
  },
  {
    id: "off-the-cuff-pro",
    name: "Off The Cuff Pro",
    description: "Complete 10 Off The Cuff sessions.",
    emoji: "🎙️",
    isEarned: (s) => s.filter((session) => session.mode === "off-the-cuff").length >= 10,
  },
  {
    id: "twister-master",
    name: "Twister Master",
    description: "Complete 10 Tongue Twister sessions.",
    emoji: "👅",
    isEarned: (s) => s.filter((session) => session.mode === "tongue-twisters").length >= 10,
  },
  {
    id: "pen-power",
    name: "Pen Power",
    description: "Complete 10 Pen Speaking sessions.",
    emoji: "✒️",
    isEarned: (s) => s.filter((session) => session.mode === "pen-speaking").length >= 10,
  },
  {
    id: "morning-routine",
    name: "Morning Person",
    description: "Complete 5 Daily Warm-Ups.",
    emoji: "🌅",
    isEarned: (s) => s.filter((session) => session.mode === "daily-warm-up").length >= 5,
  },
  {
    id: "week-streak",
    name: "Week Warrior",
    description: "Hit a 7-day streak.",
    emoji: "🔥",
    isEarned: (_s, longestStreak) => longestStreak >= 7,
  },
  {
    id: "month-streak",
    name: "Month-Long",
    description: "Hit a 30-day streak.",
    emoji: "🗓️",
    isEarned: (_s, longestStreak) => longestStreak >= 30,
  },
];
