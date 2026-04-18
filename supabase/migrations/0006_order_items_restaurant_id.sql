-- ════════════════════════════════════════════════════════════════════════════
-- 0006_order_items_restaurant_id.sql
--
-- Defense-in-depth: denormalize `restaurant_id` onto order_items so the
-- RLS policy can be a simple direct-column check instead of a join. If the
-- orders RLS policy ever develops a bug, a cross-restaurant attacker still
-- can't read order_items because the new policy only trusts this column.
--
-- The column is populated by trigger on INSERT from the parent order, so
-- application code doesn't need to set it.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

-- Backfill from existing orders.
UPDATE order_items oi
  SET restaurant_id = o.restaurant_id
  FROM orders o
  WHERE oi.order_id = o.id AND oi.restaurant_id IS NULL;

-- Now safe to enforce NOT NULL.
ALTER TABLE order_items
  ALTER COLUMN restaurant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS order_items_restaurant_idx
  ON order_items(restaurant_id);

-- Trigger: auto-populate restaurant_id from parent order on insert/update.
CREATE OR REPLACE FUNCTION set_order_items_restaurant_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.restaurant_id IS NULL THEN
    SELECT restaurant_id INTO NEW.restaurant_id
      FROM orders WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS order_items_set_restaurant_id ON order_items;
CREATE TRIGGER order_items_set_restaurant_id
  BEFORE INSERT OR UPDATE OF order_id ON order_items
  FOR EACH ROW EXECUTE FUNCTION set_order_items_restaurant_id();

-- Replace the join-based RLS policy with a direct-column check.
-- Direct-column is faster (no join) AND more secure (no reliance on
-- orders RLS correctness).
DROP POLICY IF EXISTS "order_items_members_all" ON order_items;
CREATE POLICY "order_items_members_rw" ON order_items
  FOR ALL
  USING (is_restaurant_member(restaurant_id))
  WITH CHECK (is_restaurant_member(restaurant_id));
