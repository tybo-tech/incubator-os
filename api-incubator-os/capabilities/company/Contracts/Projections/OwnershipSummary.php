<?php
declare(strict_types=1);

/**
 * Explainable ownership result for a company.
 *
 * Mirrors the flags written by CompanyRepository::recalculateOwnership(), but
 * also carries the reasoning and the director IDs behind each flag so the UI
 * can show why a flag is on or off.
 */
final class OwnershipSummary
{
    /**
     * @param DirectorSummary[] $directors
     */
    public function __construct(
        public readonly bool $blackOwnership,
        public readonly bool $blackWomenOwnership,
        public readonly bool $youthOwned,
        public readonly string $blackReason,
        public readonly string $blackWomenReason,
        public readonly string $youthReason,
        public readonly array $blackDirectorIds,
        public readonly array $blackWomenDirectorIds,
        public readonly array $youthDirectorIds,
        public readonly array $unknownYouthDirectorIds,
    ) {}

    /**
     * @param DirectorSummary[] $directors
     */
    public static function fromDirectors(array $directors): self
    {
        $black = self::filter($directors, fn(DirectorSummary $d) => $d->isBlack);
        $blackWomen = self::filter($directors, fn(DirectorSummary $d) => $d->isBlackWoman);
        $youth = self::filter($directors, fn(DirectorSummary $d) => $d->isYouth);
        $unknownYouth = self::filter($directors, fn(DirectorSummary $d) => $d->age === null);

        return new self(
            blackOwnership: count($black) > 0,
            blackWomenOwnership: count($blackWomen) > 0,
            youthOwned: count($youth) > 0,
            blackReason: self::blackReason($black, $directors),
            blackWomenReason: self::blackWomenReason($blackWomen, $black, $directors),
            youthReason: self::youthReason($youth, $unknownYouth, $directors),
            blackDirectorIds: self::ids($black),
            blackWomenDirectorIds: self::ids($blackWomen),
            youthDirectorIds: self::ids($youth),
            unknownYouthDirectorIds: self::ids($unknownYouth),
        );
    }

    /** @param DirectorSummary[] $directors */
    private static function filter(array $directors, callable $predicate): array
    {
        return array_values(array_filter($directors, $predicate));
    }

    /** @param DirectorSummary[] $directors */
    private static function ids(array $directors): array
    {
        return array_map(fn(DirectorSummary $d) => $d->directorId, $directors);
    }

    /** @param DirectorSummary[] $directors */
    private static function names(array $directors): string
    {
        return implode(', ', array_map(fn(DirectorSummary $d) => $d->fullName, $directors));
    }

    /**
     * @param DirectorSummary[] $black
     * @param DirectorSummary[] $all
     */
    private static function blackReason(array $black, array $all): string
    {
        if (count($black) > 0) {
            return sprintf(
                'Set by %s (%s).',
                self::names($black),
                implode(', ', array_unique(array_filter(array_map(
                    fn(DirectorSummary $d) => $d->race,
                    $black
                ))))
            );
        }

        if (count($all) === 0) {
            return 'No active directors on the roster.';
        }

        $missingRace = self::filter($all, fn(DirectorSummary $d) => !$d->race);
        if (count($missingRace) === count($all)) {
            return 'No director has a race captured, so black ownership cannot be determined.';
        }

        return 'No active director is recorded as Black, Coloured or Indian.';
    }

    /**
     * @param DirectorSummary[] $blackWomen
     * @param DirectorSummary[] $black
     * @param DirectorSummary[] $all
     */
    private static function blackWomenReason(array $blackWomen, array $black, array $all): string
    {
        if (count($blackWomen) > 0) {
            return sprintf('Set by %s (Black, female).', self::names($blackWomen));
        }

        if (count($all) === 0) {
            return 'No active directors on the roster.';
        }

        if (count($black) === 0) {
            return 'No Black female director — no director is recorded as Black.';
        }

        return sprintf(
            'No Black female director — %s recorded without a female gender.',
            self::names($black)
        );
    }

    /**
     * @param DirectorSummary[] $youth
     * @param DirectorSummary[] $unknownYouth
     * @param DirectorSummary[] $all
     */
    private static function youthReason(array $youth, array $unknownYouth, array $all): string
    {
        if (count($youth) > 0) {
            return sprintf(
                'Set by %s — under 40.',
                implode(', ', array_map(
                    fn(DirectorSummary $d) => sprintf('%s (%d)', $d->fullName, (int)$d->age),
                    $youth
                ))
            );
        }

        if (count($all) === 0) {
            return 'No active directors on the roster.';
        }

        if (count($unknownYouth) === count($all)) {
            return 'Age unknown for every director — capture a valid 13-digit SA ID to determine youth status.';
        }

        $known = self::filter($all, fn(DirectorSummary $d) => $d->age !== null);
        $closest = null;
        foreach ($known as $director) {
            if ($closest === null || (int)$director->age < (int)$closest->age) {
                $closest = $director;
            }
        }

        $reason = $closest
            ? sprintf('No director under 40 (closest: %s, %d).', $closest->fullName, (int)$closest->age)
            : 'No director under 40.';

        if (count($unknownYouth) > 0) {
            $reason .= sprintf(
                ' Age unknown for %s — capture a valid SA ID.',
                self::names($unknownYouth)
            );
        }

        return $reason;
    }
}
