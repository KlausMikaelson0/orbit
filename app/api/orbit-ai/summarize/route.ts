import { NextResponse } from "next/server";

import { getOrbitRequestIp } from "@/src/lib/orbit-developer-api";
import { checkOrbitRateLimit } from "@/src/lib/rate-limit";

export const runtime = "nodejs";

interface SummaryInputMessage {
  author?: string;
  content?: string;
  created_at?: string;
}

function fallbackSummary(messages: SummaryInputMessage[]) {
  if (!messages.length) {
    return "Orbit-Bot: No channel activity in the selected window.";
  }

  const usable = messages
    .map((message) => message.content?.trim() ?? "")
    .filter(Boolean);
  const first = usable[0]?.slice(0, 72) ?? "project kickoff";
  const latest = usable[usable.length - 1]?.slice(0, 72) ?? "latest update";

  return `Orbit-Bot summary: ${messages.length} messages in the last 24 hours. Discussion moved from "${first}" to "${latest}". Recommended next step: assign owners and close open blockers.`;
}

async function requestAnthropicSummary(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 260,
      temperature: 0.2,
      system:
        "You are Orbit-Bot, a concise moderation and summary assistant for collaboration channels.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error("Anthropic summary request failed.");
  }
  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  return (
    data.content?.find((item) => item.type === "text")?.text?.trim() ?? null
  );
}

async function requestOpenAiSummary(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      max_output_tokens: 260,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI summary request failed.");
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ text?: string }>;
    }>;
  };

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const nestedText = data.output?.[0]?.content?.[0]?.text?.trim();
  return nestedText || null;
}

export async function POST(request: Request) {
  const ip = getOrbitRequestIp(request);
  const rate = checkOrbitRateLimit({
    key: `orbit-ai-summarize:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { summary: "Orbit-Bot is cooling down. Please retry in a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const payload = (await request.json()) as { messages?: SummaryInputMessage[] };
    const messages = (payload.messages ?? []).slice(-250);

    const timeline = messages
      .map((message) => {
        const author = message.author ?? "Orbit User";
        const content = message.content?.trim() ?? "";
        if (!content) {
          return null;
        }
        return `${author}: ${content}`;
      })
      .filter((line): line is string => Boolean(line));

    if (!timeline.length) {
      return NextResponse.json({ summary: fallbackSummary(messages) });
    }

    const prompt = [
      "Summarize this Orbit channel activity from the last 24 hours.",
      "Use 3-4 concise sentences with: themes, decisions, blockers, and recommended next action.",
      "",
      timeline.join("\n"),
    ].join("\n");

    const anthropic = await requestAnthropicSummary(prompt).catch(() => null);
    if (anthropic) {
      return NextResponse.json({ summary: anthropic });
    }

    const openAi = await requestOpenAiSummary(prompt).catch(() => null);
    if (openAi) {
      return NextResponse.json({ summary: openAi });
    }

    return NextResponse.json({ summary: fallbackSummary(messages) });
  } catch {
    return NextResponse.json(
      { summary: "Orbit-Bot: Unable to summarize right now." },
      { status: 200 },
    );
  }
}
