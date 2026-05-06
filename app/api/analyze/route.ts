import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
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
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are a friendly but rigorous speaking coach analyzing a short impromptu response (typically under 60 seconds). Your job is to give specific, actionable feedback that helps the speaker improve.

The speaker was given this prompt:
"${prompt}"

Their spoken response was:
"${transcript}"

Provide concise coaching feedback (under 180 words total) covering:

1. **What worked**: One specific strength of this response. Be concrete — quote a phrase or describe a moment that landed well.
2. **What could improve**: One specific weakness — vagueness, hesitation, missing structure, lack of examples, etc. Be direct but not harsh.
3. **One actionable tip** for next time: a concrete technique they can try on the next prompt.

Write in flowing prose, not bullet points. Address them directly as "you." Be warm and constructive — never sycophantic, never harsh. Don't restate the prompt or the transcript. Get straight to the feedback.`,
        },
      ],
    });

    const feedback =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze response" },
      { status: 500 }
    );
  }
}