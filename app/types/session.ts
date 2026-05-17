import type { TwisterDifficulty } from "../data/twisters";

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

export type Session = OffTheCuffSession | TongueTwisterSession;
