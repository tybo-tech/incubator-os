<?php
declare(strict_types=1);

final class FinancialIndicatorRepository
{
    private const MONTH_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2];

    public function __construct(private PDO $conn) {}

    public function create(int $companyId, array $data, ?int $createdBy = null): array
    {
        $stmt = $this->conn->prepare("
            INSERT INTO nodes (type, company_id, data, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            'financial_indicators',
            $companyId,
            json_encode($data),
            $createdBy,
            $createdBy,
        ]);
        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $data, ?int $updatedBy = null): ?array
    {
        $stmt = $this->conn->prepare("
            UPDATE nodes SET data = ?, updated_by = ?, updated_at = NOW()
            WHERE id = ? AND type = 'financial_indicators'
        ");
        $stmt->execute([json_encode($data), $updatedBy, $id]);
        return $this->getById($id);
    }

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM nodes WHERE id = ? AND type = 'financial_indicators'
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['data'] = json_decode($row['data'], true) ?? [];
        return $row;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("
            DELETE FROM nodes WHERE id = ? AND type = 'financial_indicators'
        ");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function listByCompany(int $companyId): array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM nodes
            WHERE company_id = ? AND type = 'financial_indicators'
            ORDER BY created_at DESC
        ");
        $stmt->execute([$companyId]);
        $rows = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $r['data'] = json_decode($r['data'], true) ?? [];
            $rows[] = $r;
        }
        return $rows;
    }

    public function findByMonth(int $companyId, int $financialYear, int $month): ?array
    {
        $nodes = $this->listByCompany($companyId);
        foreach ($nodes as $node) {
            $meta = $node['data']['meta'] ?? [];
            if ((int)($meta['financial_year'] ?? 0) === $financialYear && (int)($meta['month'] ?? 0) === $month) {
                return $node;
            }
        }
        return null;
    }

    public function getAnnual(int $companyId, int $year): array
    {
        $nodes = $this->listByCompany($companyId);
        $monthly = [];

        foreach ($nodes as $node) {
            $meta = $node['data']['meta'] ?? [];
            $fy = (int)($meta['financial_year'] ?? 0);
            $month = (int)($meta['month'] ?? 0);

            if ($fy !== $year) continue;

            $income = $node['data']['income_statement'] ?? [];
            $balance = $node['data']['balance_sheet'] ?? [];
            $sales = (float)($income['sales'] ?? 0);
            $costOfSales = (float)($income['cost_of_sales'] ?? 0);
            $operatingExpenses = (float)($income['operating_expenses'] ?? 0);

            $calc = new FinancialIndicatorCalculator();
            $gp = $calc->grossProfit($sales, $costOfSales);
            $gpp = $calc->grossProfitPercentage($sales, $costOfSales);
            $np = $calc->netProfit($sales, $costOfSales, $operatingExpenses);
            $npp = $calc->netProfitPercentage($sales, $costOfSales, $operatingExpenses);

            $monthly[$month] = new AnnualMonthData(
                sales: $sales,
                costOfSales: $costOfSales,
                grossProfit: $gp,
                grossProfitPercentage: $gpp,
                operatingExpenses: $operatingExpenses,
                netProfit: $np,
                netProfitPercentage: $npp,
                cash: (float)($balance['cash'] ?? 0),
                cashEquivalents: (float)($balance['cash_equivalents'] ?? 0),
                shortTermInvestments: (float)($balance['short_term_investments'] ?? 0),
                currentReceivables: (float)($balance['current_receivables'] ?? 0),
                totalCurrentAssets: (float)($balance['total_current_assets'] ?? 0),
                totalAssets: (float)($balance['total_assets'] ?? 0),
                totalCurrentLiabilities: (float)($balance['total_current_liabilities'] ?? 0),
                totalLiabilities: (float)($balance['total_liabilities'] ?? 0),
                totalEquity: (float)($balance['total_equity'] ?? 0),
            );
        }

        return $monthly;
    }

    public function getLatest(int $companyId): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM nodes
            WHERE company_id = ? AND type = 'financial_indicators'
            ORDER BY created_at DESC
            LIMIT 1
        ");
        $stmt->execute([$companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['data'] = json_decode($row['data'], true) ?? [];
        return $row;
    }
}
