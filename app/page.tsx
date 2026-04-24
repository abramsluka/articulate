"use client";

import { useEffect, useRef, useState } from "react";

type PromptCategory = "Personal" | "Opinion" | "Creative" | "Abstract" | "Silly";
type FilterCategory = "All" | PromptCategory;
type Prompt = { text: string; category: PromptCategory };

const PROMPTS = [
  { text: "Describe your ideal Saturday from morning to night.", category: "Personal" },
  { text: "What small habit has changed your life the most?", category: "Personal" },
  { text: "Describe your childhood home to someone who has never visited it.", category: "Personal" },
  { text: "What is a lesson you learned too late?", category: "Personal" },
  { text: "Describe a place that makes you instantly calmer.", category: "Personal" },
  { text: "Tell the story of a time you changed your mind.", category: "Personal" },
  { text: "Describe a smell that immediately brings back a memory.", category: "Personal" },
  { text: "What is a small act of kindness you still remember?", category: "Personal" },
  { text: "Describe a moment you felt unexpectedly proud.", category: "Personal" },
  { text: "Describe your ideal morning routine.", category: "Personal" },
  { text: "If your life were a playlist, what song opens it?", category: "Personal" },
  { text: "What advice would you give your future self five years from now?", category: "Personal" },
  { text: "Argue that cereal is or is not soup.", category: "Opinion" },
  { text: "Should meetings be capped at 15 minutes by default?", category: "Opinion" },
  { text: "Should cities prioritize bikes over cars?", category: "Opinion" },
  { text: "Should schools start later in the morning?", category: "Opinion" },
  { text: "Should remote work be the default?", category: "Opinion" },
  { text: "Should everyone learn basic public speaking in school?", category: "Opinion" },
  { text: "Would you trade convenience for privacy?", category: "Opinion" },
  { text: "Should phones be allowed at the dinner table?", category: "Opinion" },
  { text: "Should AI tools be mandatory in classrooms?", category: "Opinion" },
  { text: "Should people specialize early or explore broadly?", category: "Opinion" },
  { text: "Should every company publish salaries?", category: "Opinion" },
  { text: "Should people read more fiction or nonfiction?", category: "Opinion" },
  { text: "Pitch a product you would invent if you had $1M.", category: "Creative" },
  { text: "Describe your dream app in one minute.", category: "Creative" },
  { text: "If you had to create a new holiday, what would it celebrate?", category: "Creative" },
  { text: "If your city had a mascot, what should it be?", category: "Creative" },
  { text: "Describe a fictional world you would want to live in.", category: "Creative" },
  { text: "If you had one billboard for the world to read, what would it say?", category: "Creative" },
  { text: "If you had to teach one class tomorrow, what would it be?", category: "Creative" },
  { text: "Describe an app feature that would genuinely reduce stress.", category: "Creative" },
  { text: "If you had to start over in a new city, what would you do first?", category: "Creative" },
  { text: "Describe a day in your life ten years from now.", category: "Creative" },
  { text: "Describe a color to someone who has never seen before.", category: "Abstract" },
  { text: "Explain why boredom is either useful or dangerous.", category: "Abstract" },
  { text: "What does confidence look like in everyday life?", category: "Abstract" },
  { text: "Is failure mostly a mindset or mostly an outcome?", category: "Abstract" },
  { text: "What is the difference between being busy and being productive?", category: "Abstract" },
  { text: "What is more important: consistency or intensity?", category: "Abstract" },
  { text: "What makes a conversation truly memorable?", category: "Abstract" },
  { text: "What does success look like when no one is watching?", category: "Abstract" },
  { text: "How do you define courage in ordinary life?", category: "Abstract" },
  { text: "Is optimism a skill you can practice?", category: "Abstract" },
  { text: "What does healthy ambition look like?", category: "Abstract" },
  { text: "What does balance mean to you right now?", category: "Abstract" },
  { text: "If you could rename Monday, what would you call it?", category: "Silly" },
  { text: "Would you rather be extremely lucky or extremely disciplined?", category: "Silly" },
  { text: "If your week had a theme song, what would it be and why?", category: "Silly" },
  { text: "What everyday object deserves a complete redesign?", category: "Silly" },
  { text: "If you could solve one tiny annoyance forever, what would it be?", category: "Silly" },
  { text: "Explain a complex topic using only kitchen analogies.", category: "Silly" },
  { text: "If you had to ban one buzzword, what would it be?", category: "Silly" },
  { text: "How would you explain the internet to someone from 1850?", category: "Silly" },
  { text: "What should people stop apologizing for?", category: "Silly" },
  { text: "What is one thing people overcomplicate?", category: "Silly" },
  { text: "What is something that sounds boring but is actually fascinating?", category: "Silly" },
  { text: "What role does humor play in difficult conversations?", category: "Silly" },
] satisfies Prompt[];

const CATEGORIES: FilterCategory[] = [
  "All",
  "Personal",
  "Opinion",
  "Creative",
  "Abstract",
  "Silly",
];

const TIMER_DURATION = 60;

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
  const [unusedPrompts, setUnusedPrompts] = useState<Prompt[]>(() =>
    shuffle(PROMPTS)
  );
  const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isTranscriptionSupported, setIsTranscriptionSupported] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

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
    setIsTimerRunning(false);
    setSecondsLeft(TIMER_DURATION);
    setIsRecording(false);
    setHasRecording(false);
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
    stopRecognition();
    stopAndReleaseMicrophone();
    setIsRecording(false);
    setHasRecording(false);
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
    setSecondsLeft(TIMER_DURATION);
    setIsTimerRunning(false);
    clearRecording();
  };

  const resetTimer = () => {
    stopRecognition();
    stopAndReleaseMicrophone();
    setIsRecording(false);
    setIsTimerRunning(false);
    setSecondsLeft(TIMER_DURATION);
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
        const recording = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        if (recording.size > 0) {
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
        setIsTimerRunning(false);
      };

      recorder.start();
      const SpeechRecognition = getSpeechRecognitionConstructor();
      if (SpeechRecognition) {
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
      }
      setRecordingError("");
      setHasRecording(false);
      setAudioUrl(null);
      setIsRecording(true);
      setSecondsLeft(TIMER_DURATION);
      setIsTimerRunning(true);
    } catch {
      setRecordingError("Microphone access denied. Check browser permissions.");
      setIsRecording(false);
      setIsTimerRunning(false);
      setSecondsLeft(TIMER_DURATION);
      stopAndReleaseMicrophone();
    }
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

  const timerLabel = `${Math.floor(secondsLeft / 60)}:${String(
    secondsLeft % 60
  ).padStart(2, "0")}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <section className="w-full max-w-3xl text-center">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          Off The Cuff
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
          Practice thinking and speaking on your feet. Click the button, then
          speak for 60 seconds about whatever appears.
        </p>

        <div className="mx-auto mt-8 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
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
                className={`rounded-full px-4 py-2 text-sm transition ${
                  isActive
                    ? "bg-sky-400 font-semibold text-slate-950"
                    : "bg-slate-900 font-medium text-slate-300 hover:bg-slate-800"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={pickPrompt}
          className="mt-10 rounded-2xl bg-sky-500 px-10 py-5 text-lg font-semibold text-slate-950 shadow-lg shadow-sky-900/30 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Give me a prompt
        </button>

        {currentPrompt ? (
          <div className="mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <p className="text-4xl font-semibold tabular-nums text-sky-300 sm:text-5xl">
                {timerLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={resetTimer}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-400 hover:bg-slate-800"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isRecording
                    ? "bg-rose-500 text-white hover:bg-rose-400 focus-visible:ring-rose-300"
                    : "bg-sky-500 text-slate-950 hover:bg-sky-400 focus-visible:ring-sky-300"
                }`}
              >
                {isRecording ? (
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-200" />
                ) : (
                  <span aria-hidden="true">🎤</span>
                )}
                {isRecording ? "Stop" : "Record"}
              </button>
            </div>
            {recordingError ? (
              <p className="text-xs font-medium text-rose-300">{recordingError}</p>
            ) : null}
            {secondsLeft === 0 ? (
              <p className="animate-pulse text-sm font-medium tracking-wide text-amber-300">
                Time&apos;s up!
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 min-h-40 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-sm">
          {currentPrompt ? (
            <p
              className={`text-2xl font-medium leading-relaxed text-slate-100 transition-all duration-300 ease-out ${
                isPromptVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              }`}
            >
              {currentPrompt.text}
            </p>
          ) : (
            <p className="text-base text-slate-400">
              Your prompt will appear here.
            </p>
          )}
        </div>
        {currentPrompt &&
        (finalTranscript || interimTranscript || !isTranscriptionSupported) &&
        !hasRecording ? (
          <div className="mx-auto mt-5 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Live transcript
            </p>
            {!isTranscriptionSupported ? (
              <p className="mt-2 text-xs text-slate-500">
                Transcription not supported in this browser.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {finalTranscript ? (
                  <span>{finalTranscript} </span>
                ) : null}
                {interimTranscript ? (
                  <span className="text-slate-400">{interimTranscript}</span>
                ) : finalTranscript ? null : (
                  <span className="text-slate-500">Start speaking to see text here.</span>
                )}
              </p>
            )}
          </div>
        ) : null}
        {hasRecording && audioUrl ? (
          <div className="mx-auto mt-5 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">
            <audio controls src={audioUrl} className="w-full" />
            {(finalTranscript || !isTranscriptionSupported) && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Transcript
                </p>
                {!isTranscriptionSupported ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Transcription not supported in this browser.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    {finalTranscript}
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                clearRecording();
                setSecondsLeft(TIMER_DURATION);
              }}
              className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Record again
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
