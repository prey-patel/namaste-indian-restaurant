-- Migration: Composite Performance Indexes for High-Traffic Queries
-- Created: 2026-07-03

-- 1. Composite index for Delivery & KDS Dashboard order filtering
CREATE INDEX IF NOT EXISTS idx_orders_status_type ON orders(status, order_type);

-- 2. Index for Customer lookup by phone & status
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone_status ON orders(customer_phone, status);

-- 3. Composite index for Contact Inquiries status & recency
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status_created ON contact_inquiries(status, created_at DESC);

-- 4. Index for Reservation lookup by status and date
CREATE INDEX IF NOT EXISTS idx_reservations_status_date ON reservations(status, reservation_date);
