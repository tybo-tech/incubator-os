<?php
declare(strict_types=1);

/**
 * Maps Session capability exceptions to HTTP status + JSON body.
 *
 * Status codes are chosen to match the calendar capability so a client sees one
 * consistent contract:
 *   Validation -> 422, Forbidden -> 403, NotFound -> 404, Conflict -> 409,
 *   State -> 409 (invalid lifecycle transition).
 *
 * A conflict/state exception may carry a machine-readable `code` (e.g.
 * `SESSION_LINKED`, `SESSION_INVALID_TRANSITION`) which is emitted alongside
 * `error` so callers can branch without string matching. The code is encoded in
 * the message as `CODE: human message` by convention (see the service layer).
 */
final class SessionErrorResponder
{
    public static function respond(Throwable $e): void
    {
        // The Sessions capability reuses the Calendar resolver/writer, which throw
        // Calendar exceptions. Translate them to the same status codes so a caller
        // sees one consistent contract (not a generic 400).
        if ($e instanceof CalendarNotFoundException) {
            http_response_code(404);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }
        if ($e instanceof CalendarForbiddenException) {
            http_response_code(403);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }
        if ($e instanceof CalendarValidationException) {
            http_response_code(422);
            self::emitValidation($e->getMessage());
            return;
        }

        if ($e instanceof SessionValidationException) {
            http_response_code(422);
            self::emitValidation($e->getMessage());
            return;
        }
        if ($e instanceof SessionForbiddenException) {
            http_response_code(403);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }
        if ($e instanceof SessionNotFoundException) {
            http_response_code(404);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }
        if ($e instanceof SessionStateException || $e instanceof SessionConflictException) {
            http_response_code(409);
            echo json_encode(self::conflictBody($e->getMessage()));
            return;
        }
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }

    /**
     * @return array<string,string>
     */
    private static function conflictBody(string $message): array
    {
        $body = ['error' => $message];
        $code = self::extractCode($message);
        if ($code !== null) {
            $body['code'] = $code;
        }
        return $body;
    }

    /** `SESSION_LINKED: message` -> `SESSION_LINKED`. */
    private static function extractCode(string $message): ?string
    {
        if (preg_match('/^([A-Z][A-Z0-9_]+):\s/', $message, $m) === 1) {
            return $m[1];
        }
        return null;
    }

    private static function emitValidation(string $message): void
    {
        $decoded = json_decode($message, true);
        if (is_array($decoded)) {
            echo json_encode(['error' => 'Validation failed', 'errors' => $decoded]);
            return;
        }
        echo json_encode(['error' => $message]);
    }
}
