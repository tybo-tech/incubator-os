<?php
declare(strict_types=1);

final class FinancialSummary
{
    public function __construct(
        public readonly float $totalRevenue,
        public readonly int $fyCount,
        public readonly ?string $latestFy,
        public readonly int $activeMonths,
        public readonly int $capturedMonths,
    ) {}
}