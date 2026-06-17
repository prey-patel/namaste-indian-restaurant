# Phase 13B: Delivery Distance & Travel Time Calculation

This phase introduces automated geocoding and routing calculations for delivery orders. When a customer submits an order or an admin creates a manual delivery order, the system calculates distance and travel time from the restaurant to the customer's address.

## Core Flow
1. **Customer Submits Delivery Order**: The order is stored as `pending` with the delivery address fields.
2. **Background Server Execution**: The system geocodes the customer address and calculates car/walking routes.
3. **Database Storage**: The distance (in meters) and duration (in seconds) are stored in the `orders` table.
4. **Admin Display**: At the pending approval stage, the admin sees the geocoding status, calculated route distances/ETAs, and suggested delivery fee before approving/rejecting the order.

## Database Schema Additions
- `delivery_geocoded_address` (text): Formatted address returned by Google Geocoding API.
- `delivery_geocoding_status` (text): Enforces `not_attempted`, `success`, `failed`, `partial`, or `manual_required`.
- `delivery_distance_car_meters` (integer): Route distance by car in meters.
- `delivery_duration_car_seconds` (integer): Travel time by car in seconds.
- `delivery_distance_walk_meters` (integer): Route distance by walking in meters.
- `delivery_duration_walk_seconds` (integer): Travel time by walking in seconds.
- `delivery_distance_calculated_at` (timestamptz): Timestamp when routing was resolved.
- `delivery_distance_error` (text): Stores error details if routing fails.
- `suggested_delivery_fee_amount` (integer): Suggested fee in grosz (cents).

## Pricing Integration
- **Guidance Only**: The suggested delivery fee is computed from active `delivery_fee_rules` (or `delivery_postal_codes` fallback) but does *not* automatically alter the final `delivery_fee` of the order. The admin remains in control and must explicitly confirm or adjust the fee during the approval modal.
