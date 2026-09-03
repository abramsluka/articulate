"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import SpiderChart from "../components/SpiderChart";
import { AuthRequiredError, fetchWithSessionRefresh } from "../lib/api-client";
import { saveSession } from "../lib/supabase/sessions";
import type { OffTheCuffSession } from "../types/session";

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "requires-login" }
  | { kind: "error"; message: string };

type PromptCategory =
  | "Topic"
  | "Personal"
  | "Opinion"
  | "Pitch"
  | "Creative"
  | "Abstract"
  | "Silly";
type FilterCategory = "All" | PromptCategory;
type OpinionTake = "best" | "worst" | "medium" | "contrarian";
type TakeFilter = OpinionTake | "random";
type Prompt =
  | { text: string; category: Exclude<PromptCategory, "Opinion"> }
  | { text: string; category: "Opinion"; take: OpinionTake };
type PrepMode = "3s" | "5s" | "10s" | "Manual";
type TipCategory = "clarity" | "evidence" | "structure" | "conviction";
type AnalysisResult = {
  overallScore: number;
  axes: {
    pace: number;
    evidence: number;
    confidence: number;
    clarity: number;
    fillerWords: number;
  };
  sentenceTips: {
    sentenceText: string;
    tip: string;
    category: TipCategory;
  }[];
  powerWords: string[];
  weakWords: string[];
  structure: {
    hasOpening: boolean;
    hasBody: boolean;
    hasClosing: boolean;
  };
  summary: string;
};

const PROMPTS = [
  { text: "Awkward silences", category: "Topic" },
  { text: "The word 'later'", category: "Topic" },
  { text: "Reinventing yourself", category: "Topic" },
  { text: "Sincerity", category: "Topic" },
  { text: "Confidence vs. arrogance", category: "Topic" },
  { text: "Micro-decisions", category: "Topic" },
  { text: "First impressions", category: "Topic" },
  { text: "Solitude", category: "Topic" },
  { text: "Routine", category: "Topic" },
  { text: "Overdelivering", category: "Topic" },
  { text: "Boredom", category: "Topic" },
  { text: "Why people give advice", category: "Topic" },
  {
    text: "Argue hybrid work is the optimal model for most knowledge teams.",
    category: "Opinion",
    take: "best",
  },
  {
    text: "Argue managers should share written expectations before every project kickoff.",
    category: "Opinion",
    take: "best",
  },
  {
    text: "Argue every student should learn public speaking before graduation.",
    category: "Opinion",
    take: "best",
  },
  {
    text: "Argue companies should budget for deep-work blocks, not just meetings.",
    category: "Opinion",
    take: "best",
  },
  {
    text: "Argue there should be no meeting-free days, ever.",
    category: "Opinion",
    take: "worst",
  },
  {
    text: "Argue all office chairs should be standing-only to build character.",
    category: "Opinion",
    take: "worst",
  },
  {
    text: "Argue adults should lose internet access after 9 p.m. on weekdays.",
    category: "Opinion",
    take: "worst",
  },
  {
    text: "Argue every team decision should be made by the loudest person in the room.",
    category: "Opinion",
    take: "worst",
  },
  {
    text: "Argue procrastination is sometimes a feature, not a bug.",
    category: "Opinion",
    take: "medium",
  },
  {
    text: "Argue social media is morally neutral; outcomes depend on how people use it.",
    category: "Opinion",
    take: "medium",
  },
  {
    text: "Argue strict routines help creativity for some people and kill it for others.",
    category: "Opinion",
    take: "medium",
  },
  {
    text: "Argue remote work improves focus but can quietly weaken mentorship.",
    category: "Opinion",
    take: "medium",
  },
  {
    text: "Argue boredom is essential to a good life.",
    category: "Opinion",
    take: "contrarian",
  },
  {
    text: "Argue silence often communicates more than speech.",
    category: "Opinion",
    take: "contrarian",
  },
  {
    text: "Argue introverts often make the best leaders.",
    category: "Opinion",
    take: "contrarian",
  },
  {
    text: "Argue small talk is an underrated professional skill.",
    category: "Opinion",
    take: "contrarian",
  },
  {
    text: "Pitch a TV show that takes place entirely in an elevator.",
    category: "Pitch",
  },
  {
    text: "Pitch yourself for a job you are not technically qualified for.",
    category: "Pitch",
  },
  {
    text: "Pitch a startup solving a problem you personally run into every week.",
    category: "Pitch",
  },
  {
    text: "Convince your manager to let you work from another city for one month.",
    category: "Pitch",
  },
  {
    text: "Pitch a paid service that helps roommates split chores without arguments.",
    category: "Pitch",
  },
  {
    text: "Pitch a feature that would make your favorite app impossible to quit.",
    category: "Pitch",
  },
  {
    text: "Sell a local bookstore on hosting one event that doubles foot traffic.",
    category: "Pitch",
  },
  {
    text: "Pitch a neighborhood subscription that makes daily errands easier.",
    category: "Pitch",
  },
  {
    text: "Pitch a podcast format that turns boring meetings into entertainment.",
    category: "Pitch",
  },
  {
    text: "Convince a skeptical friend to join a side project this weekend.",
    category: "Pitch",
  },
  {
    text: "Walk through what you do in the first 10 minutes after waking up.",
    category: "Personal",
  },
  {
    text: "Tell the story of a friendship that changed how you see yourself.",
    category: "Personal",
  },
  {
    text: "Describe a moment from childhood that still affects your decisions.",
    category: "Personal",
  },
  {
    text: "Tell the story of a tiny risk that paid off.",
    category: "Personal",
  },
  {
    text: "Describe a routine you outgrew and what replaced it.",
    category: "Personal",
  },
  {
    text: "Tell the story of a time you misread a room and recovered.",
    category: "Personal",
  },
  {
    text: "Describe a compliment you did not expect but never forgot.",
    category: "Personal",
  },
  {
    text: "Walk through a decision you made quickly but still trust.",
    category: "Personal",
  },
  {
    text: "Describe a place you return to when you need to reset.",
    category: "Personal",
  },
  {
    text: "Tell the story of a project you almost abandoned too early.",
    category: "Personal",
  },
  {
    text: "Design a holiday for something humans rarely celebrate.",
    category: "Creative",
  },
  {
    text: "Invent a sport that could only exist in zero gravity.",
    category: "Creative",
  },
  {
    text: "Describe the most visited museum exhibit of the year 2125.",
    category: "Creative",
  },
  {
    text: "Create a city rule that sounds strange but makes life better.",
    category: "Creative",
  },
  {
    text: "Invent a restaurant where the menu changes with your mood.",
    category: "Creative",
  },
  {
    text: "Design a classroom that makes adults feel curious again.",
    category: "Creative",
  },
  {
    text: "Imagine a phone feature people would call magic in 20 years.",
    category: "Creative",
  },
  {
    text: "Create a new genre of party that does not involve music.",
    category: "Creative",
  },
  {
    text: "Invent an app that helps strangers collaborate in five minutes.",
    category: "Creative",
  },
  {
    text: "Describe a playground built specifically for stressed adults.",
    category: "Creative",
  },
  {
    text: "Convince me hot dogs are definitely sandwiches.",
    category: "Silly",
  },
  {
    text: "Describe what dogs say at a bar after the humans leave.",
    category: "Silly",
  },
  {
    text: "Defend pigeons as the most underrated animal in any city.",
    category: "Silly",
  },
  {
    text: "Argue your laptop charger has a dramatic personality.",
    category: "Silly",
  },
  {
    text: "Pitch a luxury spa built exclusively for tired backpacks.",
    category: "Silly",
  },
  {
    text: "Convince a jury the missing sock is innocent.",
    category: "Silly",
  },
  {
    text: "Explain how elevators secretly rank every passenger.",
    category: "Silly",
  },
  {
    text: "Give an acceptance speech for best snack in your kitchen.",
    category: "Silly",
  },
  {
    text: "Describe a reality show where houseplants review their owners.",
    category: "Silly",
  },
  {
    text: "Argue cereal should be eaten with chopsticks for better pacing.",
    category: "Silly",
  },
  {
    text: "What is the difference between confidence and arrogance?",
    category: "Abstract",
  },
  {
    text: "Why do humans tell stories before they trust data?",
    category: "Abstract",
  },
  {
    text: "Can taste be taught, or only developed?",
    category: "Abstract",
  },
  {
    text: "When does patience become avoidance?",
    category: "Abstract",
  },
  {
    text: "Why does certainty sound persuasive even when it is wrong?",
    category: "Abstract",
  },
  {
    text: "What makes advice feel generous instead of intrusive?",
    category: "Abstract",
  },
  {
    text: "Is consistency a virtue or just social predictability?",
    category: "Abstract",
  },
  {
    text: "When is ambition expansive, and when is it self-erasing?",
    category: "Abstract",
  },
  {
    text: "What turns experience into wisdom instead of just memory?",
    category: "Abstract",
  },
  {
    text: "Why do people confuse urgency with importance?",
    category: "Abstract",
  },
] satisfies Prompt[];

const CATEGORIES: FilterCategory[] = [
  "All",
  "Topic",
  "Opinion",
  "Pitch",
  "Personal",
  "Creative",
  "Silly",
  "Abstract",
];
const TAKE_OPTIONS: { value: TakeFilter; label: string }[] = [
  { value: "best", label: "Best" },
  { value: "worst", label: "Worst" },
  { value: "medium", label: "Medium" },
  { value: "contrarian", label: "Contrarian" },
  { value: "random", label: "Random" },
];

const isOpinionPrompt = (prompt: Prompt): prompt is Extract<Prompt, { category: "Opinion" }> =>
  prompt.category === "Opinion";

const getPromptsForSelection = (
  category: FilterCategory,
  selectedTake: TakeFilter
) => {
  if (category === "All") {
    return PROMPTS;
  }
  if (category !== "Opinion") {
    return PROMPTS.filter((prompt) => prompt.category === category);
  }
  return PROMPTS.filter((prompt) =>
    isOpinionPrompt(prompt) &&
    (selectedTake === "random" || prompt.take === selectedTake)
  );
};

const formatTakeLabel = (take: OpinionTake) =>
  take.charAt(0).toUpperCase() + take.slice(1);

const TIMER_DURATION = 60;
const PREP_OPTIONS: PrepMode[] = ["3s", "5s", "10s", "Manual"];
const FILLER_PATTERN =
  /\b(?:you\s+know|i\s+mean|kind\s+of|sort\s+of|so\s+um|and\s+like|actually|basically|literally|honestly|right|okay|well|like|um|uh|er|ah|so)\b/gi;
const WORD_PATTERN = /\b[\w']+\b/g;

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type BrowserSpeechRecognitionErrorEvent = {
  error: string;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const appendTranscript = (existingText: string, nextText: string) => {
  const existing = existingText.trim();
  const next = nextText.trim();
  if (!next) {
    return existing;
  }
  return existing ? `${existing} ${next}` : next;
};

const normalizeSentence = (sentence: string) =>
  sentence.toLowerCase().replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");

const splitTranscriptSentences = (text: string) =>
  text.match(/[^.!?]+[.!?]*\s*/g) ?? [];

const countWords = (text: string) => text.match(WORD_PATTERN)?.length ?? 0;

const countFillers = (text: string) =>
  [...text.matchAll(new RegExp(FILLER_PATTERN.source, FILLER_PATTERN.flags))].length;

const highlightFillerParts = (text: string) => {
  const parts: { text: string; isFiller: boolean }[] = [];
  const matcher = new RegExp(FILLER_PATTERN.source, FILLER_PATTERN.flags);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isFiller: false });
    }
    parts.push({ text: match[0], isFiller: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isFiller: false });
  }

  return parts;
};

const isTipCategory = (value: unknown): value is TipCategory =>
  value === "clarity" ||
  value === "evidence" ||
  value === "structure" ||
  value === "conviction";

const isAnalysisResult = (value: unknown): value is AnalysisResult => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AnalysisResult>;

  return (
    typeof data.overallScore === "number" &&
    !!data.axes &&
    typeof data.axes.pace === "number" &&
    typeof data.axes.evidence === "number" &&
    typeof data.axes.confidence === "number" &&
    typeof data.axes.clarity === "number" &&
    typeof data.axes.fillerWords === "number" &&
    Array.isArray(data.sentenceTips) &&
    data.sentenceTips.every(
      (tip) =>
        !!tip &&
        typeof tip.sentenceText === "string" &&
        typeof tip.tip === "string" &&
        isTipCategory(tip.category)
    ) &&
    Array.isArray(data.powerWords) &&
    data.powerWords.every((word) => typeof word === "string") &&
    Array.isArray(data.weakWords) &&
    data.weakWords.every((word) => typeof word === "string") &&
    !!data.structure &&
    typeof data.structure.hasOpening === "boolean" &&
    typeof data.structure.hasBody === "boolean" &&
    typeof data.structure.hasClosing === "boolean" &&
    typeof data.summary === "string"
  );
};

const getAudioExtensionFromMimeType = (mimeType: string) => {
  const normalizedMimeType = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalizedMimeType === "audio/webm") return "webm";
  if (normalizedMimeType === "audio/mp4") return "mp4";
  if (normalizedMimeType === "audio/mpeg") return "mp3";
  if (normalizedMimeType === "audio/wav" || normalizedMimeType === "audio/x-wav") {
    return "wav";
  }
  if (normalizedMimeType === "audio/ogg") return "ogg";
  if (normalizedMimeType === "audio/aac") return "aac";
  if (normalizedMimeType === "audio/m4a" || normalizedMimeType === "audio/x-m4a") {
    return "m4a";
  }
  if (normalizedMimeType === "audio/3gpp") return "3gp";
  return "webm";
};

const getSpeechRecognitionConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
};

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("All");
  const [selectedTake, setSelectedTake] = useState<TakeFilter>("random");
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [prepMode, setPrepMode] = useState<PrepMode>("3s");
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  const [canStartCurrentPrompt, setCanStartCurrentPrompt] = useState(false);
  const [unusedPrompts, setUnusedPrompts] = useState<Prompt[]>(() =>
    shuffle(PROMPTS)
  );
  const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [reviewElapsedSeconds, setReviewElapsedSeconds] = useState<number | null>(null);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    "idle" | "transcribing" | "done" | "error"
  >("idle");
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "analyzing" | "done" | "error" | "requires-login"
  >("idle");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(true);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const discardRecordingOnStopRef = useRef(false);
  const hasMountedPrepModeRef = useRef(false);
  const secondsLeftRef = useRef(TIMER_DURATION);
  const finalTranscriptRef = useRef("");
  const transcriptionRequestIdRef = useRef(0);
  const [hasSaved, setHasSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });

  useEffect(() => {
    if (saveStatus.kind !== "saved") return;
    const timeoutId = window.setTimeout(() => {
      setSaveStatus((current) => (current.kind === "saved" ? { kind: "idle" } : current));
    }, 4000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveStatus]);

  useEffect(() => {
    document.title = "Off The Cuff";
  }, []);

  useEffect(() => {
    setIsTranscriptionSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    if (!audioUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const filteredPrompts = getPromptsForSelection(activeCategory, selectedTake);

    setUnusedPrompts(shuffle(filteredPrompts));
    setCurrentPrompt(null);
    setPrepCountdown(null);
    setCanStartCurrentPrompt(false);
    setIsTimerRunning(false);
    setSecondsLeft(TIMER_DURATION);
    setIsRecording(false);
    setIsPaused(false);
    setHasRecording(false);
    setReviewElapsedSeconds(null);
    setRecordingError("");
    setFinalTranscript("");
    setInterimTranscript("");
    setTranscriptionStatus("idle");
    setAnalysisStatus("idle");
    setAnalysisResult(null);
    setHasSaved(false);
    setSaveStatus({ kind: "idle" });
    transcriptionRequestIdRef.current += 1;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setAudioUrl(null);
  }, [activeCategory, selectedTake]);

  useEffect(() => {
    if (!hasMountedPrepModeRef.current) {
      hasMountedPrepModeRef.current = true;
      return;
    }

    setPrepCountdown(null);
    clearRecording();
    setIsTimerRunning(false);
    setSecondsLeft(TIMER_DURATION);
    setCanStartCurrentPrompt(false);
  }, [prepMode]);

  useEffect(() => {
    if (!currentPrompt) {
      return;
    }

    setIsPromptVisible(false);
    const animationFrame = requestAnimationFrame(() => {
      setIsPromptVisible(true);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [currentPrompt]);

  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  useEffect(() => {
    finalTranscriptRef.current = finalTranscript;
  }, [finalTranscript]);

  useEffect(() => {
    if (prepCountdown === null) {
      return;
    }
    if (prepCountdown <= 0) {
      setPrepCountdown(null);
      void startRecording();
      return;
    }

    const countdownTimer = setTimeout(() => {
      setPrepCountdown((previousValue) =>
        previousValue === null ? null : previousValue - 1
      );
    }, 1000);

    return () => {
      clearTimeout(countdownTimer);
    };
  }, [prepCountdown]);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((previousSeconds) => {
        if (previousSeconds <= 1) {
          clearInterval(timer);
          setIsTimerRunning(false);
          return 0;
        }
        return previousSeconds - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isTimerRunning]);

  useEffect(() => {
    if (secondsLeft !== 0 || !isRecording) {
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording, secondsLeft]);

  const stopAndReleaseMicrophone = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const stopRecognition = () => {
    if (!recognitionRef.current) {
      return;
    }
    recognitionRef.current.onresult = null;
    recognitionRef.current.onerror = null;
    recognitionRef.current.onend = null;
    recognitionRef.current.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
  };

  const clearRecording = () => {
    discardRecordingOnStopRef.current = true;
    transcriptionRequestIdRef.current += 1;
    stopRecognition();
    stopAndReleaseMicrophone();
    setIsRecording(false);
    setIsPaused(false);
    setHasRecording(false);
    setReviewElapsedSeconds(null);
    setRecordingError("");
    setFinalTranscript("");
    setInterimTranscript("");
    setTranscriptionStatus("idle");
    setAnalysisStatus("idle");
    setAnalysisResult(null);
    setHasSaved(false);
    setSaveStatus({ kind: "idle" });
    audioChunksRef.current = [];
    setAudioUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  };

  const pickPrompt = () => {
    if (PROMPTS.length === 0) {
      return;
    }

    const filteredPrompts = getPromptsForSelection(activeCategory, selectedTake);
    if (filteredPrompts.length === 0) {
      return;
    }

    let promptPool = unusedPrompts;
    if (promptPool.length === 0) {
      const refilledPool = shuffle(
        currentPrompt
          ? filteredPrompts.filter((prompt) => prompt.text !== currentPrompt.text)
          : filteredPrompts
      );
      promptPool = refilledPool;
    }

    const [nextPrompt, ...remainingPrompts] = promptPool;
    if (!nextPrompt) {
      return;
    }

    setCurrentPrompt(nextPrompt);
    setUnusedPrompts(remainingPrompts);
    setCanStartCurrentPrompt(false);
    return nextPrompt;
  };

  const resetDuringRecording = () => {
    setPrepCountdown(null);
    clearRecording();
    setIsTimerRunning(false);
    setSecondsLeft(TIMER_DURATION);
    setCanStartCurrentPrompt(!isManualMode && Boolean(currentPrompt));
    setReviewElapsedSeconds(null);
  };

  const getPrepSeconds = () => {
    if (prepMode === "3s") return 3;
    if (prepMode === "5s") return 5;
    if (prepMode === "10s") return 10;
    return null;
  };

  const ensureMicPermission = async () => {
    if (hasMicPermission) {
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasMicPermission(true);
      return true;
    } catch {
      setHasMicPermission(false);
      setRecordingError("Microphone permission needed to start this mode.");
      return false;
    }
  };

  const preparePromptForMode = async () => {
    const prepSeconds = getPrepSeconds();
    if (prepSeconds !== null) {
      const canRecord = await ensureMicPermission();
      if (!canRecord) {
        return;
      }
    }

    const nextPrompt = pickPrompt();
    if (!nextPrompt) {
      return;
    }

    setPrepCountdown(null);
    clearRecording();
    setSecondsLeft(TIMER_DURATION);
    setIsTimerRunning(false);
    setRecordingError("");
    setCanStartCurrentPrompt(false);

    if (prepSeconds !== null) {
      setPrepCountdown(prepSeconds);
    }
  };

  const startCurrentPromptForMode = async () => {
    if (!currentPrompt) {
      return;
    }

    const prepSeconds = getPrepSeconds();
    if (prepSeconds === null) {
      await startRecording();
      return;
    }

    const canRecord = await ensureMicPermission();
    if (!canRecord) {
      return;
    }

    setRecordingError("");
    setPrepCountdown(prepSeconds);
    setCanStartCurrentPrompt(false);
  };

  const startRecognition = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition || recognitionRef.current) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let nextFinal = "";
      let nextInterim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          nextFinal = appendTranscript(nextFinal, transcript);
        } else {
          nextInterim = appendTranscript(nextInterim, transcript);
        }
      }
      if (nextFinal) {
        setFinalTranscript((previous) => appendTranscript(previous, nextFinal));
      }
      setInterimTranscript(nextInterim);
    };
    recognition.onerror = () => {
      setInterimTranscript("");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setInterimTranscript("");
    };
    recognition.start();
  };

  const startRecording = async () => {
    if (!currentPrompt || isRecording) {
      return;
    }

    clearRecording();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopRecognition();
        const shouldDiscardRecording = discardRecordingOnStopRef.current;
        discardRecordingOnStopRef.current = false;
        const recordingMimeType =
          recorder.mimeType || audioChunksRef.current[0]?.type || "audio/webm";
        const recording = new Blob(audioChunksRef.current, {
          type: recordingMimeType,
        });
        audioChunksRef.current = [];
        if (!shouldDiscardRecording && recording.size > 0) {
          const fallbackTranscript = finalTranscriptRef.current;
          const elapsedSeconds = Math.max(
            0,
            Math.min(TIMER_DURATION, TIMER_DURATION - secondsLeftRef.current)
          );
          setReviewElapsedSeconds(elapsedSeconds);
          const nextAudioUrl = URL.createObjectURL(recording);
          setAudioUrl((previousUrl) => {
            if (previousUrl) {
              URL.revokeObjectURL(previousUrl);
            }
            return nextAudioUrl;
          });
          setHasRecording(true);
          setTranscriptionStatus("transcribing");
          setAnalysisStatus("idle");
          setAnalysisResult(null);
          setHasSaved(false);
          setSaveStatus({ kind: "idle" });

          const requestId = transcriptionRequestIdRef.current + 1;
          transcriptionRequestIdRef.current = requestId;
          const fileExtension = getAudioExtensionFromMimeType(
            recording.type || recordingMimeType
          );
          const formData = new FormData();
          formData.append("audio", recording, `recording.${fileExtension}`);

          try {
            const response = await fetchWithSessionRefresh("/api/transcribe", {
              method: "POST",
              body: formData,
            });
            if (!response.ok) {
              throw new Error("Transcription request failed");
            }

            const data = (await response.json()) as { text?: string };
            if (requestId !== transcriptionRequestIdRef.current) {
              return;
            }
            if (typeof data.text === "string") {
              setFinalTranscript(data.text);
              setTranscriptionStatus("done");
              setAnalysisStatus("analyzing");

              try {
                const analysisResponse = await fetchWithSessionRefresh("/api/analyze", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    prompt: currentPrompt.text,
                    transcript: data.text,
                  }),
                });

                if (!analysisResponse.ok) {
                  throw new Error("Analysis request failed");
                }

                const analysisData = (await analysisResponse.json()) as unknown;
                if (requestId !== transcriptionRequestIdRef.current) {
                  return;
                }

                if (isAnalysisResult(analysisData)) {
                  setAnalysisResult(analysisData);
                  setAnalysisStatus("done");
                  if (!hasSaved) {
                    const timestamp = Date.now();
                    const speakingDurationSeconds = Math.max(
                      1,
                      reviewElapsedSeconds ??
                        Math.max(0, Math.min(TIMER_DURATION, TIMER_DURATION - secondsLeftRef.current))
                    );
                    const wordCount = countWords(data.text);
                    const fillerCount = countFillers(data.text);
                    const wpm =
                      speakingDurationSeconds > 0
                        ? Math.round(wordCount / (speakingDurationSeconds / 60))
                        : 0;
                    const session: OffTheCuffSession = {
                      id:
                        typeof crypto !== "undefined" && "randomUUID" in crypto
                          ? crypto.randomUUID()
                          : timestamp.toString(),
                      timestamp,
                      mode: "off-the-cuff",
                      category: currentPrompt.category,
                      take: isOpinionPrompt(currentPrompt)
                        ? formatTakeLabel(currentPrompt.take)
                        : undefined,
                      promptText: currentPrompt.text,
                      transcript: data.text,
                      speakingDurationSeconds,
                      wordCount,
                      fillerCount,
                      wpm,
                      overallScore: analysisData.overallScore,
                      axes: analysisData.axes,
                      powerWords: analysisData.powerWords,
                      weakWords: analysisData.weakWords,
                      structure: analysisData.structure,
                      summary: analysisData.summary,
                      sentenceTips: analysisData.sentenceTips,
                    };
                    setHasSaved(true);
                    setSaveStatus({ kind: "saving" });
                    const result = await saveSession(session);
                    if (requestId !== transcriptionRequestIdRef.current) return;
                    if (result.ok) {
                      setSaveStatus({ kind: "saved" });
                    } else if (result.requiresLogin) {
                      setSaveStatus({ kind: "requires-login" });
                    } else {
                      setSaveStatus({ kind: "error", message: result.error });
                    }
                  }
                } else {
                  setAnalysisResult(null);
                  setAnalysisStatus("error");
                }
              } catch (analysisError) {
                if (requestId !== transcriptionRequestIdRef.current) {
                  return;
                }
                setAnalysisResult(null);
                setAnalysisStatus(
                  analysisError instanceof AuthRequiredError ? "requires-login" : "error"
                );
              }
            } else {
              setFinalTranscript(fallbackTranscript);
              setTranscriptionStatus("error");
              setAnalysisStatus("error");
              setAnalysisResult(null);
            }
          } catch (transcriptionError) {
            if (requestId !== transcriptionRequestIdRef.current) {
              return;
            }
            setFinalTranscript(fallbackTranscript);
            setTranscriptionStatus("error");
            setAnalysisStatus(
              transcriptionError instanceof AuthRequiredError ? "requires-login" : "error"
            );
            setAnalysisResult(null);
          }
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsPaused(false);
        setIsTimerRunning(false);
      };

      discardRecordingOnStopRef.current = false;
      recorder.start();
      setFinalTranscript("");
      setInterimTranscript("");
      setTranscriptionStatus("idle");
      setAnalysisStatus("idle");
      setAnalysisResult(null);
      setHasSaved(false);
      setSaveStatus({ kind: "idle" });
      startRecognition();
      setRecordingError("");
      setHasRecording(false);
      setReviewElapsedSeconds(null);
      setAudioUrl(null);
      setIsRecording(true);
      setIsPaused(false);
      setSecondsLeft(TIMER_DURATION);
      setIsTimerRunning(true);
    } catch {
      setRecordingError("Microphone access denied. Check browser permissions.");
      setHasMicPermission(false);
      setIsRecording(false);
      setIsPaused(false);
      setIsTimerRunning(false);
      setSecondsLeft(TIMER_DURATION);
      stopAndReleaseMicrophone();
    }
  };

  const pauseRecording = () => {
    if (!isRecording || !mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
      return;
    }
    mediaRecorderRef.current.pause();
    stopRecognition();
    setIsPaused(true);
    setIsTimerRunning(false);
  };

  const resumeRecording = () => {
    if (!isRecording || !isPaused || !mediaRecorderRef.current) {
      return;
    }
    if (mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    startRecognition();
    setIsPaused(false);
    setIsTimerRunning(true);
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) {
      return;
    }
    setIsRecording(false);
    setIsPaused(false);
    setIsTimerRunning(false);
    stopRecognition();
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const recordingTimerLabel = `${Math.floor(secondsLeft / 60)}:${String(
    secondsLeft % 60
  ).padStart(2, "0")}`;
  const frozenReviewTimerLabel =
    reviewElapsedSeconds === null
      ? "0:00"
      : `${Math.floor(reviewElapsedSeconds / 60)}:${String(
          reviewElapsedSeconds % 60
        ).padStart(2, "0")}`;
  const prepLabel = prepCountdown !== null ? String(Math.max(0, prepCountdown)) : null;
  const isReviewState = hasRecording && Boolean(audioUrl);
  const isManualMode = prepMode === "Manual";
  const isPreparing = prepCountdown !== null;
  const showCountdownLayer = Boolean(isPreparing && prepLabel);
  const showTimerLayer = Boolean(isRecording || isReviewState);
  const showManualRecordLayer = Boolean(
    currentPrompt && !isRecording && !isReviewState && isManualMode && !isPreparing
  );
  const showStartLayer = Boolean(
    currentPrompt &&
      !isRecording &&
      !isReviewState &&
      !isManualMode &&
      canStartCurrentPrompt &&
      !isPreparing
  );
  const showPrepResetLayer = Boolean(isPreparing);
  const showRecordingControlsLayer = Boolean(isRecording);
  const showReviewControlsLayer = Boolean(
    isReviewState && transcriptionStatus !== "transcribing"
  );
  const transcriptAnalysis = useMemo(() => {
    const wordMatches = finalTranscript.match(WORD_PATTERN) ?? [];
    const parts: { text: string; isFiller: boolean }[] = [];
    const matcher = new RegExp(FILLER_PATTERN.source, FILLER_PATTERN.flags);
    let fillerCount = 0;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(finalTranscript)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          text: finalTranscript.slice(lastIndex, match.index),
          isFiller: false,
        });
      }
      parts.push({ text: match[0], isFiller: true });
      fillerCount += 1;
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < finalTranscript.length) {
      parts.push({ text: finalTranscript.slice(lastIndex), isFiller: false });
    }

    return {
      fillerCount,
      parts,
      totalWords: wordMatches.length,
    };
  }, [finalTranscript]);
  const hasTranscriptWords = transcriptAnalysis.totalWords > 0;
  const fillerPercent = hasTranscriptWords
    ? `${((transcriptAnalysis.fillerCount / transcriptAnalysis.totalWords) * 100).toFixed(1)}%`
    : "—";
  const paceWordsPerMinute =
    hasTranscriptWords && reviewElapsedSeconds && reviewElapsedSeconds > 0
      ? Math.round(transcriptAnalysis.totalWords / (reviewElapsedSeconds / 60)).toString()
      : "—";
  const speechStats = [
    {
      label: "Words",
      value: hasTranscriptWords ? transcriptAnalysis.totalWords.toString() : "—",
    },
    {
      label: "Fillers",
      value: hasTranscriptWords ? transcriptAnalysis.fillerCount.toString() : "—",
    },
    { label: "Filler %", value: fillerPercent },
    { label: "Pace WPM", value: paceWordsPerMinute },
  ];
  const tipBySentence = useMemo(() => {
    const map = new Map<string, AnalysisResult["sentenceTips"][number]>();
    if (!analysisResult) {
      return map;
    }
    analysisResult.sentenceTips.forEach((tip) => {
      const normalized = normalizeSentence(tip.sentenceText);
      if (normalized) {
        map.set(normalized, tip);
      }
    });
    return map;
  }, [analysisResult]);
  const transcriptSentences = useMemo(
    () => splitTranscriptSentences(finalTranscript),
    [finalTranscript]
  );
  const radarData = analysisResult
    ? [
        { axis: "Pace", value: analysisResult.axes.pace },
        { axis: "Evidence", value: analysisResult.axes.evidence },
        { axis: "Confidence", value: analysisResult.axes.confidence },
        { axis: "Clarity", value: analysisResult.axes.clarity },
        { axis: "Fillers", value: analysisResult.axes.fillerWords },
      ]
    : [];
  const safeOverallScore = analysisResult
    ? Number(Math.min(10, Math.max(0, analysisResult.overallScore)).toFixed(1))
    : 0;
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (safeOverallScore / 10) * ringCircumference;
  const hasPowerWords = Boolean(analysisResult?.powerWords.length);
  const hasWeakWords = Boolean(analysisResult?.weakWords.length);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-6 text-slate-100 md:px-6 md:py-8 lg:px-8 lg:py-9">
      <section className="w-full max-w-md text-center md:max-w-xl lg:max-w-2xl xl:max-w-2xl">
        <header className="mb-8 text-center md:mb-10">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-100 md:text-5xl">
            Off The Cuff
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300 md:text-lg">
            Impromptu speaking practice.
          </p>
        </header>
        <div className="mx-auto flex min-h-12 w-full max-w-md flex-wrap items-center justify-center gap-2 text-sm md:min-h-14 md:max-w-xl md:text-base lg:max-w-2xl">
          {PREP_OPTIONS.map((modeOption) => {
            const isActive = modeOption === prepMode;
            return (
              <button
                key={modeOption}
                type="button"
                onClick={() => setPrepMode(modeOption)}
                className={`cursor-pointer rounded-full px-3 py-1 text-sm transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-4 md:py-1.5 md:text-base ${
                  isActive
                    ? "bg-sky-500 font-semibold text-slate-950 shadow-md shadow-sky-500/20 hover:scale-[1.02] hover:bg-sky-400 focus-visible:ring-sky-300"
                    : "bg-slate-800 text-slate-400 hover:scale-[1.02] hover:bg-slate-700 hover:text-slate-200 hover:shadow-md hover:shadow-slate-950/20 focus-visible:ring-slate-500"
                }`}
              >
                {modeOption}
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-5 flex min-h-12 w-full max-w-md items-center justify-center md:mt-6 md:min-h-14 md:max-w-xl lg:mt-8 lg:max-w-2xl">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 px-1 py-1 md:flex-nowrap">
            {CATEGORIES.map((category) => {
              const isActive = category === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    if (!isActive) {
                      setSelectedTake("random");
                      setActiveCategory(category);
                    }
                  }}
                  className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-sm transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-4 md:py-2 md:text-base ${
                    isActive
                      ? "bg-sky-500 font-semibold text-slate-950 shadow-md shadow-sky-500/20 hover:scale-[1.02] hover:bg-sky-400 focus-visible:ring-sky-300"
                      : "bg-slate-800 font-medium text-slate-400 hover:scale-[1.02] hover:bg-slate-700 hover:text-slate-200 hover:shadow-md hover:shadow-slate-950/20 focus-visible:ring-slate-500"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
        {activeCategory === "Opinion" ? (
          <div className="mx-auto mt-3 flex min-h-12 w-full max-w-md flex-wrap items-center justify-center gap-2 text-sm md:max-w-xl md:text-base lg:max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Take
            </span>
            {TAKE_OPTIONS.map((takeOption) => {
              const isActive = selectedTake === takeOption.value;
              return (
                <button
                  key={takeOption.value}
                  type="button"
                  onClick={() => {
                    if (!isActive) {
                      setSelectedTake(takeOption.value);
                    }
                  }}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-4 md:py-2 md:text-base ${
                    isActive
                      ? "bg-sky-500 font-semibold text-slate-950 shadow-md shadow-sky-500/20 hover:scale-[1.02] hover:bg-sky-400 focus-visible:ring-sky-300"
                      : "bg-slate-800 font-medium text-slate-400 hover:scale-[1.02] hover:bg-slate-700 hover:text-slate-200 hover:shadow-md hover:shadow-slate-950/20 focus-visible:ring-slate-500"
                  }`}
                >
                  {takeOption.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mx-auto mt-6 flex h-16 w-full max-w-md items-center justify-center md:mt-8 md:h-20 md:max-w-xl lg:mt-8 lg:max-w-2xl">
          <button
            type="button"
            onClick={() => {
              void preparePromptForMode();
            }}
            className="cursor-pointer rounded-2xl bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-sky-400 hover:shadow-xl hover:shadow-sky-500/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-7 md:py-3.5 md:text-lg"
          >
            Give me a prompt
          </button>
        </div>

        {/* Prompt card — single bordered div; text + padding only (timer/buttons/review are siblings below) */}
        <div className="mt-6 flex w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm md:mt-8 md:p-6 lg:mt-8">
          {currentPrompt ? (
            <div
              className={`w-full text-center transition-all duration-300 ease-out ${
                isPromptVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              }`}
            >
              {isOpinionPrompt(currentPrompt) ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-300">
                  Take: {formatTakeLabel(currentPrompt.take)}
                </p>
              ) : null}
              <p className="text-xl font-medium leading-relaxed text-slate-100 md:text-2xl">
                {currentPrompt.text}
              </p>
            </div>
          ) : (
            <p className="text-base text-slate-400 md:text-lg">
              Your prompt will appear here.
            </p>
          )}
        </div>

        {/* Timer / countdown slot — sibling of prompt card, not nested inside it */}
        <div className="mx-auto mt-5 flex h-12 w-full max-w-md flex-col md:mt-6 md:h-16 md:max-w-xl lg:mt-8 lg:h-20 lg:max-w-2xl">
          <div className="relative min-h-0 flex-1 w-full">
            <div
              className={`absolute inset-0 flex flex-col items-center justify-end pb-1 transition-all duration-150 ${
                showCountdownLayer
                  ? "z-10 opacity-100"
                  : "pointer-events-none z-0 opacity-0"
              }`}
              aria-hidden={!showCountdownLayer}
            >
              {prepLabel ? (
                <p
                  key={prepLabel}
                  className="animate-pulse text-4xl font-semibold tabular-nums text-sky-300 transition-all duration-150 md:text-5xl lg:text-5xl"
                >
                  {prepLabel}
                </p>
              ) : null}
            </div>
            <div
              className={`absolute inset-0 flex flex-col items-center justify-end gap-1 pb-1 transition-all duration-150 ${
                showTimerLayer
                  ? "z-10 opacity-100"
                  : "pointer-events-none z-0 opacity-0"
              }`}
              aria-hidden={!showTimerLayer}
            >
              <p className="text-4xl font-semibold tabular-nums text-sky-300 transition-all duration-150 md:text-5xl lg:text-5xl">
                {isReviewState ? frozenReviewTimerLabel : recordingTimerLabel}
              </p>
              <p
                className={`min-h-5 text-sm font-medium tabular-nums transition-all duration-150 ${
                  secondsLeft === 0 && isRecording
                    ? "animate-pulse text-amber-300"
                    : "text-transparent"
                }`}
              >
                {secondsLeft === 0 && isRecording ? "Time’s up!" : "\u00a0"}
              </p>
            </div>
            <div
              className={`absolute inset-0 flex flex-col items-center justify-end gap-1 pb-1 transition-all duration-150 ${
                !showCountdownLayer && !showTimerLayer
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              aria-hidden={showCountdownLayer || showTimerLayer}
            >
              <span className="text-4xl font-semibold tabular-nums text-transparent md:text-5xl lg:text-5xl" aria-hidden>
                0:00
              </span>
              <span className="min-h-5 text-sm text-transparent" aria-hidden>
                &nbsp;
              </span>
            </div>
          </div>
          <div className="flex h-4 w-full shrink-0 items-center justify-center px-2">
            <p
              className={`line-clamp-2 max-w-full text-center text-xs font-medium transition-all duration-150 ${
                recordingError ? "text-rose-300" : "text-transparent"
              }`}
            >
              {recordingError || "\u00a0"}
            </p>
          </div>
        </div>

        {/* Button row */}
        <div className="relative mx-auto mt-2 h-10 w-full max-w-md overflow-hidden md:h-12 md:max-w-xl lg:h-14 lg:max-w-2xl">
          <div
            className={`absolute inset-0 flex flex-nowrap items-start justify-center gap-2 overflow-x-auto overflow-y-hidden px-1 pt-0 transition-all duration-150 ${
              showManualRecordLayer
                ? "z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0"
            }`}
          >
            <button
              type="button"
              onClick={startRecording}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-sky-400 hover:shadow-xl hover:shadow-sky-500/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-5 md:py-2.5 md:text-base lg:px-6 lg:py-3"
            >
              <span aria-hidden="true">🎤</span>
              Record
            </button>
          </div>
          <div
            className={`absolute inset-0 flex flex-nowrap items-start justify-center gap-2 overflow-x-auto overflow-y-hidden px-1 pt-0 transition-all duration-150 ${
              showStartLayer ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                void startCurrentPromptForMode();
              }}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-sky-400 hover:shadow-xl hover:shadow-sky-500/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-5 md:py-2.5 md:text-base lg:px-6 lg:py-3"
            >
              Start
            </button>
          </div>
          <div
            className={`absolute inset-0 flex flex-nowrap items-start justify-center gap-2 overflow-x-auto overflow-y-hidden px-1 pt-0 transition-all duration-150 ${
              showPrepResetLayer ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
            }`}
          >
            <button
              type="button"
              onClick={resetDuringRecording}
              className="cursor-pointer rounded-lg border border-slate-600 bg-slate-950/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-300 transition-all duration-150 ease-out hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-800 hover:text-slate-100 hover:shadow-md hover:shadow-slate-950/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-5 md:py-2.5 md:text-base lg:px-6 lg:py-3"
            >
              Reset
            </button>
          </div>
          <div
            className={`absolute inset-0 flex flex-nowrap items-start justify-center gap-2 overflow-x-auto overflow-y-hidden px-1 pt-0 transition-all duration-150 ${
              showRecordingControlsLayer ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
            }`}
          >
            <button
              type="button"
              onClick={isPaused ? resumeRecording : pauseRecording}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold shadow-md transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-5 md:py-2.5 md:text-base lg:px-6 lg:py-3 ${
                isPaused
                  ? "bg-amber-500 text-slate-950 shadow-amber-500/25 hover:bg-amber-400 hover:shadow-amber-500/35 focus-visible:ring-amber-300"
                  : "bg-amber-600 text-slate-100 shadow-amber-600/25 hover:bg-amber-500 hover:shadow-amber-500/35 focus-visible:ring-amber-400"
              }`}
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rose-500/25 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-rose-400 hover:shadow-lg hover:shadow-rose-500/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-5 md:py-2.5 md:text-base lg:px-6 lg:py-3"
            >
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-200 shadow-sm shadow-red-200/70 ring-2 ring-red-200/30" />
              Stop
            </button>
            <button
              type="button"
              onClick={resetDuringRecording}
              className="cursor-pointer rounded-lg border border-slate-600 bg-slate-950/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-300 transition-all duration-150 ease-out hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-800 hover:text-slate-100 hover:shadow-md hover:shadow-slate-950/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-5 md:py-2.5 md:text-base lg:px-6 lg:py-3"
            >
              Reset
            </button>
          </div>
          <div
            className={`absolute inset-0 flex flex-nowrap items-start justify-center gap-2 overflow-x-auto overflow-y-hidden px-1 pt-0 transition-all duration-150 ${
              showReviewControlsLayer ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  clearRecording();
                  setSecondsLeft(TIMER_DURATION);
                  setIsTimerRunning(false);
                  setPrepCountdown(null);
                  setReviewElapsedSeconds(null);

                  if (isManualMode) {
                    await startRecording();
                    return;
                  }

                  const prepSeconds = getPrepSeconds();
                  if (prepSeconds === null) {
                    return;
                  }

                  const canRecord = await ensureMicPermission();
                  if (!canRecord) {
                    return;
                  }
                  setRecordingError("");
                  setPrepCountdown(prepSeconds);
                })();
              }}
              className="cursor-pointer rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 shadow-md shadow-slate-950/25 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-slate-700 hover:shadow-lg hover:shadow-slate-950/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:px-5 md:py-2.5 md:text-base lg:px-6 lg:py-3"
            >
              Record again
            </button>
          </div>
        </div>
        {hasRecording && audioUrl ? (
          <div className="mx-auto mt-2 flex w-full max-w-md flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-left transition-all duration-150 md:mt-3 md:max-w-xl md:gap-3 md:p-4 lg:mt-3 lg:max-w-2xl">
            <audio controls src={audioUrl} className="w-full" />
            <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
              {!isTranscriptionSupported ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transcript
                  </p>
                  <p className="mt-2 text-xs text-slate-500 md:text-sm lg:text-base">
                    Transcription not supported in this browser.
                  </p>
                </>
              ) : (
                <>
                  {analysisStatus === "analyzing" ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                      <p className="animate-pulse text-sm text-slate-300 md:text-base">
                        Analyzing your response...
                      </p>
                    </div>
                  ) : null}
                  {analysisStatus === "error" ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                      <p className="text-xs text-slate-400 md:text-sm">
                        Coaching analysis unavailable for this session
                      </p>
                    </div>
                  ) : null}
                  {analysisStatus === "requires-login" ? (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
                      <p className="text-sm text-rose-100">
                        Your session has expired. Please sign in again to analyze recordings.{" "}
                        <Link href="/login" className="font-semibold text-rose-50 underline underline-offset-4 hover:text-white">
                          Log in
                        </Link>
                      </p>
                    </div>
                  ) : null}
                  {analysisStatus === "done" && analysisResult ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                      <div className="grid gap-4 md:grid-cols-2 md:items-center">
                        <div className="flex justify-center">
                          <div className="relative h-36 w-36">
                            <svg
                              viewBox="0 0 120 120"
                              className="h-full w-full -rotate-90 transform"
                            >
                              <circle
                                cx="60"
                                cy="60"
                                r={ringRadius}
                                strokeWidth="10"
                                className="stroke-slate-700"
                                fill="none"
                              />
                              <circle
                                cx="60"
                                cy="60"
                                r={ringRadius}
                                strokeWidth="10"
                                className="stroke-sky-400 transition-all duration-500"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={ringCircumference}
                                strokeDashoffset={ringOffset}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                              <p className="text-3xl font-bold text-slate-100">
                                {safeOverallScore.toFixed(1)}
                              </p>
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                out of 10
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="w-full">
                          <SpiderChart axes={radarData} height={224} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {analysisStatus === "done" && analysisResult ? (
                    <p className="text-sm leading-relaxed text-slate-300 md:text-base">
                      {analysisResult.summary}
                    </p>
                  ) : null}
                  {saveStatus.kind === "saved" ? (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
                      Saved to your account ✓
                    </div>
                  ) : null}
                  {saveStatus.kind === "requires-login" ? (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-100">
                      Log in to save this session.{" "}
                      <Link href="/login" className="font-semibold text-rose-50 underline underline-offset-4 hover:text-white">
                        Log in
                      </Link>
                    </div>
                  ) : null}
                  {saveStatus.kind === "error" ? (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-100">
                      Couldn&apos;t save: {saveStatus.message}
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Transcript
                    </p>
                    <div className="mt-2 text-sm leading-relaxed text-slate-200 md:text-base lg:text-lg">
                      {transcriptionStatus === "transcribing" ? (
                        <span className="animate-pulse text-slate-300">
                          Transcribing your audio...
                        </span>
                      ) : (
                        <>
                          {transcriptionStatus === "error" ? (
                            <span className="mb-1 block text-xs text-amber-300 md:text-sm">
                              Transcription unavailable, showing live preview
                            </span>
                          ) : null}
                          {finalTranscript ? (
                            transcriptSentences.map((sentence, index) => {
                              const normalized = normalizeSentence(sentence);
                              const matchingTip = tipBySentence.get(normalized);
                              const sentenceParts = highlightFillerParts(sentence);

                              if (matchingTip) {
                                return (
                                  <div
                                    key={`${normalized}-${index}`}
                                    className="my-1 block border-l-4 border-sky-400 bg-sky-500/20 px-2"
                                  >
                                    <span>
                                      {sentenceParts.map((part, partIndex) =>
                                        part.isFiller ? (
                                          <span
                                            key={`${part.text}-${partIndex}`}
                                            className="rounded bg-amber-500/20 px-1 text-amber-200"
                                          >
                                            {part.text}
                                          </span>
                                        ) : (
                                          <span key={`${part.text}-${partIndex}`}>
                                            {part.text}
                                          </span>
                                        )
                                      )}
                                    </span>
                                    <p className="mt-1 text-sm italic text-sky-300">
                                      {matchingTip.tip}
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <span key={`${normalized}-${index}`}>
                                  {sentenceParts.map((part, partIndex) =>
                                    part.isFiller ? (
                                      <span
                                        key={`${part.text}-${partIndex}`}
                                        className="rounded bg-amber-500/20 px-1 text-amber-200"
                                      >
                                        {part.text}
                                      </span>
                                    ) : (
                                      <span key={`${part.text}-${partIndex}`}>{part.text}</span>
                                    )
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-500">No transcript captured.</span>
                          )}
                          {interimTranscript ? (
                            <span className="text-slate-400">{interimTranscript}</span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                  {analysisStatus === "done" && analysisResult ? (
                    <>
                      {(hasPowerWords || hasWeakWords) && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                          {hasPowerWords ? (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Power words
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {analysisResult.powerWords.map((word) => (
                                  <span
                                    key={`power-${word}`}
                                    className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-200"
                                  >
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {hasWeakWords ? (
                            <div className={hasPowerWords ? "mt-4" : undefined}>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Weak words
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {analysisResult.weakWords.map((word) => (
                                  <span
                                    key={`weak-${word}`}
                                    className="rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-200"
                                  >
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={
                                analysisResult.structure.hasOpening
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              }
                            >
                              {analysisResult.structure.hasOpening ? "✓" : "✕"}
                            </span>
                            Opening
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={
                                analysisResult.structure.hasBody
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              }
                            >
                              {analysisResult.structure.hasBody ? "✓" : "✕"}
                            </span>
                            Body
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={
                                analysisResult.structure.hasClosing
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              }
                            >
                              {analysisResult.structure.hasClosing ? "✓" : "✕"}
                            </span>
                            Closing
                          </span>
                        </div>
                      </div>
                    </>
                  ) : null}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {speechStats.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg bg-slate-800/50 p-2 text-center"
                        >
                          <p className="text-base font-semibold tabular-nums text-slate-100 md:text-lg">
                            {stat.value}
                          </p>
                          <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-slate-400 md:text-xs">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
