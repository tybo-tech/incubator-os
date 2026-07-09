<?php
declare(strict_types=1);

final class DirectorSummary
{
    public function __construct(
        public readonly int $directorId,
        public readonly string $fullName,
        public readonly ?string $email,
        public readonly ?string $phone,
        public readonly string $role,
        public readonly ?string $gender,
        public readonly ?string $idNumber,
    ) {}

    public static function fromUser(array $user): self
    {
        return new self(
            directorId: (int)$user['id'],
            fullName: $user['full_name'] ?? '',
            email: $user['email'] ?? null,
            phone: $user['phone'] ?? null,
            role: $user['role'] ?? 'Director',
            gender: $user['gender'] ?? null,
            idNumber: $user['id_number'] ?? null,
        );
    }
}