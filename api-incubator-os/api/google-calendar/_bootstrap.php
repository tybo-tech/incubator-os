<?php
declare(strict_types=1);

/**
 * Shared bootstrap for the Google Calendar endpoints (Sprint 010 Phase 2).
 *
 * Include order follows the repository convention:
 *   config/Database.php -> TransactionManager -> AuthGuard -> capability -> handlers
 *
 * Nothing here contacts Google. The transport is chosen by
 * `GoogleApiClientFactory` (fake under GOOGLE_FAKE / config use_fake).
 */

include_once __DIR__ . '/../../config/Database.php';
include_once __DIR__ . '/../../config/app.php';
include_once __DIR__ . '/../../config/google.php';
include_once __DIR__ . '/../../core/Infrastructure/TransactionManager.php';
include_once __DIR__ . '/../../helpers/AuthGuard.php';

include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleExceptions.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleScopes.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleOAuthResult.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/EncryptedPayload.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleTokenSet.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleEventRef.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleConnectionResponse.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleEventSyncResponse.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleApiClient.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleApiClientFactory.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Contracts/GoogleErrorResponder.php';

// The Calendar capability declares the hook interface; the Google capability
// implements it. The interface MUST load before GoogleCancelHook.
include_once __DIR__ . '/../../capabilities/calendar/Contracts/GoogleEventSyncHook.php';

include_once __DIR__ . '/../../capabilities/google-calendar/Services/SecretRedactor.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/GoogleLog.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/GoogleApiErrorMapper.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/TokenCipher.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/CurlGoogleApiClient.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/FakeGoogleApiClient.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/ReturnPathValidator.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/GoogleAccessPolicy.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/OAuthService.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/GoogleEventMapper.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/GoogleSessionContext.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/GoogleAttendeeResolver.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/GoogleEventSyncService.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Services/GoogleCancelHook.php';

include_once __DIR__ . '/../../capabilities/google-calendar/Repository/GoogleOAuthStateRepository.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Repository/GoogleConnectionRepository.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Repository/GoogleEventSyncRepository.php';

include_once __DIR__ . '/../../capabilities/google-calendar/Application/Commands/PublishCalendarEventToGoogle.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Application/Commands/SyncCalendarEventToGoogle.php';
include_once __DIR__ . '/../../capabilities/google-calendar/Application/Commands/UnpublishCalendarEventFromGoogle.php';

/**
 * Decode a JSON request body into an array (never throws).
 *
 * @return array<string,mixed>
 */
function google_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Gate every endpoint on the provider being usable. Emits 503 and exits.
 */
function google_require_configured(): void
{
    if (!google_configured()) {
        http_response_code(503);
        echo json_encode([
            'error' => 'Google Calendar is not configured on this server.',
            'code' => 'GOOGLE_NOT_CONFIGURED',
        ]);
        exit;
    }
}

/**
 * Map an OAuth result code + validated path to a safe browser redirect.
 *
 * Security: the query string contains a RESULT CODE and a PATH ONLY. No token,
 * code, raw Google error or other secret is ever placed in the URL.
 */
function google_oauth_redirect(string $result, string $returnPath): void
{
    if (!GoogleOAuthResult::isValid($result)) {
        $result = GoogleOAuthResult::FAILED;
    }
    $path = ReturnPathValidator::sanitize($returnPath);

    $separator = str_contains($path, '?') ? '&' : '?';
    $location = $path . $separator . 'google=' . rawurlencode($result);

    header('Location: ' . $location, true, 302);
    exit;
}
