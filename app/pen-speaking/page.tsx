"use client";

import { useEffect, useRef, useState } from "react";
import { PEN_PASSAGES, type PenPassage } from "../data/penPassages";
import type { PenSpeakingSession } from "../types/session";

type AnalyzePenSpeakingResponse = {
  overallScore: number;
  accuracyScore: number;
  clarityScore: number;
  coverageScore: number;
  mispronouncedWords: string[];
  feedback: string;
};

const SESSION_HISTORY_STORAGE_KEY = "articulate-history";
const SESSION_HISTORY_LIMIT = 365;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isAnalyzePenSpeakingResponse = (value: unknown): value is AnalyzePenSpeakingResponse => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AnalyzePenSpeakingResponse>;
  return (
    isFiniteNumber(data.overallScore) &&
    isFiniteNumber(data.accuracyScore) &&
    isFiniteNumber(data.clarityScore) &&
    isFiniteNumber(data.coverageScore) &&
    Array.isArray(data.mispronouncedWords) &&
    data.mispronouncedWords.every((word) => typeof word === "string") &&
    typeof data.feedback === "string"
  );
};

const getAudioExtensionFromMimeType = (mimeType: string) => {
  const normalizedMimeType = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalizedMimeType === "audio/webm") return "webm";
  if (normalizedMimeType === "audio/mp4") return "mp4";
  if (normalizedMimeType === "audio/mpeg") return "mp3";
  if (normalizedMimeType === "audio/wav" || normalizedMimeType === "audio/x-wav") return "wav";
  if (normalizedMimeType === "audio/ogg") return "ogg";
  if (normalizedMimeType === "audio/aac") return "aac";
  if (normalizedMimeType === "audio/m4a" || normalizedMimeType === "audio/x-m4a") return "m4a";
  if (normalizedMimeType === "audio/3gpp") return "3gp";
  return "webm";
};

const pickRandomPassage = (excludeId?: string) => {
  if (!PEN_PASSAGES.length) return null;
  if (PEN_PASSAGES.length === 1) return PEN_PASSAGES[0];
  const candidates = excludeId
    ? PEN_PASSAGES.filter((passage) => passage.id !== excludeId)
    : PEN_PASSAGES;
  const nextIndex = Math.floor(Math.random() * candidates.length);
  return candidates[nextIndex] ?? PEN_PASSAGES[0];
};

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const getDifficultyPillClass = (difficulty: PenPassage["difficulty"]) => {
  if (difficulty === "easy") return "bg-emerald-500/20 text-emerald-200";
  if (difficulty === "medium") return "bg-amber-500/20 text-amber-200";
  return "bg-rose-500/20 text-rose-200";
};

const getDifficultyLabel = (difficulty: PenPassage["difficulty"]) =>
  `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;

const getScoreClass = (score: number) => {
  if (score >= 7) return "bg-emerald-500/20 text-emerald-200";
  if (score >= 4) return "bg-amber-500/20 text-amber-200";
  return "bg-rose-500/20 text-rose-200";
};

export default function PenSpeakingPage() {
  const [currentPassage, setCurrentPassage] = useState<PenPassage | null>(() => pickRandomPassage());
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "transcribing" | "analyzing" | "done" | "error">(
    "idle"
  );
  const [analysisResult, setAnalysisResult] = useState<AnalyzePenSpeakingResponse | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const elapsedSecondsRef = useRef(0);

  useEffect(() => {
    document.title = "Pen Speaking";
  }, []);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    if (!audioUrl) return;
    return () => {
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [isRecording]);

  const resetRecordingState = () => {
    setIsRecording(false);
    setElapsedSeconds(0);
    setHasRecording(false);
    setRecordingError("");
    setTranscript("");
    setAnalysisStatus("idle");
    setAnalysisResult(null);
    audioChunksRef.current = [];
    recordedBlobRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setAudioUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  };

  const shufflePassage = () => {
    if (!currentPassage) return;
    const nextPassage = pickRandomPassage(currentPassage.id);
    if (!nextPassage) return;
    setCurrentPassage(nextPassage);
    resetRecordingState();
  };

  const startRecording = async () => {
    if (!currentPassage || isRecording) return;

    resetRecordingState();

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
        const recordingMimeType = recorder.mimeType || audioChunksRef.current[0]?.type || "audio/webm";
        const recording = new Blob(audioChunksRef.current, { type: recordingMimeType });
        audioChunksRef.current = [];

        if (recording.size > 0) {
          recordedBlobRef.current = recording;
          setHasRecording(true);
          const nextAudioUrl = URL.createObjectURL(recording);
          setAudioUrl((previousUrl) => {
            if (previousUrl) {
              URL.revokeObjectURL(previousUrl);
            }
            return nextAudioUrl;
          });
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      setElapsedSeconds(0);
      setRecordingError("");
      setAnalysisStatus("idle");
      setAnalysisResult(null);
      setTranscript("");
    } catch {
      setRecordingError("Microphone access denied. Check browser permissions.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    setIsRecording(false);
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const saveSession = (
    passage: PenPassage,
    nextTranscript: string,
    durationSeconds: number,
    analysis: AnalyzePenSpeakingResponse
  ) => {
    try {
      const timestamp = Date.now();
      const session: PenSpeakingSession = {
        mode: "pen-speaking",
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${timestamp}`,
        timestamp,
        passageId: passage.id,
        passageText: passage.text,
        difficulty: passage.difficulty,
        transcript: nextTranscript,
        durationSeconds,
        overallScore: analysis.overallScore,
        accuracyScore: analysis.accuracyScore,
        clarityScore: analysis.clarityScore,
        coverageScore: analysis.coverageScore,
        mispronouncedWords: analysis.mispronouncedWords,
        feedback: analysis.feedback,
      };
      const existingRaw = localStorage.getItem(SESSION_HISTORY_STORAGE_KEY);
      const existingHistory = existingRaw ? (JSON.parse(existingRaw) as unknown) : [];
      const sessions = Array.isArray(existingHistory) ? existingHistory : [];
      const nextHistory = [session, ...sessions].slice(0, SESSION_HISTORY_LIMIT);
      localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      window.dispatchEvent(new Event("articulate-history-updated"));
    } catch (error) {
      console.error("Failed to persist pen speaking session history", error);
    }
  };

  const analyzeRecording = async () => {
    if (!currentPassage || !recordedBlobRef.current || !hasRecording) return;

    const safeDurationSeconds = Math.max(1, elapsedSecondsRef.current);
    const recording = recordedBlobRef.current;
    const fileExtension = getAudioExtensionFromMimeType(recording.type || "audio/webm");
    const formData = new FormData();
    formData.append("audio", recording, `recording.${fileExtension}`);

    setAnalysisStatus("transcribing");
    setAnalysisResult(null);

    try {
      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!transcriptionResponse.ok) {
        throw new Error("Transcription request failed");
      }

      const transcriptionData = (await transcriptionResponse.json()) as { text?: string };
      if (typeof transcriptionData.text !== "string") {
        throw new Error("Transcription payload missing text");
      }

      const nextTranscript = transcriptionData.text;
      setTranscript(nextTranscript);
      setAnalysisStatus("analyzing");

      const analysisResponse = await fetch("/api/analyze-pen-speaking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: nextTranscript,
          expectedText: currentPassage.text,
          durationSeconds: safeDurationSeconds,
          difficulty: currentPassage.difficulty,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error("Pen speaking analysis request failed");
      }

      const analysisData = (await analysisResponse.json()) as unknown;
      if (!isAnalyzePenSpeakingResponse(analysisData)) {
        throw new Error("Invalid analysis payload");
      }

      setAnalysisResult(analysisData);
      setAnalysisStatus("done");
      saveSession(currentPassage, nextTranscript, safeDurationSeconds, analysisData);
    } catch {
      setAnalysisStatus("error");
      setAnalysisResult(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <section className="mx-auto w-full max-w-3xl">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Pen Speaking</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300 md:text-lg">
            Read aloud with a pen between your teeth. The constraint forces clearer articulation.
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 md:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">How to do it</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-relaxed text-slate-200 md:text-base">
            <li>Hold a pen horizontally between your front teeth, biting gently.</li>
            <li>Read the passage aloud at a normal pace. Don&apos;t rush.</li>
            <li>Remove the pen when you finish, then click Analyze.</li>
          </ol>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getDifficultyPillClass(
                currentPassage?.difficulty ?? "easy"
              )}`}
            >
              {getDifficultyLabel(currentPassage?.difficulty ?? "easy")}
            </span>
            <button
              type="button"
              onClick={shufflePassage}
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Shuffle
            </button>
          </div>
          <p className="mt-5 text-left text-xl leading-relaxed text-slate-100 md:text-2xl">
            {currentPassage?.text ?? "No passage available."}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={() => {
                  void startRecording();
                }}
                className="rounded-full bg-sky-500 px-5 py-2.5 font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Start
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 font-semibold text-white shadow-lg shadow-rose-500/30 transition-all duration-150 ease-out hover:scale-[1.02] hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-200 shadow-sm shadow-red-200/70 ring-2 ring-red-200/30" />
                Stop
              </button>
            )}
            <p className="text-2xl font-semibold tabular-nums text-sky-300">{formatDuration(elapsedSeconds)}</p>
          </div>

          <p className={`mt-3 text-center text-sm ${recordingError ? "text-rose-300" : "text-transparent"}`}>
            {recordingError || "\u00a0"}
          </p>

          {hasRecording && audioUrl ? (
            <div className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <audio controls src={audioUrl} className="w-full" />
              <button
                type="button"
                onClick={() => {
                  void analyzeRecording();
                }}
                disabled={!hasRecording || analysisStatus === "transcribing" || analysisStatus === "analyzing"}
                className="w-full rounded-xl bg-sky-500 px-4 py-2.5 font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {analysisStatus === "transcribing"
                  ? "Transcribing..."
                  : analysisStatus === "analyzing"
                    ? "Analyzing..."
                    : "Analyze"}
              </button>
            </div>
          ) : null}
        </div>

        {analysisStatus === "error" ? (
          <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            Analysis failed for this attempt. Please record again and retry.
          </div>
        ) : null}

        {analysisStatus === "done" && analysisResult && currentPassage ? (
          <div className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-100">Analysis</h2>
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ${getScoreClass(
                  analysisResult.overallScore
                )}`}
              >
                {analysisResult.overallScore.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Accuracy</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">
                  {analysisResult.accuracyScore.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Clarity</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">
                  {analysisResult.clarityScore.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Coverage</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">
                  {analysisResult.coverageScore.toFixed(1)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Mispronounced or skipped words
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {analysisResult.mispronouncedWords.length ? (
                  analysisResult.mispronouncedWords.map((word) => (
                    <span
                      key={`${currentPassage.id}-${word}`}
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
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{analysisResult.feedback}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expected passage</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{currentPassage.text}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transcript</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {transcript || "No transcript captured."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetRecordingState}
                className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={shufflePassage}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Next passage
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
