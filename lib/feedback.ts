export const HELPFUL_REASONS = [
  { key: "example", label: "具体例が分かりやすかった" },
  { key: "clear_steps", label: "試すべきことが明確だった" },
  { key: "encouraging", label: "励まされた" },
  { key: "good_links", label: "参考リンクが的確だった" },
] as const;

export const HELPFUL_REASON_KEYS: string[] = HELPFUL_REASONS.map((r) => r.key);

export const reasonLabel = (key: string) =>
  HELPFUL_REASONS.find((r) => r.key === key)?.label ?? key;