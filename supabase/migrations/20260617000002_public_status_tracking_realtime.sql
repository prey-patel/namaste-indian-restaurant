-- Create public status tables for anonymous/guest tracking to prevent RLS data leaks

-- 1. Create public_order_status table
CREATE TABLE IF NOT EXISTS public.public_order_status (
    id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create public_reservation_status table
CREATE TABLE IF NOT EXISTS public.public_reservation_status (
    id UUID PRIMARY KEY REFERENCES public.reservations(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS on both tables
ALTER TABLE public.public_order_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_reservation_status ENABLE ROW LEVEL SECURITY;

-- 4. Add SELECT policies for public (anonymous read allowed)
CREATE POLICY select_public_order_status ON public.public_order_status
    FOR SELECT TO public USING (true);

CREATE POLICY select_public_reservation_status ON public.public_reservation_status
    FOR SELECT TO public USING (true);

-- 5. Sync trigger function for orders
CREATE OR REPLACE FUNCTION public.sync_order_public_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.public_order_status (id, status, updated_at)
    VALUES (NEW.id, NEW.status::text, NEW.updated_at)
    ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_order_public_status ON public.orders;

CREATE TRIGGER trg_sync_order_public_status
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_public_status();

-- 6. Sync trigger function for reservations
CREATE OR REPLACE FUNCTION public.sync_reservation_public_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.public_reservation_status (id, status, updated_at)
    VALUES (NEW.id, NEW.status::text, NEW.updated_at)
    ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_reservation_public_status ON public.reservations;

CREATE TRIGGER trg_sync_reservation_public_status
AFTER INSERT OR UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.sync_reservation_public_status();

-- 7. Add tables to supabase_realtime publication
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.public_order_status;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.public_reservation_status;
  exception
    when duplicate_object then null;
  end;
end $$;

-- 8. Backfill existing records
INSERT INTO public.public_order_status (id, status, updated_at)
SELECT id, status::text, updated_at FROM public.orders
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.public_reservation_status (id, status, updated_at)
SELECT id, status::text, updated_at FROM public.reservations
ON CONFLICT (id) DO NOTHING;
