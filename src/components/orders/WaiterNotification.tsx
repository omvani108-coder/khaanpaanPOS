import { useEffect } from "react";
import { Bell, X } from "lucide-react";
import { cn, formatINR, elapsedLabel } from "@/lib/utils";
import type { OrderWithItems } from "@/types/db";

interface Props {
  order: OrderWithItems;
  onDismiss: () => void;
}

/** Plays a short attention ping using the Web Audio API. */
function playPing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // AudioContext not available (SSR / test env)
  }
}

export function WaiterNotification({ order, onDismiss }: Props) {
  // Play ping on mount
  useEffect(() => {
    playPing();
    // Auto-dismiss after 8 seconds
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[60] flex items-center gap-3 px-4 py-3",
        "bg-gold-400 text-[#0A0C10] shadow-gold-glow",
        "animate-in slide-in-from-top duration-300"
      )}
    >
      <Bell className="w-5 h-5 flex-shrink-0 animate-bounce" />
      <div className="flex-1 min-w-0">
        <span className="font-bold">New order — {order.table?.label ?? "Table"}</span>
        <span className="mx-2 opacity-50">·</span>
        <span className="font-medium">{formatINR(order.total)}</span>
        <span className="mx-2 opacity-50">·</span>
        <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
        <span className="mx-2 opacity-50">·</span>
        <span className="opacity-70">{elapsedLabel(order.placed_at)} ago</span>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
