-- 1. Add dine_in to order_type enum
ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'dine_in';

-- 2. Add cash_at_table and card_at_table to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cash_at_table';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card_at_table';

-- 3. Add table session and dine-in tracking columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES dining_tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS table_session_id UUID,
  ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;

-- 4. Make customer_email and customer_phone nullable since dine-in customers don't strictly need to enter them
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN customer_phone DROP NOT NULL;

-- 5. Table sessions - tracking customer stays/visits at a table
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dining_tables(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reusable trigger function trigger_set_timestamp already exists in schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_table_sessions'
  ) THEN
    CREATE TRIGGER set_timestamp_table_sessions
    BEFORE UPDATE ON table_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- 6. Add QR token column to dining_tables if it doesn't exist
ALTER TABLE dining_tables
  ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- Generate tokens for any existing tables
UPDATE dining_tables SET qr_token = encode(gen_random_bytes(6), 'hex') WHERE qr_token IS NULL;

-- 7. Add operational status control for dine-in ordering
ALTER TABLE operational_status
  ADD COLUMN IF NOT EXISTS dine_in_ordering_enabled BOOLEAN NOT NULL DEFAULT true;

-- 8. Create indexes for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_orders_table_session ON orders(table_session_id) WHERE table_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id) WHERE table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_table_sessions_active ON table_sessions(table_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_dining_tables_qr_token ON dining_tables(qr_token);

-- 9. Row Level Security (RLS) on table_sessions
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

-- Dynamic check if policy exists to avoid duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin full access to table_sessions' AND tablename = 'table_sessions'
  ) THEN
    CREATE POLICY "Admin full access to table_sessions"
      ON table_sessions FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('owner', 'manager', 'staff', 'kitchen')
          AND profiles.is_active = true
        )
      );
  END IF;

  -- Allow anonymous/public inserts (so clients can start a session when scanning QR)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert table_sessions' AND tablename = 'table_sessions'
  ) THEN
    CREATE POLICY "Public can insert table_sessions"
      ON table_sessions FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  -- Allow anonymous/public select (so client can check active session status)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can select active table_sessions' AND tablename = 'table_sessions'
  ) THEN
    CREATE POLICY "Public can select active table_sessions"
      ON table_sessions FOR SELECT
      TO anon
      USING (status = 'active');
  END IF;
END
$$;

-- 10. Enable public reading of active dining tables by qr_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can read active dining tables' AND tablename = 'dining_tables'
  ) THEN
    CREATE POLICY "Public can read active dining tables"
      ON dining_tables FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END
$$;
