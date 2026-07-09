<?php
declare(strict_types=1);

final class PublicSubmitRequest
{
    public function __construct(
        public readonly string $token,
        public readonly array $data,
    ) {}
}
