# Phase 13C — PWA Order Notifications, Push Alerts, and Sound System

This document describes the design, implementation, and features of the notification system built in Phase 13C for the Namaste Indian Restaurant admin panel and kitchen display system (KDS).

> [!IMPORTANT]
> **Device & Sound Support Policy:**
> System alerts and notification delivery are **supported where browser, operating system, PWA installation, notification permission, and device settings allow**.
> No custom sound loop or background push is guaranteed on every device.
> - Continuous custom sound works **only while the app/page is active and visible**.
> - Background or locked devices rely entirely on **Web Push notifications**.
> - The native notification sound, vibration, and banner behavior are **fully controlled by the client OS and browser settings**.
> - iOS/iPadOS devices require a supported OS version and that the app be **installed to the Home Screen as a PWA** before push notifications can be enabled.
> - Operating system modes such as Do Not Disturb, Focus, silent switch, battery saver, and browser permissions will affect or mute notification and sound playback.

## Overview

The restaurant-grade notification system operates on two distinct levels:
1. **Foreground / Active App alerts**: Leverages Web Audio API (`AudioContext`) to play continuous loop alarms (for pending orders on Order Management) or one-time kitchen bell chimes (for newly approved orders on KDS).
2. **Background / Inactive / Locked Device alerts**: Leverages **PWA Web Push Notifications** to show native system alerts when the application tab is closed, backgrounded, or the device is locked.

---

## Architectural Principles

### 1. Database-Level Idempotency
To prevent duplicate alerts for the same event key to the same user (e.g. concurrent webhook triggers or dual page-save races), we enforce a strict database-level unique constraint on `public.push_notification_logs(event_key, recipient_user_id)`.
Any duplicate insert will raise a PostgreSQL `23505` unique constraint violation, which is handled gracefully by the dispatcher to abort duplicates while continuing other pushes.

### 2. Up-to-Date Authorization (No Stored Trust)
We do **not** trust the stored `role` field on `push_subscriptions`. Instead, when dispatching a push, the database queries perform an inner join against `public.profiles` to confirm:
- The user is currently active (`profiles.is_active = true`).
- The user currently possesses an allowed role (`profiles.role IN ('owner', 'manager', 'kitchen')`).
This prevents authorized role bypasses if a staff member changes roles or is deactivated.

### 3. Fail-Silent Isolation
Notification dispatches are fully try-catched at the global level and the loop-item level. Any notification failure (e.g. bad credentials, push server timeout, invalid VAPID) is logged to `push_notification_logs` but **never** blocks order creation, manual order creation, or admin actions.

### 4. Active-Only Audio Loop
Continuous looping sounds are constrained using the browser's Page Visibility API.
- Loop alerts play only while the tab is active and visible.
- If the browser is minimized, tab is switched, or screen is locked, the sound loop stops instantly to honor native device resource management.

---

## Sound Profiles

### 1. Order Management Looping Alarm
- **Trigger**: Active when there are delivery or takeaway orders with status `pending`.
- **Chime**: A premium dual-tone electronic beep alternating between `523.25 Hz` (C5) and `659.25 Hz` (E5) every 2 seconds.
- **Stop**: Stops immediately as soon as all pending orders are approved, rejected, or cancelled.

### 2. KDS Kitchen Chime
- **Trigger**: Plays once when a new order with status `approved` is fetched.
- **Chime**: High-pitched service bell chime ("ding-ding") playing `880 Hz` (A5) then `1100 Hz` (C#6) with exponential gain decay.
- **History Guard**: Populates known order IDs on mount to prevent beeping repeatedly for old orders on first page load.
