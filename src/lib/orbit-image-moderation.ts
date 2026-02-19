const blockedTerms = [
  "nsfw",
  "explicit",
  "violence",
  "gore",
  "nudity",
  "abuse",
  "weapon",
];

export interface OrbitImageModerationResult {
  safe: boolean;
  reason?: string;
}

function containsBlockedTerm(value: string) {
  const lowered = value.toLowerCase();
  return blockedTerms.find((term) => lowered.includes(term)) ?? null;
}

export function moderateOrbitImageFilename(name: string): OrbitImageModerationResult {
  const blocked = containsBlockedTerm(name);
  if (blocked) {
    return {
      safe: false,
      reason: `Image blocked by safety filter (${blocked}).`,
    };
  }
  return { safe: true };
}

export function moderateOrbitImageUrl(url: string): OrbitImageModerationResult {
  const blocked = containsBlockedTerm(url);
  if (blocked) {
    return {
      safe: false,
      reason: `Attachment URL blocked by safety filter (${blocked}).`,
    };
  }
  return { safe: true };
}
