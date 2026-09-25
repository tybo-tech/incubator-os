<?php
declare(strict_types=1);

/**
 * Acknowledge an issued visit report: issued -> acknowledged.
 *
 * Bound to the exact issued version: if the caller names a version that no
 * longer matches `current_version`, the acknowledgement is refused.
 */
final class AcknowledgeVisitReport
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
            message: 'Visit report acknowledged',
            data: $this->visits->acknowledge($sessionId, $payload),
        ));
    }
}
