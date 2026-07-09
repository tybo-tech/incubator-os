<?php
declare(strict_types=1);

final class CompanyRepository
{
    public function __construct(private PDO $conn) {}

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM companies WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function update(int $id, array $data): ?array
    {
        $fields = $this->filterWritable($data);
        if (!$fields) return $this->getById($id);

        $sets = [];
        $params = [];
        foreach ($fields as $k => $v) {
            $sets[] = "{$k} = ?";
            $params[] = $v;
        }
        $params[] = $id;

        $sql = "UPDATE companies SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    public function getFinancialSummary(int $companyId): ?FinancialSummary
    {
        $stmt = $this->conn->prepare("
            SELECT
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(DISTINCT financial_year_id) as fy_count,
                MAX(financial_year_id) as latest_fy_id
            FROM company_financial_yearly_stats
            WHERE company_id = ?
        ");
        $stmt->execute([$companyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || (float)$row['total_revenue'] === 0.0 && (int)$row['fy_count'] === 0) {
            return null;
        }

        $latestFyName = null;
        if ($row['latest_fy_id']) {
            $fyStmt = $this->conn->prepare("SELECT name FROM financial_years WHERE id = ?");
            $fyStmt->execute([(int)$row['latest_fy_id']]);
            $latestFyName = $fyStmt->fetchColumn() ?: null;
        }

        $activeMonths = 0;
        $capturedMonths = 0;
        $monthStmt = $this->conn->prepare("
            SELECT
                COUNT(*) as total_rows,
                SUM(CASE WHEN m1 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m2 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m3 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m4 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m5 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m6 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m7 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m8 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m9 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m10 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m11 > 0 THEN 1 ELSE 0 END) +
                SUM(CASE WHEN m12 > 0 THEN 1 ELSE 0 END) as captured_months
            FROM company_financial_yearly_stats
            WHERE company_id = ?
        ");
        $monthStmt->execute([$companyId]);
        $monthRow = $monthStmt->fetch(PDO::FETCH_ASSOC);
        if ($monthRow) {
            $capturedMonths = (int)$monthRow['captured_months'];
            $activeMonths = (int)$monthRow['total_rows'] * 12;
        }

        return new FinancialSummary(
            totalRevenue: (float)$row['total_revenue'],
            fyCount: (int)$row['fy_count'],
            latestFy: $latestFyName,
            activeMonths: $activeMonths,
            capturedMonths: $capturedMonths,
        );
    }

    private const WRITABLE = [
        'name','registration_no','bbbee_level','cipc_status',
        'service_offering','description','city','suburb','address','postal_code',
        'business_location','contact_number','email_address','trading_name',
        'youth_owned','black_ownership','black_women_ownership',
        'youth_owned_text','black_ownership_text','black_women_ownership_text',
        'compliance_notes','has_valid_bbbbee','has_tax_clearance','is_sars_registered',
        'has_cipc_registration','bbbee_valid_status','bbbee_expiry_date',
        'tax_valid_status','tax_pin_expiry_date','vat_number',
        'turnover_estimated','turnover_actual','permanent_employees','temporary_employees',
        'locations','industry_id'
    ];

    private function filterWritable(array $data): array
    {
        $out = [];
        foreach (self::WRITABLE as $k) {
            if (array_key_exists($k, $data)) {
                if (in_array($k, ['youth_owned','black_ownership','black_women_ownership','has_valid_bbbbee','has_tax_clearance','is_sars_registered','has_cipc_registration'], true)) {
                    $out[$k] = $data[$k] ? 1 : 0;
                } elseif (in_array($k, ['permanent_employees','temporary_employees','industry_id'], true)) {
                    $out[$k] = is_null($data[$k]) ? null : (int)$data[$k];
                } elseif (in_array($k, ['turnover_estimated','turnover_actual'], true)) {
                    $out[$k] = is_null($data[$k]) ? null : (float)$data[$k];
                } else {
                    $out[$k] = $data[$k];
                }
            }
        }
        return $out;
    }

    private function castRow(array $row): array
    {
        foreach (['youth_owned','black_ownership','black_women_ownership','has_valid_bbbbee','has_tax_clearance','is_sars_registered','has_cipc_registration'] as $b) {
            if (isset($row[$b])) $row[$b] = (bool)$row[$b];
        }
        foreach (['permanent_employees','temporary_employees','industry_id','id'] as $i) {
            if (isset($row[$i]) && $row[$i] !== null) $row[$i] = (int)$row[$i];
        }
        foreach (['turnover_estimated','turnover_actual'] as $d) {
            if (isset($row[$d]) && $row[$d] !== null) $row[$d] = (float)$row[$d];
        }
        return $row;
    }
}