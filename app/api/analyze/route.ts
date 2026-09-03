import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const stripJsonCodeFences = (rawText: string) => {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
};

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "analyze", 20, 5 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { prompt, transcript } = body;

    if (!transcript || !prompt) {
      return NextResponse.json(
        { error: "Missing prompt or transcript" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are a friendly but rigorous speaking coach analyzing a short impromptu response (typically under 60 seconds).

The speaker was given this prompt:
"${prompt}"

Their spoken response was:
"${transcript}"

Return ONLY a valid JSON object with this exact schema and key names:
{
  "overallScore": 7.5,
  "axes": {
    "pace": 8,
    "evidence": 5,
    "confidence": 7,
    "clarity": 8,
    "fillerWords": 6
  },
  "sentenceTips": [
    {
      "sentenceText": "exact sentence pulled from the transcript",
      "tip": "specific actionable suggestion under 25 words",
      "category": "clarity"
    }
  ],
  "powerWords": ["dilemma", "obsolete", "transformative"],
  "weakWords": ["um", "like", "kind of"],
  "structure": {
    "hasOpening": true,
    "hasBody": true,
    "hasClosing": false
  },
  "summary": "Brief 2-3 sentence overall coaching feedback, warm but rigorous."
}

Scoring requirements:
- Score each axis from 1-10 (decimals allowed).
- Axis definitions:
  - pace = rhythm and flow
  - evidence = specificity and concrete examples
  - confidence = conviction and assertiveness
  - clarity = ease of understanding
  - fillerWords = lack of fillers (higher means fewer fillers)
- Compute overallScore as a weighted-ish average that reflects overall quality (1-10, decimals allowed).

Content requirements:
- sentenceTips: include 1-4 entries, only for sentences that genuinely need improvement.
- For each sentenceTip:
  - sentenceText must be an exact sentence pulled from the transcript
  - tip must be specific and actionable, under 25 words
  - category must be one of: "clarity", "evidence", "structure", "conviction"
- powerWords: words from the response showing specificity, conviction, or vivid detail (max 6).
- weakWords: filler words and vague hedging language found in the response (max 6).
- structure booleans:
  - hasOpening for clear hook/setup
  - hasBody for main content
  - hasClosing for wrap-up
- summary: warm, direct, constructive coaching in 2-3 sentences. No bullet points and no markdown.

Output constraints:
- Output ONLY valid JSON.
- No markdown code fences.
- No preamble or extra commentary.`,
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

    return NextResponse.json(parsedAnalysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze response" },
      { status: 500 }
    );
  }
}