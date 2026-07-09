<?php
declare(strict_types=1);

final class FinancialIndicatorCalculator
{
    public function grossProfit(float $sales, float $costOfSales): float
    {
        return $sales - $costOfSales;
    }

    public function grossProfitPercentage(float $sales, float $costOfSales): ?int
    {
        if ($sales <= 0) return null;
        $gp = $this->grossProfit($sales, $costOfSales);
        return (int)round(($gp / $sales) * 100);
    }

    public function netProfit(float $sales, float $costOfSales, float $operatingExpenses): float
    {
        return $this->grossProfit($sales, $costOfSales) - $operatingExpenses;
    }

    public function netProfitPercentage(float $sales, float $costOfSales, float $operatingExpenses): ?int
    {
        if ($sales <= 0) return null;
        $np = $this->netProfit($sales, $costOfSales, $operatingExpenses);
        return (int)round(($np / $sales) * 100);
    }

    public function calculateAll(float $sales, float $costOfSales, float $operatingExpenses): array
    {
        $gp = $this->grossProfit($sales, $costOfSales);
        $np = $this->netProfit($sales, $costOfSales, $operatingExpenses);
        return [
            'grossProfit' => $gp,
            'grossProfitPercentage' => $this->grossProfitPercentage($sales, $costOfSales),
            'netProfit' => $np,
            'netProfitPercentage' => $this->netProfitPercentage($sales, $costOfSales, $operatingExpenses),
        ];
    }
}
