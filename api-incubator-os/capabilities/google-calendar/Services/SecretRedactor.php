<?php
declare(strict_types=1);

/**
 * Redacts secrets from any string before it is logged (Sprint 010 Phase 1).
 *
 * Guardrail: access tokens, refresh tokens, authorization codes, client secrets
 * and decrypted payloads must never reach a log. Nothing in the capability logs
 * raw remote bodies or credential values; when a diagnostic message must include
 * a value, it is passed through here first.
 *
 * Two layers of defence:
 *   1. Pattern matching for the well-known Google credential formats.
 *   2. A registry of exact runtime secrets (`register()`) so values are redacted
 *      even if their format changes.
 */
final class SecretRedactor
{
    private const PLACEHOLDER = '[redacted]';

    /** @var string[] */
    private static array $registered = [];

    /** Patterns for credential material that must never be logged. */
    private const PATTERNS = [
        // Google OAuth access token: "ya29.<long opaque string>"
        '/ya29\.[A-Za-z0-9_\-\.]+/',
        // Google OAuth refresh token: "1//<opaque>"
        '/1\/\/[A-Za-z0-9_\-]+/',
        // Google OAuth authorization code: "4/<opaque>"
        '/\b4\/[A-Za-z0-9_\-\.]+/',
        // Google OAuth client secret: "GOCSPX-<opaque>"
        '/GOCSPX-[A-Za-z0-9_\-]+/',
        // Any JSON/query assignment of a credential-ish key.
        '/(?i)("?(?:access_token|refresh_token|id_token|client_secret|authorization_code|code)"?\s*[:=]\s*"?)[^"&,\s}]+/',
    ];

    /**
     * Register an exact secret value (e.g. the current client secret) so it is
     * stripped even if its format is not covered by a pattern.
     */
    public static function register(?string $secret): void
    {
        if ($secret === null || $secret === '') {
            return;
        }
        if (!in_array($secret, self::$registered, true)) {
            self::$registered[] = $secret;
        }
    }

    /** Clear the registry (used between tests). */
    public static function reset(): void
    {
        self::$registered = [];
    }

    public static function redact(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        foreach (self::$registered as $secret) {
            if ($secret !== '') {
                $text = str_replace($secret, self::PLACEHOLDER, $text);
            }
        }

        foreach (self::PATTERNS as $pattern) {
            $text = preg_replace($pattern, '$1' . self::PLACEHOLDER, $text) ?? $text;
        }

        // Collapse an accidental repeat of the placeholder.
        return str_replace(self::PLACEHOLDER . self::PLACEHOLDER, self::PLACEHOLDER, $text);
    }

    /**
     * Recursively redact array context values (for structured log lines).
     *
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    public static function redactContext(array $context): array
    {
        $out = [];
        foreach ($context as $key => $value) {
            if (is_array($value)) {
                $out[$key] = self::redactContext($value);
            } elseif (is_string($value)) {
                $out[$key] = self::redact($value);
            } else {
                $out[$key] = $value;
            }
        }
        return $out;
    }
}
