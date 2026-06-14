-- Migration: Support Admin Manual Order Creation
-- 1. Make customer_email nullable in orders
ALTER TABLE public.orders ALTER COLUMN customer_email DROP NOT NULL;

-- 2. Add source column referencing existing reservation_source enum
ALTER TABLE public.orders ADD COLUMN source reservation_source NOT NULL DEFAULT 'website';

-- 3. Add manual_delivery_fee column
ALTER TABLE public.orders ADD COLUMN manual_delivery_fee boolean NOT NULL DEFAULT false;

-- 4. Add send_customer_email column
ALTER TABLE public.orders ADD COLUMN send_customer_email boolean NOT NULL DEFAULT true;

-- 5. Enable realtime publication for orders if not already enabled (redundant but safe)
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception
    when duplicate_object then null;
  end;
end $$;
