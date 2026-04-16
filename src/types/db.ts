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
  label: string; // e.g., "T1", "Garden 3"
  seats: number;
  qr_token: string;
  is_active: boolean;
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
  order_number: number; // human-visible per-restaurant sequence
  source: OrderSource;
  table_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  aggregator_ref: string | null; // external order id (Zomato/Swiggy)
  status: OrderStatus;
  sla_minutes: number; // after this, status becomes "delayed" visually
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
