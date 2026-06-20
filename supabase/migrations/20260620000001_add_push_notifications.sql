-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    device_label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for push_subscriptions
CREATE POLICY select_own_push_subscriptions ON public.push_subscriptions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY insert_own_push_subscriptions ON public.push_subscriptions
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_push_subscriptions ON public.push_subscriptions
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY delete_own_push_subscriptions ON public.push_subscriptions
    FOR DELETE TO authenticated USING (user_id = auth.uid());


-- Create push_notification_logs table
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role_target TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Enable RLS on push_notification_logs
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for push_notification_logs
-- Only owner/manager roles can view logs
CREATE POLICY select_push_notification_logs ON public.push_notification_logs
    FOR SELECT TO authenticated USING (
        exists (
            select 1 from public.profiles 
            where profiles.id = auth.uid() 
            and profiles.role in ('owner', 'manager')
        )
    );
