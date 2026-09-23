<?php
declare(strict_types=1);

/**
 * Google integration credentials — EXAMPLE / CONTRACT ONLY.
 *
 * DO NOT put real secrets in this file. Commit this example to document the
 * shape; create the real `config/google.local.php` (same keys, same folder) on
 * the server, where it is gitignored and never uploaded to source control.
 *
 * How to generate a valid AES-256 key (32 random bytes, base64-encoded):
 *
 *   php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
 *
 * The encryption key MUST be:
 *   * exactly 32 bytes once base64-decoded (AES-256), and
 *   * a DIFFERENT secret from the Google client secret.
 *
 * Environment variables override this file:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ENCRYPTION_KEY,
 *   GOOGLE_KEY_VERSION, GOOGLE_DEFAULT_CALENDAR_ID
 *
 * Every value below is a placeholder and is intentionally invalid so that an
 * accidental copy fails closed (google_configured() === false) rather than
 * silently running half-configured.
 */

return [
    // OAuth client of type "Web application" (Google Cloud Console).
    'client_id' => '',

    // OAuth client secret. NEVER commit or log the real value.
    'client_secret' => '',

    // base64(random_bytes(32)) — a SEPARATE secret from the client secret.
    'encryption_key' => '',

    // Stored with each ciphertext so keys can be rotated safely.
    'key_version' => 1,

    // Calendar to write into. "primary" targets the connected user's main calendar.
    'default_calendar_id' => 'primary',
];
