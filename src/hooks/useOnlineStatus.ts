import { useEffect, useState } from "react";

/**
 * Tracks browser online/offline state. On WiFi drop (common on restaurant
 * networks) Captain/Kitchen screens will keep showing their last successful
 * data from the TanStack cache — this hook lets us surface a banner so the
 * user knows the screen is stale and their actions may not sync yet.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
