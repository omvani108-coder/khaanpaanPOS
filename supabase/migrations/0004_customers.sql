-- ═══════════════════════════════════════════════════════════════════════════
-- 0004 — Customer CRM + Loyalty Points
-- ═══════════════════════════════════════════════════════════════════════════

-- ── CUSTOMERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT,
  phone           TEXT NOT NULL,
  email           TEXT,
  notes           TEXT,
  -- aggregated stats (kept denormalized for fast reads)
  total_visits    INT  NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  loyalty_points  INT  NOT NULL DEFAULT 0,   -- 1 pt per ₹10 spent
  last_visit_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, phone)
);

CREATE INDEX IF NOT EXISTS customers_restaurant_idx ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx      ON customers(restaurant_id, phone);

-- ── LINK ORDERS TO CUSTOMERS ──────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);

-- ── LOYALTY REDEMPTIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  points_earned   INT NOT NULL DEFAULT 0,
  points_redeemed INT NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_customer_idx ON loyalty_redemptions(customer_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant members manage customers"
  ON customers FOR ALL
  USING (is_restaurant_member(restaurant_id))
  WITH CHECK (is_restaurant_member(restaurant_id));

CREATE POLICY "restaurant members manage loyalty"
  ON loyalty_redemptions FOR ALL
  USING (is_restaurant_member(restaurant_id))
  WITH CHECK (is_restaurant_member(restaurant_id));

-- ── TRIGGER: auto-upsert customer + update stats on order ────────────────────
-- Fires AFTER INSERT OR UPDATE on orders when customer_phone is set.
-- Creates or updates the customer record and links the order.

CREATE OR REPLACE FUNCTION sync_customer_from_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_customer_id UUID;
  v_points_earned INT;
BEGIN
  -- Only process if we have a phone number
  IF NEW.customer_phone IS NULL OR NEW.customer_phone = '' THEN
    RETURN NEW;
  END IF;

  -- Upsert customer record
  INSERT INTO customers (restaurant_id, phone, name, last_visit_at, created_at, updated_at)
  VALUES (NEW.restaurant_id, NEW.customer_phone, NEW.customer_name, NEW.placed_at, now(), now())
  ON CONFLICT (restaurant_id, phone) DO UPDATE
    SET name          = COALESCE(EXCLUDED.name, customers.name),
        last_visit_at = GREATEST(customers.last_visit_at, EXCLUDED.last_visit_at),
        updated_at    = now()
  RETURNING id INTO v_customer_id;

  -- Link order to customer
  UPDATE orders SET customer_id = v_customer_id WHERE id = NEW.id;

  -- On first insert: increment visits + spent + earn loyalty points
  IF TG_OP = 'INSERT' THEN
    UPDATE customers
    SET total_visits  = total_visits + 1,
        total_spent   = total_spent + NEW.total,
        updated_at    = now()
    WHERE id = v_customer_id;

    -- 1 loyalty point per ₹10 spent
    v_points_earned := FLOOR(NEW.total / 10)::INT;
    IF v_points_earned > 0 THEN
      UPDATE customers SET loyalty_points = loyalty_points + v_points_earned WHERE id = v_customer_id;
      INSERT INTO loyalty_redemptions (customer_id, restaurant_id, order_id, points_earned)
      VALUES (v_customer_id, NEW.restaurant_id, NEW.id, v_points_earned);
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_sync_customer ON orders;
CREATE TRIGGER orders_sync_customer
  AFTER INSERT OR UPDATE OF customer_phone ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_customer_from_order();

-- ── UPDATE place_customer_order RPC to pass customer through ─────────────────
-- The existing RPC already stores customer_name + phone on orders,
-- so the trigger above will auto-create the customer. No changes needed.

-- ── HELPER: redeem loyalty points ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_customer_id   UUID,
  p_order_id      UUID,
  p_points        INT
) RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_available INT;
  v_discount  NUMERIC(10,2);
BEGIN
  SELECT loyalty_points INTO v_available FROM customers WHERE id = p_customer_id;
  IF v_available < p_points THEN
    RAISE EXCEPTION 'Not enough points (available: %)', v_available;
  END IF;

  -- 100 points = ₹10
  v_discount := (p_points / 100.0) * 10;

  UPDATE customers
  SET loyalty_points = loyalty_points - p_points,
      updated_at     = now()
  WHERE id = p_customer_id;

  INSERT INTO loyalty_redemptions (customer_id, restaurant_id, order_id, points_redeemed, note)
  SELECT p_customer_id, restaurant_id, p_order_id, p_points, 'Redeemed at billing'
  FROM orders WHERE id = p_order_id;

  RETURN v_discount;
END $$;

GRANT EXECUTE ON FUNCTION redeem_loyalty_points(UUID, UUID, INT) TO authenticated;
