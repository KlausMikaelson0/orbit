import type { OrbitMessageView } from "@/src/types/orbit";

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "you",
  "are",
  "was",
  "have",
  "from",
  "about",
  "into",
  "your",
  "just",
  "they",
  "will",
  "then",
  "there",
  "were",
  "when",
  "what",
]);

const toxicSignals = new Map<string, number>([
  ["hate", 0.21],
  ["idiot", 0.27],
  ["stupid", 0.24],
  ["moron", 0.3],
  ["trash", 0.18],
  ["garbage", 0.22],
  ["useless", 0.25],
  ["loser", 0.24],
  ["dumb", 0.23],
  ["shut", 0.09],
  ["kill", 0.27],
  ["pathetic", 0.24],
  ["toxic", 0.11],
  ["awful", 0.14],
  ["worst", 0.13],
]);

const calmingSignals = new Set([
  "thanks",
  "please",
  "appreciate",
  "great",
  "awesome",
  "helpful",
  "respect",
  "kind",
  "friendly",
  "sorry",
]);

export interface OrbitToxicityResult {
  score: number;
  flagged: boolean;
  reason: string;
}

export type OrbitSlashCommand =
  | { kind: "summarize" }
  | { kind: "clear"; count: number }
  | { kind: "poll"; question: string; options: string[] }
  | { kind: "unknown"; name: string };

function tokenize(content: string) {
  return content
    .toLowerCase()
    .replace(/[^\w\s!?]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreOrbitToxicity(content: string | null | undefined): OrbitToxicityResult {
  const raw = (content ?? "").trim();
  if (!raw) {
    return { score: 0, flagged: false, reason: "No text content." };
  }

  const words = tokenize(raw);
  let score = 0.02;
  let trigger = "Neutral tone.";

  for (const word of words) {
    const weight = toxicSignals.get(word);
    if (weight) {
      score += weight;
      trigger = `Detected hostile sentiment around "${word}".`;
    }
    if (calmingSignals.has(word)) {
      score -= 0.08;
    }
  }

  if (/[!?]{3,}/.test(raw)) {
    score += 0.08;
    trigger = "Escalated punctuation suggests aggressive tone.";
  }
  if (/\b[A-Z]{4,}\b/.test(raw)) {
    score += 0.08;
    trigger = "All-caps phrase suggests escalation.";
  }
  if (/\byou\b.*\b(are|re)\b/i.test(raw) && score > 0.2) {
    score += 0.07;
    trigger = "Direct second-person hostility pattern detected.";
  }

  const normalized = Number(Math.max(0, Math.min(0.99, score)).toFixed(3));
  return {
    score: normalized,
    flagged: normalized >= 0.42,
    reason: trigger,
  };
}

export function parseOrbitSlashCommand(input: string): OrbitSlashCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  const [commandToken, ...rest] = trimmed.slice(1).split(" ");
  const command = commandToken.toLowerCase();
  const restJoined = rest.join(" ").trim();

  if (command === "summarize") {
    return { kind: "summarize" };
  }

  if (command === "clear") {
    const parsedCount = Number.parseInt(restJoined, 10);
    const count = Number.isFinite(parsedCount)
      ? Math.max(1, Math.min(parsedCount, 100))
      : 20;
    return { kind: "clear", count };
  }

  if (command === "poll") {
    const segments = restJoined
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
    const [question = "Untitled poll", ...options] = segments;
    const safeOptions = options.slice(0, 8);
    if (!safeOptions.length) {
      safeOptions.push("Yes", "No");
    }
    return { kind: "poll", question, options: safeOptions };
  }

  return { kind: "unknown", name: command };
}

export function buildOrbitPollMarkdown(question: string, options: string[]) {
  const lines = [
    `📊 **${question.trim() || "Untitled poll"}**`,
    "",
    ...options.map((option, index) => `${index + 1}. ⬜ ${option}`),
    "",
    "_Vote by replying with the option number._",
  ];
  return lines.join("\n");
}

function extractSummaryKeywords(messages: OrbitMessageView[]) {
  const counts = new Map<string, number>();
  for (const message of messages) {
    const parts = tokenize(message.content ?? "").filter(
      (word) => word.length >= 4 && !stopWords.has(word),
    );
    for (const part of parts) {
      counts.set(part, (counts.get(part) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

export function fallbackOrbitSummary(messages: OrbitMessageView[]) {
  if (!messages.length) {
    return "Orbit-Bot: No channel activity in the selected window.";
  }

  const keywords = extractSummaryKeywords(messages);
  const first = messages[0]?.content?.slice(0, 72) ?? "project kickoff";
  const latest =
    messages[messages.length - 1]?.content?.slice(0, 72) ?? "latest update";

  return [
    `Orbit-Bot summary (${messages.length} messages):`,
    `Main focus: ${keywords.join(", ") || "delivery coordination"}.`,
    `Conversation moved from "${first}" to "${latest}".`,
    "Action: align owners, confirm deadlines, and close open blockers.",
  ].join(" ");
}

export async function requestOrbitSummary(messages: OrbitMessageView[]) {
  try {
    const payload = messages.map((message) => ({
      author:
        message.author.profile?.full_name ??
        message.author.profile?.username ??
        "Orbit User",
      content: message.content ?? "",
      created_at: message.created_at,
    }));
    const response = await fetch("/api/orbit-ai/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: payload }),
    });

    if (!response.ok) {
      throw new Error("Orbit AI request failed.");
    }
    const data = (await response.json()) as { summary?: string };
    if (typeof data.summary === "string" && data.summary.trim()) {
      return data.summary.trim();
    }
    throw new Error("Orbit AI returned an empty summary.");
  } catch {
    return fallbackOrbitSummary(messages);
  }
}
