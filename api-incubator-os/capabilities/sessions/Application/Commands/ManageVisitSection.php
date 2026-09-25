<?php
declare(strict_types=1);

/**
 * Manage one report section: add | update | reorder | delete.
 *
 * `section` comes from the query string and is validated by the service.
 */
final class ManageVisitSection
{
    public function __construct(
        private VisitReportService $visits,
        private TransactionManager $tx,
    ) {}

    /**
     * @param array<string,mixed> $payload
     */
    public function execute(int $sessionId, string $action, string $section, array $payload): CommandResult
    {
        return $this->tx->execute(fn(): CommandResult => new CommandResult(
            success: true,
            message: 'Visit section updated',
            data: $this->visits->manageSection($sessionId, $action, $section, $payload),
        ));
    }
}
