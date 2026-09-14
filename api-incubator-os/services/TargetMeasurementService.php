<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/MetricTypeAccount.php';

/**
 * TargetMeasurementService — derive a target's actual from authoritative financial records.
 *
 * Sprint 007 Phase 3 (revenue vertical slice). READ-ONLY: this service never writes to the
 * database and never persists an actual. `metric_records` is not used; the source is
 * `company_financial_yearly_stats`, reached through `metric_type_accounts` bindings.
 *
 * Core distinctions preserved (per the Phase 1–3 review):
 *   - confirmed_zero ..... real, populated data establishes the zero months
 *   - unknown ............ records exist but cannot establish that every month was captured
 *                          (zero-filled legacy rows)
 *   - incomplete ......... identifiable required data is missing (no row / NULL month)
 *   - partial_coverage ... only some required bindings resolve for the company
 *   - no_accounts ........ a required binding resolves to no accounts at all
 *
 * Financial rows whose `account_id` is NULL cannot be attributed to a measure. They are
 * EXCLUDED from every subtotal and reported via `unresolved_rows`; their presence makes a
 * result non-authoritative.
 */
class TargetMeasurementService
{
    public const CALCULATION_VERSION = 'rev1';

    private PDO $conn;
    private MetricTypeAccount $bindings;

    private const MONTH_COLUMNS = ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->bindings = new MetricTypeAccount($db);
    }

    /**
     * Calculate the measurement result for a target. Never mutates anything.
     */
    public function calculateForTarget(int $gpsTargetId): array
    {
        $target = $this->loadTarget($gpsTargetId);
        if (!$target) {
            return $this->unconfigured($gpsTargetId, null, 'target_not_found');
        }
        $companyId = (int)$target['company_id'];

        $link = $this->loadMetricLink($gpsTargetId);
        if (!$link) {
            return $this->unconfigured($gpsTargetId, $companyId, 'no_measure_configured');
        }

        $metricTypeId = (int)$link['metric_type_id'];
        $direction = $link['direction'] ?? null;
        $method = $link['calculation_method'] ?? null;

        if ($method === null || $method === '') $method = 'period_total'; // default for measurement
        if ($method !== 'period_total') {
            return $this->unconfigured($gpsTargetId, $companyId, 'unsupported_calculation_method', $link);
        }
        if ($direction === null || $direction === '') {
            return $this->unconfigured($gpsTargetId, $companyId, 'direction_not_configured', $link);
        }

        $metricType = $this->loadMetricType($metricTypeId);
        $measure = [
            'metric_type_id' => $metricTypeId,
            'metric_code' => $metricType['code'] ?? null,
            'metric_name' => $metricType['name'] ?? null,
            'unit' => $metricType['unit'] ?? null,
            'direction' => $direction,
            'calculation_method' => $method,
            'tolerance' => [
                'value' => $link['maintain_tolerance_value'] !== null ? (float)$link['maintain_tolerance_value'] : null,
                'unit' => $link['maintain_tolerance_unit'] ?? null,
            ],
        ];

        $warnings = [];

        $baseline = $this->measurePeriod(
            $companyId,
            (string)($link['baseline_period_type'] ?? ''),
            (string)($link['baseline_period_ref'] ?? ''),
            $metricTypeId
        );
        $targetPeriod = $this->measurePeriod(
            $companyId,
            (string)($link['target_period_type'] ?? ''),
            (string)($link['target_period_ref'] ?? ''),
            $metricTypeId
        );

        foreach (['baseline' => $baseline, 'target' => $targetPeriod] as $name => $p) {
            if (!empty($p['unresolved_rows'])) {
                $warnings[] = sprintf(
                    '%s period: %d financial row(s) excluded — account association unresolved (account_id NULL).',
                    ucfirst($name),
                    (int)$p['unresolved_rows']
                );
            }
            if (($p['status'] ?? '') === 'unknown') {
                $warnings[] = sprintf('%s period contains zero-filled records whose completeness cannot be confirmed.', ucfirst($name));
            }
            if (($p['status'] ?? '') === 'partial_coverage') {
                $warnings[] = sprintf('%s period: only some required bindings resolve; subtotal is partial revenue, not combined revenue.', ucfirst($name));
            }
        }

        $progress = $this->computeProgress(
            $baseline,
            $targetPeriod,
            $direction,
            $measure['tolerance'],
            $link['target_value'] !== null ? (float)$link['target_value'] : null
        );

        return [
            'gps_target_id' => $gpsTargetId,
            'company_id' => $companyId,
            'configured' => true,
            'reason' => null,
            'calculation_version' => self::CALCULATION_VERSION,
            'measure' => $measure,
            'baseline' => $baseline,
            'target' => $targetPeriod,
            'progress' => $progress,
            'eligible_for_achievement' => $progress['authoritative'] === true,
            'authoritative' => $progress['authoritative'] === true,
            'warnings' => $warnings,
        ];
    }

    // ---------------------------------------------------------------- periods

    /**
     * Measure one period: resolve bindings, fetch rows, classify completeness, subtotal.
     */
    private function measurePeriod(int $companyId, string $periodType, string $periodRef, int $metricTypeId): array
    {
        $resolvedPeriod = $this->resolvePeriod($periodType, $periodRef);
        if (!$resolvedPeriod['ok']) {
            return [
                'period' => ['type' => $periodType ?: null, 'ref' => $periodRef ?: null, 'label' => null],
                'status' => 'invalid_period',
                'reason' => $resolvedPeriod['reason'],
                'subtotal' => null,
                'subtotal_is_partial' => true,
                'coverage' => null,
                'accounts' => [],
                'missing_accounts' => [],
                'missing_months' => [],
                'unresolved_rows' => 0,
                'captured_rows' => 0,
                'zero_only_rows' => 0,
                'months' => [],
                'month_totals' => [],
            ];
        }

        $fyId = $resolvedPeriod['financial_year_id'];
        $months = $resolvedPeriod['months'];
        $label = $resolvedPeriod['label'];

        $bindings = $this->bindings->listByType($metricTypeId);
        $accounts = $this->bindings->resolveAccounts($metricTypeId, $companyId);
        $resolvedBindingIds = array_map('intval', array_unique(array_column($accounts, 'binding_id')));
        $unresolvedBindings = [];
        foreach ($bindings as $b) {
            if (!in_array((int)$b['id'], $resolvedBindingIds, true)) {
                $unresolvedBindings[] = [
                    'id' => (int)$b['id'],
                    'account_type' => $b['account_type'],
                    'account_id' => $b['account_id'] !== null ? (int)$b['account_id'] : null,
                ];
            }
        }

        $periodInfo = ['type' => $periodType, 'ref' => $periodRef, 'financial_year_id' => $fyId, 'months' => $months, 'label' => $label];

        // Unresolved rows: cannot be attributed to a measure — excluded and reported for company+FY.
        $unresolvedRows = $this->countUnresolvedRows($companyId, $fyId);

        if (empty($accounts)) {
            return [
                'period' => $periodInfo,
                'status' => 'no_accounts',
                'reason' => 'No account resolves for this company from the measure bindings.',
                'subtotal' => null,
                'subtotal_is_partial' => true,
                'coverage' => ['required_bindings' => count($bindings), 'resolved_bindings' => 0, 'unresolved_bindings' => $unresolvedBindings],
                'accounts' => [],
                'missing_accounts' => [],
                'missing_months' => [],
                'unresolved_rows' => $unresolvedRows,
                'captured_rows' => 0,
                'zero_only_rows' => 0,
                'months' => $months,
                'month_totals' => [],
            ];
        }

        $accountIds = array_map('intval', array_column($accounts, 'account_id'));
        $rows = $this->fetchRows($companyId, $fyId, $accountIds);

        $rowsByAccount = [];
        foreach ($rows as $r) $rowsByAccount[(int)$r['account_id']][] = $r;

        $missingAccounts = [];
        $missingMonths = [];
        $zeroOnlyRows = 0;
        $capturedRows = 0;
        $subtotal = 0.0;
        $monthTotals = array_fill_keys($months, 0.0);
        $accountSummaries = [];

        foreach ($accounts as $a) {
            $aid = (int)$a['account_id'];
            $accountRows = $rowsByAccount[$aid] ?? [];
            if (empty($accountRows)) {
                $missingAccounts[] = ['account_id' => $aid, 'account_name' => $a['account_name'], 'account_type' => $a['account_type']];
                $accountSummaries[] = ['account_id' => $aid, 'account_name' => $a['account_name'], 'account_type' => $a['account_type'], 'rows' => 0, 'subtotal' => null, 'present' => false];
                continue;
            }
            $acctSubtotal = 0.0;
            foreach ($accountRows as $row) {
                $populated = false;
                foreach (self::MONTH_COLUMNS as $col) {
                    if ($row[$col] !== null && (float)$row[$col] != 0.0) { $populated = true; break; }
                }
                $hasNotes = !empty($row['notes']);
                if ($populated || $hasNotes) $capturedRows++; else $zeroOnlyRows++;

                foreach ($months as $mIdx) {
                    $col = 'm' . $mIdx;
                    if (!array_key_exists($col, $row) || $row[$col] === null) {
                        $missingMonths[$mIdx] = true;
                        continue;
                    }
                    $v = (float)$row[$col];
                    $acctSubtotal += $v;
                    $subtotal += $v;
                    $monthTotals[$mIdx] += $v;
                }
            }
            $accountSummaries[] = [
                'account_id' => $aid,
                'account_name' => $a['account_name'],
                'account_type' => $a['account_type'],
                'rows' => count($accountRows),
                'subtotal' => round($acctSubtotal, 2),
                'present' => true,
            ];
        }

        // Status precedence (most conservative first).
        if (!empty($unresolvedBindings)) {
            $status = 'partial_coverage';
        } elseif (!empty($missingAccounts) || !empty($missingMonths)) {
            $status = 'incomplete';
        } elseif ($zeroOnlyRows > 0) {
            $status = 'unknown';
        } else {
            $status = 'complete';
        }

        return [
            'period' => $periodInfo,
            'status' => $status,
            'reason' => null,
            'subtotal' => round($subtotal, 2),
            'subtotal_is_partial' => $status !== 'complete' || $unresolvedRows > 0,
            'coverage' => [
                'required_bindings' => count($bindings),
                'resolved_bindings' => count($bindings) - count($unresolvedBindings),
                'unresolved_bindings' => $unresolvedBindings,
            ],
            'accounts' => $accountSummaries,
            'missing_accounts' => $missingAccounts,
            'missing_months' => array_map('intval', array_keys($missingMonths)),
            'unresolved_rows' => $unresolvedRows,
            'captured_rows' => $capturedRows,
            'zero_only_rows' => $zeroOnlyRows,
            'months' => $months,
            'month_totals' => array_map(fn($v) => round((float)$v, 2), $monthTotals),
        ];
    }

    // --------------------------------------------------------------- progress

    /**
     * Outcome progress. Only computed when both periods have complete data.
     * `authoritative` also requires zero unresolved rows in both periods.
     */
    private function computeProgress(array $baseline, array $target, string $direction, array $tolerance, ?float $goal): array
    {
        $disqualifiers = [];
        if (($baseline['status'] ?? '') !== 'complete') $disqualifiers[] = 'baseline:' . ($baseline['status'] ?? 'unknown');
        if (($target['status'] ?? '') !== 'complete') $disqualifiers[] = 'target:' . ($target['status'] ?? 'unknown');
        if (!empty($baseline['unresolved_rows'])) $disqualifiers[] = 'baseline:unresolved_rows';
        if (!empty($target['unresolved_rows'])) $disqualifiers[] = 'target:unresolved_rows';

        $authoritative = empty($disqualifiers);

        if (($baseline['status'] ?? '') !== 'complete' || ($target['status'] ?? '') !== 'complete') {
            return [
                'status' => 'not_computed',
                'reason' => 'Required financial data is not complete for both periods — no authoritative outcome progress is reported.',
                'percent' => null,
                'percent_display' => null,
                'met' => null,
                'authoritative' => false,
                'disqualifiers' => $disqualifiers,
            ];
        }

        $baselineVal = (float)$baseline['subtotal'];
        $actual = (float)$target['subtotal'];

        if ($direction === 'maintain') {
            $tolVal = $tolerance['value'] ?? null;
            $tolUnit = $tolerance['unit'] ?? null;
            if ($tolVal === null || $tolUnit === null) {
                return ['status' => 'invalid_definition', 'reason' => 'maintain requires a tolerance value and unit.', 'percent' => null, 'percent_display' => null, 'met' => null, 'authoritative' => false, 'disqualifiers' => $disqualifiers];
            }
            if ($tolUnit === 'percent' && $baselineVal == 0.0) {
                return ['status' => 'invalid_definition', 'reason' => 'percentage tolerance is undefined when the baseline is zero.', 'percent' => null, 'percent_display' => null, 'met' => null, 'authoritative' => false, 'disqualifiers' => $disqualifiers];
            }
            $bound = $tolUnit === 'percent' ? abs($baselineVal) * ($tolVal / 100.0) : $tolVal;
            $drift = abs($actual - $baselineVal);
            $met = $drift <= $bound;
            return [
                'status' => 'computed',
                'reason' => null,
                'percent' => $met ? 100.0 : 0.0,
                'percent_display' => $met ? 100.0 : 0.0,
                'met' => $met,
                'authoritative' => $authoritative,
                'disqualifiers' => $disqualifiers,
                'detail' => ['baseline' => $baselineVal, 'actual' => $actual, 'tolerance_absolute' => round($bound, 2), 'drift' => round($drift, 2)],
            ];
        }

        // increase / decrease — goal comes from gps_target_metrics.target_value (never the actual).
        if ($goal === null) {
            return ['status' => 'invalid_definition', 'reason' => 'target_value (goal) is not set.', 'percent' => null, 'percent_display' => null, 'met' => null, 'authoritative' => false, 'disqualifiers' => $disqualifiers];
        }
        $denom = $direction === 'increase' ? ($goal - $baselineVal) : ($baselineVal - $goal);
        if ($denom == 0.0) {
            return ['status' => 'invalid_definition', 'reason' => 'target equals baseline — progress is undefined (division by zero).', 'percent' => null, 'percent_display' => null, 'met' => null, 'authoritative' => false, 'disqualifiers' => $disqualifiers];
        }
        $numerator = $direction === 'increase' ? ($actual - $baselineVal) : ($baselineVal - $actual);
        $percent = round(($numerator / $denom) * 100.0, 2);
        $display = max(0.0, min(100.0, $percent));

        return [
            'status' => 'computed',
            'reason' => null,
            'percent' => $percent,
            'percent_display' => $display,
            'met' => $percent >= 100.0,
            'authoritative' => $authoritative,
            'disqualifiers' => $disqualifiers,
            'detail' => ['baseline' => $baselineVal, 'target' => $goal, 'actual' => $actual],
        ];
    }

    // ----------------------------------------------------------------- helpers

    /** Resolve a period descriptor to a financial year + month indices (1..12 = FY-relative). */
    private function resolvePeriod(string $type, string $ref): array
    {
        $type = strtolower(trim($type));
        $ref = trim($ref);
        if ($type === '' || $ref === '') return ['ok' => false, 'reason' => 'period_type and period_ref are required.'];

        if ($type === 'financial_year') {
            $fyId = (int)$ref;
            $fy = $this->loadFinancialYear($fyId);
            if (!$fy) return ['ok' => false, 'reason' => "financial_year $fyId not found."];
            return ['ok' => true, 'financial_year_id' => $fyId, 'months' => range(1, 12), 'label' => $fy['name'] . ' (full year)'];
        }

        if ($type === 'quarter') {
            if (!preg_match('/^(\d+):Q([1-4])$/i', $ref, $m)) {
                return ['ok' => false, 'reason' => "quarter ref must be '<financial_year_id>:Qn', e.g. 1:Q3."];
            }
            $fyId = (int)$m[1]; $q = (int)$m[2];
            $fy = $this->loadFinancialYear($fyId);
            if (!$fy) return ['ok' => false, 'reason' => "financial_year $fyId not found."];
            $start = ($q - 1) * 3 + 1;
            $months = [$start, $start + 1, $start + 2];
            $cal = $this->calendarMonthsFor($months, (int)$fy['start_month']);
            return ['ok' => true, 'financial_year_id' => $fyId, 'months' => $months, 'label' => sprintf('%s Q%d (%s)', $fy['name'], $q, implode(', ', $cal))];
        }

        if ($type === 'custom') {
            if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})\.\.(\d{4})-(\d{2})-(\d{2})$/', $ref, $m)) {
                return ['ok' => false, 'reason' => 'custom ref must be YYYY-MM-DD..YYYY-MM-DD.'];
            }
            [$sY, $sM] = [(int)$m[1], (int)$m[2]];
            [$eY, $eM] = [(int)$m[4], (int)$m[5]];
            $sFy = $this->financialYearForCalendarMonth($sY, $sM);
            $eFy = $this->financialYearForCalendarMonth($eY, $eM);
            if (!$sFy) return ['ok' => false, 'reason' => 'custom start date does not fall in a known financial year.'];
            if (!$eFy) return ['ok' => false, 'reason' => 'custom end date does not fall in a known financial year.'];
            if ((int)$sFy['id'] !== (int)$eFy['id']) {
                return ['ok' => false, 'reason' => 'custom range spans multiple financial years — not supported.'];
            }
            $iStart = $this->monthIndexInFy($sM, (int)$sFy['start_month']);
            $iEnd = $this->monthIndexInFy($eM, (int)$sFy['start_month']);
            if ($iStart === null || $iEnd === null || $iEnd < $iStart) {
                return ['ok' => false, 'reason' => 'custom range could not be mapped within the financial year.'];
            }
            $months = range($iStart, $iEnd);
            $cal = $this->calendarMonthsFor($months, (int)$sFy['start_month']);
            return ['ok' => true, 'financial_year_id' => (int)$sFy['id'], 'months' => $months, 'label' => sprintf('%s (%s)', $sFy['name'], implode(', ', $cal))];
        }

        return ['ok' => false, 'reason' => "unsupported period_type '$type'."];
    }

    private function countUnresolvedRows(int $companyId, int $fyId): int
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM company_financial_yearly_stats WHERE company_id = ? AND financial_year_id = ? AND account_id IS NULL");
        $stmt->execute([$companyId, $fyId]);
        return (int)$stmt->fetchColumn();
    }

    private function fetchRows(int $companyId, int $fyId, array $accountIds): array
    {
        if (empty($accountIds)) return [];
        $ph = implode(',', array_fill(0, count($accountIds), '?'));
        $params = array_merge([$companyId, $fyId], $accountIds);
        $stmt = $this->conn->prepare("SELECT * FROM company_financial_yearly_stats WHERE company_id = ? AND financial_year_id = ? AND account_id IN ($ph)");
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function loadTarget(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT id, company_id, progress_mode, status FROM gps_targets WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function loadMetricLink(int $gpsTargetId): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM gps_target_metrics WHERE gps_target_id = ? ORDER BY id ASC LIMIT 1");
        $stmt->execute([$gpsTargetId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function loadMetricType(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT id, code, name, unit FROM metric_types WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function loadFinancialYear(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT id, name, start_month, end_month, fy_start_year, fy_end_year FROM financial_years WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function financialYearForCalendarMonth(int $year, int $month): ?array
    {
        $stmt = $this->conn->prepare("SELECT id, name, start_month, end_month, fy_start_year, fy_end_year FROM financial_years ORDER BY fy_start_year ASC");
        $stmt->execute();
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $fy) {
            $startMonth = (int)$fy['start_month'];
            // A FY with start_month S and start year Y covers calendar months S..12 of Y and 1..(S-1) of Y+1.
            $candidateStartYear = ($month >= $startMonth) ? $year : $year - 1;
            if ((int)$fy['fy_start_year'] === $candidateStartYear) {
                return $fy;
            }
        }
        return null;
    }

    private function monthIndexInFy(int $calendarMonth, int $startMonth): ?int
    {
        $idx = (($calendarMonth - $startMonth + 12) % 12) + 1;
        return ($idx >= 1 && $idx <= 12) ? $idx : null;
    }

    /** Map FY-relative month indices to calendar month numbers. */
    private function calendarMonthsFor(array $monthIdx, int $startMonth): array
    {
        $names = [1=>'Jan',2=>'Feb',3=>'Mar',4=>'Apr',5=>'May',6=>'Jun',7=>'Jul',8=>'Aug',9=>'Sep',10=>'Oct',11=>'Nov',12=>'Dec'];
        $out = [];
        foreach ($monthIdx as $i) {
            $cal = (($startMonth - 1 + ($i - 1)) % 12) + 1;
            $out[] = $names[$cal];
        }
        return $out;
    }

    private function unconfigured(int $gpsTargetId, ?int $companyId, string $reason, ?array $link = null): array
    {
        return [
            'gps_target_id' => $gpsTargetId,
            'company_id' => $companyId,
            'configured' => false,
            'reason' => $reason,
            'calculation_version' => self::CALCULATION_VERSION,
            'measure' => null,
            'baseline' => null,
            'target' => null,
            'progress' => [
                'status' => 'not_computed',
                'reason' => $reason,
                'percent' => null,
                'percent_display' => null,
                'met' => null,
                'authoritative' => false,
                'disqualifiers' => [$reason],
            ],
            'eligible_for_achievement' => false,
            'authoritative' => false,
            'warnings' => [],
        ];
    }
}
