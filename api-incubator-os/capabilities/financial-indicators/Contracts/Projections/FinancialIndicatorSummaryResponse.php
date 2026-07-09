<?php
declare(strict_types=1);

final class FinancialIndicatorSummaryResponse implements JsonSerializable
{
    public function __construct(
        public readonly ?int $latestMonth = null,
        public readonly ?int $latestFinancialYear = null,
        public readonly ?float $latestNetProfit = null,
        public readonly ?float $latestGrossProfit = null,
        public readonly ?float $latestSales = null,
        public readonly ?float $latestExpenses = null,
        public readonly ?float $grossMargin = null,
        public readonly ?float $netMargin = null,
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'latestMonth' => $this->latestMonth,
            'latestFinancialYear' => $this->latestFinancialYear,
            'latestNetProfit' => $this->latestNetProfit,
            'latestGrossProfit' => $this->latestGrossProfit,
            'latestSales' => $this->latestSales,
            'latestExpenses' => $this->latestExpenses,
            'grossMargin' => $this->grossMargin,
            'netMargin' => $this->netMargin,
        ];
    }
}
