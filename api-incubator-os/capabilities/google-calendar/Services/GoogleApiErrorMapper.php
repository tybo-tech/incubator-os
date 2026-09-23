<?php
declare(strict_types=1);

/**
 * Maps an HTTP status / transport failure to a `GoogleApiException` with a stable
 * reason code (Sprint 010 Phase 1).
 *
 * Kept separate from the cURL transport so the classification is unit-testable
 * and identical for any transport.
 */
final class GoogleApiErrorMapper
{
    /**
     * @param int    $status HTTP status code, or 0 for a transport failure.
     * @param string $body   Raw response body (used only to read the Google error
     *                       reason; never logged verbatim, never returned to the client).
     */
    public static function fromResponse(int $status, string $body): GoogleApiException
    {
        $googleReason = self::extractReason($body);

        // Google reports a revoked/expired refresh token as 400 + invalid_grant.
        if ($status === 400 && $googleReason === 'invalid_grant') {
            return new GoogleApiException('Google authorisation is no longer valid.', GoogleApiException::REASON_INVALID_GRANT, $status);
        }

        return match (true) {
            $status === 401 => new GoogleApiException('Google rejected the request (unauthorised).', GoogleApiException::REASON_UNAUTHORIZED, $status),
            $status === 403 => self::forbidden($googleReason, $status),
            $status === 404 => new GoogleApiException('The Google resource was not found.', GoogleApiException::REASON_NOT_FOUND, $status),
            $status === 409 => self::conflictOrDuplicate($googleReason, $status),
            $status === 412 => new GoogleApiException('The Google event changed since it was last synced.', GoogleApiException::REASON_CONFLICT, $status),
            $status === 429 => new GoogleApiException('Google rate limit reached.', GoogleApiException::REASON_RATE_LIMITED, $status),
            $status >= 500 => new GoogleApiException('Google returned a server error.', GoogleApiException::REASON_SERVER_ERROR, $status),
            default => new GoogleApiException('Google rejected the request.', GoogleApiException::REASON_NETWORK, $status),
        };
    }

    /**
     * A 409 on INSERT with our deterministic id means the event already exists —
     * that is the idempotent-recovery signal, not a generic conflict. A 409 on a
     * PATCH stays a conflict.
     */
    private static function conflictOrDuplicate(string $googleReason, int $status): GoogleApiException
    {
        if ($googleReason === 'duplicate' || $googleReason === 'alreadyExists') {
            return new GoogleApiException('A Google event with this id already exists.', GoogleApiException::REASON_DUPLICATE, $status);
        }
        return new GoogleApiException('The Google resource was modified by someone else.', GoogleApiException::REASON_CONFLICT, $status);
    }

    public static function malformed(): GoogleApiException
    {
        return new GoogleApiException('Google returned a malformed response.', GoogleApiException::REASON_MALFORMED, 0);
    }

    public static function timeout(): GoogleApiException
    {
        return new GoogleApiException('The Google request timed out.', GoogleApiException::REASON_TIMEOUT, 0);
    }

    public static function network(): GoogleApiException
    {
        return new GoogleApiException('The Google request could not be sent.', GoogleApiException::REASON_NETWORK, 0);
    }

    private static function forbidden(string $googleReason, int $status): GoogleApiException
    {
        // A scope/consent problem that only the user can resolve reads as a
        // reconnect, not a hard 403.
        if ($googleReason === 'insufficientPermissions' || $googleReason === 'forbidden') {
            return new GoogleApiException('Google authorisation is no longer valid.', GoogleApiException::REASON_INVALID_GRANT, $status);
        }
        return new GoogleApiException('Google denied access to the resource.', GoogleApiException::REASON_FORBIDDEN, $status);
    }

    /**
     * Extract the Google `error` reason without exposing the rest of the body.
     * Handles both {"error":"invalid_grant"} and
     * {"error":{"status":"...","errors":[{"reason":"..."}]}}.
     */
    private static function extractReason(string $body): string
    {
        if ($body === '') {
            return '';
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded) || !isset($decoded['error'])) {
            return '';
        }
        $error = $decoded['error'];
        if (is_string($error)) {
            return $error;
        }
        if (is_array($error)) {
            if (isset($error['errors'][0]['reason']) && is_string($error['errors'][0]['reason'])) {
                return $error['errors'][0]['reason'];
            }
            if (isset($error['status']) && is_string($error['status'])) {
                return $error['status'];
            }
        }
        return '';
    }
}
