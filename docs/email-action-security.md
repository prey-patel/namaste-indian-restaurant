# Secure Email Actions Security Architecture

This document outlines the security architecture used for secure one-click actions embedded in admin email alerts.

## 1. Token Generation and Hashing (HMAC-SHA256)

To prevent database exposure and unauthorized action attempts, the application utilizes cryptographically secure tokens hashed using HMAC-SHA256.

1. **Raw Token Generation**: The system generates a cryptographically secure 32-byte (64 characters hex) random token:
   ```typescript
   const rawToken = crypto.randomBytes(32).toString("hex");
   ```
2. **HMAC-SHA256 hashing**: The token is signed using `EMAIL_ACTION_TOKEN_SECRET` with the HMAC-SHA256 algorithm. Only the hash is saved to the database in `email_action_tokens.token_hash`.
3. **No Raw Tokens Stored**: Even if the database is compromised, an attacker cannot reverse-engineer the raw token from the hash, making it impossible to spoof links.
4. **No Raw Tokens Logged**: Raw tokens are never written to server logs.

## 2. Token Expiration and One-Time Use

- **2-Hour Expiration Window**: Tokens are generated with a strict `expires_at` timestamp set to exactly `now + 2 hours`.
- **One-Time Use Enforcement**: Action confirmation pages first check `used_at` in `email_action_tokens`. When consumed, the token is updated with `used_at = now()` inside a transaction-safe conditional update.
- **Race Condition Prevention**:
  ```sql
  UPDATE email_action_tokens 
  SET used_at = :now 
  WHERE id = :id AND used_at IS NULL;
  ```
  If another thread attempts to double-use the same token, the conditional update fails.

## 3. Privacy Preservation

To ensure customer privacy, the admin email confirmation landing pages strictly restrict data exposure:
- **First Name Only**: Customer names are split (e.g., `Prey Patel` -> `Prey`) to avoid displaying full names.
- **Concealed Contacts**: Email addresses and phone numbers are completely omitted from the confirmation display.
- **Concealed Delivery/Notes**: Delivery addresses, customer notes, and internal notes are not displayed on the email action pages. Only order totals and ordered items list are visible.
- **Token Preview**: The confirmation page calls `verifyActionTokenForPreview()` to authenticate the session but does NOT consume the token. The token is consumed using `consumeActionTokenForConfirmation()` only when the administrator clicks the **Confirm** button.
