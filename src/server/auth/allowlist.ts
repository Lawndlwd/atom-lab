export function isEmailAllowed(email: string): boolean {
  if (process.env.OPEN_SIGNUP === "true") return true;
  const raw = process.env.ALLOWED_EMAILS ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
