-- Drop existing status-restricted sync triggers.
DROP TRIGGER IF EXISTS trg_sync_order_public_status ON public.orders;
DROP TRIGGER IF EXISTS trg_sync_reservation_public_status ON public.reservations;

-- Re-create triggers to fire on any UPDATE/INSERT.
-- This ensures public status tracking gets notified when columns like estimated_time (ETA),
-- table assignments, or notes change, instantly updating anonymous client status dashboards.
CREATE TRIGGER trg_sync_order_public_status
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_public_status();

CREATE TRIGGER trg_sync_reservation_public_status
AFTER INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.sync_reservation_public_status();
