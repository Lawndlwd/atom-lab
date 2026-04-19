import webpush from "web-push";

const PUB = process.env.VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJ = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

export const vapidConfigured = !!(PUB && PRIV);

if (vapidConfigured) {
  webpush.setVapidDetails(SUBJ, PUB!, PRIV!);
}

export type PushPayload = {
  title: string;
  body?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
};

export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  if (!vapidConfigured) throw new Error("VAPID not configured");
  return webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
  );
}
