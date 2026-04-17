/**
 * NewOrderContext — tracks unseen new orders across the app.
 *
 * - `newOrderCount` — number of unseen new orders (shows as badge)
 * - `clearNewOrders()` — call when user opens Dashboard or Orders tab
 */
import { createContext, useContext, useRef, useState, useCallback } from "react";

interface NewOrderContextValue {
  newOrderCount: number;
  notifyNewOrders: (count: number) => void;
  clearNewOrders: () => void;
}

const NewOrderContext = createContext<NewOrderContextValue>({
  newOrderCount: 0,
  notifyNewOrders: () => {},
  clearNewOrders: () => {},
});

export function NewOrderProvider({ children }: { children: React.ReactNode }) {
  const [newOrderCount, setNewOrderCount] = useState(0);
  // Track the highest order count we've seen so far (to detect truly new ones)
  const seenCountRef = useRef(0);

  const notifyNewOrders = useCallback((currentCount: number) => {
    if (currentCount > seenCountRef.current) {
      const diff = currentCount - seenCountRef.current;
      setNewOrderCount((prev) => prev + diff);
      seenCountRef.current = currentCount;
      // Play a subtle ping sound
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch {
        // AudioContext not available (e.g. SSR) — ignore
      }
    } else {
      // Order count didn't grow (e.g. page refresh) — sync baseline without showing badge
      seenCountRef.current = Math.max(seenCountRef.current, currentCount);
    }
  }, []);

  const clearNewOrders = useCallback(() => {
    setNewOrderCount(0);
  }, []);

  return (
    <NewOrderContext.Provider value={{ newOrderCount, notifyNewOrders, clearNewOrders }}>
      {children}
    </NewOrderContext.Provider>
  );
}

export function useNewOrders() {
  return useContext(NewOrderContext);
}
