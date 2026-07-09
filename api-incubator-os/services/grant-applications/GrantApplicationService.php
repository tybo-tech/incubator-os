<?php
declare(strict_types=1);

class GrantApplicationService
{
    private Node $node;
    private ?Company $company = null;
    private ?CategoryItem $categoryItem = null;
    private ?CompanyFinancialYearlyStats $yearlyStats = null;
    private ?User $userModel = null;

    public function __construct(Node $node)
    {
        $this->node = $node;
    }

    private function getCompany(): Company
    {
        if (!$this->company) {
            $this->company = new Company($this->node->getConnection());
        }
        return $this->company;
    }

    private function getCategoryItem(): CategoryItem
    {
        if (!$this->categoryItem) {
            $this->categoryItem = new CategoryItem($this->node->getConnection());
        }
        return $this->categoryItem;
    }

    private function getYearlyStats(): CompanyFinancialYearlyStats
    {
        if (!$this->yearlyStats) {
            $this->yearlyStats = new CompanyFinancialYearlyStats($this->node->getConnection());
        }
        return $this->yearlyStats;
    }

    private function getUserModel(): User
    {
        if (!$this->userModel) {
            $this->userModel = new User($this->node->getConnection());
        }
        return $this->userModel;
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

    /**
     * Dry-run import: map grant applications to company format and
     * cross-check against existing companies by registration_no OR name.
     * Optionally filter by status (workflow stage key).
     * Returns a summary without writing anything.
     */
    public function dryRunImportToCompanies(?string $statusFilter = null): array
    {
        $applications = $this->node->getByType('grant_application');
        $company = $this->getCompany();

        $results = [];
        $stats = ['total' => 0, 'match_by_reg' => 0, 'match_by_name' => 0, 'no_match' => 0, 'skipped' => 0];

        foreach ($applications as $app) {
            $data = $this->toArray($app['data']);

            // Apply status filter
            if ($statusFilter && ($data['status'] ?? null) !== $statusFilter) {
                continue;
            }

            $stats['total']++;
            $data = $this->toArray($app['data']);
            $regNo = $data['registration_number'] ?? null;
            $name = $data['company_name'] ?? '';

            if (empty($name)) {
                $stats['skipped']++;
                $results[] = [
                    'node_id' => $app['id'],
                    'company_name' => '',
                    'registration_no' => $regNo,
                    'status' => 'skipped',
                    'reason' => 'No company name',
                    'existing_company' => null,
                    'mapped_data' => null,
                ];
                continue;
            }

            // Cross-check by registration number first
            $existing = null;
            $matchType = null;
            if ($regNo && $regNo !== 'Nil' && $regNo !== '') {
                $existing = $company->getByRegistrationNo($regNo);
                if ($existing) {
                    $matchType = 'by_registration_no';
                    $stats['match_by_reg']++;
                }
            }

            // Fallback: check by name
            if (!$existing) {
                $existing = $company->getByName($name);
                if ($existing) {
                    $matchType = 'by_name';
                    $stats['match_by_name']++;
                }
            }

            if (!$existing) {
                $stats['no_match']++;
            }

            $mapped = $this->mapApplicationToCompany($data);

            $results[] = [
                'node_id' => $app['id'],
                'company_name' => $name,
                'registration_no' => $regNo,
                'status' => $existing ? 'exists' : 'new',
                'match_type' => $matchType,
                'existing_company' => $existing ? [
                    'id' => $existing['id'],
                    'name' => $existing['name'],
                    'registration_no' => $existing['registration_no'],
                ] : null,
                'mapped_data' => $mapped,
            ];
        }

        return [
            'summary' => $stats,
            'results' => $results,
        ];
    }

    /**
     * Execute the import: create/update companies, set company_id on nodes,
     * and optionally attach to a cohort. Optionally filter by status.
     */
    public function executeImportToCompanies(?int $cohortId = null, ?string $statusFilter = null): array
    {
        $dryRun = $this->dryRunImportToCompanies($statusFilter);
        $company = $this->getCompany();

        $inserted = 0;
        $updated = 0;
        $attached = 0;
        $errors = [];

        foreach ($dryRun['results'] as $item) {
            if ($item['status'] === 'skipped' || !$item['mapped_data']) {
                continue;
            }

            try {
                $companyId = null;
                $isExisting = $item['status'] === 'exists';
                if ($isExisting) {
                    $companyId = (int)$item['existing_company']['id'];
                    $company->update($companyId, $item['mapped_data']);
                    $updated++;
                } else {
                    $created = $company->add($item['mapped_data']);
                    $companyId = (int)$created['id'];
                    $inserted++;
                }

                // Always set company_id on the node so undo can find it
                $this->node->updateCompanyId((int)$item['node_id'], $companyId);

                // Mark the node — undo knows not to delete if is_existing_company is true
                $this->node->patchNodeData((int)$item['node_id'], [
                    'is_existing_company' => $isExisting,
                    'last_action' => 'imported',
                    'last_action_at' => date('c'),
                ]);

                // Attach to cohort if specified and company was processed
                if ($cohortId && $companyId) {
                    try {
                        $this->getCategoryItem()->attachCompany($cohortId, $companyId);
                        $attached++;
                    } catch (Throwable $t) {
                        // Skip if already assigned — not a real error
                        if (!str_contains($t->getMessage(), 'already assigned')) {
                            throw $t;
                        }
                    }
                }

                // Migrate bank statements to company_financial_yearly_stats
                if ($companyId && $this->getCompany()->getById($companyId)) {
                    $statements = $this->getBankStatements((int)$item['node_id']);
                    foreach ($statements as $stmt) {
                        $bsData = $this->toArray($stmt['data']);
                        $this->getYearlyStats()->upsert([
                            'company_id'        => $companyId,
                            'financial_year_id' => $bsData['financial_year_id'],
                            'account_id'        => null,
                            'm1'                => $bsData['m1'] ?? 0,
                            'm2'                => $bsData['m2'] ?? 0,
                            'm3'                => $bsData['m3'] ?? 0,
                            'm4'                => $bsData['m4'] ?? 0,
                            'm5'                => $bsData['m5'] ?? 0,
                            'm6'                => $bsData['m6'] ?? 0,
                            'm7'                => $bsData['m7'] ?? 0,
                            'm8'                => $bsData['m8'] ?? 0,
                            'm9'                => $bsData['m9'] ?? 0,
                            'm10'               => $bsData['m10'] ?? 0,
                            'm11'               => $bsData['m11'] ?? 0,
                            'm12'               => $bsData['m12'] ?? 0,
                            'notes'             => $bsData['notes'] ?? null,
                        ]);
                    }
                }

                // Import directors as users
                $nodeData = $this->toArray($this->node->getById((int)$item['node_id'])['data'] ?? []);
                $directors = $nodeData['directors'] ?? [];
                $createdUserIds = [];
                foreach ($directors as $dir) {
                    $fullName = trim(($dir['name'] ?? '') . ' ' . ($dir['surname'] ?? ''));
                    if (empty($fullName)) continue;

                    $email = $dir['email'] ?? null;
                    $phone = $dir['cell_phone'] ?? $dir['phone'] ?? null;

                    // Build a unique username: prefer email, fall back to fullName + random suffix
                    $username = $email;
                    if ($username && $this->getUserModel()->getByUsername($username)) {
                        $username = null; // email taken, fall through to name-based
                    }
                    if (!$username) {
                        $base = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($fullName));
                        $username = $base;
                        for ($i = 0; $i < 10; $i++) {
                            if (!$this->getUserModel()->getByUsername($username)) break;
                            $username = $base . '_' . bin2hex(random_bytes(2));
                        }
                    }

                    $user = $this->getUserModel()->add([
                        'company_id' => $companyId,
                        'full_name'  => $fullName,
                        'email'      => $email,
                        'phone'      => $phone,
                        'username'   => $username,
                        'role'       => 'Director',
                        'race'       => $dir['race'] ?? null,
                        'gender'     => $dir['gender'] ?? null,
                        'id_number'  => $dir['id_number'] ?? null,
                        'status'     => 'active',
                    ]);
                    $createdUserIds[] = (int)$user['id'];
                }

                // Track created user IDs on the node for undo
                if (!empty($createdUserIds)) {
                    $this->node->patchNodeData((int)$item['node_id'], [
                        'imported_user_ids' => $createdUserIds,
                    ]);
                }
            } catch (Throwable $t) {
                $errors[] = [
                    'node_id' => $item['node_id'],
                    'company_name' => $item['company_name'],
                    'message' => $t->getMessage(),
                ];
            }
        }

        return [
            'summary' => [
                'total' => $dryRun['summary']['total'],
                'inserted' => $inserted,
                'updated' => $updated,
                'attached_to_cohort' => $attached,
                'errors' => count($errors),
            ],
            'error_details' => $errors,
        ];
    }

    /**
     * Undo the import: remove cohort assignments, clear company_id on nodes,
     * and delete companies that were created by the import (not flagged as pre-existing).
     */
    public function undoImportToCompanies(int $cohortId): array
    {
        $categoryItem = $this->getCategoryItem();
        $company = $this->getCompany();

        $companies = $categoryItem->getCompaniesInCohort($cohortId);
        $detached = 0;
        $deleted = 0;
        $cleared = 0;
        $errors = [];

        foreach ($companies as $entry) {
            $companyId = (int)$entry['id'];

            try {
                // Check the flag on grant_application nodes BEFORE clearing company_id
                $applications = $this->node->search('grant_application', null, $companyId);
                $isExisting = false;
                foreach ($applications as $app) {
                    $appData = $this->toArray($app['data']);
                    if (!empty($appData['is_existing_company'])) {
                        $isExisting = true;
                        break;
                    }
                }

                // Remove from cohort
                $categoryItem->detachCompany($cohortId, $companyId);
                $detached++;

                // Clear company_id on all grant_application nodes referencing this company
                $this->node->clearCompanyId($companyId);
                $cleared++;

                // Mark nodes as undone
                foreach ($applications as $app) {
                    $this->node->patchNodeData((int)$app['id'], [
                        'last_action' => 'undone',
                        'last_action_at' => date('c'),
                    ]);
                }

                // Delete all users linked to this company (created by import or otherwise)
                $companyUsers = $this->getUserModel()->listByCompany($companyId);
                foreach ($companyUsers as $u) {
                    try {
                        $this->getUserModel()->delete((int)$u['id']);
                    } catch (Throwable $t) {
                        // skip
                    }
                }

                // Delete only companies that were created by this import
                if (!$isExisting) {
                    $company->delete($companyId);
                    $deleted++;
                }
            } catch (Throwable $t) {
                $errors[] = [
                    'company_id' => $companyId,
                    'company_name' => $entry['name'] ?? '',
                    'message' => $t->getMessage(),
                ];
            }
        }

        return [
            'summary' => [
                'total_in_cohort' => count($companies),
                'detached_from_cohort' => $detached,
                'company_id_cleared' => $cleared,
                'companies_deleted' => $deleted,
                'errors' => count($errors),
            ],
            'error_details' => $errors,
        ];
    }

    private function mapApplicationToCompany(array $data): array
    {
        $address = trim(($data['address_line1'] ?? '') . ' ' . ($data['address_line2'] ?? ''));

        return [
            'name' => $data['company_name'] ?? '',
            'registration_no' => $data['registration_number'] ?? null,
            'trading_name' => $data['trade_name'] ?? null,
            'address' => $address ?: null,
            'suburb' => $data['suburb'] ?? null,
            'city' => $data['city'] ?? null,
            'business_location' => $data['province'] ?? null,
            'youth_owned' => !empty($data['youth_owned']),
            'black_ownership' => !empty($data['black_owned']),
            'black_women_ownership' => !empty($data['black_women_owned']),
            'turnover_actual' => $data['bank_statement_grand_total'] ?? null,
        ];
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
