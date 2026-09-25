<?php
declare(strict_types=1);

/**
 * Business validation for site-visit reports.
 *
 * Scope:
 *   - the Session must actually be a `site_visit` (VISIT_TYPE_MISMATCH);
 *   - header field shapes and controlled vocabularies;
 *   - section item required fields;
 *   - sign-off role validity;
 *   - the ISSUE preconditions that the schema cannot express.
 *
 * Issue preconditions are split by nature:
 *   - Session not COMPLETED      -> conflict (409) `VISIT_SESSION_NOT_COMPLETED`
 *   - missing enrolment / date   -> structured validation (422) with field errors.
 */
final class VisitReportValidator
{
    public const MAX_TITLE = 255;
    public const MAX_LOCATION = 255;
    public const MAX_NAME = 255;
    public const MAX_DESIGNATION = 255;
    public const MAX_SIGNATURE_REF = 512;
    public const MAX_TEXT = 10000;

    /**
     * A report only exists for a `site_visit` Session.
     *
     * @param array<string,mixed> $sessionRow
     * @throws SessionValidationException
     */
    public function assertSiteVisitSession(array $sessionRow): void
    {
        if ((string)($sessionRow['session_type'] ?? '') !== SessionType::SITE_VISIT) {
            throw new SessionValidationException(
                'VISIT_TYPE_MISMATCH: ' . json_encode([
                    'sessionType' => 'A visit report can only be created for a site_visit Session.',
                ])
            );
        }
    }

    /**
     * @param array<string,mixed> $data
     * @throws SessionValidationException
     */
    public function validateHeader(array $data): void
    {
        $errors = [];

        if (isset($data['visitKind']) && $data['visitKind'] !== null && !VisitKind::isValid((string)$data['visitKind'])) {
            $errors['visitKind'] = 'Unknown visit kind: ' . $data['visitKind'];
        }
        if (isset($data['actualVisitDate']) && $data['actualVisitDate'] !== null && $data['actualVisitDate'] !== ''
            && !CalendarValidator::isValidDate((string)$data['actualVisitDate'])) {
            $errors['actualVisitDate'] = 'The actual visit date must be a valid date (YYYY-MM-DD).';
        }
        if (isset($data['nextVisitTargetDate']) && $data['nextVisitTargetDate'] !== null && $data['nextVisitTargetDate'] !== ''
            && !CalendarValidator::isValidDate((string)$data['nextVisitTargetDate'])) {
            $errors['nextVisitTargetDate'] = 'The next-visit target date must be a valid date (YYYY-MM-DD).';
        }
        if (isset($data['followUpMethod']) && $data['followUpMethod'] !== null && $data['followUpMethod'] !== ''
            && !FollowUpMethod::isValid((string)$data['followUpMethod'])) {
            $errors['followUpMethod'] = 'Unknown follow-up method: ' . $data['followUpMethod'];
        }
        if (isset($data['actualLocation']) && $data['actualLocation'] !== null && mb_strlen((string)$data['actualLocation']) > self::MAX_LOCATION) {
            $errors['actualLocation'] = 'Location is too long.';
        }
        if (isset($data['operatingStatus']) && $data['operatingStatus'] !== null && mb_strlen((string)$data['operatingStatus']) > self::MAX_TEXT) {
            $errors['operatingStatus'] = 'Operating status is too long.';
        }
        $enrolment = $data['categoriesItemId'] ?? null;
        if ($enrolment !== null && $enrolment !== '' && (int)$enrolment <= 0) {
            $errors['categoriesItemId'] = 'A valid enrolment id is required.';
        }
        $followUp = $data['followUpSessionId'] ?? null;
        if ($followUp !== null && $followUp !== '' && (int)$followUp <= 0) {
            $errors['followUpSessionId'] = 'A valid follow-up Session id is required.';
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid visit report header.');
        }
    }

    /**
     * @param array<string,mixed> $data
     * @throws SessionValidationException
     */
    public function validateItem(string $section, array $data): void
    {
        $errors = [];
        if (!VisitSection::isValid($section)) {
            $errors['section'] = 'Unknown section: ' . $section;
        }
        $title = trim((string)($data['title'] ?? ''));
        if ($title === '') {
            $errors['title'] = 'A title is required for this item.';
        } elseif (mb_strlen($title) > self::MAX_TITLE) {
            $errors['title'] = 'Title is too long.';
        }
        foreach (['detail' => $data['detail'] ?? null, 'impact' => $data['impact'] ?? null] as $field => $value) {
            if ($value !== null && mb_strlen((string)$value) > self::MAX_TEXT) {
                $errors[$field] = 'This field is too long.';
            }
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid visit item.');
        }
    }

    /**
     * @param array<string,mixed> $data
     * @throws SessionValidationException
     */
    public function validateSignoff(array $data): void
    {
        $errors = [];
        $role = (string)($data['role'] ?? '');
        if (!VisitSignoffRole::isValid($role)) {
            $errors['role'] = 'Unknown sign-off role: ' . $role;
        }
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            $errors['name'] = 'A name is required for a sign-off.';
        } elseif (mb_strlen($name) > self::MAX_NAME) {
            $errors['name'] = 'Name is too long.';
        }
        if (isset($data['designation']) && $data['designation'] !== null && mb_strlen((string)$data['designation']) > self::MAX_DESIGNATION) {
            $errors['designation'] = 'Designation is too long.';
        }
        if (isset($data['signatureRef']) && $data['signatureRef'] !== null && mb_strlen((string)$data['signatureRef']) > self::MAX_SIGNATURE_REF) {
            $errors['signatureRef'] = 'Signature reference is too long.';
        }

        if ($errors) {
            throw new SessionValidationException(json_encode($errors) ?: 'Invalid sign-off.');
        }
    }

    /**
     * ISSUE preconditions. Order matters: the Session state is a conflict,
     * the missing fields are structured validation.
     *
     * @param array<string,mixed> $sessionRow
     * @param array<string,mixed> $reportRow
     * @throws SessionConflictException|SessionValidationException
     */
    public function assertIssuable(array $sessionRow, array $reportRow): void
    {
        if ((string)($sessionRow['status'] ?? '') !== SessionStatus::COMPLETED) {
            throw new SessionConflictException(
                'VISIT_SESSION_NOT_COMPLETED: The visit Session must be COMPLETED before the report can be issued.'
            );
        }

        $errors = [];
        $enrolment = $reportRow['categories_item_id'] ?? null;
        if ($enrolment === null || (int)$enrolment <= 0) {
            $errors['categoriesItemId'] = 'An enrolment (programme/cohort) is required to issue the report.';
        }
        $actualDate = $reportRow['actual_visit_date'] ?? null;
        if ($actualDate === null || (string)$actualDate === '') {
            $errors['actualVisitDate'] = 'The actual visit date is required to issue the report.';
        }

        if ($errors) {
            $code = isset($errors['categoriesItemId']) ? 'VISIT_ENROLMENT_REQUIRED' : 'VISIT_ACTUAL_DATE_REQUIRED';
            throw new SessionValidationException($code . ': ' . json_encode($errors));
        }
    }
}
