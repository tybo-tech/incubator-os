<?php
declare(strict_types=1);

final class AnnualMonthData implements JsonSerializable
{
    public function __construct(
        public readonly ?float $sales = null,
        public readonly ?float $costOfSales = null,
        public readonly ?float $grossProfit = null,
        public readonly ?int $grossProfitPercentage = null,
        public readonly ?float $operatingExpenses = null,
        public readonly ?float $netProfit = null,
        public readonly ?int $netProfitPercentage = null,
        public readonly ?float $cash = null,
        public readonly ?float $cashEquivalents = null,
        public readonly ?float $shortTermInvestments = null,
        public readonly ?float $currentReceivables = null,
        public readonly ?float $totalCurrentAssets = null,
        public readonly ?float $totalAssets = null,
        public readonly ?float $totalCurrentLiabilities = null,
        public readonly ?float $totalLiabilities = null,
        public readonly ?float $totalEquity = null,
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'sales' => $this->sales,
            'costOfSales' => $this->costOfSales,
            'grossProfit' => $this->grossProfit,
            'grossProfitPercentage' => $this->grossProfitPercentage,
            'operatingExpenses' => $this->operatingExpenses,
            'netProfit' => $this->netProfit,
            'netProfitPercentage' => $this->netProfitPercentage,
            'cash' => $this->cash,
            'cashEquivalents' => $this->cashEquivalents,
            'shortTermInvestments' => $this->shortTermInvestments,
            'currentReceivables' => $this->currentReceivables,
            'totalCurrentAssets' => $this->totalCurrentAssets,
            'totalAssets' => $this->totalAssets,
            'totalCurrentLiabilities' => $this->totalCurrentLiabilities,
            'totalLiabilities' => $this->totalLiabilities,
            'totalEquity' => $this->totalEquity,
        ];
    }
}
