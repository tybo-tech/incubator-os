<?php
declare(strict_types=1);

final class CreateIndicatorRequest
{
    public function __construct(
        public readonly int $companyId,
        public readonly array $data,
    ) {}
}
