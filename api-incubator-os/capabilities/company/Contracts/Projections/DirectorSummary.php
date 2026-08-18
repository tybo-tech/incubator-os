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
        public readonly ?string $race,
        public readonly ?string $idNumber,
        public readonly ?string $dateOfBirth,
        public readonly ?int $age,
    ) {}

    public static function fromUser(array $user): self
    {
        $idNumber = $user['id_number'] ?? null;
        $dob = self::parseDateOfBirth($idNumber);
        $age = $dob ? self::calculateAge($dob) : null;

        return new self(
            directorId: (int)$user['id'],
            fullName: $user['full_name'] ?? '',
            email: $user['email'] ?? null,
            phone: $user['phone'] ?? null,
            role: $user['role'] ?? 'Director',
            gender: $user['gender'] ?? null,
            race: $user['race'] ?? null,
            idNumber: $idNumber,
            dateOfBirth: $dob,
            age: $age,
        );
    }

    /**
     * Parse a South African ID number (YYMMDDSSSSCAZ) to extract date of birth.
     * Returns YYYY-MM-DD or null if the ID is not a valid 13-digit SA ID.
     */
    public static function parseDateOfBirth(?string $idNumber): ?string
    {
        if (!$idNumber || !preg_match('/^\d{13}$/', $idNumber)) {
            return null;
        }

        $yy = (int)substr($idNumber, 0, 2);
        $mm = (int)substr($idNumber, 2, 2);
        $dd = (int)substr($idNumber, 4, 2);

        if ($mm < 1 || $mm > 12 || $dd < 1 || $dd > 31) {
            return null;
        }

        // Century heuristic: if YY is greater than the current 2-digit year,
        // the person was born in the 1900s, otherwise the 2000s.
        $currentYY = (int)date('y');
        $century = $yy > $currentYY ? 1900 : 2000;

        $year = $century + $yy;
        if (!checkdate($mm, $dd, $year)) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $year, $mm, $dd);
    }

    public static function calculateAge(string $dateOfBirth): int
    {
        $dob = new DateTimeImmutable($dateOfBirth);
        $now = new DateTimeImmutable();
        return $now->diff($dob)->y;
    }
}
