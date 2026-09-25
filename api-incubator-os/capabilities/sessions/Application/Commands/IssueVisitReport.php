<?php
declare(strict_types=1);

/**
 * Issue a visit report: draft -> issued.
 *
 * The transaction is the critical section: the immutable snapshot version, the
 * sign-off version stamp and the guarded status transition commit together, so
 * an issued report can never exist without its snapshot (and a failed issue
 * leaves no orphan version row).
 */
final class IssueVisitReport
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
            message: 'Visit report issued',
            data: $this->visits->issue($sessionId, $payload),
        ));
    }
}
