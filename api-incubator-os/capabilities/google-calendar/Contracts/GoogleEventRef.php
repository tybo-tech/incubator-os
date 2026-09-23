<?php
declare(strict_types=1);

/**
 * Normalised Google Calendar event response (Sprint 010 Phase 1).
 *
 * Captures only the fields the capability needs to persist in
 * `google_event_sync`: identifiers, links, conference data and the etag used for
 * optimistic concurrency. Transport-agnostic and secret-free.
 */
final class GoogleEventRef implements JsonSerializable
{
    public function __construct(
        public readonly string $eventId,
        public readonly string $etag = '',
        public readonly string $htmlLink = '',
        public readonly ?string $meetUrl = null,
        public readonly ?string $conferenceId = null,
        /** @var string pending|success|failure */
        public readonly string $conferenceStatus = 'success',
    ) {}

    /**
     * @param array<string,mixed> $event A single Google Calendar event resource.
     */
    public static function fromArray(array $event): self
    {
        $meetUrl = null;
        $conferenceId = null;
        $conferenceStatus = 'success';

        $conference = $event['conferenceData'] ?? null;
        if (is_array($conference)) {
            $status = $conference['createRequest'] ?? null;
            if (is_array($status) && isset($status['status']['statusCode'])) {
                // createRequest.status.statusCode ∈ {pending, success, failure}
                $code = (string) $status['status']['statusCode'];
                $conferenceStatus = in_array($code, ['pending', 'success', 'failure'], true) ? $code : 'success';
            }
            $solution = $conference['conferenceSolution'] ?? null;
            if (is_array($solution) && isset($solution['name'])) {
                $conferenceId = (string) ($conference['conferenceId'] ?? '');
            }
            foreach (($conference['entryPoints'] ?? []) as $entry) {
                if (is_array($entry) && ($entry['entryPointType'] ?? '') === 'video' && !empty($entry['uri'])) {
                    $meetUrl = (string) $entry['uri'];
                    break;
                }
            }
            if ($conferenceId === null && isset($conference['conferenceId'])) {
                $conferenceId = (string) $conference['conferenceId'];
            }
        }

        return new self(
            eventId: (string) ($event['id'] ?? ''),
            etag: (string) ($event['etag'] ?? ''),
            htmlLink: (string) ($event['htmlLink'] ?? ''),
            meetUrl: $meetUrl,
            conferenceId: $conferenceId !== '' ? $conferenceId : null,
            conferenceStatus: $conferenceStatus,
        );
    }

    public function isComplete(): bool
    {
        return $this->eventId !== '';
    }

    public function jsonSerialize(): mixed
    {
        return [
            'eventId' => $this->eventId,
            'etag' => $this->etag,
            'htmlLink' => $this->htmlLink,
            'meetUrl' => $this->meetUrl,
            'conferenceId' => $this->conferenceId,
            'conferenceStatus' => $this->conferenceStatus,
        ];
    }
}
