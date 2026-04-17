import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useBhojanBot";
import type { BhojanBotAction } from "@/types/db";

export function BotMessage({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex gap-2 items-end", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gold-400 flex items-center justify-center text-[13px] flex-shrink-0 mb-0.5">
          🤖
        </div>
      )}

      <div className={cn("max-w-[82%] flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-gold-500 text-white rounded-br-sm"
              : "bg-slate-100 text-foreground rounded-bl-sm",
            msg.loading && "animate-pulse"
          )}
        >
          {msg.loading ? (
            <span className="flex gap-1 items-center text-muted-foreground py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
          )}
        </div>

        {/* Action pills */}
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {msg.actions.map((a, i) => (
              <ActionPill key={i} action={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionPill({ action }: { action: BhojanBotAction }) {
  if (action.type === "toggle_menu_item") {
    return (
      <span className={cn(
        "text-[10px] font-medium rounded-full px-2 py-0.5 ring-1",
        action.available
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-rose-50 text-rose-700 ring-rose-200"
      )}>
        {action.available ? "✓ Enabled" : "✕ Disabled"}: {action.item_name}
      </span>
    );
  }
  if (action.type === "update_menu_price") {
    return (
      <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-gold-50 text-gold-600 ring-1 ring-gold-200">
        ₹{action.price} set: {action.item_name}
      </span>
    );
  }
  return null;
}
