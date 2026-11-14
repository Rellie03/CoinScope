import { useEffect } from "react";

/**
 * Registers the CoinScope service worker (public/sw.js) once the app shell
 * mounts in the browser. Server rendering never runs this effect.
 * Registration failure (e.g. an older browser) is swallowed on purpose:
 * the app works exactly as before without a service worker.
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
