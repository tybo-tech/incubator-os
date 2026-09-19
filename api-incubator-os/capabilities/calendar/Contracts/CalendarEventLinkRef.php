<?php
declare(strict_types=1);

/**
 * One linked domain record attached to a calendar event.
 */
final class CalendarEventLinkRef implements JsonSerializable
{
    public function __construct(
        public readonly string $entityType,
        public readonly int $entityId,
        public readonly ?string $label = null,
    ) {}

    public function jsonSerialize(): mixed
    {
        return [
            'entityType' => $this->entityType,
            'entityId' => $this->entityId,
            'label' => $this->label,
        ];
    }
}
