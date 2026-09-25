<?php
declare(strict_types=1);

/**
 * Upsert the draft visit-report header (creates the report on first save).
 *
 * The whole sub-resource is returned in the `CommandResult` envelope so the
 * editor can re-render from one response.
 */
final class SaveVisitReport
{
    public function __construct(
        private VisitReportService $visits,
        private TransactionManager $tx,
    ) {}

    /**
     * @param array<string,mixed> $payload
     */
    public function execute(int $sessionId, array $payload): CommandResult
    {
        return $this->tx->execute(fn(): CommandResult => new CommandResult(
            success: true,
            message: 'Visit report saved',
            data: $this->visits->saveHeader($sessionId, $payload),
        ));
    }
}
