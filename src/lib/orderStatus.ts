import type { Order, OrderStatus } from "@/types/db";

/** UI-facing statuses. "delayed" is derived from pending/preparing + SLA. */
export type DisplayStatus = OrderStatus | "delayed";

export const statusLabel: Record<DisplayStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
  delayed: "Delayed",
};

/** Tailwind classes for status pill. */
export const statusClass: Record<DisplayStatus, string> = {
  pending: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
  preparing: "bg-blue-100 text-blue-900 ring-1 ring-blue-300",
  ready: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
  served: "bg-teal-100 text-teal-900 ring-1 ring-teal-300",
  completed: "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300",
  cancelled: "bg-rose-100 text-rose-900 ring-1 ring-rose-300",
  delayed: "bg-red-100 text-red-900 ring-1 ring-red-400 animate-pulse",
};

/** Compute whether an order should render as "delayed" based on SLA. */
export function isDelayed(order: Pick<Order, "status" | "placed_at" | "sla_minutes">): boolean {
  if (order.status !== "pending" && order.status !== "preparing") return false;
  const placedMs = new Date(order.placed_at).getTime();
  const ageMin = (Date.now() - placedMs) / 60000;
  return ageMin > order.sla_minutes;
}

export function displayStatus(order: Pick<Order, "status" | "placed_at" | "sla_minutes">): DisplayStatus {
  return isDelayed(order) ? "delayed" : order.status;
}

/** Allowed forward transitions from a given state. */
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["completed"],
  completed: [],
  cancelled: [],
};
