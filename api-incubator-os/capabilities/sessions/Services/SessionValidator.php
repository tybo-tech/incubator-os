<?php
declare(strict_types=1);

/**
 * Business validation for Sessions and their sub-resources.
 *
 * Date/time parsing is delegated to CalendarValidator (Sprint 008) so the
 * all-day vs timed contract is defined once and the two capabilities cannot
 * drift. This validator only knows Session-specific rules.
 */
final class SessionValidator
{
    public const MAX_SUBJECT = 255;
    public const MAX_TEXT = 10000;
    public const MAX_NAME = 255;
    public const MAX_EMAIL = 255;
    public const MAX_TOPIC = 255;
    public const MAX_ROLE = 64;
    public const MAX_LABEL = 255;

    public function __construct(private CalendarValidator $dates) {}

    /**
     * Validate Session create/update fields.
     *
     * @throws SessionValidationException
     */
    public function validateSession(SessionRequest $input, bool $creating): void
    {
        $errors = [];

        if ($creating && ($input->companyId === null || $input->companyId <= 0)) {
            $errors['companyId'] = 'A company is required.';
        }
        if ($input->subject === '') {
            $errors['subject'] = 'A subject is required.';
        } elseif (mb_strlen($input->subject) > self::MAX_SUBJECT) {
            $errors['subject'] = 'Subject must be ' . self::MAX_SUBJECT . ' characters or fewer.';
        }
        if (!SessionType::isValid($input->sessionType)) {
            $errors['sessionType'] = 'Unknown session type: ' . $input->sessionType;
        }
        foreach (['purpose' => $input->purpose, 'preparationSummary' => $input->preparationSummary, 'closingSummary' => $input->closingSummary] as $field => $value) {
            if ($value !== null && mb_strlen($value) > self::MAX_TEXT) {
                $errors[$field] = 'This field is too long.';
            }
        }
        if ($input->facilitatorLabel !== null && mb_strlen($input->facilitatorLabel) > self::MAX_LABEL) {
            $errors['facilitatorLabel'] = 'Facilitator is too long.';
        }

        // When create() must build the calendar event itself, the event's own
        // date/time shape is validated here using the calendar contract.
        if ($creating && $input->calendarEventId === null) {
            $errors += $this->eventShapeErrors($input);
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid Session.');
        }
    }

    /**
     * @return array<string,string>
     */
    private function eventShapeErrors(SessionRequest $input): array
    {
        $errors = [];
        if ($input->allDay) {
            if (!CalendarValidator::isValidDate($input->startDate)) {
                $errors['startDate'] = 'A scheduled Session requires a valid start date (YYYY-MM-DD).';
            }
            $end = $input->endDate ?? $input->startDate;
            if (!CalendarValidator::isValidDate($end)) {
                $errors['endDate'] = 'All-day events require a valid end date (YYYY-MM-DD).';
            } elseif (!isset($errors['startDate']) && $end < (string)$input->startDate) {
                $errors['endDate'] = 'End date must be on or after the start date.';
            }
        } else {
            if ($this->dates->parseUtc($input->startAt) === null) {
                $errors['startAt'] = 'A scheduled Session requires a valid start time (ISO-8601).';
            }
            if ($this->dates->parseUtc($input->endAt) === null) {
                $errors['endAt'] = 'A scheduled Session requires a valid end time (ISO-8601).';
            }
            if ($input->timezone === null) {
                $errors['timezone'] = 'Timed events require a timezone.';
            } else {
                try {
                    new DateTimeZone($input->timezone);
                } catch (Exception) {
                    $errors['timezone'] = 'Unknown timezone: ' . $input->timezone;
                }
            }
        }
        return $errors;
    }

    /**
     * @param array<string,mixed> $data
     * @throws SessionValidationException
     */
    public function validateParticipant(array $data): void
    {
        $errors = [];
        $type = (string)($data['participantType'] ?? 'external');
        if (!ParticipantType::isValid($type)) {
            $errors['participantType'] = 'Unknown participant type: ' . $type;
        }
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            $errors['name'] = 'A participant name is required.';
        } elseif (mb_strlen($name) > self::MAX_NAME) {
            $errors['name'] = 'Name is too long.';
        }
        $email = $data['email'] ?? null;
        if ($email !== null && $email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen((string)$email) > self::MAX_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }
        if ($type === ParticipantType::INTERNAL && (int)($data['userId'] ?? 0) <= 0) {
            $errors['userId'] = 'An internal participant requires a user id.';
        }
        $attendance = (string)($data['attendance'] ?? AttendanceState::INVITED);
        if (!AttendanceState::isValid($attendance)) {
            $errors['attendance'] = 'Unknown attendance state: ' . $attendance;
        }
        if (isset($data['role']) && $data['role'] !== null && mb_strlen((string)$data['role']) > self::MAX_ROLE) {
            $errors['role'] = 'Role is too long.';
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid participant.');
        }
    }

    /**
     * @param array<string,mixed> $data
     * @throws SessionValidationException
     */
    public function validateAgendaItem(array $data): void
    {
        $errors = [];
        $topic = trim((string)($data['topic'] ?? ''));
        if ($topic === '') {
            $errors['topic'] = 'An agenda topic is required.';
        } elseif (mb_strlen($topic) > self::MAX_TOPIC) {
            $errors['topic'] = 'Topic is too long.';
        }
        if (isset($data['status']) && !AgendaItemStatus::isValid((string)$data['status'])) {
            $errors['status'] = 'Unknown agenda status: ' . $data['status'];
        }
        if (isset($data['description']) && $data['description'] !== null && mb_strlen((string)$data['description']) > self::MAX_TEXT) {
            $errors['description'] = 'Description is too long.';
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid agenda item.');
        }
    }

    /**
     * @param array<string,mixed> $data
     * @throws SessionValidationException
     */
    public function validateNote(array $data): void
    {
        $errors = [];
        $content = trim((string)($data['content'] ?? ''));
        if ($content === '') {
            $errors['content'] = 'Note content is required.';
        } elseif (mb_strlen($content) > self::MAX_TEXT) {
            $errors['content'] = 'Note is too long.';
        }
        $visibility = (string)($data['visibility'] ?? SessionNoteVisibility::SHARED);
        if (!SessionNoteVisibility::isValid($visibility)) {
            $errors['visibility'] = 'Unknown note visibility: ' . $visibility;
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid note.');
        }
    }

    /**
     * @param array<string,mixed> $data
     * @throws SessionValidationException
     */
    public function validateDecision(array $data): void
    {
        $errors = [];
        $text = trim((string)($data['decisionText'] ?? ''));
        if ($text === '') {
            $errors['decisionText'] = 'Decision text is required.';
        } elseif (mb_strlen($text) > self::MAX_TEXT) {
            $errors['decisionText'] = 'Decision text is too long.';
        }
        $date = (string)($data['decisionDate'] ?? '');
        if (!CalendarValidator::isValidDate($date)) {
            $errors['decisionDate'] = 'A valid decision date (YYYY-MM-DD) is required.';
        }
        if (isset($data['rationale']) && $data['rationale'] !== null && mb_strlen((string)$data['rationale']) > self::MAX_TEXT) {
            $errors['rationale'] = 'Rationale is too long.';
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid decision.');
        }
    }

    /**
     * @param array<string,mixed> $data
     * @throws SessionValidationException
     */
    public function validateLink(array $data): void
    {
        $errors = [];
        $type = (string)($data['entityType'] ?? '');
        if (!SessionLinkEntityType::isValid($type)) {
            $errors['entityType'] = 'Unknown link type: ' . $type;
        }
        if ((int)($data['entityId'] ?? 0) <= 0) {
            $errors['entityId'] = 'A link must reference a positive entity id.';
        }
        $relationship = (string)($data['relationship'] ?? SessionRelationship::DISCUSSED);
        if (!SessionRelationship::isValid($relationship)) {
            $errors['relationship'] = 'Unknown relationship: ' . $relationship;
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid link.');
        }
    }
}
