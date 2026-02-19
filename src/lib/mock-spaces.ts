import type { UnifiedSpace } from "@/src/types/orbit";

export const ORBIT_SPACES: UnifiedSpace[] = [
  {
    id: "space-product",
    name: "Product Orbit",
    tagline: "Designing the next communication paradigm",
    visibility: "PUBLIC",
    accent: "from-violet-500/70 to-fuchsia-500/70",
    channels: [
      { id: "c-roadmap", name: "roadmap", kind: "CHAT", unreadCount: 6 },
      { id: "c-launch", name: "launch-control", kind: "CHAT", unreadCount: 2 },
      { id: "c-sync", name: "daily-sync", kind: "VOICE" },
      { id: "c-specs", name: "specs", kind: "DOCS" },
    ],
  },
  {
    id: "space-growth",
    name: "Growth Constellation",
    tagline: "Go-to-market strategy with real-time collaboration",
    visibility: "PRIVATE",
    accent: "from-sky-500/70 to-cyan-500/70",
    channels: [
      { id: "c-campaigns", name: "campaigns", kind: "CHAT" },
      { id: "c-partnerships", name: "partnerships", kind: "CHAT", unreadCount: 1 },
      { id: "c-war-room", name: "war-room", kind: "VOICE" },
      { id: "c-insights", name: "insights-docs", kind: "DOCS" },
    ],
  },
  {
    id: "space-ai-lab",
    name: "AI Lab",
    tagline: "Building Orbit's autonomous collaboration systems",
    visibility: "PRIVATE",
    accent: "from-emerald-500/70 to-teal-500/70",
    channels: [
      { id: "c-models", name: "model-stream", kind: "CHAT", unreadCount: 4 },
      { id: "c-feedback", name: "human-feedback", kind: "CHAT" },
      { id: "c-voice-lab", name: "voice-lab", kind: "VOICE" },
      { id: "c-playbooks", name: "ai-playbooks", kind: "DOCS" },
    ],
  },
];
