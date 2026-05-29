<?php

require_once 'MetaValueSyncService.php';

class NodeGrantFund
{
    private $conn;
    private $metaSync;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->metaSync = new MetaValueSyncService($db);
    }

    public function scoreReport()
    {
        $formResults = $this->getByTypeAndParent('form_submission', 2627);

        $scoreFields = [
            'c1_business_background', 'c2_location', 'c3_problem',
            'c4_solution', 'c5_current_situation', 'c6_business_needs',
            'c7_investment_plan', 'c8_roi', 'c9_presentation',
        ];

        // Group submissions by company_id, collecting votes
        $submissionsByCompany = [];
        foreach ($formResults as $sub) {
            $companyId = $sub['company_id'];
            if ($companyId === null) continue;

            $answers = $sub['data']->answers ?? null;
            if (!$answers) continue;

            $judgeName = $answers->judge_name ?? 'Unknown';
            if (is_object($judgeName)) {
                $judgeName = $judgeName->full_name ?? 'Unknown';
            }

            $score = 0;
            foreach ($scoreFields as $field) {
                $score += (int) ($answers->$field ?? 0);
            }

            $submissionsByCompany[$companyId][] = [
                'judge' => $judgeName,
                'score' => $score,
            ];
        }

        // Only look up companies that actually have votes
        $companyIds = array_keys($submissionsByCompany);
        if (empty($companyIds)) {
            return [];
        }

        $applicants = $this->getByIds($companyIds);

        // Build final report — only scored companies, sorted by total desc
        $report = [];
        foreach ($applicants as $applicant) {
            $id    = $applicant['id'];
            $votes = $submissionsByCompany[$id] ?? [];
            $report[] = [
                'id'           => $id,
                'companyName'  => $applicant['companyName'],
                'directorName' => $applicant['directorName'],
                'industryName' => $applicant['industryName'],
                'votes'        => $votes,
                'totalScore'   => array_sum(array_column($votes, 'score')),
            ];
        }

        usort($report, fn($a, $b) => $b['totalScore'] <=> $a['totalScore']);

        return $report;
    }

    private function getByIds(array $ids): array
    {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $q = "SELECT 
        id,
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.company_name')) AS companyName,
        CONCAT(
            JSON_UNQUOTE(JSON_EXTRACT(data, '$.directors[0].name')), ' ',
            JSON_UNQUOTE(JSON_EXTRACT(data, '$.directors[0].surname'))
        ) AS directorName,
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.industry_name')) AS industryName
        FROM nodes WHERE id IN ($placeholders)";
        $stmt = $this->conn->prepare($q);
        $stmt->execute($ids);

        $results = [];
        while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = $item;
        }
        return $results;
    }

    private function getByType($type)
    {
        $q = "SELECT 
        id,
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.company_name')) AS companyName,
        CONCAT(
            JSON_UNQUOTE(JSON_EXTRACT(data, '$.directors[0].name')), ' ',
            JSON_UNQUOTE(JSON_EXTRACT(data, '$.directors[0].surname'))
        ) AS directorName,
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.industry_name')) AS industryName
        FROM nodes WHERE type = ?";
        $stmt = $this->conn->prepare($q);
        $stmt->execute([$type]);

        $results = [];
        while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = $item;
        }

        return $results;
    }

     private function getByTypeAndParent($type, $parentId)
    {
        $stmt = $this->conn->prepare("SELECT * FROM nodes WHERE type = ? AND parent_id = ?");
        $stmt->execute([$type, $parentId]);

        $results = [];
        while ($item = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $item['data'] = json_decode($item['data']);
            $results[] = $item;
        }

        return $results;
    }

    public function users(int $companyId = 99): array
    {
        $q ="SELECT id,full_name,role FROM users WHERE company_id = ? 
        AND role IN ('Judge', 'Admin', 'Advisor')
        ORDER BY full_name ASC";
        $stmt = $this->conn->prepare($q);
        $stmt->execute([$companyId]);
        $out = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = $this->castRow($r);
        }
        return $out;
    }

    private function castRow(array $row): array
    {
        foreach (['id', 'company_id'] as $i) {
            if (isset($row[$i]))
                $row[$i] = (int) $row[$i];
        }
        return $row;
    }

}
