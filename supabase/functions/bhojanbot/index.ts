/**
 * BhojanBot — AI restaurant manager powered by Claude.
 *
 * Input:  POST { restaurant_id, message, history: [{role, content}] }
 * Output: { reply: string, actions: BhojanBotAction[] }
 *
 * Claude tool loop runs server-side; client gets a single clean response.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-6";

// ── tools Claude can call ─────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_menu_items",
    description: "Get all menu items for the restaurant with their current availability and price.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "toggle_menu_item",
    description: "Enable or disable a menu item (mark it available or unavailable).",
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "UUID of the menu item" },
        available: { type: "boolean", description: "true = available, false = unavailable" },
      },
      required: ["item_id", "available"],
    },
  },
  {
    name: "update_menu_price",
    description: "Update the price of a menu item.",
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "UUID of the menu item" },
        price: { type: "number", description: "New price in INR" },
      },
      required: ["item_id", "price"],
    },
  },
  {
    name: "get_order_analytics",
    description: "Get aggregated order statistics for the last N days.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of past days to include (max 90)" },
      },
      required: ["days"],
    },
  },
  {
    name: "get_staff_list",
    description: "Get all staff members of the restaurant.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function callClaude(messages: unknown[], systemPrompt: string) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: TOOLS,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  let body: { restaurant_id: string; message: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { restaurant_id, message, history = [] } = body;
  if (!restaurant_id || !message) return json({ error: "restaurant_id and message required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // ── Build system prompt with restaurant context ───────────────────────────
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, address, tax_percent")
    .eq("id", restaurant_id)
    .single();

  const systemPrompt = `You are BhojanBot, the AI restaurant manager for "${restaurant?.name ?? "this restaurant"}".
You help the owner manage their restaurant — menu, staff, and operations.
Be concise, friendly, and practical. Use Indian context (INR, Indian dishes).
When you take an action (like disabling a menu item), confirm what you did.
If asked about data you don't have, use the available tools to fetch it.
Restaurant: ${restaurant?.name}, Tax: ${restaurant?.tax_percent ?? 5}%`;

  // ── Build messages array ──────────────────────────────────────────────────
  const messages: unknown[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  const actions: { type: string; item_id?: string; item_name?: string; available?: boolean; price?: number }[] = [];

  // ── Tool-use agentic loop (max 5 iterations) ──────────────────────────────
  for (let i = 0; i < 5; i++) {
    const claudeRes = await callClaude(messages, systemPrompt);

    // Check for errors
    if (claudeRes.type === "error") {
      return json({ reply: "Sorry, I ran into an issue. Please try again.", actions: [] });
    }

    // Collect text content
    const textBlocks = (claudeRes.content ?? []).filter((b: { type: string }) => b.type === "text");
    const toolUseBlocks = (claudeRes.content ?? []).filter((b: { type: string }) => b.type === "tool_use");

    // If no tool calls — final response
    if (toolUseBlocks.length === 0 || claudeRes.stop_reason === "end_turn") {
      const reply = textBlocks.map((b: { text: string }) => b.text).join("\n").trim();
      return json({ reply: reply || "Done!", actions });
    }

    // Append assistant message with tool use
    messages.push({ role: "assistant", content: claudeRes.content });

    // Execute each tool call
    const toolResults: { type: string; tool_use_id: string; content: string }[] = [];
    for (const tool of toolUseBlocks as { id: string; name: string; input: Record<string, unknown> }[]) {
      let result = "";

      if (tool.name === "get_menu_items") {
        const { data } = await supabase
          .from("menu_items")
          .select("id, name, price, is_available, is_veg, category_id")
          .eq("restaurant_id", restaurant_id)
          .order("name");
        result = JSON.stringify(data ?? []);
      }

      else if (tool.name === "toggle_menu_item") {
        const { item_id, available } = tool.input as { item_id: string; available: boolean };
        const { data: item } = await supabase
          .from("menu_items")
          .update({ is_available: available })
          .eq("id", item_id)
          .eq("restaurant_id", restaurant_id)
          .select("name")
          .single();
        actions.push({ type: "toggle_menu_item", item_id, item_name: item?.name, available });
        result = JSON.stringify({ success: true, item_name: item?.name, available });
      }

      else if (tool.name === "update_menu_price") {
        const { item_id, price } = tool.input as { item_id: string; price: number };
        const { data: item } = await supabase
          .from("menu_items")
          .update({ price })
          .eq("id", item_id)
          .eq("restaurant_id", restaurant_id)
          .select("name")
          .single();
        actions.push({ type: "update_menu_price", item_id, item_name: item?.name, price });
        result = JSON.stringify({ success: true, item_name: item?.name, price });
      }

      else if (tool.name === "get_order_analytics") {
        const days = Math.min(Number(tool.input.days) || 7, 90);
        const since = new Date(Date.now() - days * 86_400_000).toISOString();
        const { data } = await supabase
          .from("orders")
          .select("status, total, placed_at, source")
          .eq("restaurant_id", restaurant_id)
          .gte("placed_at", since);

        const orders = data ?? [];
        const total_revenue = orders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);
        const by_status = orders.reduce((acc: Record<string, number>, o) => {
          acc[o.status] = (acc[o.status] ?? 0) + 1;
          return acc;
        }, {});
        // Hour distribution
        const by_hour: Record<number, number> = {};
        for (const o of orders) {
          const h = new Date(o.placed_at).getHours();
          by_hour[h] = (by_hour[h] ?? 0) + 1;
        }
        const peak_hour = Object.entries(by_hour).sort((a, b) => b[1] - a[1])[0];

        result = JSON.stringify({
          total_orders: orders.length,
          total_revenue,
          by_status,
          peak_hour: peak_hour ? `${peak_hour[0]}:00 (${peak_hour[1]} orders)` : "N/A",
          days,
        });
      }

      else if (tool.name === "get_staff_list") {
        const { data } = await supabase
          .from("staff")
          .select("id, display_name, role")
          .eq("restaurant_id", restaurant_id);
        result = JSON.stringify(data ?? []);
      }

      toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result });
    }

    // Feed results back
    messages.push({ role: "user", content: toolResults });
  }

  return json({ reply: "I've completed your request.", actions });
});
