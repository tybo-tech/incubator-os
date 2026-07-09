<?php
declare(strict_types=1);

class GrantApplicationService
{
    private Node $node;

    public function __construct(Node $node)
    {
        $this->node = $node;
    }

    public function getOverview(int $applicantId): array
    {
        $application = $this->getApplication($applicantId);
        $companyId = $application['company_id'] ?? $applicantId;

        return [
            'application' => $application,
            'workflow' => $this->getWorkflow(),
            'bank_statements' => $this->getBankStatements($applicantId),
            'compliance' => $this->getCompliance($applicantId),
            'scm_verification' => $this->getScmVerification($companyId),
            'dd_answers' => $this->getDdAnswers($companyId),
        ];
    }

    public function updateApplication(int $applicantId, array $patch): array
    {
        $existing = $this->node->getById($applicantId);
        if (!$existing) {
            throw new InvalidArgumentException("Application not found: $applicantId");
        }
        $merged = array_merge($this->toArray($existing['data']), $patch);
        return $this->node->update($applicantId, $merged);
    }

    private function getApplication(int $id): array
    {
        $node = $this->node->getById($id);
        if (!$node) {
            throw new InvalidArgumentException("Application not found: $id");
        }
        return $node;
    }

    private function getWorkflow(): array
    {
        $workflows = $this->node->getByType('grant_workflow');
        if (empty($workflows)) {
            return [];
        }
        return $workflows;
    }

    private function getBankStatements(int $applicantId): array
    {
        return $this->node->search('grant_bank_statement', $applicantId);
    }

    private function getCompliance(int $applicantId): array
    {
        return $this->node->search('grant_compliance', $applicantId);
    }

    private function getScmVerification(int $companyId): array
    {
        return $this->node->search('grant_scm_verification', $companyId);
    }

    private function getDdAnswers(int $companyId): ?array
    {
        $submissions = $this->node->search('form_submission', null, $companyId);
        if (empty($submissions)) {
            return null;
        }
        $latest = null;
        foreach ($submissions as $s) {
            $sData = $this->toArray($s['data']);
            if (($sData['status'] ?? null) === 'submitted') {
                $latest = $s;
            }
        }
        $latest ??= $submissions[count($submissions) - 1];
        $data = $this->toArray($latest['data']);
        return $data['answers'] ?? null;
    }

    private function toArray(mixed $value): array
    {
        return json_decode(json_encode($value), true) ?? [];
    }
}
