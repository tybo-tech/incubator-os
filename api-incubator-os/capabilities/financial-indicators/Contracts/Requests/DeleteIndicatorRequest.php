<?php
declare(strict_types=1);

final class DeleteIndicatorRequest
{
    public function __construct(
        public readonly int $id,
    ) {}
}
