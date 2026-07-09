<?php
declare(strict_types=1);

final class RequestLinkRequest
{
    public function __construct(
        public readonly int $companyId,
        public readonly int $financialYear,
        public readonly int $month,
    ) {}
}
