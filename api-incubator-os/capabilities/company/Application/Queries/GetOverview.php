<?php
declare(strict_types=1);

final class GetOverview
{
    public function __construct(
        private CompanyRepository $companyRepo,
        private UserRepository $userRepo,
    ) {}

    public function execute(int $companyId): CompanyOverviewResponse
    {
        $company = $this->companyRepo->getById($companyId);
        if (!$company) {
            throw new InvalidArgumentException("Company not found: $companyId");
        }

        $directors = array_map(
            fn(array $u) => DirectorSummary::fromUser($u),
            $this->userRepo->listByCompany($companyId)
        );

        $financialSummary = $this->companyRepo->getFinancialSummary($companyId);

        return new CompanyOverviewResponse(
            company: $company,
            directors: $directors,
            financialSummary: $financialSummary,
        );
    }
}