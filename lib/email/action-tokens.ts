import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function computeHash(token: string): string {
  const secret = process.env.EMAIL_ACTION_TOKEN_SECRET;
  if (!secret) {
    throw new Error("Configuration Error: EMAIL_ACTION_TOKEN_SECRET is not configured.");
  }
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

/**
 * Creates a cryptographically secure token, hashes it, stores it in the DB,
 * and returns the raw token to be embedded in email URLs.
 */
export async function createAdminActionToken(
  entityType: "reservation" | "order",
  entityId: string,
  action: "approve" | "reject",
  adminEmail?: string
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = computeHash(rawToken);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours expiration

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("email_action_tokens")
    .insert({
      token_hash: tokenHash,
      entity_type: entityType,
      entity_id: entityId,
      action,
      admin_email: adminEmail || null,
      expires_at: expiresAt.toISOString(),
      metadata: {}
    });

  if (error) {
    console.error("Failed to insert email action token:", error);
    throw new Error("Could not generate secure email action link.");
  }

  return rawToken;
}

/**
 * Verifies a token without consuming it. Used to render the confirmation page preview.
 */
export async function verifyActionTokenForPreview(token: string) {
  if (!token) {
    throw new Error("This action link was already used or expired.");
  }

  const tokenHash = computeHash(token);
  const adminClient = createAdminClient();

  const { data: tokenRecord, error } = await adminClient
    .from("email_action_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !tokenRecord) {
    throw new Error("This action link was already used or expired.");
  }

  if (tokenRecord.used_at) {
    throw new Error("This action link was already used or expired.");
  }

  const now = new Date();
  const expiresAt = new Date(tokenRecord.expires_at);
  if (expiresAt < now) {
    throw new Error("This action link was already used or expired.");
  }

  return tokenRecord;
}

/**
 * Consumes the token by marking it as used. Called when the admin confirms the action.
 */
export async function consumeActionTokenForConfirmation(token: string, userId?: string) {
  // First verify it is valid
  const tokenRecord = await verifyActionTokenForPreview(token);

  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  const { data: updatedRecord, error: updateError } = await adminClient
    .from("email_action_tokens")
    .update({
      used_at: now,
      used_by: userId || null
    })
    .eq("id", tokenRecord.id)
    .is("used_at", null) // Prevent race condition/double use
    .select()
    .maybeSingle();

  if (updateError || !updatedRecord) {
    throw new Error("This action link was already used or expired.");
  }

  return updatedRecord;
}
