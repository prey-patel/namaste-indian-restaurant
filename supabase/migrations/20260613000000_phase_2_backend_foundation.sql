-- ==============================================================================
-- PHASE 2: DATABASE SCHEMA, RLS, STORAGE BUCKETS, AND SECURE RPC FUNCTIONS
-- ==============================================================================

-- 0. EXTENSIONS SETUP
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ENUM TYPES
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'kitchen', 'staff');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show');
CREATE TYPE reservation_source AS ENUM ('website', 'phone', 'walk_in', 'admin');
CREATE TYPE service_hours_type AS ENUM ('dine_in', 'reservations', 'delivery', 'takeaway');
CREATE TYPE affected_service_type AS ENUM ('all', 'dine_in', 'reservations', 'delivery', 'takeaway');
CREATE TYPE inquiry_status AS ENUM ('new', 'read', 'replied', 'archived');
CREATE TYPE order_type AS ENUM ('delivery', 'takeaway');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'preparing', 'out_for_delivery', 'delivered', 'ready_for_pickup', 'picked_up', 'completed', 'rejected', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE payment_method AS ENUM ('cash_on_delivery', 'cash_on_pickup', 'card_on_delivery', 'card_on_pickup');
CREATE TYPE packaging_fee_type AS ENUM ('food_container', 'beverage_cup', 'bag', 'custom');
CREATE TYPE charge_type AS ENUM ('delivery_fee', 'packaging_fee', 'service_fee', 'discount', 'manual_adjustment');
CREATE TYPE notification_channel AS ENUM ('brevo', 'telegram');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'retrying');
CREATE TYPE geocoding_status_type AS ENUM ('pending', 'success', 'failed', 'manually_corrected');
CREATE TYPE rule_action_type AS ENUM ('allow', 'contact_restaurant', 'block');

-- 2. REUSABLE TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABLES CREATION

-- 1. Table: profiles
CREATE TABLE profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    full_name text NOT NULL,
    phone text,
    is_active boolean NOT NULL DEFAULT false, -- baselined as inactive for security
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 2. Table: dining_tables
CREATE TABLE dining_tables (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number integer UNIQUE NOT NULL,
    capacity integer NOT NULL CHECK (capacity > 0),
    section text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_dining_tables
BEFORE UPDATE ON dining_tables
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 3. Table: reservations
CREATE TABLE reservations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    table_id uuid REFERENCES dining_tables(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text NOT NULL,
    reservation_start_at timestamptz NOT NULL,
    reservation_end_at timestamptz NOT NULL,
    timezone text NOT NULL DEFAULT 'Europe/Warsaw',
    guests_count integer NOT NULL CHECK (guests_count > 0),
    status reservation_status NOT NULL DEFAULT 'pending',
    source reservation_source NOT NULL DEFAULT 'website',
    rejection_reason text,
    cancellation_reason text,
    admin_notes text,
    customer_notes text,
    token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    idempotency_key text UNIQUE,
    created_by_admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    consent_accepted_at timestamptz,
    privacy_policy_version text,
    terms_version text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT chk_reservation_times CHECK (reservation_start_at < reservation_end_at)
);

CREATE TRIGGER set_timestamp_reservations
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 4. Table: reservation_status_events
CREATE TABLE reservation_status_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
    old_status reservation_status,
    new_status reservation_status NOT NULL,
    changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Table: categories
CREATE TABLE categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name_pl text NOT NULL,
    name_en text NOT NULL,
    slug text UNIQUE NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_categories
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 6. Table: menu_items
CREATE TABLE menu_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
    name_pl text NOT NULL,
    name_en text NOT NULL,
    description_pl text,
    description_en text,
    price numeric(10,2) NOT NULL CHECK (price >= 0),
    image_url text,
    is_available boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by uuid REFERENCES profiles(id),
    spiciness integer NOT NULL DEFAULT 0 CHECK (spiciness BETWEEN 0 AND 3),
    allergens text[] DEFAULT '{}'::text[] NOT NULL,
    is_vegetarian boolean NOT NULL DEFAULT false,
    is_vegan boolean NOT NULL DEFAULT false,
    is_gluten_free boolean NOT NULL DEFAULT false,
    is_chef_special boolean NOT NULL DEFAULT false,
    is_popular boolean NOT NULL DEFAULT false,
    is_new boolean NOT NULL DEFAULT false,
    preparation_time integer NOT NULL DEFAULT 15,
    upsell_suggestions uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_menu_items
BEFORE UPDATE ON menu_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 7. Table: service_hours
CREATE TABLE service_hours (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    service_type service_hours_type NOT NULL,
    day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    slot_number integer NOT NULL DEFAULT 1 CHECK (slot_number > 0),
    open_time time NOT NULL,
    close_time time NOT NULL,
    is_closed boolean NOT NULL DEFAULT false,
    min_lead_time_minutes integer NOT NULL DEFAULT 30,
    max_preorder_days integer NOT NULL DEFAULT 7,
    last_order_time time,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by uuid REFERENCES profiles(id),
    CONSTRAINT chk_service_times CHECK (open_time < close_time),
    CONSTRAINT uq_service_slot UNIQUE (service_type, day_of_week, slot_number)
);

CREATE TRIGGER set_timestamp_service_hours
BEFORE UPDATE ON service_hours
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 8. Table: holiday_closures
CREATE TABLE holiday_closures (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    title_pl text NOT NULL,
    title_en text NOT NULL,
    affected_service affected_service_type NOT NULL DEFAULT 'all',
    is_closed boolean NOT NULL DEFAULT true,
    custom_open_time time,
    custom_close_time time,
    message_pl text,
    message_en text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by uuid REFERENCES profiles(id),
    CONSTRAINT uq_holiday_date_service UNIQUE (date, affected_service)
);

CREATE TRIGGER set_timestamp_holiday_closures
BEFORE UPDATE ON holiday_closures
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 9. Table: operational_status
CREATE TABLE operational_status (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_enabled boolean NOT NULL DEFAULT true,
    takeaway_enabled boolean NOT NULL DEFAULT true,
    reservations_enabled boolean NOT NULL DEFAULT true,
    dine_in_status text NOT NULL DEFAULT 'open',
    kitchen_busy_mode boolean NOT NULL DEFAULT false,
    temporary_message_pl text,
    temporary_message_en text,
    estimated_delay_minutes integer NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by uuid REFERENCES profiles(id)
);

CREATE TRIGGER set_timestamp_operational_status
BEFORE UPDATE ON operational_status
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 10. Table: system_settings
CREATE TABLE system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_by uuid REFERENCES profiles(id),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_system_settings
BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 11. Table: contact_inquiries
CREATE TABLE contact_inquiries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    subject text NOT NULL,
    message text NOT NULL,
    status inquiry_status NOT NULL DEFAULT 'new',
    source_language text NOT NULL DEFAULT 'pl',
    ip_hash text,
    user_agent text,
    consent_accepted_at timestamptz NOT NULL,
    privacy_policy_version text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_contact_inquiries
BEFORE UPDATE ON contact_inquiries
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 12. Table: site_content
CREATE TABLE site_content (
    key text PRIMARY KEY,
    value_pl jsonb NOT NULL,
    value_en jsonb NOT NULL,
    updated_by uuid REFERENCES profiles(id),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_site_content
BEFORE UPDATE ON site_content
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 13. Table: media_assets
CREATE TABLE media_assets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket text NOT NULL CHECK (bucket IN ('menu-images', 'site-images', 'gallery-images')),
    file_path text NOT NULL,
    alt_text_pl text,
    alt_text_en text,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    is_public boolean NOT NULL DEFAULT true,
    is_approved boolean NOT NULL DEFAULT false, -- baseline unapproved
    uploaded_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 14. Table: delivery_zones
CREATE TABLE delivery_zones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    radius_km numeric(5,2),
    min_order_amount numeric(10,2) NOT NULL DEFAULT 40.00,
    delivery_fee numeric(10,2) NOT NULL DEFAULT 0.00,
    estimated_delivery_minutes integer NOT NULL DEFAULT 45,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_delivery_zones
BEFORE UPDATE ON delivery_zones
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 15. Table: delivery_postal_codes
CREATE TABLE delivery_postal_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    postal_code text UNIQUE NOT NULL,
    zone_id uuid REFERENCES delivery_zones(id) ON DELETE CASCADE NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    delivery_fee_override numeric(10,2),
    min_order_override numeric(10,2)
);

-- 16. Table: delivery_fee_rules
CREATE TABLE delivery_fee_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    min_distance_km numeric(5,2) NOT NULL,
    max_distance_km numeric(5,2),
    fee_amount numeric(10,2) NOT NULL CHECK (fee_amount >= 0),
    rule_action rule_action_type NOT NULL DEFAULT 'allow',
    message_pl text,
    message_en text,
    is_active boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by uuid REFERENCES profiles(id),
    CONSTRAINT chk_distance_range CHECK (max_distance_km IS NULL OR min_distance_km < max_distance_km)
);

CREATE TRIGGER set_timestamp_delivery_fee_rules
BEFORE UPDATE ON delivery_fee_rules
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 17. Table: packaging_fee_rules
CREATE TABLE packaging_fee_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name_pl text NOT NULL,
    name_en text NOT NULL,
    fee_type packaging_fee_type NOT NULL,
    amount numeric(10,2) NOT NULL CHECK (amount >= 0),
    applies_to_delivery boolean NOT NULL DEFAULT true,
    applies_to_takeaway boolean NOT NULL DEFAULT true,
    applies_to_dine_in boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    tax_behavior text NOT NULL DEFAULT 'inclusive',
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    updated_by uuid REFERENCES profiles(id)
);

CREATE TRIGGER set_timestamp_packaging_fee_rules
BEFORE UPDATE ON packaging_fee_rules
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 18. Table: menu_item_packaging_rules
CREATE TABLE menu_item_packaging_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    packaging_fee_rule_id uuid REFERENCES packaging_fee_rules(id) ON DELETE CASCADE NOT NULL,
    default_quantity integer NOT NULL DEFAULT 1 CHECK (default_quantity >= 0),
    is_required boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (menu_item_id, packaging_fee_rule_id)
);

CREATE TRIGGER set_timestamp_menu_item_packaging_rules
BEFORE UPDATE ON menu_item_packaging_rules
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 19. Table: orders
CREATE TABLE orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    order_type order_type NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    delivery_address text,
    delivery_postal_code text,
    delivery_city text,
    delivery_latitude numeric(9,6),
    delivery_longitude numeric(9,6),
    route_distance_km numeric(6,2),
    route_duration_car_minutes integer,
    route_duration_walk_minutes integer,
    route_provider text,
    geocoding_status geocoding_status_type NOT NULL DEFAULT 'pending',
    geocoding_error text,
    address_verified_at timestamptz,
    delivery_fee numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    items_subtotal numeric(10,2) NOT NULL CHECK (items_subtotal >= 0),
    packaging_total numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (packaging_total >= 0),
    other_charges_total numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (other_charges_total >= 0),
    discount_total numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0),
    total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method payment_method NOT NULL,
    token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    idempotency_key text UNIQUE,
    customer_language text NOT NULL DEFAULT 'pl',
    rejection_reason text,
    cancellation_reason text,
    admin_notes text,
    customer_notes text,
    approved_at timestamptz,
    preparing_at timestamptz,
    ready_at timestamptz,
    dispatched_at timestamptz,
    completed_at timestamptz,
    estimated_time timestamptz,
    created_by_admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 20. Table: order_status_events
CREATE TABLE order_status_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    old_status order_status,
    new_status order_status NOT NULL,
    changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 21. Table: order_items
CREATE TABLE order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name_pl text NOT NULL,
    item_name_en text NOT NULL,
    unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity integer NOT NULL CHECK (quantity > 0),
    line_total numeric(10,2) NOT NULL CHECK (line_total >= 0),
    customer_notes text,
    kitchen_notes text,
    allergens_snapshot text[] DEFAULT '{}'::text[] NOT NULL,
    spice_level_snapshot integer NOT NULL DEFAULT 0
);

-- 22. Table: order_charges
CREATE TABLE order_charges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    charge_type charge_type NOT NULL,
    label_pl text NOT NULL,
    label_en text NOT NULL,
    amount numeric(10,2) NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    total_amount numeric(10,2) NOT NULL,
    tax_rate numeric(4,2),
    metadata jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 23. Table: notification_logs
CREATE TABLE notification_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    channel notification_channel NOT NULL,
    type text NOT NULL,
    status notification_status NOT NULL DEFAULT 'pending',
    retry_count integer NOT NULL DEFAULT 0,
    max_retries integer NOT NULL DEFAULT 3,
    error_message text,
    payload jsonb NOT NULL,
    related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
    related_reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
    related_contact_inquiry_id uuid REFERENCES contact_inquiries(id) ON DELETE SET NULL,
    sent_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 24. Table: admin_activity_logs
CREATE TABLE admin_activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    details jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);


-- 4. DATABASE ROLE CHECKING HELPERS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'::user_role AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'::user_role AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_kitchen()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'kitchen'::user_role AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'staff'::user_role AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner'::user_role, 'manager'::user_role) AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner'::user_role, 'manager'::user_role) AND is_active = true
  );
END;
$$;


-- 5. FUNCTIONAL TRIGGERS AND CONSTRAINT PROTECTION

-- A. Split-Shift Overlap Trigger for service_hours
CREATE OR REPLACE FUNCTION check_service_hours_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_closed = true THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.service_hours
    WHERE service_type = NEW.service_type
      AND day_of_week = NEW.day_of_week
      AND is_closed = false
      AND id <> NEW.id
      AND NEW.open_time < close_time
      AND open_time < NEW.close_time
  ) THEN
    RAISE EXCEPTION 'Overlapping active service hours are not allowed for service type % on day of week %.', NEW.service_type, NEW.day_of_week;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_service_hours_overlap
BEFORE INSERT OR UPDATE ON service_hours
FOR EACH ROW EXECUTE FUNCTION check_service_hours_overlap();

-- B. Distance Band Overlap Trigger for delivery_fee_rules [min, max)
CREATE OR REPLACE FUNCTION check_delivery_fee_rules_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  IF NEW.max_distance_km IS NOT NULL AND NEW.min_distance_km >= NEW.max_distance_km THEN
    RAISE EXCEPTION 'min_distance_km (%) must be less than max_distance_km (%).', NEW.min_distance_km, NEW.max_distance_km;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.delivery_fee_rules
    WHERE is_active = true
      AND id <> NEW.id
      AND (
        NEW.min_distance_km < COALESCE(max_distance_km, 999999.99)
        AND min_distance_km < COALESCE(NEW.max_distance_km, 999999.99)
      )
  ) THEN
    RAISE EXCEPTION 'Overlapping active delivery fee rules are not allowed.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_delivery_fee_rules_overlap
BEFORE INSERT OR UPDATE ON delivery_fee_rules
FOR EACH ROW EXECUTE FUNCTION check_delivery_fee_rules_overlap();

-- C. Reservation Status Event Logging Trigger
CREATE OR REPLACE FUNCTION log_reservation_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.reservation_status_events (reservation_id, old_status, new_status, changed_by, reason)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by_admin_id, 'Reservation created');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.reservation_status_events (reservation_id, old_status, new_status, changed_by, reason)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), COALESCE(NEW.rejection_reason, NEW.cancellation_reason, 'Status updated'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_reservation_status_event
AFTER INSERT OR UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION log_reservation_status_event();

-- D. Order Status Event Logging Trigger
CREATE OR REPLACE FUNCTION log_order_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_events (order_id, old_status, new_status, changed_by, reason)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by_admin_id, 'Order created');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_events (order_id, old_status, new_status, changed_by, reason)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), COALESCE(NEW.rejection_reason, NEW.cancellation_reason, 'Status updated'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_order_status_event
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION log_order_status_event();

-- E. Order Update Protection (Uses IS DISTINCT FROM)
CREATE OR REPLACE FUNCTION check_order_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. If user is kitchen, restrict updates strictly to status and timestamps
  IF public.is_kitchen() THEN
    IF OLD.customer_name IS DISTINCT FROM NEW.customer_name OR
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
       OLD.admin_notes IS DISTINCT FROM NEW.admin_notes OR
       OLD.customer_notes IS DISTINCT FROM NEW.customer_notes OR
       OLD.created_by_admin_id IS DISTINCT FROM NEW.created_by_admin_id OR
       OLD.created_at IS DISTINCT FROM NEW.created_at
    THEN
      RAISE EXCEPTION 'Kitchen staff is only allowed to update order status fields.';
    END IF;

    -- Kitchen can only transition to preparing, ready_for_pickup, out_for_delivery, completed
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('preparing'::order_status, 'ready_for_pickup'::order_status, 'out_for_delivery'::order_status, 'completed'::order_status) THEN
      RAISE EXCEPTION 'Kitchen staff is not allowed to transition order status to %.', NEW.status;
    END IF;
  END IF;

  -- 2. If user is staff, prevent changing pricing totals, fees, and payment methods
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

CREATE TRIGGER trg_check_order_update_permissions
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION check_order_update_permissions();

-- F. Order Total Integrity Verification Trigger
CREATE OR REPLACE FUNCTION check_order_total_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF ABS(NEW.total_amount - (NEW.items_subtotal + NEW.packaging_total + NEW.delivery_fee + NEW.other_charges_total - NEW.discount_total)) >= 0.01 THEN
    RAISE EXCEPTION 'Order total_amount (%) does not match sum of subtotals and fees (items: %, packaging: %, delivery: %, other: %, discount: %).',
      NEW.total_amount, NEW.items_subtotal, NEW.packaging_total, NEW.delivery_fee, NEW.other_charges_total, NEW.discount_total;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_order_total_integrity
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION check_order_total_integrity();

-- G. Profile Update Security Trigger (Bypasses OLD/NEW in RLS)
CREATE OR REPLACE FUNCTION check_profile_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow superuser (postgres) to perform administrative bootstrapping/testing
  IF session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- Owner is allowed full updates
  IF public.is_owner() THEN
    RETURN NEW;
  END IF;

  -- Users can only edit their own profiles
  IF auth.uid() IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'You are not allowed to update other profiles.';
  END IF;

  -- Cannot change role or active status
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'You are not allowed to change your own role.';
  END IF;

  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    RAISE EXCEPTION 'You are not allowed to change your active status.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_profile_update_permissions
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION check_profile_update_permissions();

-- H. Automatic Profile Trigger on Signup (Baseline: Role=staff, is_active=false)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, phone, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    'staff'::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Staff Member'),
    NEW.raw_user_meta_data->>'phone',
    false -- Requires manual Owner activation
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- I. Soft Delete Trigger for Categories
CREATE OR REPLACE FUNCTION handle_soft_delete_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    NEW.deleted_at = NOW();
    NEW.deleted_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_soft_delete_categories
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION handle_soft_delete_categories();

-- J. Soft Delete Trigger for Menu Items
CREATE OR REPLACE FUNCTION handle_soft_delete_menu_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    NEW.deleted_at = NOW();
    NEW.deleted_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_soft_delete_menu_items
BEFORE UPDATE ON menu_items
FOR EACH ROW EXECUTE FUNCTION handle_soft_delete_menu_items();


-- 6. PERFORMANCE INDEXES
CREATE INDEX idx_reservations_status_start ON reservations(status, reservation_start_at);
CREATE INDEX idx_reservations_overlap ON reservations(table_id, reservation_start_at, reservation_end_at) WHERE table_id IS NOT NULL;
CREATE INDEX idx_reservations_token ON reservations(token);
CREATE INDEX idx_reservations_src_status ON reservations(source, status);
CREATE INDEX idx_reservations_created ON reservations(created_at DESC);
CREATE INDEX idx_orders_lookup ON orders(status, order_type, created_at DESC);
CREATE INDEX idx_orders_token ON orders(token);
CREATE INDEX idx_orders_phone ON orders(customer_phone);
CREATE INDEX idx_orders_postal ON orders(delivery_postal_code);
CREATE INDEX idx_order_items_id ON order_items(order_id);
CREATE INDEX idx_order_charges_id ON order_charges(order_id);
CREATE INDEX idx_menu_items_cms ON menu_items(category_id, is_active, is_deleted, display_order);
CREATE INDEX idx_categories_cms ON categories(is_active, is_deleted, display_order);
CREATE INDEX idx_contact_inquiries_lookup ON contact_inquiries(status, created_at DESC);
CREATE INDEX idx_notification_logs_retry ON notification_logs(status, channel, created_at DESC);
CREATE INDEX idx_delivery_fee_rules_active ON delivery_fee_rules(is_active, display_order);
CREATE INDEX idx_service_hours_lookup ON service_hours(service_type, day_of_week);
CREATE INDEX idx_holiday_closures_lookup ON holiday_closures(date, affected_service);
CREATE INDEX idx_admin_activity_logs_lookup ON admin_activity_logs(admin_id, created_at DESC);
CREATE INDEX idx_res_status_events ON reservation_status_events(reservation_id, created_at DESC);
CREATE INDEX idx_order_status_events ON order_status_events(order_id, created_at DESC);
CREATE INDEX idx_media_assets_approved_public ON media_assets(is_approved, is_public);


-- 7. ROW LEVEL SECURITY (RLS) ACTIVATION
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_postal_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_packaging_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;


-- 8. ROW LEVEL SECURITY POLICIES (EXPLICIT AND BULLETPROOF)

-- A. Table: profiles
CREATE POLICY select_profiles_owner_manager ON profiles
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager());

CREATE POLICY select_profiles_self ON profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY insert_profiles_owner ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner());

CREATE POLICY update_profiles_policy ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_owner())
    WITH CHECK (id = auth.uid() OR public.is_owner());

CREATE POLICY delete_profiles_owner ON profiles
    FOR DELETE TO authenticated
    USING (public.is_owner());

-- B. Table: dining_tables
CREATE POLICY select_dining_tables ON dining_tables
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff() OR public.is_kitchen());

CREATE POLICY insert_dining_tables ON dining_tables
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_dining_tables ON dining_tables
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_dining_tables ON dining_tables
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- C. Table: reservations
CREATE POLICY select_reservations ON reservations
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff());

CREATE POLICY insert_reservations ON reservations
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());

CREATE POLICY update_reservations ON reservations
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff())
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());

-- D. Table: reservation_status_events
CREATE POLICY select_reservation_status_events ON reservation_status_events
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff());

-- E. Table: categories
CREATE POLICY select_categories_public ON categories
    FOR SELECT TO public
    USING (is_active = true AND is_deleted = false);

CREATE POLICY select_categories_admin ON categories
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff() OR public.is_kitchen());

CREATE POLICY insert_categories ON categories
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_categories ON categories
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

-- F. Table: menu_items
CREATE POLICY select_menu_items_public ON menu_items
    FOR SELECT TO public
    USING (is_active = true AND is_deleted = false);

CREATE POLICY select_menu_items_admin ON menu_items
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff() OR public.is_kitchen());

CREATE POLICY insert_menu_items ON menu_items
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_menu_items ON menu_items
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

-- G. Table: service_hours
CREATE POLICY select_service_hours ON service_hours FOR SELECT TO public USING (true);

CREATE POLICY insert_service_hours ON service_hours
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_service_hours ON service_hours
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_service_hours ON service_hours
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- H. Table: holiday_closures
CREATE POLICY select_holiday_closures ON holiday_closures FOR SELECT TO public USING (true);

CREATE POLICY insert_holiday_closures ON holiday_closures
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_holiday_closures ON holiday_closures
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_holiday_closures ON holiday_closures
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- I. Table: operational_status
CREATE POLICY select_operational_status ON operational_status FOR SELECT TO public USING (true);

CREATE POLICY insert_operational_status ON operational_status
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_operational_status ON operational_status
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

-- J. Table: system_settings
CREATE POLICY select_system_settings ON system_settings
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager());

CREATE POLICY insert_system_settings ON system_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner());

CREATE POLICY update_system_settings ON system_settings
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

-- K. Table: contact_inquiries
CREATE POLICY select_contact_inquiries ON contact_inquiries
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager());

CREATE POLICY update_contact_inquiries ON contact_inquiries
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

-- L. Table: site_content
CREATE POLICY select_site_content ON site_content FOR SELECT TO public USING (true);

CREATE POLICY insert_site_content ON site_content
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_site_content ON site_content
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

-- M. Table: media_assets
CREATE POLICY select_media_assets_public ON media_assets
    FOR SELECT TO public
    USING (is_approved = true AND is_public = true);

CREATE POLICY select_media_assets_admin ON media_assets
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager());

CREATE POLICY insert_media_assets ON media_assets
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_media_assets ON media_assets
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_media_assets ON media_assets
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- N. Table: delivery_zones
CREATE POLICY select_delivery_zones ON delivery_zones FOR SELECT TO public USING (true);

CREATE POLICY insert_delivery_zones ON delivery_zones
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_delivery_zones ON delivery_zones
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_delivery_zones ON delivery_zones
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- O. Table: delivery_postal_codes
CREATE POLICY select_delivery_postal_codes ON delivery_postal_codes FOR SELECT TO public USING (true);

CREATE POLICY insert_delivery_postal_codes ON delivery_postal_codes
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_delivery_postal_codes ON delivery_postal_codes
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_delivery_postal_codes ON delivery_postal_codes
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- P. Table: delivery_fee_rules
CREATE POLICY select_delivery_fee_rules ON delivery_fee_rules FOR SELECT TO public USING (true);

CREATE POLICY insert_delivery_fee_rules ON delivery_fee_rules
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_delivery_fee_rules ON delivery_fee_rules
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_delivery_fee_rules ON delivery_fee_rules
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- Q. Table: packaging_fee_rules
CREATE POLICY select_packaging_fee_rules ON packaging_fee_rules FOR SELECT TO public USING (true);

CREATE POLICY insert_packaging_fee_rules ON packaging_fee_rules
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_packaging_fee_rules ON packaging_fee_rules
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_packaging_fee_rules ON packaging_fee_rules
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- R. Table: menu_item_packaging_rules
CREATE POLICY select_menu_item_packaging_rules ON menu_item_packaging_rules FOR SELECT TO public USING (true);

CREATE POLICY insert_menu_item_packaging_rules ON menu_item_packaging_rules
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY update_menu_item_packaging_rules ON menu_item_packaging_rules
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

CREATE POLICY delete_menu_item_packaging_rules ON menu_item_packaging_rules
    FOR DELETE TO authenticated
    USING (public.is_admin_or_manager());

-- S. Table: orders
CREATE POLICY select_orders ON orders
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff() OR public.is_kitchen());

CREATE POLICY insert_orders ON orders
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());

CREATE POLICY update_orders_admin ON orders
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff())
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());

CREATE POLICY update_orders_kitchen ON orders
    FOR UPDATE TO authenticated
    USING (public.is_kitchen())
    WITH CHECK (public.is_kitchen());

-- T. Table: order_status_events
CREATE POLICY select_order_status_events ON order_status_events
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff() OR public.is_kitchen());

-- U. Table: order_items
CREATE POLICY select_order_items ON order_items
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff() OR public.is_kitchen());

CREATE POLICY insert_order_items ON order_items
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());

CREATE POLICY update_order_items ON order_items
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff())
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());

-- V. Table: order_charges
CREATE POLICY select_order_charges ON order_charges
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff() OR public.is_kitchen());

CREATE POLICY insert_order_charges ON order_charges
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());

CREATE POLICY update_order_charges ON order_charges
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager() OR public.is_staff())
    WITH CHECK (public.is_admin_or_manager() OR public.is_staff());

-- W. Table: notification_logs
CREATE POLICY select_notification_logs ON notification_logs
    FOR SELECT TO authenticated
    USING (public.is_admin_or_manager());

CREATE POLICY update_notification_logs ON notification_logs
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

-- X. Table: admin_activity_logs
CREATE POLICY select_admin_activity_logs_owner ON admin_activity_logs
    FOR SELECT TO authenticated
    USING (public.is_owner());

CREATE POLICY select_admin_activity_logs_manager ON admin_activity_logs
    FOR SELECT TO authenticated
    USING (public.is_manager() AND admin_id = auth.uid());


-- 9. SECURITY DEFINER RPC FUNCTIONS (SAFE PATH SEARCH AND ENHANCED PRIVILEGES)

-- A. Get Public System Settings
CREATE OR REPLACE FUNCTION public.get_public_system_settings()
RETURNS TABLE (
    key text,
    value jsonb
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT s.key, s.value
    FROM public.system_settings s
    WHERE s.key IN ('restaurant_address', 'restaurant_phone', 'opening_status', 'public_messages', 'public_service_hours');
END;
$$ LANGUAGE plpgsql;

-- B. Get Public Reservation Status by Token
CREATE OR REPLACE FUNCTION public.get_public_reservation_status_by_token(res_id uuid, sec_token uuid)
RETURNS TABLE (
    reservation_start_at timestamptz,
    reservation_end_at timestamptz,
    timezone text,
    guests_count integer,
    status reservation_status,
    rejection_reason text,
    cancellation_reason text,
    customer_notes text,
    timeline jsonb
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY 
    SELECT r.reservation_start_at, r.reservation_end_at, r.timezone, 
           r.guests_count, r.status, r.rejection_reason, r.cancellation_reason, 
           r.customer_notes,
           COALESCE(
             (
               SELECT jsonb_agg(json_build_object(
                 'status', e.new_status,
                 'created_at', e.created_at
               ) ORDER BY e.created_at ASC)
               FROM public.reservation_status_events e
               WHERE e.reservation_id = r.id
             ),
             '[]'::jsonb
           ) AS timeline
    FROM public.reservations r
    WHERE r.id = res_id AND r.token = sec_token;
END;
$$ LANGUAGE plpgsql;

-- C. Get Public Order Details by Token
CREATE OR REPLACE FUNCTION public.get_public_order_details_by_token(ord_id uuid, sec_token uuid)
RETURNS TABLE (
    order_type order_type,
    status order_status,
    delivery_address_public text,
    delivery_fee numeric(10,2),
    items_subtotal numeric(10,2),
    packaging_total numeric(10,2),
    other_charges_total numeric(10,2),
    discount_total numeric(10,2),
    total_amount numeric(10,2),
    payment_method payment_method,
    estimated_time timestamptz,
    rejection_reason text,
    cancellation_reason text,
    customer_notes text,
    created_at timestamptz,
    items jsonb,
    charges jsonb,
    timeline jsonb
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT o.order_type, o.status, 
           -- Mask numbers and apartments by taking the street name word and appending **
           CASE 
             WHEN o.delivery_address IS NULL THEN NULL
             ELSE split_part(o.delivery_address, ' ', 1) || ' **' || COALESCE(', ' || split_part(o.delivery_address, ',', 2), '')
           END AS delivery_address_public,
           o.delivery_fee, o.items_subtotal, o.packaging_total, o.other_charges_total, o.discount_total, 
           o.total_amount, o.payment_method, o.estimated_time,
           o.rejection_reason, o.cancellation_reason, o.customer_notes, o.created_at,
           COALESCE(
             (
               SELECT jsonb_agg(json_build_object(
                 'name_pl', i.item_name_pl,
                 'name_en', i.item_name_en,
                 'unit_price', i.unit_price,
                 'quantity', i.quantity,
                 'line_total', i.line_total,
                 'customer_notes', i.customer_notes
               ))
               FROM public.order_items i
               WHERE i.order_id = o.id
             ),
             '[]'::jsonb
           ) AS items,
           COALESCE(
             (
               SELECT jsonb_agg(json_build_object(
                 'type', c.charge_type,
                 'label_pl', c.label_pl,
                 'label_en', c.label_en,
                 'total_amount', c.total_amount
               ))
               FROM public.order_charges c
               WHERE c.order_id = o.id
             ),
             '[]'::jsonb
           ) AS charges,
           COALESCE(
             (
               SELECT jsonb_agg(json_build_object(
                 'status', e.new_status,
                 'created_at', e.created_at
               ) ORDER BY e.created_at ASC)
               FROM public.order_status_events e
               WHERE e.order_id = o.id
             ),
             '[]'::jsonb
           ) AS timeline
    FROM public.orders o
    WHERE o.id = ord_id AND o.token = sec_token;
END;
$$ LANGUAGE plpgsql;

-- D. Secure KDS Order Status Update RPC Function
CREATE OR REPLACE FUNCTION public.update_kds_order_status(ord_id uuid, new_status order_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated.';
  END IF;

  -- Role check: kitchen, manager, or owner
  IF NOT (public.is_kitchen() OR public.is_admin_or_manager()) THEN
    RAISE EXCEPTION 'Unauthorized.';
  END IF;

  -- Status transition restriction for kitchen staff
  IF public.is_kitchen() AND new_status NOT IN ('preparing'::order_status, 'ready_for_pickup'::order_status, 'completed'::order_status) THEN
    RAISE EXCEPTION 'Kitchen role is only allowed to transition orders to preparing, ready_for_pickup, or completed.';
  END IF;

  UPDATE public.orders
  SET status = new_status
  WHERE id = ord_id;
END;
$$;

-- E. Secure Admin Activity Logging RPC Function
CREATE OR REPLACE FUNCTION public.log_admin_activity(action text, details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated.';
  END IF;

  SELECT role INTO user_role_val FROM public.profiles WHERE id = auth.uid() AND is_active = true;

  IF user_role_val IS NULL THEN
    RAISE EXCEPTION 'Unauthorized.';
  END IF;

  INSERT INTO public.admin_activity_logs (admin_id, action, details)
  VALUES (auth.uid(), action, details);
END;
$$;


-- REVOKE AND GRANT RPC PERMISSIONS
REVOKE EXECUTE ON FUNCTION public.update_kds_order_status(uuid, order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_kds_order_status(uuid, order_status) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_admin_activity(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_activity(text, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_reservation_status_by_token(uuid, uuid) TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_order_details_by_token(uuid, uuid) TO public, anon, authenticated;

-- Revoke role checker helpers execution from public
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_kitchen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_kitchen() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_admin_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_admin_access() TO authenticated;


-- 10. STORAGE BUCKETS SETUP & SECURITY POLICIES

-- A. Create Private Buckets (Option B - More Secure)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('menu-images', 'menu-images', false),
  ('site-images', 'site-images', false),
  ('gallery-images', 'gallery-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- B. Storage Policies on storage.objects
CREATE POLICY "Public Read Objects"
ON storage.objects FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.media_assets
    WHERE media_assets.bucket = storage.objects.bucket_id
      AND media_assets.file_path = storage.objects.name
      AND media_assets.is_public = true
      AND media_assets.is_approved = true
  )
);

CREATE POLICY "Owner/Manager Upload Objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('menu-images', 'site-images', 'gallery-images')
  AND public.is_admin_or_manager()
);

CREATE POLICY "Owner/Manager Update Objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('menu-images', 'site-images', 'gallery-images')
  AND public.is_admin_or_manager()
)
WITH CHECK (
  bucket_id IN ('menu-images', 'site-images', 'gallery-images')
  AND public.is_admin_or_manager()
);

CREATE POLICY "Owner/Manager Delete Objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('menu-images', 'site-images', 'gallery-images')
  AND public.is_admin_or_manager()
);


-- 11. BASELINE SEED CONFIGURATION

-- A. Table: system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('restaurant_address', '"Warszawska 1/3, 06-400 Ciechanów, Poland"'::jsonb, 'The physical address of the restaurant'),
  ('restaurant_phone', '"511984331"'::jsonb, 'The public contact phone number'),
  ('timezone', '"Europe/Warsaw"'::jsonb, 'The local timezone of the restaurant'),
  ('site_url', '"http://localhost:3000"'::jsonb, 'The site URL placeholder'),
  ('coordinates', '{"latitude": null, "longitude": null, "status": "unverified"}'::jsonb, 'Verified coordinates of the restaurant (coordinates status: unverified)'),
  ('opening_status', '{"is_open": true, "message": null}'::jsonb, 'Current public opening status banner'),
  ('public_messages', '{"alert_banner": null, "welcome_message": "Welcome to Namaste Indian Restaurant!"}'::jsonb, 'Public message configurations'),
  ('public_service_hours', '{"dine_in": "12:00 - 22:00", "delivery": "12:00 - 21:30"}'::jsonb, 'Publicly displayed opening hours summary')
ON CONFLICT (key) DO NOTHING;

-- B. Table: operational_status
INSERT INTO public.operational_status (delivery_enabled, takeaway_enabled, reservations_enabled, dine_in_status, kitchen_busy_mode, temporary_message_pl, temporary_message_en, estimated_delay_minutes)
VALUES (true, true, true, 'open', false, NULL, NULL, 0);

-- C. Table: delivery_fee_rules (Half-open intervals [min, max) )
INSERT INTO public.delivery_fee_rules (name, min_distance_km, max_distance_km, fee_amount, rule_action, message_pl, message_en, is_active, display_order)
VALUES 
  ('Zone 1 (Close)', 0.00, 2.00, 5.00, 'allow', 'Dostawa blisko (0-2 km)', 'Delivery close (0-2 km)', true, 1),
  ('Zone 2 (Medium)', 2.00, 5.00, 10.00, 'allow', 'Dostawa średnia (2-5 km)', 'Delivery medium (2-5 km)', true, 2),
  ('Zone 3 (Far)', 5.00, 20.00, 15.00, 'allow', 'Dostawa daleko (5-20 km)', 'Delivery far (5-20 km)', true, 3),
  ('Zone 4 (Too Far)', 20.00, NULL, 0.00, 'contact_restaurant', 'Dostawa powyżej 20 km - prosimy o kontakt', 'Delivery above 20 km - please contact restaurant', true, 4);

-- D. Table: packaging_fee_rules (Configurable placeholders - Accountant/Legal advisor must confirm fee amounts and tax behaviors)
INSERT INTO public.packaging_fee_rules (name_pl, name_en, fee_type, amount, applies_to_delivery, applies_to_takeaway, applies_to_dine_in, is_active, tax_behavior, effective_from)
VALUES 
  ('Pojemnik na jedzenie', 'Food container', 'food_container', 1.50, true, true, false, true, 'inclusive', now()),
  ('Kubek na napój', 'Beverage cup', 'beverage_cup', 1.00, true, true, false, true, 'inclusive', now()),
  ('Torba papierowa', 'Paper bag', 'bag', 2.00, true, true, false, true, 'inclusive', now());

-- E. Table: service_hours (Weekly splits)
DO $$
DECLARE
  day_idx integer;
BEGIN
  FOR day_idx IN 0..6 LOOP
    -- Dine in
    INSERT INTO public.service_hours (service_type, day_of_week, slot_number, open_time, close_time, is_closed, min_lead_time_minutes, max_preorder_days, display_order)
    VALUES ('dine_in', day_idx, 1, '12:00:00', '22:00:00', false, 0, 0, 1);
    
    -- Reservations
    INSERT INTO public.service_hours (service_type, day_of_week, slot_number, open_time, close_time, is_closed, min_lead_time_minutes, max_preorder_days, display_order)
    VALUES ('reservations', day_idx, 1, '12:00:00', '21:00:00', false, 30, 30, 2);
    
    -- Delivery
    INSERT INTO public.service_hours (service_type, day_of_week, slot_number, open_time, close_time, is_closed, min_lead_time_minutes, max_preorder_days, display_order)
    VALUES ('delivery', day_idx, 1, '12:00:00', '21:30:00', false, 45, 7, 3);
    
    -- Takeaway
    INSERT INTO public.service_hours (service_type, day_of_week, slot_number, open_time, close_time, is_closed, min_lead_time_minutes, max_preorder_days, display_order)
    VALUES ('takeaway', day_idx, 1, '12:00:00', '21:45:00', false, 15, 7, 4);
  END LOOP;
END;
$$;
