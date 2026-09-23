<?php
declare(strict_types=1);

/**
 * Google integration configuration loader (Sprint 010 Phase 1).
 *
 * This file is COMMITTED and contains NO secrets. Real credentials are supplied
 * by the operator in the sibling, GITIGNORED `config/google.local.php`
 * (see `config/google.local.example.php` for the exact contract), or via the
 * matching environment variables.
 *
 * Fail-closed contract:
 *   * `google_configured()` is the single gate every endpoint checks.
 *   * When credentials are missing OR invalid, it returns false and the caller
 *     must return `503 GOOGLE_NOT_CONFIGURED`. It never partially configures.
 *   * No function here ever returns, echoes or logs a secret value.
 *
 * Security requirements enforced here:
 *   * The AES key is a SEPARATE 32-byte secret — never the Google client secret.
 *   * The AES key must decode to exactly 32 bytes (AES-256).
 *
 * The exception is declared here (guarded) so the config layer stays
 * self-contained and testable, and so `GoogleErrorResponder` can map it to 503
 * without the config file depending on any capability class.
 */

if (!class_exists('GoogleConfigurationException', false)) {
    final class GoogleConfigurationException extends RuntimeException {}
}

if (!function_exists('google_config')) {
    /**
     * Default (non-secret) shape. `encryption_key` is a BASE64-encoded 32-byte
     * key; `key_version` allows safe key rotation later (stored per record).
     *
     * @return array<string,mixed>
     */
    function google_config_defaults(): array
    {
        return [
            'client_id' => '',
            'client_secret' => '',
            'encryption_key' => '',
            'key_version' => 1,
            'default_calendar_id' => 'primary',
            'use_fake' => false,
        ];
    }
}

if (!function_exists('google_config')) {
    /**
     * Resolve the working configuration without ever exposing values.
     *
     * Precedence: local file < environment variables. The local file is optional;
     * a missing file is not an error (it simply yields an unconfigured provider).
     *
     * @return array<string,mixed>
     */
    function google_config(): array
    {
        $config = google_config_defaults();

        // Test-only escape hatch: `GOOGLE_SKIP_LOCAL_CONFIG=1` ignores the local
        // credentials file so the fail-closed logic can be exercised hermetically.
        // It can only ever REDUCE configuration; it never adds a secret and has no
        // effect in production (where the variable is unset).
        $skipLocal = getenv('GOOGLE_SKIP_LOCAL_CONFIG') === '1';

        $localPath = __DIR__ . DIRECTORY_SEPARATOR . 'google.local.php';
        if (!$skipLocal && is_file($localPath)) {
            $loaded = require $localPath;
            if (is_array($loaded)) {
                foreach (array_keys($config) as $key) {
                    if (array_key_exists($key, $loaded) && $loaded[$key] !== null && $loaded[$key] !== '') {
                        $config[$key] = $loaded[$key];
                    }
                }
            }
        }

        $envMap = [
            'client_id' => 'GOOGLE_CLIENT_ID',
            'client_secret' => 'GOOGLE_CLIENT_SECRET',
            'encryption_key' => 'GOOGLE_ENCRYPTION_KEY',
            'key_version' => 'GOOGLE_KEY_VERSION',
            'default_calendar_id' => 'GOOGLE_DEFAULT_CALENDAR_ID',
        ];
        foreach ($envMap as $key => $envName) {
            $value = getenv($envName);
            if ($value !== false && $value !== '') {
                $config[$key] = $value;
            }
        }

        $config['client_id'] = is_string($config['client_id']) ? trim($config['client_id']) : '';
        $config['client_secret'] = is_string($config['client_secret']) ? trim($config['client_secret']) : '';
        $config['encryption_key'] = is_string($config['encryption_key']) ? trim($config['encryption_key']) : '';
        $config['default_calendar_id'] = is_string($config['default_calendar_id']) && $config['default_calendar_id'] !== ''
            ? trim($config['default_calendar_id'])
            : 'primary';
        $config['key_version'] = max(1, (int) $config['key_version']);

        // `use_fake` is a boolean convenience. It can be set in the gitignored
        // google.local.php or via GOOGLE_FAKE=1. It only ever enables an OFFLINE
        // fake client; it can never cause a real network call.
        $envFake = getenv('GOOGLE_FAKE');
        if ($envFake !== false && $envFake !== '') {
            $config['use_fake'] = $envFake === '1' || strtolower($envFake) === 'true';
        } else {
            $config['use_fake'] = (bool) $config['use_fake'];
        }

        return $config;
    }
}

if (!function_exists('google_use_fake')) {
    /**
     * Whether the deterministic offline fake client must be used. Kept beside the
     * provider availability gate so the fake can be exercised with a valid
     * encryption key but NO real Google credentials.
     */
    function google_use_fake(): bool
    {
        return (bool) (google_config()['use_fake'] ?? false);
    }
}

if (!function_exists('google_encryption_key_bytes')) {
    /**
     * Decode and validate the AES-256 key. Returns the raw 32 bytes.
     *
     * @throws GoogleConfigurationException when the key is missing or not 32 bytes.
     */
    function google_encryption_key_bytes(): string
    {
        $encoded = (string) (google_config()['encryption_key'] ?? '');
        if ($encoded === '') {
            throw new GoogleConfigurationException('Encryption key is not configured.');
        }

        $decoded = base64_decode($encoded, true);
        if ($decoded === false || strlen($decoded) !== 32) {
            throw new GoogleConfigurationException('Encryption key must be a base64-encoded 32-byte value.');
        }

        return $decoded;
    }
}

if (!function_exists('google_validate_encryption_key')) {
    /**
     * Shared encryption-key validation. Returns a secret-free error, or null when
     * the key is present and decodes to exactly 32 bytes (AES-256).
     */
    function google_validate_encryption_key(string $encoded): ?string
    {
        if ($encoded === '') {
            return 'Google encryption key is not configured.';
        }
        $decoded = base64_decode($encoded, true);
        if ($decoded === false || strlen($decoded) !== 32) {
            return 'Google encryption key must be a base64-encoded 32-byte value.';
        }
        return null;
    }
}

if (!function_exists('google_config_error')) {
    /**
     * A safe (secret-free) reason the provider is not usable, or null when it is.
     */
    function google_config_error(): ?string
    {
        $config = google_config();

        // In fake mode (local tests only) the provider is considered usable with
        // the encryption key alone: no real Google credentials are required and
        // no network call can occur.
        if (google_use_fake()) {
            return google_validate_encryption_key((string) $config['encryption_key']);
        }

        if ($config['client_id'] === '') {
            return 'Google client id is not configured.';
        }
        if ($config['client_secret'] === '') {
            return 'Google client secret is not configured.';
        }

        $keyError = google_validate_encryption_key((string) $config['encryption_key']);
        if ($keyError !== null) {
            return $keyError;
        }

        // The AES key must be a separate secret from the Google client secret.
        if (hash_equals((string) $config['client_secret'], (string) $config['encryption_key'])) {
            return 'Google encryption key must be distinct from the client secret.';
        }

        return null;
    }
}

if (!function_exists('google_configured')) {
    /**
     * The single gate every Google endpoint checks. Fails closed.
     */
    function google_configured(): bool
    {
        return google_config_error() === null;
    }
}

if (!function_exists('google_redirect_uri')) {
    /**
     * The exact redirect URI to register in the Google Cloud Console. Derived
     * from APP_URL (config/app.php) so it follows the host the API is reached on.
     * Requires config/app.php to have been included.
     */
    function google_redirect_uri(): string
    {
        $base = defined('APP_URL') ? rtrim((string) APP_URL, '/') : '';
        return $base . '/api/api/google-calendar/commands/callback.php';
    }
}
