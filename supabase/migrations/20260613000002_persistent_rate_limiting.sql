-- Migration: Persistent Rate Limiting Table
-- Creates the rate_limits table with CHECK constraints, indexing, and RLS enabled.

CREATE TABLE public.rate_limits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type text NOT NULL CHECK (action_type IN ('contact', 'order', 'reservation', 'order_status_lookup', 'reservation_status_lookup')),
    ip_hash text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for high-performance lookup (descending created_at for window scanning)
CREATE INDEX idx_rate_limits_action_ip_created ON public.rate_limits (action_type, ip_hash, created_at DESC);

-- Enable RLS to prevent direct read/write from client APIs
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Note: No RLS policies are created, which means all client-side SELECT, INSERT, UPDATE,
-- and DELETE requests over PostgREST/anon/authenticated APIs will be rejected by default.
-- Only database operations using bypass RLS (like service_role connections or superusers)
-- are allowed, which secures our server-side rate limiter.
