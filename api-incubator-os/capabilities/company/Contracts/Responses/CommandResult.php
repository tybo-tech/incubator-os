<?php
declare(strict_types=1);

final class CommandResult implements JsonSerializable
{
    public function __construct(
        public readonly bool $success,
        public readonly string $message,
        public readonly mixed $data = null,
        public readonly ?string $auditId = null,
        public readonly array $warnings = [],
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'success' => $this->success,
            'message' => $this->message,
            'data' => $this->data,
            'auditId' => $this->auditId,
            'warnings' => $this->warnings,
        ];
    }
}