<?php
declare(strict_types=1);

/**
 * Single place that maps Google capability exceptions to HTTP status + JSON body,
 * so every endpoint returns the same shape (mirrors `CalendarErrorResponder`).
 *
 * Security: messages emitted here are always secret-free. Exceptions raised by
 * this capability never embed tokens, authorization codes or client secrets;
 * the raw Google response body is never echoed to the client.
 */
final class GoogleErrorResponder
{
    public static function respond(Throwable $e): void
    {
        if ($e instanceof GoogleConfigurationException) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Google Calendar is not configured on this server.',
                'code' => 'GOOGLE_NOT_CONFIGURED',
            ]);
            return;
        }

        if ($e instanceof GoogleDecryptionException) {
            // A token could not be decrypted. Fail closed; do not reveal why.
            http_response_code(500);
            echo json_encode([
                'error' => 'Stored Google credentials could not be read. Please reconnect.',
                'code' => 'GOOGLE_TOKEN_UNREADABLE',
            ]);
            return;
        }

        if ($e instanceof GoogleApiException) {
            self::respondApi($e);
            return;
        }

        if ($e instanceof GoogleForbiddenException) {
            http_response_code(403);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }

        if ($e instanceof GoogleOAuthStateException || $e instanceof GoogleOAuthCallbackException) {
            http_response_code(422);
            echo json_encode([
                'error' => 'The Google authorisation request could not be verified. Please start again.',
                'code' => 'GOOGLE_OAUTH_STATE',
            ]);
            return;
        }

        if ($e instanceof GoogleAccountMismatchException) {
            http_response_code(409);
            echo json_encode([
                'error' => 'A different Google account was used while existing published mappings reference the previous account.',
                'code' => 'GOOGLE_ACCOUNT_MISMATCH',
            ]);
            return;
        }

        if ($e instanceof GoogleNotConnectedException) {
            // No usable connection: publishing is refused without contacting Google.
            http_response_code(409);
            echo json_encode([
                'error' => $e->getMessage(),
                'code' => 'GOOGLE_NOT_CONNECTED',
                'connectionStatus' => $e->connectionStatus(),
            ]);
            return;
        }

        if ($e instanceof GooglePublishInProgressException) {
            // A concurrent publish holds the lease; Google was not contacted.
            http_response_code(409);
            echo json_encode([
                'error' => $e->getMessage(),
                'code' => 'GOOGLE_PUBLISH_IN_PROGRESS',
            ]);
            return;
        }

        if ($e instanceof GoogleScopeException) {
            http_response_code(422);
            echo json_encode([
                'error' => 'The required Google Calendar permission was not granted.',
                'code' => 'GOOGLE_SCOPE_MISSING',
            ]);
            return;
        }

        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }

    private static function respondApi(GoogleApiException $e): void
    {
        $reason = $e->reason();

        // A revoked/expired refresh token cannot be recovered without the user
        // reconnecting, so surface it as 401 with a stable code.
        if ($e->requiresReconnect()) {
            http_response_code(401);
            echo json_encode([
                'error' => 'Google authorisation is no longer valid. Please reconnect your calendar.',
                'code' => 'GOOGLE_RECONNECT_REQUIRED',
            ]);
            return;
        }

        $status = match ($reason) {
            GoogleApiException::REASON_FORBIDDEN => 403,
            GoogleApiException::REASON_CONFLICT => 409,
            GoogleApiException::REASON_RATE_LIMITED => 429,
            default => 502,
        };

        http_response_code($status);
        echo json_encode([
            'error' => 'The Google Calendar request could not be completed.',
            'code' => 'GOOGLE_API_' . strtoupper($reason),
        ]);
    }
}
