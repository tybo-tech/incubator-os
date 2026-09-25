<?php
declare(strict_types=1);

/**
 * Set or clear a report sign-off: set | clear.
 *
 * Sign-offs are only editable while the report is a draft; the issued version
 * stamp is applied by the issue command.
 */
final class ManageVisitSignoff
{
    public function __construct(
        private VisitReportService $visits,
        private TransactionManager $tx,
    ) {}

    /**
     * @param array<string,mixed> $payload
     */
    public function execute(int $sessionId, string $action, array $payload): CommandResult
    {
        return $this->tx->execute(fn(): CommandResult => new CommandResult(
            success: true,
            message: 'Visit sign-off updated',
            data: $this->visits->manageSignoff($sessionId, $action, $payload),
        ));
    }
}
