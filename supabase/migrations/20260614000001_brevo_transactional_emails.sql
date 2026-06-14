-- Migration: Brevo Transactional Email System and Action Tokens
-- Created: 2026-06-14

-- 1. Create email_logs table
CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type text NOT NULL CHECK (entity_type IN ('reservation', 'order', 'system')),
    entity_id uuid,
    recipient_email text NOT NULL,
    recipient_type text NOT NULL CHECK (recipient_type IN ('customer', 'admin')),
    template_key text NOT NULL,
    subject text NOT NULL,
    brevo_message_id text,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    sent_at timestamptz
);

-- 2. Create email_action_tokens table
CREATE TABLE public.email_action_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash text UNIQUE NOT NULL,
    entity_type text NOT NULL CHECK (entity_type IN ('reservation', 'order')),
    entity_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('approve', 'reject')),
    admin_email text,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_action_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Only authenticated owners/managers can select from email_logs
CREATE POLICY select_email_logs ON public.email_logs
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager());

-- No public policies exist for email_action_tokens, making it completely locked down to public/auth users.
-- Bypassed only via service-role / service-key client.

-- 5. Create performance indexes
CREATE INDEX idx_email_logs_entity ON public.email_logs (entity_type, entity_id);
CREATE INDEX idx_email_logs_recipient ON public.email_logs (recipient_email);
CREATE INDEX idx_email_action_tokens_hash ON public.email_action_tokens (token_hash);
