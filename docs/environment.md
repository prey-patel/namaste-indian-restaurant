# Environment Variables Guide

This guide explains client vs. server variable requirements for Namaste Indian Restaurant.

## Client-Accessible Variables
All variables prefixed with `NEXT_PUBLIC_` are compiled into the browser bundle:
*   `NEXT_PUBLIC_SUPABASE_URL`: Target URL for the restaurant's Supabase project.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Safe public anon key for database queries under RLS.
*   `NEXT_PUBLIC_SITE_URL`: public URL used for locale redirects.

## Secure Server-Side Variables
These variables must **never** be prefixed with `NEXT_PUBLIC_` or referenced in client-side code:
*   `SUPABASE_SERVICE_ROLE_KEY`: Service-role token bypassing database RLS policies.
*   `BREVO_API_KEY`: SMTP keys for dispatching customer emails.
*   `TELEGRAM_BOT_TOKEN`: Token for dispatching admin notifications.
*   `TELEGRAM_ADMIN_CHAT_ID`: Admin group ID for Telegram.
*   `ROUTING_PROVIDER_API_KEY`: Key for routing/distance calculations.
