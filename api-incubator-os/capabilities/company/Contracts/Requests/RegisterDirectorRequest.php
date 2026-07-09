<?php
declare(strict_types=1);

final class RegisterDirectorRequest
{
    public function __construct(
        public readonly string $fullName,
        public readonly ?string $email,
        public readonly ?string $phone,
        public readonly ?string $gender,
        public readonly ?string $idNumber,
    ) {}
}