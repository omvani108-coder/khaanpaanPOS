import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Thin banner shown on Captain / Kitchen / Customer screens when the device
 * loses network. The underlying data keeps showing from the TanStack cache,
 * but the user is explicitly told their next action may not persist until
 * connectivity returns.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 text-[#0A0C10] text-xs font-semibold px-3 py-1.5 shadow-md">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline — showing last-known data. Reconnecting…</span>
    </div>
  );
}
