<?php
declare(strict_types=1);

final class FinancialIndicatorSummary implements JsonSerializable
{
    public function __construct(
        public readonly int $id,
        public readonly int $financialYear,
        public readonly int $month,
        public readonly ?float $netProfit,
        public readonly ?float $grossProfit,
        public readonly string $status,
        public readonly string $createdAt,
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'financialYear' => $this->financialYear,
            'month' => $this->month,
            'netProfit' => $this->netProfit,
            'grossProfit' => $this->grossProfit,
            'status' => $this->status,
            'createdAt' => $this->createdAt,
        ];
    }
}
