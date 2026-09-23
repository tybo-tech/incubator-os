<?php
declare(strict_types=1);

/**
 * The only logging seam in the Google Calendar capability (Sprint 010 Phase 1).
 *
 * Every diagnostic message is routed through `SecretRedactor`, so a careless
 * caller cannot leak a token, code or client secret into the log. Use this
 * instead of `error_log()` anywhere Google credentials are in scope.
 */
final class GoogleLog
{
    public static function warning(string $message, array $context = []): void
    {
        self::write('WARNING', $message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::write('ERROR', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::write('INFO', $message, $context);
    }

    /**
     * @param array<string,mixed> $context
     */
    private static function write(string $level, string $message, array $context): void
    {
        $safeMessage = SecretRedactor::redact($message);
        $safeContext = SecretRedactor::redactContext($context);

        $line = 'GoogleCalendar ' . $level . ': ' . $safeMessage;
        if ($safeContext) {
            $encoded = json_encode($safeContext);
            if ($encoded !== false) {
                $line .= ' ' . $encoded;
            }
        }

        error_log(SecretRedactor::redact($line));
    }
}
