"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { REPS_PER_SESSION, TWISTERS, type Twister } from "../data/twisters";
import { AuthRequiredError, fetchWithSessionRefresh } from "../lib/api-client";
import { saveSession } from "../lib/supabase/sessions";
import type { TongueTwisterSession } from "../types/session";

type AnalyzeTwisterResponse = {
  overallScore: number;
  accuracyScore: number;
  speedScore: number;
  clarityScore: number;
  actualWpm: number;
  targetWpm: number;
  mispronouncedWords: string[];
  feedback: string;
};

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "requires-login" }
  | { kind: "error"; message: string };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isAnalyzeTwisterResponse = (value: unknown): value is AnalyzeTwisterResponse => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AnalyzeTwisterResponse>;
  return (
    isFiniteNumber(data.overallScore) &&
    isFiniteNumber(data.accuracyScore) &&
    isFiniteNumber(data.speedScore) &&
    isFiniteNumber(data.clarityScore) &&
    isFiniteNumber(data.actualWpm) &&
    isFiniteNumber(data.targetWpm) &&
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

const pickRandomTwister = (excludeId?: string) => {
  if (!TWISTERS.length) return null;
  if (TWISTERS.length === 1) return TWISTERS[0];
  const candidates = excludeId ? TWISTERS.filter((twister) => twister.id !== excludeId) : TWISTERS;
  const nextIndex = Math.floor(Math.random() * candidates.length);
  return candidates[nextIndex] ?? TWISTERS[0];
};

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const getDifficultyPillClass = (difficulty: Twister["difficulty"]) => {
  if (difficulty === "easy") return "bg-emerald-500/20 text-emerald-200";
  if (difficulty === "medium") return "bg-amber-500/20 text-amber-200";
  return "bg-rose-500/20 text-rose-200";
};

const getDifficultyLabel = (difficulty: Twister["difficulty"]) =>
  `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;

const getScoreClass = (score: number) => {
  if (score >= 7) return "bg-emerald-500/20 text-emerald-200";
  if (score >= 4) return "bg-amber-500/20 text-amber-200";
  return "bg-rose-500/20 text-rose-200";
};

export default function TongueTwistersPage() {
  const [currentTwister, setCurrentTwister] = useState<Twister | null>(() => pickRandomTwister());
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "transcribing" | "analyzing" | "done" | "error" | "requires-login">(
    "idle"
  );
  const [analysisResult, setAnalysisResult] = useState<AnalyzeTwisterResponse | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const elapsedSecondsRef = useRef(0);

  useEffect(() => {
    document.title = "Tongue Twisters";
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

  useEffect(() => {
    if (saveStatus.kind !== "saved") return;
    const timeoutId = window.setTimeout(() => {
      setSaveStatus((current) => (current.kind === "saved" ? { kind: "idle" } : current));
    }, 4000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveStatus]);

  const resetRecordingState = () => {
    setIsRecording(false);
    setElapsedSeconds(0);
    setHasRecording(false);
    setRecordingError("");
    setTranscript("");
    setAnalysisStatus("idle");
    setAnalysisResult(null);
    setHasSaved(false);
    setSaveStatus({ kind: "idle" });
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

  const shuffleTwister = () => {
    if (!currentTwister) return;
    const nextTwister = pickRandomTwister(currentTwister.id);
    if (!nextTwister) return;
    setCurrentTwister(nextTwister);
    resetRecordingState();
  };

  const startRecording = async () => {
    if (!currentTwister || isRecording) return;

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

  const persistSession = async (
    twister: Twister,
    nextTranscript: string,
    durationSeconds: number,
    analysis: AnalyzeTwisterResponse
  ) => {
    if (hasSaved) return;
    const timestamp = Date.now();
    const session: TongueTwisterSession = {
      mode: "tongue-twisters",
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${timestamp}`,
      timestamp,
      twisterId: twister.id,
      twisterText: twister.text,
      difficulty: twister.difficulty,
      transcript: nextTranscript,
      durationSeconds,
      overallScore: analysis.overallScore,
      accuracyScore: analysis.accuracyScore,
      speedScore: analysis.speedScore,
      clarityScore: analysis.clarityScore,
      actualWpm: analysis.actualWpm,
      targetWpm: analysis.targetWpm,
      mispronouncedWords: analysis.mispronouncedWords,
      feedback: analysis.feedback,
    };
    setHasSaved(true);
    setSaveStatus({ kind: "saving" });
    const result = await saveSession(session);
    if (result.ok) {
      setSaveStatus({ kind: "saved" });
    } else if (result.requiresLogin) {
      setSaveStatus({ kind: "requires-login" });
    } else {
      setSaveStatus({ kind: "error", message: result.error });
    }
  };

  const analyzeRecording = async () => {
    if (!currentTwister || !recordedBlobRef.current || !hasRecording) return;

    const safeDurationSeconds = Math.max(1, elapsedSecondsRef.current);
    const recording = recordedBlobRef.current;
    const fileExtension = getAudioExtensionFromMimeType(recording.type || "audio/webm");
    const formData = new FormData();
    formData.append("audio", recording, `recording.${fileExtension}`);

    setAnalysisStatus("transcribing");
    setAnalysisResult(null);

    try {
      const transcriptionResponse = await fetchWithSessionRefresh("/api/transcribe", {
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

      const analysisResponse = await fetchWithSessionRefresh("/api/analyze-twister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: nextTranscript,
          expectedText: currentTwister.text,
          durationSeconds: safeDurationSeconds,
          difficulty: currentTwister.difficulty,
          targetSecondsPerRep: currentTwister.targetSecondsPerRep,
          repsPerSession: REPS_PER_SESSION,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error("Twister analysis request failed");
      }

      const analysisData = (await analysisResponse.json()) as unknown;
      if (!isAnalyzeTwisterResponse(analysisData)) {
        throw new Error("Invalid analysis payload");
      }

      setAnalysisResult(analysisData);
      setAnalysisStatus("done");
      await persistSession(currentTwister, nextTranscript, safeDurationSeconds, analysisData);
    } catch (error) {
      setAnalysisStatus(error instanceof AuthRequiredError ? "requires-login" : "error");
      setAnalysisResult(null);
    }
  };

  const targetSessionSeconds = useMemo(() => {
    if (!currentTwister) return 0;
    return currentTwister.targetSecondsPerRep * REPS_PER_SESSION;
  }, [currentTwister]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <section className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center md:mb-10">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-100 md:text-5xl">
            Tongue Twisters
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300 md:text-lg">
            Sharpen your diction with 3 reps of each twister.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 md:p-8">
          <p className="text-center text-2xl font-semibold leading-relaxed text-sky-200 md:text-3xl">
            {currentTwister?.text ?? "No twister available."}
          </p>
          {currentTwister ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getDifficultyPillClass(
                  currentTwister.difficulty
                )}`}
              >
                {getDifficultyLabel(currentTwister.difficulty)}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Repeat {REPS_PER_SESSION}×
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Target {targetSessionSeconds}s
              </span>
            </div>
          ) : null}
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={shuffleTwister}
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Shuffle
            </button>
          </div>
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

        {analysisStatus === "requires-login" ? (
          <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            Your session has expired. Please sign in again to analyze recordings.{" "}
            <Link href="/login" className="font-semibold text-rose-50 underline underline-offset-4 hover:text-white">
              Log in
            </Link>
          </div>
        ) : null}

        {analysisStatus === "done" && analysisResult && currentTwister ? (
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

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Accuracy</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">
                  {analysisResult.accuracyScore.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Speed</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">
                  {analysisResult.speedScore.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Clarity</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">
                  {analysisResult.clarityScore.toFixed(1)}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Actual WPM <span className="font-semibold text-slate-100">{analysisResult.actualWpm.toFixed(1)}</span>{" "}
              {" · "}
              Target WPM <span className="font-semibold text-slate-100">{analysisResult.targetWpm.toFixed(1)}</span>
            </p>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Mispronounced or missed words
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {analysisResult.mispronouncedWords.length ? (
                  analysisResult.mispronouncedWords.map((word) => (
                    <span
                      key={`${currentTwister.id}-${word}`}
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expected text</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{currentTwister.text}</p>
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
                onClick={shuffleTwister}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Next twister
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
