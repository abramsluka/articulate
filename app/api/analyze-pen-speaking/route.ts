import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { PassageDifficulty } from "@/app/data/penPassages";
import { rateLimit } from "@/app/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type AnalyzePenSpeakingBody = {
  transcript: string;
  expectedText: string;
  durationSeconds: number;
  difficulty: PassageDifficulty;
};

type PenSpeakingAnalysisResponse = {
  overallScore: number;
  accuracyScore: number;
  clarityScore: number;
  coverageScore: number;
  mispronouncedWords: string[];
  feedback: string;
};

const stripJsonCodeFences = (rawText: string) => {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isDifficulty = (value: unknown): value is PassageDifficulty =>
  value === "easy" || value === "medium" || value === "hard";

const isPenSpeakingAnalysisResponse = (value: unknown): value is PenSpeakingAnalysisResponse => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<PenSpeakingAnalysisResponse>;
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

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "analyze-pen-speaking", 20, 5 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = (await request.json()) as Partial<AnalyzePenSpeakingBody>;
    const { transcript, expectedText, durationSeconds, difficulty } = body;

    if (
      typeof transcript !== "string" ||
      typeof expectedText !== "string" ||
      !isFiniteNumber(durationSeconds) ||
      !isDifficulty(difficulty)
    ) {
      return NextResponse.json(
        { error: "Missing or invalid pen speaking analysis inputs" },
        { status: 400 }
      );
    }

    const safeDurationSeconds = Math.max(0.1, durationSeconds);
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are a rigorous speech coach scoring a pen speaking attempt.

The user is reading the expected text aloud while holding a pen between their teeth, which forces over-articulation.
Score how well their transcript matches the expected text - high accuracy indicates clear articulation despite the pen constraint.
Skipped words count as missed.

Difficulty: ${difficulty}
Expected passage:
"${expectedText}"

Transcript captured:
"${transcript}"

Duration (seconds): ${safeDurationSeconds.toFixed(2)}

Return ONLY valid JSON with this exact schema and keys:
{
  "overallScore": 0,
  "accuracyScore": 0,
  "clarityScore": 0,
  "coverageScore": 0,
  "mispronouncedWords": [],
  "feedback": ""
}

Scoring rules:
- All scores are 0-10 (decimals allowed).
- accuracyScore: word-level match between transcript and expected passage.
- clarityScore: holistic articulation judgment given the pen constraint.
- coverageScore: how much of the full passage was attempted; strongly penalize incomplete attempts.
- overallScore: weighted blend with accuracy highest, then clarity, then coverage.
- mispronouncedWords: unique list of words missed, mangled, or skipped.
- feedback: 1-3 sentences, direct and actionable, no markdown.

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

    if (!isPenSpeakingAnalysisResponse(parsedAnalysis)) {
      return NextResponse.json(
        { error: "Analyzer response did not match expected shape" },
        { status: 502 }
      );
    }

    return NextResponse.json(parsedAnalysis);
  } catch (error) {
    console.error("Pen speaking analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze pen speaking response" },
      { status: 500 }
    );
  }
}
