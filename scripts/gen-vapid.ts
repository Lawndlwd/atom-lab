import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("# Add these to .env (and restart the server):");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log("# Keep VAPID_SUBJECT set to a mailto: or https: URL you control.");
