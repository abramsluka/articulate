import type { TwisterDifficulty } from "../data/twisters";
import type { PassageDifficulty } from "../data/penPassages";

export type OffTheCuffSession = {
  mode: "off-the-cuff";
  id: string;
  timestamp: number;
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

export type TongueTwisterSession = {
  mode: "tongue-twisters";
  id: string;
  timestamp: number;
  twisterId: string;
  twisterText: string;
  difficulty: TwisterDifficulty;
  transcript: string;
  durationSeconds: number;
  overallScore: number;
  accuracyScore: number;
  speedScore: number;
  clarityScore: number;
  actualWpm: number;
  targetWpm: number;
  mispronouncedWords: string[];
  feedback: string;
};

export type PenSpeakingSession = {
  mode: "pen-speaking";
  id: string;
  timestamp: number;
  passageId: string;
  passageText: string;
  difficulty: PassageDifficulty;
  transcript: string;
  durationSeconds: number;
  overallScore: number;
  accuracyScore: number;
  clarityScore: number;
  coverageScore: number;
  mispronouncedWords: string[];
  feedback: string;
};

export type Session = OffTheCuffSession | TongueTwisterSession | PenSpeakingSession;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isTwisterDifficulty = (value: unknown): value is TwisterDifficulty =>
  value === "easy" || value === "medium" || value === "hard";

const isPassageDifficulty = (value: unknown): value is PassageDifficulty =>
  value === "easy" || value === "medium" || value === "hard";

export const parseOffTheCuffSession = (value: unknown): OffTheCuffSession | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<OffTheCuffSession> & { mode?: unknown };
  if (
    typeof data.id !== "string" ||
    !isFiniteNumber(data.timestamp) ||
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

export const parseTongueTwisterSession = (value: unknown): TongueTwisterSession | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<TongueTwisterSession>;
  if (
    data.mode !== "tongue-twisters" ||
    typeof data.id !== "string" ||
    !isFiniteNumber(data.timestamp) ||
    typeof data.twisterId !== "string" ||
    typeof data.twisterText !== "string" ||
    !isTwisterDifficulty(data.difficulty) ||
    typeof data.transcript !== "string" ||
    !isFiniteNumber(data.durationSeconds) ||
    !isFiniteNumber(data.overallScore) ||
    !isFiniteNumber(data.accuracyScore) ||
    !isFiniteNumber(data.speedScore) ||
    !isFiniteNumber(data.clarityScore) ||
    !isFiniteNumber(data.actualWpm) ||
    !isFiniteNumber(data.targetWpm) ||
    !Array.isArray(data.mispronouncedWords) ||
    !data.mispronouncedWords.every((word) => typeof word === "string") ||
    typeof data.feedback !== "string"
  ) {
    return null;
  }

  return data as TongueTwisterSession;
};

export const parsePenSpeakingSession = (value: unknown): PenSpeakingSession | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<PenSpeakingSession>;
  if (
    data.mode !== "pen-speaking" ||
    typeof data.id !== "string" ||
    !isFiniteNumber(data.timestamp) ||
    typeof data.passageId !== "string" ||
    typeof data.passageText !== "string" ||
    !isPassageDifficulty(data.difficulty) ||
    typeof data.transcript !== "string" ||
    !isFiniteNumber(data.durationSeconds) ||
    !isFiniteNumber(data.overallScore) ||
    !isFiniteNumber(data.accuracyScore) ||
    !isFiniteNumber(data.clarityScore) ||
    !isFiniteNumber(data.coverageScore) ||
    !Array.isArray(data.mispronouncedWords) ||
    !data.mispronouncedWords.every((word) => typeof word === "string") ||
    typeof data.feedback !== "string"
  ) {
    return null;
  }

  return data as PenSpeakingSession;
};

export const parseSession = (value: unknown): Session | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as { mode?: unknown };
  const mode = data.mode;
  if (mode === "tongue-twisters") return parseTongueTwisterSession(value);
  if (mode === "pen-speaking") return parsePenSpeakingSession(value);
  return parseOffTheCuffSession(value);
};
