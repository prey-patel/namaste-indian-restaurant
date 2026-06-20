-- Add DB-level push idempotency index
-- Prevent duplicate push notifications for the same event key to the same recipient user
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_notification_logs_event_recipient 
ON public.push_notification_logs (event_key, recipient_user_id);
