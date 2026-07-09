<?php
declare(strict_types=1);

final class UpdateProfileRequest
{
    public function __construct(
        public readonly string $name,
        public readonly ?string $registrationNo,
        public readonly ?string $tradingName,
        public readonly ?string $contactPerson,
        public readonly ?string $contactNumber,
        public readonly ?string $emailAddress,
        public readonly ?string $city,
        public readonly ?string $suburb,
        public readonly ?string $address,
        public readonly ?string $businessLocation,
        public readonly ?string $serviceOffering,
        public readonly ?string $bbbeeLevel,
        public readonly ?string $industryId,
    ) {}
}