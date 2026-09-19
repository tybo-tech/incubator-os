<?php
declare(strict_types=1);

/**
 * GET one calendar event by id. Authorization is repeated here.
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
include_once '../../../capabilities/calendar/Services/CalendarValidator.php';
include_once '../../../capabilities/calendar/Services/CalendarAccessPolicy.php';
include_once '../../../capabilities/calendar/Repository/CalendarEventRepository.php';
include_once '../../../capabilities/calendar/Repository/CalendarLinkResolver.php';
include_once '../../../capabilities/calendar/Application/Queries/GetCalendarEvent.php';

$id = (int)($_GET['id'] ?? 0);

try {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'id is required']);
        exit;
    }

    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $result = (new GetCalendarEvent(
        new CalendarEventRepository($db),
        new CalendarAccessPolicy($actor),
    ))->execute($id);

    echo json_encode($result);
} catch (CalendarNotFoundException $e) {
    http_response_code(404);
    echo json_encode(['error' => $e->getMessage()]);
} catch (CalendarForbiddenException $e) {
    http_response_code(403);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
