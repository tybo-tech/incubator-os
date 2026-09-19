<?php
declare(strict_types=1);

/**
 * Single place that maps capability exceptions to HTTP status + JSON body, so
 * every calendar endpoint returns the same shape.
 *
 * Validation errors are emitted structured (`errors` field) when the validator
 * provides a JSON payload, so the client can render field messages safely
 * without parsing a string.
 */
final class CalendarErrorResponder
{
    public static function respond(Throwable $e): void
    {
        if ($e instanceof CalendarValidationException) {
            http_response_code(422);
            self::emitValidation($e->getMessage());
            return;
        }
        if ($e instanceof CalendarForbiddenException) {
            http_response_code(403);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }
        if ($e instanceof CalendarNotFoundException) {
            http_response_code(404);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }
        if ($e instanceof CalendarConflictException) {
            http_response_code(409);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
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
