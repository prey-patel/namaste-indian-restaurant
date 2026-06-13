# Database Schema Reference

This file documents the database schema created in Phase 2. All primary keys use UUIDs generated via `gen_random_uuid()` from `pgcrypto`. Timezones are handled via `timestamptz` defaulting to `Europe/Warsaw`.

---

## 1. Table Definitions

### 1. `profiles`
Maps database users to Supabase Auth.
-   `id` (uuid, PK): References `auth.users(id)`
-   `email` (text, unique, not null)
-   `role` (user_role, default `'staff'`)
-   `full_name` (text, not null)
-   `phone` (text)
-   `is_active` (boolean, default `false`)
-   `created_at` (timestamptz)
-   `updated_at` (timestamptz)

### 2. `dining_tables`
Physical dining tables.
-   `id` (uuid, PK)
-   `table_number` (integer, unique, not null)
-   `capacity` (integer, not null)
-   `section` (text, not null)
-   `is_active` (boolean, default `true`)
-   `notes` (text)
-   `created_at` / `updated_at` (timestamptz)

### 3. `reservations`
Bookings with half-open intervals. Nullable email allows manual bookings.
-   `id` (uuid, PK)
-   `customer_id` (uuid): References `profiles(id)`
-   `table_id` (uuid): References `dining_tables(id)`
-   `customer_name` (text, not null)
-   `customer_email` (text)
-   `customer_phone` (text, not null)
-   `reservation_start_at` / `reservation_end_at` (timestamptz, not null)
-   `timezone` (text, default `'Europe/Warsaw'`)
-   `guests_count` (integer, not null)
-   `status` (reservation_status, default `'pending'`)
-   `source` (reservation_source, default `'website'`)
-   `rejection_reason` / `cancellation_reason` / `admin_notes` / `customer_notes` (text)
-   `token` (uuid, unique, default random)
-   `idempotency_key` (text, unique)
-   `created_by_admin_id` (uuid): References `profiles(id)`
-   `consent_accepted_at` (timestamptz)
-   `privacy_policy_version` / `terms_version` (text)
-   `created_at` / `updated_at` (timestamptz)

### 4. `reservation_status_events`
-   `id` (uuid, PK)
-   `reservation_id` (uuid): References `reservations(id)`
-   `old_status` / `new_status` (reservation_status)
-   `changed_by` (uuid): References `profiles(id)`
-   `reason` (text)
-   `metadata` (jsonb)
-   `created_at` (timestamptz)

### 5. `categories`
-   `id` (uuid, PK)
-   `name_pl` / `name_en` (text, not null)
-   `slug` (text, unique, not null)
-   `display_order` (integer, default `0`)
-   `is_active` (boolean, default `true`)
-   `is_deleted` (boolean, default `false`)
-   `deleted_at` (timestamptz)
-   `deleted_by` (uuid): References `profiles(id)`
-   `created_at` / `updated_at` (timestamptz)

### 6. `menu_items`
-   `id` (uuid, PK)
-   `category_id` (uuid): References `categories(id)`
-   `name_pl` / `name_en` (text, not null)
-   `description_pl` / `description_en` (text)
-   `price` (numeric(10,2), not null)
-   `image_url` (text)
-   `is_available` / `is_active` (boolean, default `true`)
-   `is_deleted` (boolean, default `false`)
-   `deleted_at` (timestamptz)
-   `deleted_by` (uuid): References `profiles(id)`
-   `spiciness` (integer, 0 to 3)
-   `allergens` (text[])
-   `is_vegetarian` / `is_vegan` / `is_gluten_free` / `is_chef_special` / `is_popular` / `is_new` (boolean, default `false`)
-   `preparation_time` (integer, default `15`)
-   `upsell_suggestions` (uuid[])
-   `display_order` (integer, default `0`)
-   `created_at` / `updated_at` (timestamptz)

### 7. `service_hours`
Split shifts per day.
-   `id` (uuid, PK)
-   `service_type` (service_hours_type)
-   `day_of_week` (integer, 0 to 6)
-   `slot_number` (integer, default 1)
-   `open_time` / `close_time` (time, not null)
-   `is_closed` (boolean, default `false`)
-   `min_lead_time_minutes` (integer, default `30`)
-   `max_preorder_days` (integer, default `7`)
-   `last_order_time` (time)
-   `display_order` (integer, default `0`)
-   `created_at` / `updated_at` (timestamptz)

### 8. `holiday_closures`
-   `id` (uuid, PK)
-   `date` (date, not null)
-   `title_pl` / `title_en` (text, not null)
-   `affected_service` (affected_service_type, default `'all'`)
-   `is_closed` (boolean, default `true`)
-   `custom_open_time` / `custom_close_time` (time)
-   `message_pl` / `message_en` (text)
-   `created_at` / `updated_at` (timestamptz)

### 9. `operational_status`
-   `id` (uuid, PK)
-   `delivery_enabled` / `takeaway_enabled` / `reservations_enabled` (boolean, default `true`)
-   `dine_in_status` (text, default `'open'`)
-   `kitchen_busy_mode` (boolean, default `false`)
-   `temporary_message_pl` / `temporary_message_en` (text)
-   `estimated_delay_minutes` (integer, default `0`)
-   `updated_at` (timestamptz)

### 10. `system_settings`
-   `key` (text, PK)
-   `value` (jsonb, not null)
-   `description` (text)
-   `updated_by` (uuid): References `profiles(id)`
-   `updated_at` (timestamptz)

### 11. `contact_inquiries`
-   `id` (uuid, PK)
-   `name` / `email` (text, not null)
-   `phone` / `subject` / `message` (text)
-   `status` (inquiry_status, default `'new'`)
-   `source_language` (text, default `'pl'`)
-   `ip_hash` / `user_agent` (text)
-   `consent_accepted_at` (timestamptz, not null)
-   `privacy_policy_version` (text, not null)
-   `created_at` / `updated_at` (timestamptz)

### 12. `site_content`
-   `key` (text, PK)
-   `value_pl` / `value_en` (jsonb, not null)
-   `updated_by` (uuid): References `profiles(id)`
-   `updated_at` (timestamptz)

### 13. `media_assets`
-   `id` (uuid, PK)
-   `bucket` (text, check menu/site/gallery images)
-   `file_path` (text, not null)
-   `alt_text_pl` / `alt_text_en` (text)
-   `file_type` (text, not null)
-   `file_size` (integer, not null)
-   `is_public` (boolean, default `true`)
-   `is_approved` (boolean, default `false`)
-   `uploaded_by` (uuid): References `profiles(id)`
-   `created_at` (timestamptz)

### 14. `delivery_zones`
-   `id` (uuid, PK)
-   `name` (text, unique, not null)
-   `is_active` (boolean, default `true`)
-   `radius_km` (numeric(5,2))
-   `min_order_amount` (numeric(10,2), default `40.00`)
-   `delivery_fee` (numeric(10,2), default `0.00`)
-   `estimated_delivery_minutes` (integer, default `45`)
-   `created_at` / `updated_at` (timestamptz)

### 15. `delivery_postal_codes`
-   `id` (uuid, PK)
-   `postal_code` (text, unique, not null)
-   `zone_id` (uuid): References `delivery_zones(id)`
-   `is_active` (boolean, default `true`)
-   `delivery_fee_override` / `min_order_override` (numeric(10,2))

### 16. `delivery_fee_rules`
Distance-based boundaries [min, max).
-   `id` (uuid, PK)
-   `name` (text, not null)
-   `min_distance_km` / `max_distance_km` (numeric(5,2))
-   `fee_amount` (numeric(10,2), not null)
-   `rule_action` (rule_action_type, default `'allow'`)
-   `message_pl` / `message_en` (text)
-   `is_active` (boolean, default `true`)
-   `display_order` (integer, default `0`)
-   `created_at` / `updated_at` (timestamptz)

### 17. `packaging_fee_rules`
-   `id` (uuid, PK)
-   `name_pl` / `name_en` (text, not null)
-   `fee_type` (packaging_fee_type)
-   `amount` (numeric(10,2), not null)
-   `applies_to_delivery` / `applies_to_takeaway` (boolean, default `true`)
-   `applies_to_dine_in` (boolean, default `false`)
-   `is_active` (boolean, default `true`)
-   `tax_behavior` (text, default `'inclusive'`)
-   `effective_from` (timestamptz, default now())
-   `effective_to` (timestamptz)
-   `created_at` / `updated_at` (timestamptz)

### 18. `menu_item_packaging_rules`
-   `id` (uuid, PK)
-   `menu_item_id` (uuid): References `menu_items(id)`
-   `packaging_fee_rule_id` (uuid): References `packaging_fee_rules(id)`
-   `default_quantity` (integer, default `1`)
-   `is_required` (boolean, default `true`)
-   `created_at` / `updated_at` (timestamptz)

### 19. `orders`
Customer details and total calculations.
-   `id` (uuid, PK)
-   `customer_id` (uuid): References `profiles(id)`
-   `customer_name` / `customer_email` / `customer_phone` (text, not null)
-   `order_type` (order_type)
-   `status` (order_status, default `'pending'`)
-   `delivery_address` / `delivery_postal_code` / `delivery_city` (text)
-   `delivery_latitude` / `delivery_longitude` (numeric(9,6))
-   `route_distance_km` (numeric(6,2))
-   `route_duration_car_minutes` / `route_duration_walk_minutes` (integer)
-   `route_provider` (text)
-   `geocoding_status` (geocoding_status_type, default `'pending'`)
-   `geocoding_error` (text)
-   `address_verified_at` (timestamptz)
-   `delivery_fee` / `items_subtotal` / `packaging_total` / `other_charges_total` / `discount_total` / `total_amount` (numeric(10,2))
-   `payment_status` (payment_status, default `'pending'`)
-   `payment_method` (payment_method)
-   `token` (uuid, unique, default random)
-   `idempotency_key` (text, unique)
-   `customer_language` (text, default `'pl'`)
-   `rejection_reason` / `cancellation_reason` / `admin_notes` / `customer_notes` (text)
-   `approved_at` / `preparing_at` / `ready_at` / `dispatched_at` / `completed_at` / `estimated_time` (timestamptz)
-   `created_by_admin_id` (uuid): References `profiles(id)`
-   `created_at` / `updated_at` (timestamptz)

### 20. `order_status_events`
-   `id` (uuid, PK)
-   `order_id` (uuid): References `orders(id)`
-   `old_status` / `new_status` (order_status)
-   `changed_by` (uuid): References `profiles(id)`
-   `reason` (text)
-   `metadata` (jsonb)
-   `created_at` (timestamptz)

### 21. `order_items`
Snapshotted items from the menu.
-   `id` (uuid, PK)
-   `order_id` (uuid): References `orders(id)`
-   `menu_item_id` (uuid): References `menu_items(id)`
-   `item_name_pl` / `item_name_en` (text, not null)
-   `unit_price` (numeric(10,2), not null)
-   `quantity` (integer, not null)
-   `line_total` (numeric(10,2), not null)
-   `customer_notes` / `kitchen_notes` (text)
-   `allergens_snapshot` (text[])
-   `spice_level_snapshot` (integer)

### 22. `order_charges`
Snapshotted packaging, delivery, or custom charges.
-   `id` (uuid, PK)
-   `order_id` (uuid): References `orders(id)`
-   `charge_type` (charge_type)
-   `label_pl` / `label_en` (text, not null)
-   `amount` / `total_amount` (numeric(10,2))
-   `quantity` (integer, default `1`)
-   `tax_rate` (numeric(4,2))
-   `metadata` (jsonb)
-   `created_at` (timestamptz)

### 23. `notification_logs`
Telegram / Brevo log payloads.
-   `id` (uuid, PK)
-   `channel` (notification_channel)
-   `type` (text, not null)
-   `status` (notification_status, default `'pending'`)
-   `retry_count` / `max_retries` (integer)
-   `error_message` (text)
-   `payload` (jsonb, not null)
-   `related_order_id` (uuid): References `orders(id)`
-   `related_reservation_id` (uuid): References `reservations(id)`
-   `related_contact_inquiry_id` (uuid): References `contact_inquiries(id)`
-   `sent_at` / `created_at` (timestamptz)

### 24. `admin_activity_logs`
Owner/Manager audit trails.
-   `id` (uuid, PK)
-   `admin_id` (uuid): References `profiles(id)`
-   `action` (text, not null)
-   `details` (jsonb)
-   `created_at` (timestamptz)
