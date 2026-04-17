/**
 * ai-schedule — Staffing recommendations powered by Claude.
 *
 * Input:  POST { restaurant_id }
 * Output: { heatmap: HourlyOrderCount[], staffing_rec: string, peak_label: string }
 *
 * Fetches last 30 days of order data, builds a weekday×hour matrix,
 * then asks Claude for a concise staffing recommendation.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  let body: { restaurant_id: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { restaurant_id } = body;
  if (!restaurant_id) return json({ error: "restaurant_id required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Fetch last 30 days of orders
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("placed_at")
    .eq("restaurant_id", restaurant_id)
    .neq("status", "cancelled")
    .gte("placed_at", since);

  if (error) return json({ error: error.message }, 500);

  // Build heatmap: dow (0-6) × hour (0-23)
  const matrix: Record<string, number> = {};
  for (const o of orders ?? []) {
    const d = new Date(o.placed_at);
    const key = `${d.getDay()}_${d.getHours()}`;
    matrix[key] = (matrix[key] ?? 0) + 1;
  }

  const heatmap = Object.entries(matrix).map(([key, count]) => {
    const [dow, hour] = key.split("_").map(Number);
    return { dow, hour, count };
  });

  // Find top busy slots
  const sorted = [...heatmap].sort((a, b) => b.count - a.count);
  const topSlots = sorted.slice(0, 5);

  // Build text summary for Claude
  const totalOrders = (orders ?? []).length;
  const topSlotsText = topSlots
    .map((s) => `${DAYS[s.dow]} ${s.hour}:00 — ${s.count} orders`)
    .join(", ");

  let staffing_rec = "Not enough order data yet to make a recommendation. Keep taking orders and check back soon!";
  let peak_label = "—";

  if (totalOrders > 10 && topSlots.length > 0) {
    peak_label = `${DAYS[topSlots[0].dow]} ${topSlots[0].hour}:00–${topSlots[0].hour + 1}:00`;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (apiKey) {
      const prompt = `You are a restaurant operations advisor for an Indian restaurant POS system.
Here are the top busy time slots from the last 30 days of orders (${totalOrders} total):
${topSlotsText}

Give exactly 3 short, actionable staffing recommendations based on this data.
Format as a bulleted list. Each bullet max 20 words. Be specific with days and hours. No preamble.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 256,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        staffing_rec = data.content?.[0]?.text?.trim() ?? staffing_rec;
      }
    } else {
      // No API key — generate local recommendation
      staffing_rec = topSlots
        .slice(0, 3)
        .map((s) => `• ${DAYS[s.dow]} ${s.hour}:00–${s.hour + 2}:00 — peak slot (${s.count} orders). Add 1–2 extra staff.`)
        .join("\n");
    }
  }

  return json({ heatmap, staffing_rec, peak_label });
});
