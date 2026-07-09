<?php
declare(strict_types=1);

final class FinancialIndicatorResponse implements JsonSerializable
{
    public function __construct(
        public readonly int $id,
        public readonly int $companyId,
        public readonly ?int $parentId,
        public readonly array $data,
        public readonly string $createdAt,
        public readonly string $updatedAt,
        public readonly ?int $createdBy,
        public readonly ?int $updatedBy,
        public readonly ?float $grossProfit = null,
        public readonly ?float $grossProfitPercentage = null,
        public readonly ?float $netProfit = null,
        public readonly ?float $netProfitPercentage = null,
    ) {}

    public static function fromNode(array $node, ?FinancialIndicatorCalculator $calc = null): self
    {
        $data = json_decode(json_encode($node['data']), true) ?? [];
        $meta = $data['meta'] ?? [];
        $income = $data['income_statement'] ?? [];
        $balance = $data['balance_sheet'] ?? [];

        $sales = (float)($income['sales'] ?? 0);
        $costOfSales = (float)($income['cost_of_sales'] ?? 0);
        $operatingExpenses = (float)($income['operating_expenses'] ?? 0);

        $gp = null;
        $gpp = null;
        $np = null;
        $npp = null;

        if ($calc) {
            $gp = $calc->grossProfit($sales, $costOfSales);
            $gpp = $calc->grossProfitPercentage($sales, $costOfSales);
            $np = $calc->netProfit($sales, $costOfSales, $operatingExpenses);
            $npp = $calc->netProfitPercentage($sales, $costOfSales, $operatingExpenses);
        }

        return new self(
            id: (int)$node['id'],
            companyId: (int)$node['company_id'],
            parentId: $node['parent_id'] !== null ? (int)$node['parent_id'] : null,
            data: $data,
            createdAt: $node['created_at'],
            updatedAt: $node['updated_at'],
            createdBy: $node['created_by'] !== null ? (int)$node['created_by'] : null,
            updatedBy: $node['updated_by'] !== null ? (int)$node['updated_by'] : null,
            grossProfit: $gp,
            grossProfitPercentage: $gpp,
            netProfit: $np,
            netProfitPercentage: $npp,
        );
    }

    public function jsonSerialize(): mixed
    {
        $out = [
            'id' => $this->id,
            'companyId' => $this->companyId,
            'parentId' => $this->parentId,
            'data' => $this->data,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
            'createdBy' => $this->createdBy,
            'updatedBy' => $this->updatedBy,
        ];
        if ($this->grossProfit !== null) {
            $out['grossProfit'] = $this->grossProfit;
            $out['grossProfitPercentage'] = $this->grossProfitPercentage;
            $out['netProfit'] = $this->netProfit;
            $out['netProfitPercentage'] = $this->netProfitPercentage;
        }
        return $out;
    }
}
