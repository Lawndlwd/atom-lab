export function stripLead(input: string, words: string[]): string {
  if (!input) return input;
  const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return input.replace(new RegExp(`^(?:${pattern})\\s+`, "i"), "").trim();
}
