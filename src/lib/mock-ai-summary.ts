import type { OrbitMessageView } from "@/src/types/orbit";

function extractKeywords(messages: OrbitMessageView[]) {
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
  ]);

  const counts = new Map<string, number>();
  for (const message of messages) {
    const parts = (message.content ?? "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !stopWords.has(word));

    for (const part of parts) {
      counts.set(part, (counts.get(part) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);
}

export async function mockChannelSummary(messages: OrbitMessageView[]) {
  await new Promise((resolve) => setTimeout(resolve, 900));

  if (!messages.length) {
    return "No recent conversation to summarize yet.";
  }

  const keywords = extractKeywords(messages);
  const latest = messages[messages.length - 1];
  const first = messages[Math.max(0, messages.length - 50)];

  const highlights = [
    `Last ${Math.min(messages.length, 50)} messages focused on ${keywords.join(", ") || "team coordination"}.`,
    `The thread moved from "${first.content?.slice(0, 56) || "initial planning"}" to "${latest.content?.slice(0, 56) || "latest update"}".`,
    "Most contributors aligned on next steps and immediate follow-up actions.",
  ];

  return highlights.join(" ");
}
