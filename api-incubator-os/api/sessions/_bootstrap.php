<?php
declare(strict_types=1);

/**
 * Shared bootstrap for the Sessions endpoints.
 *
 * Sessions reuse the Calendar capability's resolver, writer, validator and access
 * policy, so the calendar contract (all-day vs timed, canonical entity names,
 * company scoping) is defined once and cannot drift between the two capabilities.
 *
 * Include order mirrors the calendar endpoints: config -> transaction -> auth
 * (auto-starts the session) -> calendar capability -> sessions capability.
 */

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../helpers/AuthGuard.php';

// --- Calendar capability (reused, not duplicated) ---
include_once '../../../capabilities/calendar/Contracts/CalendarExceptions.php';
include_once '../../../capabilities/calendar/Contracts/CalendarErrorResponder.php';
include_once '../../../capabilities/calendar/Contracts/CalendarSessionGuard.php';
include_once '../../../capabilities/calendar/Contracts/CalendarCategory.php';
include_once '../../../capabilities/calendar/Contracts/CalendarStatus.php';
include_once '../../../capabilities/calendar/Contracts/CalendarLinkEntityType.php';
include_once '../../../capabilities/calendar/Contracts/CalendarEventLinkRef.php';
include_once '../../../capabilities/calendar/Contracts/CalendarEventResponse.php';
include_once '../../../capabilities/calendar/Contracts/CalendarEventRequest.php';
include_once '../../../capabilities/calendar/Contracts/CalendarEventMapper.php';
include_once '../../../capabilities/calendar/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/calendar/Services/CalendarValidator.php';
include_once '../../../capabilities/calendar/Services/CalendarAccessPolicy.php';
include_once '../../../capabilities/calendar/Services/CalendarEventWriter.php';
include_once '../../../capabilities/calendar/Repository/CalendarEventRepository.php';
include_once '../../../capabilities/calendar/Repository/CalendarLinkResolver.php';

// --- Sessions capability ---
include_once '../../../capabilities/sessions/Contracts/SessionExceptions.php';
include_once '../../../capabilities/sessions/Contracts/SessionErrorResponder.php';
include_once '../../../capabilities/sessions/Contracts/SessionVocabulary.php';
include_once '../../../capabilities/sessions/Contracts/SessionResponse.php';
include_once '../../../capabilities/sessions/Contracts/SessionSummary.php';
include_once '../../../capabilities/sessions/Contracts/SessionRequest.php';
include_once '../../../capabilities/sessions/Contracts/SessionMapper.php';
include_once '../../../capabilities/sessions/Services/SessionAccessPolicy.php';
include_once '../../../capabilities/sessions/Services/SessionStateMachine.php';
include_once '../../../capabilities/sessions/Services/SessionValidator.php';
include_once '../../../capabilities/sessions/Services/SessionCalendarGateway.php';
include_once '../../../capabilities/sessions/Repository/SessionRepository.php';
include_once '../../../capabilities/sessions/Repository/SessionBriefReadModel.php';

// --- Application (queries + commands) ---
include_once '../../../capabilities/sessions/Application/Queries/ListCompanySessions.php';
include_once '../../../capabilities/sessions/Application/Queries/ListUpcomingSessions.php';
include_once '../../../capabilities/sessions/Application/Queries/GetSession.php';
include_once '../../../capabilities/sessions/Application/Queries/GetSessionBrief.php';
include_once '../../../capabilities/sessions/Application/Queries/ListSessionBacklinks.php';
include_once '../../../capabilities/sessions/Application/Queries/ListEligibleEvents.php';
include_once '../../../capabilities/sessions/Application/Commands/CreateSession.php';
include_once '../../../capabilities/sessions/Application/Commands/ConvertCalendarEventToSession.php';
include_once '../../../capabilities/sessions/Application/Commands/UpdateSession.php';
include_once '../../../capabilities/sessions/Application/Commands/ManageSessionAgenda.php';
include_once '../../../capabilities/sessions/Application/Commands/ManageSessionNotes.php';
include_once '../../../capabilities/sessions/Application/Commands/ManageSessionDecisions.php';
include_once '../../../capabilities/sessions/Application/Commands/ManageSessionLinks.php';
include_once '../../../capabilities/sessions/Application/Commands/ManageSessionParticipants.php';
include_once '../../../capabilities/sessions/Application/Commands/StartSession.php';
include_once '../../../capabilities/sessions/Application/Commands/CompleteSession.php';
include_once '../../../capabilities/sessions/Application/Commands/CancelSession.php';

/**
 * Reads the JSON request body as an array (empty array when absent/invalid).
 *
 * @return array<string,mixed>
 */
function sessions_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Validates the required action parameter for a sub-resource command.
 */
function sessions_require_action(): string
{
    $action = trim((string)($_GET['action'] ?? ''));
    if ($action === '') {
        http_response_code(422);
        echo json_encode(['error' => 'An action is required.', 'errors' => ['action' => 'An action is required.']]);
        exit;
    }
    return $action;
}
