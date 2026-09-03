import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type TwisterDifficulty = "easy" | "medium" | "hard";

type AnalyzeTwisterBody = {
  transcript: string;
  expectedText: string;
  durationSeconds: number;
  difficulty: TwisterDifficulty;
  targetSecondsPerRep: number;
  repsPerSession: number;
};

type TwisterAnalysisResponse = {
  overallScore: number;
  accuracyScore: number;
  speedScore: number;
  clarityScore: number;
  actualWpm: number;
  targetWpm: number;
  mispronouncedWords: string[];
  feedback: string;
};

const WORD_PATTERN = /\b[\w']+\b/g;

const stripJsonCodeFences = (rawText: string) => {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const countWords = (text: string) => text.match(WORD_PATTERN)?.length ?? 0;

const computeWpm = (wordCount: number, durationSeconds: number) =>
  durationSeconds > 0 ? Number(((wordCount / durationSeconds) * 60).toFixed(1)) : 0;

const isDifficulty = (value: unknown): value is TwisterDifficulty =>
  value === "easy" || value === "medium" || value === "hard";

const isTwisterAnalysisResponse = (value: unknown): value is TwisterAnalysisResponse => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<TwisterAnalysisResponse>;
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

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "analyze-twister", 20, 5 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = (await request.json()) as Partial<AnalyzeTwisterBody>;
    const {
      transcript,
      expectedText,
      durationSeconds,
      difficulty,
      targetSecondsPerRep,
      repsPerSession,
    } = body;

    if (
      typeof transcript !== "string" ||
      typeof expectedText !== "string" ||
      !isFiniteNumber(durationSeconds) ||
      !isDifficulty(difficulty) ||
      !isFiniteNumber(targetSecondsPerRep) ||
      !isFiniteNumber(repsPerSession)
    ) {
      return NextResponse.json(
        { error: "Missing or invalid tongue twister analysis inputs" },
        { status: 400 }
      );
    }

    const safeDurationSeconds = Math.max(0.1, durationSeconds);
    const targetDurationSeconds = Math.max(0.1, targetSecondsPerRep * repsPerSession);
    const actualWpm = computeWpm(countWords(transcript), safeDurationSeconds);
    const targetWpm = computeWpm(countWords(expectedText) * repsPerSession, targetDurationSeconds);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are a rigorous speech coach scoring a tongue twister attempt.

The user is expected to say the same tongue twister exactly ${repsPerSession} times in one recording.
Be strict about accuracy. Whisper transcripts are usually clean enough that missing/wrong words indicate speaking errors.

Difficulty: ${difficulty}
Expected text for one rep:
"${expectedText}"

Transcript captured:
"${transcript}"

Actual duration (seconds): ${safeDurationSeconds.toFixed(2)}
Target duration (seconds): ${targetDurationSeconds.toFixed(2)}
Actual WPM (precomputed): ${actualWpm.toFixed(1)}
Target WPM (precomputed): ${targetWpm.toFixed(1)}

Return ONLY valid JSON with this exact schema and keys:
{
  "overallScore": 0,
  "accuracyScore": 0,
  "speedScore": 0,
  "clarityScore": 0,
  "actualWpm": 0,
  "targetWpm": 0,
  "mispronouncedWords": [],
  "feedback": ""
}

Scoring rules:
- All scores are 0-10 (decimals allowed).
- accuracyScore: compare transcript against expected text repeated ${repsPerSession} times. Penalize skipped/mangled words heavily.
- speedScore: compare actual duration to target duration.
- clarityScore: holistic articulation judgment based on transcript quality and consistency.
- overallScore should reflect all three scores with accuracy weighted highest.
- mispronouncedWords should list words clearly missed/mangled/skipped. Use unique entries.
- feedback must be 1-3 sentences, direct and actionable, no markdown.
- actualWpm and targetWpm must be numeric and align with provided values unless there is a strong reason to adjust.

Output constraints:
- Output only JSON.
- No markdown fences.
- No extra keys.`,
        },
      ],
    });

    const rawContent = message.content
      .filter((contentBlock) => contentBlock.type === "text")
      .map((contentBlock) => contentBlock.text)
      .join("\n")
      .trim();

    if (!rawContent) {
      return NextResponse.json(
        { error: "Analyzer returned empty response" },
        { status: 502 }
      );
    }

    const sanitizedJson = stripJsonCodeFences(rawContent);
    let parsedAnalysis: unknown;

    try {
      parsedAnalysis = JSON.parse(sanitizedJson);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON returned from analyzer" },
        { status: 502 }
      );
    }

    if (!isTwisterAnalysisResponse(parsedAnalysis)) {
      return NextResponse.json(
        { error: "Analyzer response did not match expected shape" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...parsedAnalysis,
      actualWpm: isFiniteNumber(parsedAnalysis.actualWpm)
        ? Number(parsedAnalysis.actualWpm.toFixed(1))
        : actualWpm,
      targetWpm: isFiniteNumber(parsedAnalysis.targetWpm)
        ? Number(parsedAnalysis.targetWpm.toFixed(1))
        : targetWpm,
    } satisfies TwisterAnalysisResponse);
  } catch (error) {
    console.error("Twister analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze tongue twister response" },
      { status: 500 }
    );
  }
}
