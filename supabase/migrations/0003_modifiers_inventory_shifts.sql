-- ═══════════════════════════════════════════════════════════════════════════
-- 0003 — Item Modifiers, Ingredient Inventory, Recipe Costing, Shifts
-- ═══════════════════════════════════════════════════════════════════════════

-- ── MODIFIER GROUPS ───────────────────────────────────────────────────────────
-- e.g. "Spice Level", "Extras", "Size"
CREATE TABLE IF NOT EXISTS modifier_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                  -- "Spice Level"
  required        BOOLEAN NOT NULL DEFAULT false, -- must the customer pick one?
  min_select      INT  NOT NULL DEFAULT 0,
  max_select      INT  NOT NULL DEFAULT 1,
  sort_order      INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── MODIFIERS (options inside a group) ───────────────────────────────────────
-- e.g. "Mild", "Medium", "Extra Spicy" / "Extra Cheese +₹30"
CREATE TABLE IF NOT EXISTS modifiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,          -- "Extra Cheese"
  price_delta     INT  NOT NULL DEFAULT 0, -- additional price in paise (0 = free)
  sort_order      INT  NOT NULL DEFAULT 0,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── MENU ITEM ↔ MODIFIER GROUP (many-to-many) ────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id)     ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, group_id)
);

-- ── ORDER ITEM MODIFIER SELECTIONS ───────────────────────────────────────────
-- Stores which modifiers the customer picked for each order item
CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id   UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_id     UUID NOT NULL REFERENCES modifiers(id)   ON DELETE CASCADE,
  name_snapshot   TEXT NOT NULL,          -- modifier name at time of order
  price_snapshot  INT  NOT NULL DEFAULT 0 -- price_delta at time of order
);

-- ── INGREDIENTS (inventory) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,           -- "Paneer"
  unit            TEXT NOT NULL DEFAULT 'kg', -- kg, g, litre, ml, pcs, etc.
  cost_per_unit   NUMERIC(10,2) NOT NULL DEFAULT 0, -- ₹ per unit
  stock_qty       NUMERIC(10,3) NOT NULL DEFAULT 0,  -- current stock in units
  reorder_level   NUMERIC(10,3) NOT NULL DEFAULT 0,  -- alert when below this
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RECIPE INGREDIENTS ────────────────────────────────────────────────────────
-- Links each menu item to the ingredients it consumes
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id)   ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id)  ON DELETE CASCADE,
  quantity        NUMERIC(10,4) NOT NULL DEFAULT 0, -- qty of ingredient per 1 unit of dish
  UNIQUE (menu_item_id, ingredient_id)
);

-- ── SHIFTS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  opened_by       UUID REFERENCES auth.users(id),
  closed_by       UUID REFERENCES auth.users(id),
  opening_cash    NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_cash    NUMERIC(10,2),
  notes           TEXT,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE modifier_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts                   ENABLE ROW LEVEL SECURITY;

-- modifier_groups — members of restaurant can read; owners/managers can write
CREATE POLICY "restaurant members read modifier_groups"
  ON modifier_groups FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "owners manage modifier_groups"
  ON modifier_groups FOR ALL
  USING (is_restaurant_member(restaurant_id));

-- modifiers — via parent group
CREATE POLICY "restaurant members read modifiers"
  ON modifiers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM modifier_groups g
    WHERE g.id = modifiers.group_id AND is_restaurant_member(g.restaurant_id)
  ));

CREATE POLICY "owners manage modifiers"
  ON modifiers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM modifier_groups g
    WHERE g.id = modifiers.group_id AND is_restaurant_member(g.restaurant_id)
  ));

-- menu_item_modifier_groups
CREATE POLICY "restaurant members read mimgs"
  ON menu_item_modifier_groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.id = menu_item_modifier_groups.menu_item_id
    AND is_restaurant_member(mi.restaurant_id)
  ));

CREATE POLICY "owners manage mimgs"
  ON menu_item_modifier_groups FOR ALL
  USING (EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.id = menu_item_modifier_groups.menu_item_id
    AND is_restaurant_member(mi.restaurant_id)
  ));

-- order_item_modifiers — via order_item → order → restaurant
CREATE POLICY "restaurant members read order_item_modifiers"
  ON order_item_modifiers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_modifiers.order_item_id
    AND is_restaurant_member(o.restaurant_id)
  ));

CREATE POLICY "anyone insert order_item_modifiers"
  ON order_item_modifiers FOR INSERT
  WITH CHECK (true);

-- ingredients
CREATE POLICY "restaurant members read ingredients"
  ON ingredients FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "owners manage ingredients"
  ON ingredients FOR ALL
  USING (is_restaurant_member(restaurant_id));

-- recipe_ingredients
CREATE POLICY "restaurant members read recipe_ingredients"
  ON recipe_ingredients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.id = recipe_ingredients.menu_item_id
    AND is_restaurant_member(mi.restaurant_id)
  ));

CREATE POLICY "owners manage recipe_ingredients"
  ON recipe_ingredients FOR ALL
  USING (EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.id = recipe_ingredients.menu_item_id
    AND is_restaurant_member(mi.restaurant_id)
  ));

-- shifts
CREATE POLICY "restaurant members read shifts"
  ON shifts FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "owners manage shifts"
  ON shifts FOR ALL
  USING (is_restaurant_member(restaurant_id));

-- Public read for customer menu modifiers (QR order flow)
CREATE POLICY "public read available modifiers"
  ON modifiers FOR SELECT
  USING (is_available = true);

CREATE POLICY "public read modifier_groups"
  ON modifier_groups FOR SELECT
  USING (true);

CREATE POLICY "public read menu_item_modifier_groups"
  ON menu_item_modifier_groups FOR SELECT
  USING (true);
