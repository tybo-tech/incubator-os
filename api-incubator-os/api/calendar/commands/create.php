<?php
declare(strict_types=1);

/**
 * POST create a calendar event.
 *
 * Actor, tenant and accessible-company scope are server-derived. `client_token`
 * makes a retried request idempotent.
 */

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../helpers/AuthGuard.php';
include_once '../../../capabilities/calendar/Contracts/CalendarExceptions.php';
include_once '../../../capabilities/calendar/Contracts/CalendarErrorResponder.php';
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
include_once '../../../capabilities/calendar/Application/Commands/CreateCalendarEvent.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Request body is required']);
    exit;
}

try {
    $db = (new Database())->connect();
    $actor = auth_require_user($db);
    $policy = new CalendarAccessPolicy($actor);
    $repo = new CalendarEventRepository($db);
    $validator = new CalendarValidator();

    $request = CalendarEventRequest::fromArray($input);

    $result = (new CreateCalendarEvent(
        $repo,
        new CalendarEventWriter(new CalendarLinkResolver($db), $validator),
        $validator,
        $policy,
        new TransactionManager($db),
    ))->execute($request);

    http_response_code(201);
    echo json_encode($result);
} catch (Throwable $e) {
    CalendarErrorResponder::respond($e);
}
