<?php
declare(strict_types=1);

final class UpdateIndicatorRequest
{
    public function __construct(
        public readonly array $data,
    ) {}
}
