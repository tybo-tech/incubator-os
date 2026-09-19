<?php
declare(strict_types=1);

/**
 * GET calendar events for a bounded date range.
 *
 * Required: start, end (YYYY-MM-DD).
 * Optional: company_id, category, status, search, assignee_user_id.
 *
 * The actor is resolved from the session; range is always bounded so a client
 * can never request the whole table.
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
include_once '../../../capabilities/calendar/Application/Queries/ListCalendarEvents.php';

$start = trim((string)($_GET['start'] ?? ''));
$end = trim((string)($_GET['end'] ?? ''));

try {
    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $companyId = isset($_GET['company_id']) && $_GET['company_id'] !== ''
        ? (int)$_GET['company_id']
        : null;

    $result = (new ListCalendarEvents(
        new CalendarEventRepository($db),
        new CalendarAccessPolicy($actor),
    ))->execute(
        startDate: $start,
        endDate: $end,
        companyId: $companyId,
        category: isset($_GET['category']) && $_GET['category'] !== '' ? (string)$_GET['category'] : null,
        status: isset($_GET['status']) && $_GET['status'] !== '' ? (string)$_GET['status'] : null,
        search: isset($_GET['search']) && $_GET['search'] !== '' ? (string)$_GET['search'] : null,
        assigneeUserId: isset($_GET['assignee_user_id']) && $_GET['assignee_user_id'] !== ''
            ? (int)$_GET['assignee_user_id']
            : null,
    );

    echo json_encode($result);
} catch (Throwable $e) {
    CalendarErrorResponder::respond($e);
}
