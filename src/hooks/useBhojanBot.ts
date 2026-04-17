import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { BhojanBotAction } from "@/types/db";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: BhojanBotAction[];
  loading?: boolean;
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/bhojanbot`;

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Namaste! 🙏 I'm BhojanBot, your AI restaurant manager.\n\nI can help you:\n• Manage your menu (\"Turn off dal makhani\")\n• Check analytics (\"How many orders today?\")\n• Staff & schedule insights\n\nWhat would you like to do?",
};

// Demo responses when Supabase is not configured
const DEMO_RESPONSES = [
  "In live mode I can check your real menu and orders. For now: your top seller is usually Butter Chicken on weekends. Add Supabase + ANTHROPIC_API_KEY to unlock full AI.",
  "Got it! Once connected to Supabase, I can actually update your menu in real-time. Try me after setup!",
  "Great question. With live data I'd pull your last 7 days of orders and show you the exact peak hours. Setup takes 2 minutes.",
];
let demoIdx = 0;

export function useBhojanBot() {
  const { restaurant } = useAuth();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
      const thinkingMsg: ChatMessage = {
        id: "thinking",
        role: "assistant",
        content: "",
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, thinkingMsg]);
      setLoading(true);

      // Demo mode — no real API
      if (!supabaseConfigured || !restaurant) {
        await new Promise((r) => setTimeout(r, 900));
        const reply = DEMO_RESPONSES[demoIdx++ % DEMO_RESPONSES.length];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "thinking" ? { id: crypto.randomUUID(), role: "assistant", content: reply } : m
          )
        );
        setLoading(false);
        return;
      }

      try {
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(EDGE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            restaurant_id: restaurant.id,
            message: text,
            history: historyRef.current.slice(-10), // last 10 turns
          }),
        });

        const data: { reply: string; actions: BhojanBotAction[] } = await res.json();

        // Persist to bhojanbot_messages
        void supabase.from("bhojanbot_messages").insert([
          { restaurant_id: restaurant.id, role: "user", content: text },
          { restaurant_id: restaurant.id, role: "assistant", content: data.reply, actions: data.actions },
        ]);

        // Update history
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: text },
          { role: "assistant", content: data.reply },
        ];

        // Apply actions — invalidate menu queries so UI reflects changes instantly
        if (data.actions?.length) {
          void qc.invalidateQueries({ queryKey: ["menu_items", restaurant.id] });
          void qc.invalidateQueries({ queryKey: ["menu_categories", restaurant.id] });
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === "thinking"
              ? { id: crypto.randomUUID(), role: "assistant", content: data.reply, actions: data.actions }
              : m
          )
        );
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "thinking"
              ? { id: crypto.randomUUID(), role: "assistant", content: `Sorry, I hit an error: ${(e as Error).message}` }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, restaurant, qc]
  );

  function clearHistory() {
    setMessages([WELCOME]);
    historyRef.current = [];
  }

  return { messages, loading, sendMessage, clearHistory };
}
