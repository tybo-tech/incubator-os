<?php
declare(strict_types=1);

final class DeactivateDirectorRequest
{
    public function __construct(
        public readonly int $directorId,
    ) {}
}