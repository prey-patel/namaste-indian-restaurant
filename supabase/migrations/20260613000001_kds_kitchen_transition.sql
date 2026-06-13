-- Migration: KDS Kitchen Transition Permissions Update
-- Allows the kitchen role to transition orders to out_for_delivery and ready_for_pickup while keeping all other permissions locked.
-- Restricts status transitions strictly and prevents kitchen role from completing orders or changing pricing/totals/customer/payment details.

CREATE OR REPLACE FUNCTION public.check_order_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. If user is kitchen, restrict updates strictly to allowed status transitions and timestamps (preparing_at, ready_at, dispatched_at, updated_at)
  IF public.is_kitchen() THEN
    IF OLD.id IS DISTINCT FROM NEW.id OR
       OLD.customer_id IS DISTINCT FROM NEW.customer_id OR
       OLD.customer_name IS DISTINCT FROM NEW.customer_name OR
       OLD.customer_email IS DISTINCT FROM NEW.customer_email OR
       OLD.customer_phone IS DISTINCT FROM NEW.customer_phone OR
       OLD.order_type IS DISTINCT FROM NEW.order_type OR
       OLD.delivery_address IS DISTINCT FROM NEW.delivery_address OR
       OLD.delivery_postal_code IS DISTINCT FROM NEW.delivery_postal_code OR
       OLD.delivery_city IS DISTINCT FROM NEW.delivery_city OR
       OLD.delivery_latitude IS DISTINCT FROM NEW.delivery_latitude OR
       OLD.delivery_longitude IS DISTINCT FROM NEW.delivery_longitude OR
       OLD.route_distance_km IS DISTINCT FROM NEW.route_distance_km OR
       OLD.route_duration_car_minutes IS DISTINCT FROM NEW.route_duration_car_minutes OR
       OLD.route_duration_walk_minutes IS DISTINCT FROM NEW.route_duration_walk_minutes OR
       OLD.route_provider IS DISTINCT FROM NEW.route_provider OR
       OLD.geocoding_status IS DISTINCT FROM NEW.geocoding_status OR
       OLD.geocoding_error IS DISTINCT FROM NEW.geocoding_error OR
       OLD.address_verified_at IS DISTINCT FROM NEW.address_verified_at OR
       OLD.delivery_fee IS DISTINCT FROM NEW.delivery_fee OR
       OLD.items_subtotal IS DISTINCT FROM NEW.items_subtotal OR
       OLD.packaging_total IS DISTINCT FROM NEW.packaging_total OR
       OLD.other_charges_total IS DISTINCT FROM NEW.other_charges_total OR
       OLD.discount_total IS DISTINCT FROM NEW.discount_total OR
       OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
       OLD.payment_status IS DISTINCT FROM NEW.payment_status OR
       OLD.payment_method IS DISTINCT FROM NEW.payment_method OR
       OLD.token IS DISTINCT FROM NEW.token OR
       OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key OR
       OLD.customer_language IS DISTINCT FROM NEW.customer_language OR
       OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason OR
       OLD.cancellation_reason IS DISTINCT FROM NEW.cancellation_reason OR
       OLD.admin_notes IS DISTINCT FROM NEW.admin_notes OR
       OLD.customer_notes IS DISTINCT FROM NEW.customer_notes OR
       OLD.approved_at IS DISTINCT FROM NEW.approved_at OR
       OLD.completed_at IS DISTINCT FROM NEW.completed_at OR
       OLD.estimated_time IS DISTINCT FROM NEW.estimated_time OR
       OLD.created_by_admin_id IS DISTINCT FROM NEW.created_by_admin_id OR
       OLD.created_at IS DISTINCT FROM NEW.created_at
    THEN
      RAISE EXCEPTION 'Kitchen staff is only allowed to update order status and kitchen timestamps.';
    END IF;

    -- Kitchen status transition rules
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'preparing'::order_status AND OLD.status = 'approved'::order_status THEN
        -- Allowed: Transitioning from approved to preparing
      ELSIF NEW.status = 'ready_for_pickup'::order_status AND OLD.status = 'preparing'::order_status AND OLD.order_type = 'takeaway'::order_type THEN
        -- Allowed: Transitioning takeaway order to ready_for_pickup
      ELSIF NEW.status = 'out_for_delivery'::order_status AND OLD.status = 'preparing'::order_status AND OLD.order_type = 'delivery'::order_type THEN
        -- Allowed: Transitioning delivery order to out_for_delivery
      ELSE
        RAISE EXCEPTION 'Kitchen staff is not allowed to transition order status from % to %.', OLD.status, NEW.status;
      END IF;
    END IF;
  END IF;

  -- 2. If user is staff, prevent changing pricing totals, fees, and payment fields
  IF public.is_staff() THEN
    IF OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
       OLD.items_subtotal IS DISTINCT FROM NEW.items_subtotal OR
       OLD.delivery_fee IS DISTINCT FROM NEW.delivery_fee OR
       OLD.packaging_total IS DISTINCT FROM NEW.packaging_total OR
       OLD.other_charges_total IS DISTINCT FROM NEW.other_charges_total OR
       OLD.discount_total IS DISTINCT FROM NEW.discount_total OR
       OLD.payment_status IS DISTINCT FROM NEW.payment_status OR
       OLD.payment_method IS DISTINCT FROM NEW.payment_method
    THEN
      RAISE EXCEPTION 'Staff members are not allowed to modify order pricing or payment fields.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
