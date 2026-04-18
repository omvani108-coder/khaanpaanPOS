-- ════════════════════════════════════════════════════════════════════════════
-- 0005_order_idempotency.sql
--
-- Prevents duplicate orders when a customer mashes "Place Order" on poor
-- network: the client generates a UUID per checkout attempt, sends it with
-- the RPC, and the server returns the existing order id if that key has
-- already been used instead of creating a second order.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- Unique per-restaurant (null-tolerant — existing rows and non-QR orders
-- won't collide because NULLs don't count toward uniqueness in Postgres).
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uidx
  ON orders(restaurant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Update the RPC to accept and honor the idempotency key.
CREATE OR REPLACE FUNCTION place_customer_order(
  p_token text,
  p_items jsonb,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_table restaurant_tables%ROWTYPE;
  v_order_id uuid;
  v_existing_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_tax_percent numeric(5,2);
  v_tax numeric(10,2);
  v_item jsonb;
  v_menu menu_items%ROWTYPE;
  v_qty int;
BEGIN
  SELECT * INTO v_table FROM restaurant_tables
    WHERE qr_token = p_token AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive table token';
  END IF;

  -- Idempotency short-circuit: if we've seen this key for this restaurant,
  -- return the existing order id rather than inserting a duplicate.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
      FROM orders
      WHERE restaurant_id = v_table.restaurant_id
        AND idempotency_key = p_idempotency_key
      LIMIT 1;
    IF FOUND THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  SELECT tax_percent INTO v_tax_percent FROM restaurants WHERE id = v_table.restaurant_id;

  INSERT INTO orders (
    restaurant_id, source, table_id, customer_name, customer_phone,
    status, subtotal, tax, total, idempotency_key
  ) VALUES (
    v_table.restaurant_id, 'dine_in', v_table.id, p_customer_name, p_customer_phone,
    'pending', 0, 0, 0, p_idempotency_key
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_menu FROM menu_items
      WHERE id = (v_item->>'menu_item_id')::uuid
        AND restaurant_id = v_table.restaurant_id
        AND is_available = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item unavailable';
    END IF;
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, 1));
    INSERT INTO order_items (order_id, menu_item_id, name_snapshot, price_snapshot, quantity, notes)
      VALUES (v_order_id, v_menu.id, v_menu.name, v_menu.price, v_qty, v_item->>'notes');
    v_subtotal := v_subtotal + (v_menu.price * v_qty);
  END LOOP;

  v_tax := ROUND(v_subtotal * v_tax_percent / 100.0, 2);
  UPDATE orders
    SET subtotal = v_subtotal, tax = v_tax, total = v_subtotal + v_tax
    WHERE id = v_order_id;

  RETURN v_order_id;
END $$;

GRANT EXECUTE ON FUNCTION place_customer_order(text, jsonb, text, text, uuid)
  TO anon, authenticated;

-- Also add the index audit flagged: qr_token lookup at scale.
CREATE INDEX IF NOT EXISTS restaurant_tables_qr_token_idx
  ON restaurant_tables(qr_token);
