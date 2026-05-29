<?php
declare(strict_types=1);

/**
 * GrantReports
 *
 * Server-side aggregation for Grant Funding data.
 *
 * Node types used:
 *   grant_application      – top-level applicant node
 *   grant_bank_statement   – child of application, one per financial year (m1-m12)
 *   grant_compliance       – child of application
 *   form_submission        – form / interview answer node (company_id = applicant company_id)
 */
class GrantReports
{
    private PDO $conn;

    private const TYPE_APPLICATION    = 'grant_application';
    private const TYPE_BANK_STMT      = 'grant_bank_statement';
    private const TYPE_FORM_SUBMISSION = 'form_submission';

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    // =========================================================================
    // 1. APPLICANT COLLECTION
    //    All applicants with aggregated bank-statement stats.
    //    Optional filters: workflow_id, status, province.
    // =========================================================================

    public function getApplicantsCollection(
        ?string $workflowId = null,
        ?string $status     = null,
        ?string $province   = null
    ): array {
        $activeSum   = $this->buildMonthSumExpr('bs', true);
        $capturedSum = $this->buildMonthSumExpr('bs', false);

        $sql = "
            SELECT
                app.id,
                app.company_id,
                app.created_at,
                JSON_UNQUOTE(JSON_EXTRACT(app.data, '$.company_name'))       AS company_name,
                JSON_UNQUOTE(JSON_EXTRACT(app.data, '$.status'))             AS status,
                JSON_UNQUOTE(JSON_EXTRACT(app.data, '$.province'))           AS province,
                JSON_UNQUOTE(JSON_EXTRACT(app.data, '$.registration_number')) AS registration_number,
                JSON_UNQUOTE(JSON_EXTRACT(app.data, '$.workflow_id'))        AS workflow_id,
                COUNT(DISTINCT bs.id)                                         AS fy_count,
                COALESCE(SUM(
                    CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(bs.data, '$.total_amount')), '0') AS DECIMAL(15,2))
                ), 0)                                                         AS grand_total,
                COALESCE(SUM({$activeSum}), 0)                               AS active_months,
                COALESCE(SUM({$capturedSum}), 0)                             AS captured_months
            FROM nodes app
            LEFT JOIN nodes bs
                ON bs.parent_id = app.id
               AND bs.type      = :bs_type
            WHERE app.type = :app_type
        ";

        $params = [
            ':app_type' => self::TYPE_APPLICATION,
            ':bs_type'  => self::TYPE_BANK_STMT,
        ];

        if ($workflowId !== null) {
            $sql .= " AND JSON_UNQUOTE(JSON_EXTRACT(app.data, '$.workflow_id')) = :workflow_id";
            $params[':workflow_id'] = $workflowId;
        }
        if ($status !== null) {
            $sql .= " AND JSON_UNQUOTE(JSON_EXTRACT(app.data, '$.status')) = :status";
            $params[':status'] = $status;
        }
        if ($province !== null) {
            $sql .= " AND JSON_UNQUOTE(JSON_EXTRACT(app.data, '$.province')) = :province";
            $params[':province'] = $province;
        }

        $sql .= " GROUP BY app.id ORDER BY app.created_at DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($row) => $this->enrichApplicantRow($row), $rows);
    }

    // =========================================================================
    // 2. APPLICANT FINANCIAL SUMMARY
    //    Full per-FY breakdown + aggregate stats for a single applicant.
    // =========================================================================

    public function getApplicantFinancialSummary(int $applicantId): array
    {
        // ── Application ──────────────────────────────────────────────────────
        $stmt = $this->conn->prepare(
            "SELECT * FROM nodes WHERE id = ? AND type = ?"
        );
        $stmt->execute([$applicantId, self::TYPE_APPLICATION]);
        $app = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$app) {
            throw new RuntimeException("Applicant #{$applicantId} not found");
        }

        $appData = json_decode($app['data'], true);

        // ── Bank statements ───────────────────────────────────────────────────
        $bsStmt = $this->conn->prepare(
            "SELECT * FROM nodes WHERE parent_id = ? AND type = ? ORDER BY id ASC"
        );
        $bsStmt->execute([$applicantId, self::TYPE_BANK_STMT]);
        $statements = $bsStmt->fetchAll(PDO::FETCH_ASSOC);

        $fyRows       = [];
        $grandTotal   = 0.0;
        $totalActive  = 0;
        $totalCaptured = 0;

        foreach ($statements as $bs) {
            $d = json_decode($bs['data'], true);

            $months      = [];
            $rowActive   = 0;
            $rowCaptured = 0;
            $rowTotal    = (float)($d['total_amount'] ?? 0);

            for ($m = 1; $m <= 12; $m++) {
                $key = "m{$m}";
                $val = array_key_exists($key, $d) && $d[$key] !== null
                    ? (float)$d[$key]
                    : null;
                $months[$key] = $val;

                if ($val !== null) {
                    $rowCaptured++;
                    if ($val > 0) $rowActive++;
                }
            }

            $grandTotal    += $rowTotal;
            $totalActive   += $rowActive;
            $totalCaptured += $rowCaptured;

            $consistency = $this->calcConsistency($rowActive, $rowCaptured);

            $fyRows[] = [
                'node_id'              => (int)$bs['id'],
                'financial_year_id'    => (int)($d['financial_year_id'] ?? 0),
                'financial_year_name'  => $d['financial_year_name'] ?? '',
                'months'               => $months,
                'total'                => round($rowTotal, 2),
                'active_months'        => $rowActive,
                'captured_months'      => $rowCaptured,
                'avg_per_active_month' => $rowActive > 0 ? round($rowTotal / $rowActive, 2) : 0,
                'consistency_rate'     => $consistency['rate'],
                'consistency_label'    => $consistency['label'],
            ];
        }

        $overall = $this->calcConsistency($totalActive, $totalCaptured);

        return [
            'applicant_id'          => $applicantId,
            'company_name'          => $appData['company_name']       ?? '',
            'status'                => $appData['status']             ?? '',
            'province'              => $appData['province']           ?? '',
            'registration_number'   => $appData['registration_number'] ?? '',
            'workflow_id'           => $appData['workflow_id']        ?? '',
            'grand_total'           => round($grandTotal, 2),
            'active_months'         => $totalActive,
            'captured_months'       => $totalCaptured,
            'avg_per_active_month'  => $totalActive > 0 ? round($grandTotal / $totalActive, 2) : 0,
            'consistency_rate'      => $overall['rate'],
            'consistency_label'     => $overall['label'],
            'consistency_note'      => $overall['note'],
            'fy_count'              => count($fyRows),
            'fy_rows'               => $fyRows,
        ];
    }

    // =========================================================================
    // 3. APPLICANT FORM SUBMISSIONS
    //    All form_submission nodes belonging to an applicant's company.
    // =========================================================================

    public function getApplicantFormSubmissions(int $applicantId): array
    {
        // Resolve effective company id (mirrors Angular effectiveCompanyId logic)
        $stmt = $this->conn->prepare(
            "SELECT id, company_id, data FROM nodes WHERE id = ? AND type = ?"
        );
        $stmt->execute([$applicantId, self::TYPE_APPLICATION]);
        $app = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$app) {
            throw new RuntimeException("Applicant #{$applicantId} not found");
        }

        $effectiveCompanyId = $app['company_id'] ?? $applicantId;
        $appData            = json_decode($app['data'], true);

        // Join to the parent form_template to pull the template name
        $subStmt = $this->conn->prepare("
            SELECT
                n.id,
                n.parent_id,
                n.created_at,
                n.data               AS submission_data,
                pt.data              AS template_data
            FROM nodes n
            LEFT JOIN nodes pt ON pt.id = n.parent_id AND pt.type = 'form_template'
            WHERE n.type       = ?
              AND n.company_id = ?
            ORDER BY n.created_at DESC
        ");
        $subStmt->execute([self::TYPE_FORM_SUBMISSION, $effectiveCompanyId]);
        $submissions = $subStmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($submissions as $sub) {
            $d       = json_decode($sub['submission_data'], true);
            $tplData = $sub['template_data'] ? json_decode($sub['template_data'], true) : null;

            $result[] = [
                'id'                 => (int)$sub['id'],
                'parent_id'          => (int)$sub['parent_id'],
                'form_template_id'   => (int)($d['form_template_id']   ?? $sub['parent_id']),
                'form_template_name' => $d['form_template_name']       ?? ($tplData['name'] ?? ''),
                'status'             => $d['status']                   ?? 'draft',
                'submitted_at'       => $d['submitted_at']             ?? null,
                'answers'            => $d['answers']                  ?? [],
                'meta'               => $d['meta']                     ?? [],
                'created_at'         => $sub['created_at'],
            ];
        }

        return [
            'applicant_id' => $applicantId,
            'company_id'   => $effectiveCompanyId,
            'company_name' => $appData['company_name'] ?? '',
            'total'        => count($result),
            'submissions'  => $result,
        ];
    }

    // =========================================================================
    // 4. FORM ANALYTICS
    //    For a workflow, iterate every stage that has a form_template_id or
    //    interview_template_id. Pull all submissions for that template and
    //    aggregate reportable fields (boolean → yes/no, select → per-option,
    //    number → min/max/avg/sum).  Free-text fields are intentionally skipped.
    // =========================================================================

    public function getFormAnalytics(string $workflowId): array
    {
        // ── 1. Workflow node ──────────────────────────────────────────────────
        $wStmt = $this->conn->prepare(
            "SELECT * FROM nodes WHERE type = 'grant_workflow'
              AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.id')) = ?"
        );
        $wStmt->execute([$workflowId]);
        $workflow = $wStmt->fetch(PDO::FETCH_ASSOC);

        if (!$workflow) {
            throw new RuntimeException("Workflow '{$workflowId}' not found");
        }

        $wData  = json_decode($workflow['data'], true);
        $stages = $wData['stages'] ?? [];

        // ── 2. Total applicants ───────────────────────────────────────────────
        $cStmt = $this->conn->prepare(
            "SELECT COUNT(*) FROM nodes WHERE type = ?
              AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.workflow_id')) = ?"
        );
        $cStmt->execute([self::TYPE_APPLICATION, $workflowId]);
        $totalApplicants = (int) $cStmt->fetchColumn();

        // ── 3. Per-stage analytics ────────────────────────────────────────────
        $reportableTypes = ['boolean', 'select', 'number'];
        $stageAnalytics  = [];

        foreach ($stages as $stage) {
            $templateId = $stage['form_template_id'] ?? $stage['interview_template_id'] ?? null;
            if (!$templateId) continue;

            // Pull form_template node
            $tplStmt = $this->conn->prepare(
                "SELECT * FROM nodes WHERE id = ? AND type = 'form_template'"
            );
            $tplStmt->execute([(int) $templateId]);
            $tpl = $tplStmt->fetch(PDO::FETCH_ASSOC);
            if (!$tpl) continue;

            $tplData = json_decode($tpl['data'], true);

            // Pull all form_submission nodes for this template
            $subStmt = $this->conn->prepare(
                "SELECT data FROM nodes WHERE type = ? AND parent_id = ?"
            );
            $subStmt->execute([self::TYPE_FORM_SUBMISSION, (int) $templateId]);
            $submissions = $subStmt->fetchAll(PDO::FETCH_ASSOC);

            $submittedCount = 0;
            $draftCount     = 0;
            $allAnswers     = [];

            foreach ($submissions as $sub) {
                $d      = json_decode($sub['data'], true);
                $status = $d['status'] ?? 'draft';
                if ($status === 'submitted') {
                    $submittedCount++;
                } else {
                    $draftCount++;
                }
                $allAnswers[] = $d['answers'] ?? [];
            }

            // ── Aggregate per section / question ──────────────────────────────
            $sections = [];

            foreach ($tplData['sections'] ?? [] as $section) {
                $reportableQuestions = [];

                foreach ($section['questions'] ?? [] as $q) {
                    if (!in_array($q['type'], $reportableTypes)) continue;

                    $breakdown    = [];
                    $totalAnswered = 0;
                    $numbers      = [];

                    foreach ($allAnswers as $answers) {
                        if (!array_key_exists($q['id'], $answers)) continue;
                        $val = $answers[$q['id']];
                        if ($val === null) continue;

                        $totalAnswered++;

                        if ($q['type'] === 'boolean') {
                            $key = ($val === true || $val === 'true' || $val === 1 || $val === '1')
                                ? 'Yes' : 'No';
                            $breakdown[$key] = ($breakdown[$key] ?? 0) + 1;
                        } elseif ($q['type'] === 'select') {
                            $key = (string) $val;
                            $breakdown[$key] = ($breakdown[$key] ?? 0) + 1;
                        } elseif ($q['type'] === 'number' && is_numeric($val)) {
                            $key = (string) $val;
                            $breakdown[$key] = ($breakdown[$key] ?? 0) + 1;
                            $numbers[] = (float) $val;
                        }
                    }

                    $qData = [
                        'id'             => $q['id'],
                        'label'          => $q['label'],
                        'type'           => $q['type'],
                        'total_answered' => $totalAnswered,
                        'total_possible' => count($allAnswers),
                        'breakdown'      => empty($breakdown) ? (object)[] : $breakdown,
                    ];

                    if ($q['type'] === 'number' && !empty($numbers)) {
                        $qData['stats'] = [
                            'min' => min($numbers),
                            'max' => max($numbers),
                            'avg' => round(array_sum($numbers) / count($numbers), 2),
                            'sum' => round(array_sum($numbers), 2),
                        ];
                    }

                    // Carry the defined options list for select questions
                    if ($q['type'] === 'select' && isset($q['options'])) {
                        $qData['options'] = $q['options'];
                    }

                    $reportableQuestions[] = $qData;
                }

                if (!empty($reportableQuestions)) {
                    $sections[] = [
                        'id'        => $section['id'],
                        'title'     => $section['title'],
                        'questions' => $reportableQuestions,
                    ];
                }
            }

            $stageAnalytics[] = [
                'stage_key'         => $stage['key'],
                'stage_label'       => $stage['label'],
                'stage_type'        => $stage['type'],
                'stage_color'       => $stage['color'],
                'template_id'       => (int) $templateId,
                'template_name'     => $tplData['name'] ?? '',
                'total_submissions' => count($submissions),
                'submitted_count'   => $submittedCount,
                'draft_count'       => $draftCount,
                'sections'          => $sections,
            ];
        }

        return [
            'workflow_id'      => $workflowId,
            'workflow_name'    => $wData['name'] ?? '',
            'total_applicants' => $totalApplicants,
            'stage_count'      => count($stageAnalytics),
            'stages'           => $stageAnalytics,
        ];
    }

    // =========================================================================
    // 5. FINANCIAL OVERVIEW  (cross-applicant leaderboard + aggregates)
    // =========================================================================

    public function getFinancialOverview(?string $workflowId = null): array
    {
        $all      = $this->getApplicantsCollection($workflowId);
        $withData = array_values(array_filter($all, fn($r) => $r['captured_months'] > 0));

        // Sort descending by grand_total
        usort($withData, fn($a, $b) => $b['grand_total'] <=> $a['grand_total']);

        $ranked = [];
        $rank   = 1;
        foreach ($withData as $r) {
            $ranked[] = array_merge($r, ['rank' => $rank++]);
        }

        $totals      = array_column($withData, 'grand_total');
        $totalPool   = array_sum($totals);
        $activeSum   = array_sum(array_column($withData, 'active_months'));
        $capturedSum = array_sum(array_column($withData, 'captured_months'));

        $topAvg      = !empty($withData)
            ? max(array_column($withData, 'avg_per_active_month'))
            : 0;

        return [
            'workflow_id'                    => $workflowId,
            'total_applicants'               => count($all),
            'applicants_with_data'           => count($withData),
            'total_pool_value'               => round($totalPool, 2),
            'overall_active_months'          => $activeSum,
            'overall_captured_months'        => $capturedSum,
            'overall_avg_per_active_month'   => $activeSum > 0
                ? round($totalPool / $activeSum, 2)
                : 0,
            'top_avg_per_month'              => round((float)$topAvg, 2),
            'applicants'                     => $ranked,
        ];
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private function enrichApplicantRow(array $row): array
    {
        $active    = (int)$row['active_months'];
        $captured  = (int)$row['captured_months'];
        $total     = (float)$row['grand_total'];
        $c         = $this->calcConsistency($active, $captured);

        return [
            'id'                   => (int)$row['id'],
            'company_id'           => isset($row['company_id']) ? (int)$row['company_id'] : null,
            'company_name'         => $row['company_name'],
            'status'               => $row['status'],
            'province'             => $row['province'],
            'registration_number'  => $row['registration_number'],
            'workflow_id'          => $row['workflow_id'],
            'created_at'           => $row['created_at'],
            'fy_count'             => (int)$row['fy_count'],
            'grand_total'          => round($total, 2),
            'active_months'        => $active,
            'captured_months'      => $captured,
            'avg_per_active_month' => $active > 0 ? round($total / $active, 2) : 0,
            'consistency_rate'     => $c['rate'],
            'consistency_label'    => $c['label'],
            'consistency_note'     => $c['note'],
        ];
    }

    /**
     * Returns rate (%), label (Consistent | Moderate | Irregular) and note.
     */
    private function calcConsistency(int $active, int $captured): array
    {
        $rate = $captured > 0 ? round(($active / $captured) * 100, 1) : 0;

        if ($rate >= 80) return [
            'rate'  => $rate,
            'label' => 'Consistent',
            'note'  => 'Revenue in most months',
        ];
        if ($rate >= 50) return [
            'rate'  => $rate,
            'label' => 'Moderate',
            'note'  => 'Some gaps in trading',
        ];
        return [
            'rate'  => $rate,
            'label' => 'Irregular',
            'note'  => 'Significant gaps detected',
        ];
    }

    /**
     * Builds a SQL CASE-SUM expression over m1–m12 for a bank-statement alias.
     * active=true  → counts months where value > 0 (has revenue)
     * active=false → counts months where key exists and is not null (captured)
     */
    private function buildMonthSumExpr(string $alias, bool $active): string
    {
        $parts = [];
        for ($m = 1; $m <= 12; $m++) {
            $path = "'$.m{$m}'";
            $extract = "JSON_EXTRACT({$alias}.data, {$path})";
            if ($active) {
                $parts[] = "CASE WHEN {$extract} IS NOT NULL"
                    . " AND CAST(JSON_UNQUOTE({$extract}) AS DECIMAL(15,2)) > 0"
                    . " THEN 1 ELSE 0 END";
            } else {
                $parts[] = "CASE WHEN {$extract} IS NOT NULL THEN 1 ELSE 0 END";
            }
        }
        return '(' . implode(" +\n                        ", $parts) . ')';
    }
}
