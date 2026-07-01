-- 1. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Add trigger to update timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_reviews'
  ) THEN
    CREATE TRIGGER set_timestamp_reviews
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DO $$
BEGIN
  -- Select policy for admins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all reviews' AND tablename = 'reviews'
  ) THEN
    CREATE POLICY "Admins can read all reviews"
      ON reviews FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('owner', 'manager', 'staff')
          AND profiles.is_active = true
        )
      );
  END IF;

  -- Insert policy for everyone (so public users can submit reviews)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert reviews' AND tablename = 'reviews'
  ) THEN
    CREATE POLICY "Public can insert reviews"
      ON reviews FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  -- Public select policy so users can see if order has review
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can read reviews by order' AND tablename = 'reviews'
  ) THEN
    CREATE POLICY "Public can read reviews by order"
      ON reviews FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$$;

-- 6. Add reviews table to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
