const EVENT_IMAGE_RULES: Array<{ pattern: RegExp; imageUrl: string }> = [
  { pattern: /\bwelcome to country\b/, imageUrl: "/images/events/wlecome-to-country.jpeg" },
  { pattern: /\bformal program concludes\b|\bprogram concludes\b/, imageUrl: "/images/events/closing.png" },
  { pattern: /\bmorning tea\b/, imageUrl: "/images/events/morning-tea.jpeg" },
  { pattern: /\blunch\b/, imageUrl: "/images/events/lunch.jpeg" },
  { pattern: /\bafternoon tea\b/, imageUrl: "/images/events/afternoon-tea.avif" },
  { pattern: /\bgroup dinner\b|\bdinner\b/, imageUrl: "/images/events/group-dinner.jpeg" },
  { pattern: /\bregistration\b|\bcheck in\b/, imageUrl: "/images/events/registration.jpeg" },
  { pattern: /\bworkshop(?:s)?\b/, imageUrl: "/images/events/workshop.jpeg" },
  { pattern: /\bbreakout(?:s)?\b/, imageUrl: "/images/events/breakouts.jpeg" },
  {
    pattern:
      /\bplenary ?2\b|\bplenary two\b|\bafternoon plenary\b|\bplenary closing\b|\bplenary concludes\b|\breport backs?\b/,
    imageUrl: "/images/events/plenary2.jpeg",
  },
  { pattern: /\bplenary\b/, imageUrl: "/images/events/plenary.avif" },
  { pattern: /\bopening\b/, imageUrl: "/images/events/opening.jpeg" },
];

function normalizeEventTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function eventImageForTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const normalizedTitle = normalizeEventTitle(title);
  if (!normalizedTitle) return null;
  for (const rule of EVENT_IMAGE_RULES) {
    if (rule.pattern.test(normalizedTitle)) return rule.imageUrl;
  }
  return null;
}
