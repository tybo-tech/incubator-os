<?php
declare(strict_types=1);

final class GetDirectors
{
    public function __construct(
        private UserRepository $userRepo,
    ) {}

    /**
     * Returns the active director roster plus the ownership summary derived
     * from it (same rules the stored company flags are calculated with).
     *
     * @return array{directors: DirectorSummary[], ownership: OwnershipSummary}
     */
    public function execute(int $companyId): array
    {
        $directors = array_map(
            fn(array $u) => DirectorSummary::fromUser($u),
            $this->userRepo->listDirectorsByCompany($companyId)
        );

        return [
            'directors' => $directors,
            'ownership' => OwnershipSummary::fromDirectors($directors),
        ];
    }
}
