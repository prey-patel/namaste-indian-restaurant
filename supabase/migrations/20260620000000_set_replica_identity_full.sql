-- Set REPLICA IDENTITY to FULL for orders and reservations tables.
-- This is required so that Supabase Realtime can correctly evaluate Row Level Security (RLS) policies 
-- on UPDATE/DELETE events and broadcast changes to subscribed client dashboards.

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.reservations REPLICA IDENTITY FULL;
