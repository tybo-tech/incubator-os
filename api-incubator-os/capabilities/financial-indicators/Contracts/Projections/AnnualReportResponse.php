<?php
declare(strict_types=1);

final class AnnualReportResponse implements JsonSerializable
{
    private const MONTH_ORDER = [
        'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December', 'January', 'February'
    ];

    public function __construct(
        public readonly int $year,
        public readonly array $months,
    ) {}

    public static function fromData(int $year, array $monthlyData): self
    {
        $months = [];
        foreach (self::MONTH_ORDER as $monthName) {
            $monthNum = self::monthNameToNumber($monthName);
            if (isset($monthlyData[$monthNum])) {
                $months[$monthName] = $monthlyData[$monthNum];
            } else {
                $months[$monthName] = new AnnualMonthData();
            }
        }
        return new self(year: $year, months: $months);
    }

    private static function monthNameToNumber(string $name): int
    {
        $map = [
            'March' => 3, 'April' => 4, 'May' => 5, 'June' => 6,
            'July' => 7, 'August' => 8, 'September' => 9, 'October' => 10,
            'November' => 11, 'December' => 12, 'January' => 1, 'February' => 2
        ];
        return $map[$name] ?? 0;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'year' => $this->year,
            'months' => $this->months,
        ];
    }
}
