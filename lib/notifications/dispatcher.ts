import "server-only";

/**
 * ARCHITECTURE PLACEHOLDER - NOT IMPLEMENTED IN PHASE 1
 * This file is an architecture placeholder for future notification routing (Brevo SMTP & Telegram alerts).
 * Do not implement business logic in Phase 1.
 * 
 * WARNING: This is a server-only file and must never be imported into client components.
 */

export interface NotificationPayload {
  recipient: string;
  channel: 'brevo' | 'telegram';
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface DispatchResult {
  success: boolean;
  retryCount: number;
  errorMessage?: string;
}

/**
 * Dispatches notification logs and handles automated retries.
 * Reserved for Phase 6 (Reservations alerts), Phase 8 (Order alerts), and Phase 9 (Retry engine).
 */
export async function queueNotification(payload: NotificationPayload): Promise<DispatchResult> {
  // Logic placeholder
  return {
    success: true,
    retryCount: 0
  };
}
