import { useEffect, useRef, useState } from "react";
import { ChefHat, X, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBhojanBot } from "@/hooks/useBhojanBot";
import { BotMessage } from "./BotMessage";

export function BhojanBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, sendMessage, clearHistory } = useBhojanBot();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // Unread indicator — show if last message is assistant and widget is closed
  const hasUnread = !open && messages.length > 1 && messages[messages.length - 1].role === "assistant";

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-gold-500 shadow-gold-glow flex items-center justify-center transition-all hover:bg-gold-600 active:scale-95 no-print",
          open && "rotate-[15deg]"
        )}
        aria-label="Open BhojanBot"
      >
        <ChefHat className="w-6 h-6 text-[#0A0C10]" />
        {hasUnread && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-background" />
        )}
      </button>

      {/* ── Chat drawer ── */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-50 flex flex-col no-print",
          "w-full md:w-[380px] md:bottom-24 md:right-6 md:rounded-2xl",
          "bg-white border border-border shadow-card-lg overflow-hidden",
          "transition-all duration-300 origin-bottom-right",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
          // Mobile full-screen
          "h-[85dvh] md:h-[520px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gold-500 flex items-center justify-center shadow-gold-glow">
            <span className="text-base">🤖</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-foreground">BhojanBot</div>
            <div className="text-[10px] text-muted-foreground">AI Restaurant Manager</div>
          </div>
          <button
            onClick={() => { clearHistory(); }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick prompts — shown only at start */}
        {messages.length === 1 && (
          <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5 flex-shrink-0">
            {[
              "What sold most today?",
              "Show menu items",
              "What's my peak hour?",
              "How much revenue this week?",
            ].map((p) => (
              <button
                key={p}
                onClick={() => void sendMessage(p)}
                className="text-[11px] rounded-full px-3 py-1.5 bg-gold-500/10 text-gold-600 border border-gold-300 hover:bg-gold-500/15 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg) => (
            <BotMessage key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-3 border-t border-border flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask BhojanBot anything…"
            disabled={loading}
            className="flex-1 bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gold-500 flex items-center justify-center shadow-gold-glow hover:bg-gold-600 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
          >
            <Send className="w-4 h-4 text-[#0A0C10]" />
          </button>
        </div>
      </div>
    </>
  );
}
