-- Add foreign key constraint from push_subscriptions to profiles
-- This ensures referential integrity and enables PostgREST to automatically resolve joins on profiles
ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS fk_push_subscriptions_profiles,
ADD CONSTRAINT fk_push_subscriptions_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
