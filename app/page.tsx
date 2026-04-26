"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PromptCategory =
  | "Personal"
  | "Opinion"
  | "Pitch"
  | "Creative"
  | "Abstract"
  | "Silly";
type FilterCategory = "All" | PromptCategory;
type Prompt = { text: string; category: PromptCategory };
type PrepMode = "3s" | "5s" | "10s" | "Manual";

const PROMPTS = [
  { text: "Describe the first 15 minutes of your workday, including the tiny choices that set the tone.", category: "Personal" },
  { text: "Tell the story of a room you still remember clearly, using three objects in it as anchors.", category: "Personal" },
  { text: "Describe a meal someone made for you that felt like more than just food.", category: "Personal" },
  { text: "Talk through a time you almost quit something but stayed for one more try.", category: "Personal" },
  { text: "Describe the version of yourself your closest friend sees that strangers usually miss.", category: "Personal" },
  { text: "Tell the story of a small purchase that made your daily life noticeably better.", category: "Personal" },
  { text: "Describe a place in your neighborhood that you would miss if you moved tomorrow.", category: "Personal" },
  { text: "Walk through your perfect evening after a difficult day, from the door opening onward.", category: "Personal" },
  { text: "Tell the story of a compliment you still remember and why it landed.", category: "Personal" },
  { text: "Describe one habit you inherited from your family, and whether you want to keep it.", category: "Personal" },
  { text: "Argue that voice messages are warmer than texts, or make the opposite case.", category: "Opinion" },
  { text: "Make the case that every calendar should have one meeting-free day each week.", category: "Opinion" },
  { text: "Defend the idea that being early is overrated, or argue that it reveals character.", category: "Opinion" },
  { text: "Argue that restaurants should have smaller menus, using one memorable example.", category: "Opinion" },
  { text: "Make the case that everyone should keep one analog tool in their digital life.", category: "Opinion" },
  { text: "Argue that silence in conversation is useful, or explain why it usually hurts the room.", category: "Opinion" },
  { text: "Defend spending extra money on one everyday item, and explain where you would never splurge.", category: "Opinion" },
  { text: "Make the case that people should reread favorite books instead of always chasing new ones.", category: "Opinion" },
  { text: "Argue that a messy desk helps creativity, or that it quietly drains attention.", category: "Opinion" },
  { text: "Defend the idea that walking is one of the best forms of problem solving.", category: "Opinion" },
  { text: "Pitch a service that fixes one annoying part of your morning routine.", category: "Pitch" },
  { text: "Convince a skeptical manager to fund a tiny tool that would save your team one hour a week.", category: "Pitch" },
  { text: "Pitch yourself for a role where your unusual background is the main advantage.", category: "Pitch" },
  { text: "Sell a local shop on an event that would bring new people through the door this weekend.", category: "Pitch" },
  { text: "Pitch an app that helps people make better plans with friends without endless group chats.", category: "Pitch" },
  { text: "Convince a busy parent to try a product that gives them 10 quiet minutes a day.", category: "Pitch" },
  { text: "Pitch a newsletter someone would actually look forward to opening on Monday morning.", category: "Pitch" },
  { text: "Sell your professional superpower to a client who has never worked with someone like you.", category: "Pitch" },
  { text: "Pitch a low-cost improvement to your favorite public space, with a clear before-and-after.", category: "Pitch" },
  { text: "Convince a friend to join a side project you would genuinely want to build.", category: "Pitch" },
  { text: "Invent a museum exhibit built around one ordinary object from your kitchen.", category: "Creative" },
  { text: "Design a restaurant where every course is based on a different weather forecast.", category: "Creative" },
  { text: "Create a movie trailer for a mystery that happens entirely during a delayed flight.", category: "Creative" },
  { text: "Describe a city where everyone has to swap jobs for one day each year.", category: "Creative" },
  { text: "Invent a holiday that celebrates unfinished projects and explain its main ritual.", category: "Creative" },
  { text: "Design a tiny home for someone who collects one very impractical thing.", category: "Creative" },
  { text: "Create a podcast premise where the host interviews people about one object in their bag.", category: "Creative" },
  { text: "Describe a theme park ride based on the feeling of checking your email.", category: "Creative" },
  { text: "Invent a children's book character who solves problems by asking boring questions.", category: "Creative" },
  { text: "Design a class that teaches adults how to be beginners again.", category: "Creative" },
  { text: "What is the difference between being comfortable and being stuck?", category: "Abstract" },
  { text: "Why do people trust a story faster than a statistic?", category: "Abstract" },
  { text: "What makes advice feel generous instead of intrusive?", category: "Abstract" },
  { text: "When does patience become avoidance?", category: "Abstract" },
  { text: "What is the difference between taste and judgment?", category: "Abstract" },
  { text: "Why do small rituals make ordinary days feel more meaningful?", category: "Abstract" },
  { text: "What does it mean to be reliable without becoming predictable?", category: "Abstract" },
  { text: "Why is starting often harder than continuing?", category: "Abstract" },
  { text: "What is the difference between privacy and secrecy?", category: "Abstract" },
  { text: "When does ambition make life bigger, and when does it make life smaller?", category: "Abstract" },
  { text: "Convince me that soup is just a drink with confidence.", category: "Silly" },
  { text: "Explain why pigeons would be excellent city council members.", category: "Silly" },
  { text: "Describe the group chat your houseplants would start about you.", category: "Silly" },
  { text: "Make the case that socks should have biographies printed on the package.", category: "Silly" },
  { text: "Pitch a luxury spa day designed specifically for tired office chairs.", category: "Silly" },
  { text: "Explain what cats would put on their resumes if they had to get jobs.", category: "Silly" },
  { text: "Describe a cooking show where the contestants are all raccoons with strong opinions.", category: "Silly" },
  { text: "Convince a jury that the missing TV remote is innocent.", category: "Silly" },
  { text: "Give a dramatic awards speech for the best snack in your pantry.", category: "Silly" },
  { text: "Describe what elevators gossip about after everyone leaves the building.", category: "Silly" },
] satisfies Prompt[];

const CATEGORIES: FilterCategory[] = [
  "All",
  "Personal",
  "Opinion",
  "Pitch",
  "Creative",
  "Abstract",
  "Silly",
];

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

const getSpeechRecognitionConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
};

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("All");
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
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(true);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const discardRecordingOnStopRef = useRef(false);
  const hasMountedPrepModeRef = useRef(false);
  const secondsLeftRef = useRef(TIMER_DURATION);

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
    const filteredPrompts =
      activeCategory === "All"
        ? PROMPTS
        : PROMPTS.filter((prompt) => prompt.category === activeCategory);

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
  }, [activeCategory]);

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
    stopRecognition();
    stopAndReleaseMicrophone();
    setIsRecording(false);
    setIsPaused(false);
    setHasRecording(false);
    setReviewElapsedSeconds(null);
    setRecordingError("");
    setFinalTranscript("");
    setInterimTranscript("");
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

    const filteredPrompts =
      activeCategory === "All"
        ? PROMPTS
        : PROMPTS.filter((prompt) => prompt.category === activeCategory);
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

      recorder.onstop = () => {
        stopRecognition();
        const shouldDiscardRecording = discardRecordingOnStopRef.current;
        discardRecordingOnStopRef.current = false;
        const recording = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        if (!shouldDiscardRecording && recording.size > 0) {
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
  const showReviewControlsLayer = Boolean(isReviewState);
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-6 text-slate-100 md:px-6 md:py-8 lg:px-8 lg:py-9">
      <section className="w-full max-w-md text-center md:max-w-xl lg:max-w-2xl xl:max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-5xl">
          Off The Cuff
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-300 md:mt-5 md:max-w-xl md:text-lg lg:mt-5 lg:max-w-2xl">
          Practice thinking and speaking on your feet. Click the button, then
          speak for 60 seconds about whatever appears.
        </p>
        <div className="mx-auto mt-5 flex min-h-12 w-full max-w-md flex-wrap items-center justify-center gap-2 text-sm md:mt-6 md:min-h-14 md:max-w-xl md:text-base lg:mt-8 lg:max-w-2xl">
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
            <p
              className={`text-xl font-medium leading-relaxed text-slate-100 transition-all duration-300 ease-out md:text-2xl ${
                isPromptVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              }`}
            >
              {currentPrompt.text}
            </p>
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
                {secondsLeft === 0 && isRecording ? "Time\u2019s up!" : "\u00a0"}
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
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
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
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {speechStats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg bg-slate-800/50 p-3 text-center"
                      >
                        <p className="text-lg font-semibold tabular-nums text-slate-100 md:text-xl">
                          {stat.value}
                        </p>
                        <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400 md:text-xs">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transcript
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200 md:text-base lg:text-lg">
                    {finalTranscript ? (
                      transcriptAnalysis.parts.map((part, index) =>
                        part.isFiller ? (
                          <span
                            key={`${part.text}-${index}`}
                            className="rounded bg-amber-500/20 px-1 text-amber-200"
                          >
                            {part.text}
                          </span>
                        ) : (
                          <span key={`${part.text}-${index}`}>{part.text}</span>
                        )
                      )
                    ) : (
                      <span className="text-slate-500">No transcript captured.</span>
                    )}
                    {interimTranscript ? (
                      <span className="text-slate-400">{interimTranscript}</span>
                    ) : null}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
