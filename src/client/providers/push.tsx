import { useCallback } from "react";
import { trpc } from "../trpc";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePush() {
  const vapid = trpc.push.vapidPublicKey.useQuery(undefined, { staleTime: Infinity });
  const subscribe = trpc.push.subscribe.useMutation();
  const unsubscribe = trpc.push.unsubscribe.useMutation();
  const test = trpc.push.test.useMutation();

  const isSupported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  const enable = useCallback(async () => {
    if (!isSupported) throw new Error("Push not supported on this browser.");
    if (isIos && !isStandalone) {
      throw new Error("On iOS, add to home screen first (Share → Add to Home Screen).");
    }
    const pk =
      (vapid.data?.key && vapid.data.key.length > 0 && vapid.data.key) ||
      (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined);
    if (!pk) throw new Error("Server has no VAPID public key configured.");

    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Notification permission denied.");

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pk) as unknown as BufferSource,
    });
    const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
    if (!json.keys?.p256dh || !json.keys?.auth) throw new Error("Malformed PushSubscription.");
    await subscribe.mutateAsync({
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    });
    return sub;
  }, [isSupported, isIos, isStandalone, vapid.data?.key, subscribe]);

  const disable = useCallback(async () => {
    if (!isSupported) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      try {
        await unsubscribe.mutateAsync({ endpoint: sub.endpoint });
      } catch {}
      await sub.unsubscribe();
    }
  }, [isSupported, unsubscribe]);

  return {
    isSupported,
    isIos,
    isStandalone,
    vapidConfigured: vapid.data?.configured ?? false,
    enable,
    disable,
    test: () => test.mutateAsync(),
    enabling: subscribe.isPending,
    testing: test.isPending,
  };
}
