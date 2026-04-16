# KHAANPAAN (खानपान)

Restaurant CRM for local food joints: QR-code table ordering, unified order board, delivery-partner intake (Zomato / Swiggy / phone), and printable bills.

## Feature highlights

- **QR ordering** — each table gets a QR code customers scan to open a mobile-friendly menu. Orders flow straight to the kitchen.
- **Order board** — unified view of dine-in, takeaway, and aggregator orders. Status pipeline: pending → preparing → ready → served → completed. Delayed orders are flagged automatically once past SLA.
- **Menu management** — categories + items, veg/non-veg, price, availability toggle.
- **Tables + QR printing** — generate, rotate, and print QR codes per table.
- **Delivery intake** — manual entry form for Zomato / Swiggy / phone orders until official APIs are integrated.
- **Billing** — one-click invoice generation with a thermal-printer-friendly print view (57–80 mm receipts).

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Supabase (Postgres, Auth, Realtime) — multi-tenant via `restaurant_id` + RLS
- React Router, TanStack Query
- `qrcode.react` for QR generation, `sonner` for toasts

## Setup

1. Install deps:
   ```bash
   npm install
   ```

2. Create a Supabase project, then run the migration in `supabase/migrations/0001_init.sql` against it (SQL editor → paste → Run).

3. Copy env and fill in your project values:
   ```bash
   cp .env.example .env.local
   ```
   - `VITE_SUPABASE_URL` — your project URL
   - `VITE_SUPABASE_ANON_KEY` — anon public key
   - `VITE_PUBLIC_BASE_URL` — the public URL QRs will encode (e.g. `https://khaanpaan.yourdomain.com`). In dev, `http://localhost:5173` is fine.

4. Run the dev server:
   ```bash
   npm run dev
   ```

5. Visit `http://localhost:5173`, sign up, then go to **Settings** to name your restaurant. Add menu items, add tables, print QR codes, and you're live.

Without Supabase credentials the app runs in **demo mode**: the UI is explorable but data calls won't work.

## Routes

| Path                   | Who        | Purpose                          |
| ---------------------- | ---------- | -------------------------------- |
| `/login`               | public     | Staff sign-in / sign-up          |
| `/dashboard`           | staff      | Live stats + active orders       |
| `/orders`              | staff      | Full order board with filters    |
| `/menu`                | staff      | CRUD menu categories + items     |
| `/tables`              | staff      | Tables + QR printing             |
| `/delivery`            | staff      | Manual Zomato/Swiggy/phone entry |
| `/bills`               | staff      | List of generated invoices       |
| `/bills/:id/print`     | staff      | Receipt-formatted print view     |
| `/settings`            | owner      | Restaurant profile + tax config  |
| `/t/:token`            | customer   | QR menu + order placement        |

## Data model (abbreviated)

- `restaurants` — tenants, owned by an `auth.users` row
- `staff` — membership: which user has what role for which restaurant
- `restaurant_tables` — physical tables, each with a `qr_token`
- `menu_categories`, `menu_items` — catalog
- `orders`, `order_items` — sequential `order_number` per restaurant via trigger
- `invoices` — one per order, prefixed per `restaurants.invoice_prefix`

All tenant tables enable RLS; staff only see their own restaurant. The customer QR flow uses a `SECURITY DEFINER` RPC `place_customer_order(token, items, ...)` to write orders without giving anonymous users direct insert rights.

## What's next (v2 ideas)

- Thermal printer browser integration (WebUSB / ESC/POS)
- Official Zomato Partner API / Swiggy POS API once accounts are approved
- Kitchen Display System (KDS) view
- Staff roster + shift reports
- Customer loyalty (phone-based)
- Inventory / stock depletion per menu item
