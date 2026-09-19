<?php
declare(strict_types=1);

/**
 * Business validation for calendar events.
 *
 * Enforces the date/time storage contract so the two shapes can never mix:
 *  - all-day  -> valid `startDate` / `endDate` (YYYY-MM-DD), no times.
 *  - timed    -> valid UTC `startAt` / `endAt` + a valid IANA `timezone`.
 *
 * Also allowlists category/status and length-limits free text. Throws
 * CalendarValidationException so endpoints can map it to a 422.
 */
final class CalendarValidator
{
    public const MAX_TITLE = 200;
    public const MAX_DESCRIPTION = 5000;
    public const MAX_LOCATION = 255;
    public const MAX_LABEL = 255;
    public const MAX_TIMEZONE = 64;

    public function validate(CalendarEventRequest $input): void
    {
        $errors = [];

        if ($input->title === '') {
            $errors['title'] = 'A title is required.';
        } elseif (mb_strlen($input->title) > self::MAX_TITLE) {
            $errors['title'] = 'Title must be ' . self::MAX_TITLE . ' characters or fewer.';
        }

        if ($input->description !== null && mb_strlen($input->description) > self::MAX_DESCRIPTION) {
            $errors['description'] = 'Description is too long.';
        }
        if ($input->location !== null && mb_strlen($input->location) > self::MAX_LOCATION) {
            $errors['location'] = 'Location is too long.';
        }
        if ($input->assigneeLabel !== null && mb_strlen($input->assigneeLabel) > self::MAX_LABEL) {
            $errors['assigneeLabel'] = 'Assignee is too long.';
        }

        if (!CalendarCategory::isValid($input->category)) {
            $errors['category'] = 'Unknown category: ' . $input->category;
        }
        if (!CalendarStatus::isValid($input->status)) {
            $errors['status'] = 'Unknown status: ' . $input->status;
        }

        if ($input->allDay) {
            $this->validateAllDay($input, $errors);
        } else {
            $this->validateTimed($input, $errors);
        }

        foreach ($input->links as $i => $link) {
            $type = (string)($link['entityType'] ?? '');
            $id = (int)($link['entityId'] ?? 0);
            if (!CalendarLinkEntityType::isValid($type)) {
                $errors["links.$i.entityType"] = 'Unknown link type: ' . $type;
            }
            if ($id <= 0) {
                $errors["links.$i.entityId"] = 'A link must reference a positive entity id.';
            }
        }

        if ($input->timezone !== null && mb_strlen($input->timezone) > self::MAX_TIMEZONE) {
            $errors['timezone'] = 'Timezone value is too long.';
        }
        if ($input->clientToken !== null && mb_strlen($input->clientToken) > 64) {
            $errors['clientToken'] = 'clientToken must be 64 characters or fewer.';
        }

        if ($errors) {
            throw new CalendarValidationException(json_encode($errors) ?: 'Invalid calendar event.');
        }
    }

    /**
     * @param array<string,string> $errors
     */
    private function validateAllDay(CalendarEventRequest $input, array &$errors): void
    {
        if ($input->startDate === null || !$this->isValidDate($input->startDate)) {
            $errors['startDate'] = 'All-day events require a valid start date (YYYY-MM-DD).';
        }
        $end = $input->endDate ?? $input->startDate;
        if (!self::isValidDate($end)) {
            $errors['endDate'] = 'All-day events require a valid end date (YYYY-MM-DD).';
        }
        if (!isset($errors['startDate']) && !isset($errors['endDate']) && $end < $input->startDate) {
            $errors['endDate'] = 'End date must be on or after the start date.';
        }
        if ($input->startAt !== null || $input->endAt !== null) {
            $errors['startAt'] = 'All-day events must not carry start/end times.';
        }
    }

    /**
     * @param array<string,string> $errors
     */
    private function validateTimed(CalendarEventRequest $input, array &$errors): void
    {
        $start = $this->parseUtc($input->startAt);
        $end = $this->parseUtc($input->endAt);

        if ($start === null) {
            $errors['startAt'] = 'Timed events require a valid start time (ISO-8601).';
        }
        if ($end === null) {
            $errors['endAt'] = 'Timed events require a valid end time (ISO-8601).';
        }
        if ($start !== null && $end !== null && $end <= $start) {
            $errors['endAt'] = 'End time must be after the start time.';
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

        if ($input->startDate !== null || $input->endDate !== null) {
            $errors['startDate'] = 'Timed events must not carry dates in the all-day fields.';
        }
    }

    public static function isValidDate(?string $value): bool
    {
        if ($value === null || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return false;
        }
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $d !== false && $d->format('Y-m-d') === $value;
    }

    /**
     * Accepts ISO-8601 / SQL datetimes and normalises to a UTC DateTimeImmutable.
     * A missing zone is interpreted as UTC (timed events are stored in UTC).
     */
    public function parseUtc(?string $value): ?DateTimeImmutable
    {
        if ($value === null || trim($value) === '') {
            return null;
        }
        $value = trim($value);
        $utc = new DateTimeZone('UTC');

        foreach (['Y-m-d\TH:i:sP', 'Y-m-d\TH:i:s\Z', 'Y-m-d\TH:i:s', 'Y-m-d H:i:s', 'Y-m-d\TH:i'] as $fmt) {
            $d = DateTimeImmutable::createFromFormat($fmt, $value, $utc);
            if ($d !== false) {
                return $d->setTimezone($utc);
            }
        }

        try {
            return (new DateTimeImmutable($value))->setTimezone($utc);
        } catch (Exception) {
            return null;
        }
    }
}
