-- Migration: Add contact inquiries replies columns
-- Created: 2026-06-29

-- 1. Add reply fields to contact_inquiries
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS replied_at timestamptz;
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
