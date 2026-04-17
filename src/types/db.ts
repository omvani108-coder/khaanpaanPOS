// Core domain types used across the app. Keep in sync with Supabase schema.

export type UserRole = "owner" | "manager" | "waiter" | "kitchen";

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type OrderSource =
  | "dine_in"
  | "takeaway"
  | "zomato"
  | "swiggy"
  | "phone"
  | "other";

export type PaymentStatus = "unpaid" | "paid" | "partial" | "refunded";
export type PaymentMethod = "cash" | "upi" | "card" | "aggregator" | "other";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  gstin: string | null;
  currency: string;
  tax_percent: number;
  invoice_prefix: string;
  owner_id: string;
  created_at: string;
}

export interface Staff {
  id: string;
  restaurant_id: string;
  user_id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  label: string;
  seats: number;
  qr_token: string;
  is_active: boolean;
  assigned_waiter_id: string | null; // waiter assigned to this table
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  image_url: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: number;
  source: OrderSource;
  table_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  aggregator_ref: string | null;
  status: OrderStatus;
  sla_minutes: number;
  notes: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  placed_at: string;
  preparing_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  restaurant_id: string;
  order_id: string;
  invoice_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  issued_at: string;
  paid_at: string | null;
}

// Derived view-model combining Order + items
export interface OrderWithItems extends Order {
  items: OrderItem[];
  table?: RestaurantTable | null;
}

// ── AI features ──────────────────────────────────────────────────────────────

export interface BhojanBotMessage {
  id: string;
  restaurant_id: string;
  role: "user" | "assistant";
  content: string;
  actions: BhojanBotAction[] | null;
  created_at: string;
}

export interface BhojanBotAction {
  type: "toggle_menu_item" | "update_menu_price";
  item_id: string;
  item_name?: string;
  available?: boolean;
  price?: number;
}

export interface StaffTask {
  id: string;
  restaurant_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: "pending" | "completed" | "verified" | "rejected";
  photo_url: string | null;
  ai_verdict: { passed: boolean; reason: string } | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ── Customer CRM ──────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  restaurant_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  total_visits: number;
  total_spent: number;
  loyalty_points: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyRedemption {
  id: string;
  customer_id: string;
  restaurant_id: string;
  order_id: string | null;
  points_earned: number;
  points_redeemed: number;
  note: string | null;
  created_at: string;
}

// ── Modifiers ─────────────────────────────────────────────────────────────────

export interface ModifierGroup {
  id: string;
  restaurant_id: string;
  name: string;
  required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  created_at: string;
}

export interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price_delta: number; // extra paise / pence / cents
  sort_order: number;
  is_available: boolean;
  created_at: string;
}

export interface ModifierGroupWithOptions extends ModifierGroup {
  modifiers: Modifier[];
}

export interface OrderItemModifier {
  id: string;
  order_item_id: string;
  modifier_id: string;
  name_snapshot: string;
  price_snapshot: number;
}

// ── Inventory / Recipe Costing ────────────────────────────────────────────────

export interface Ingredient {
  id: string;
  restaurant_id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  stock_qty: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
}

export interface RecipeIngredientWithDetail extends RecipeIngredient {
  ingredient: Ingredient;
}

// ── Shifts ────────────────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  restaurant_id: string;
  opened_by: string | null;
  closed_by: string | null;
  opening_cash: number;
  closing_cash: number | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
}

// Analytics types
export interface HourlyOrderCount {
  dow: number;   // 0 = Sunday … 6 = Saturday
  hour: number;  // 0-23
  count: number;
}

export interface ScheduleInsight {
  heatmap: HourlyOrderCount[];
  staffing_rec: string;
  peak_label: string; // e.g. "Friday 8–10 PM"
}
