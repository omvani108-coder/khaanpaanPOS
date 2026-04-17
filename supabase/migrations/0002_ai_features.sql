-- ── 0002_ai_features.sql — BhojanBot AI + Waiter Assignment ──────────────────

-- 1. Waiter assignment on tables
ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS assigned_waiter_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- 2. BhojanBot conversation history (per restaurant)
CREATE TABLE IF NOT EXISTS bhojanbot_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  actions       JSONB,          -- actions executed: [{type,item_id,...}]
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE bhojanbot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_rw_bhojanbot" ON bhojanbot_messages
  FOR ALL USING (is_restaurant_member(restaurant_id));

-- 3. Staff tasks — task assignment + photo verification (P2)
CREATE TABLE IF NOT EXISTS staff_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  assigned_to   UUID REFERENCES staff(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'verified', 'rejected')),
  photo_url     TEXT,
  ai_verdict    JSONB,          -- { passed: bool, reason: string }
  due_at        TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_rw_tasks" ON staff_tasks
  FOR ALL USING (is_restaurant_member(restaurant_id));
