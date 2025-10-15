export interface YearGroup {
  id: number;
  name: string; // e.g. "FY 2024/2025"
  startMonth: number; // 3 for March
  endMonth: number; // 2 for February
  expanded: boolean;
  isActive: boolean;
  accounts: AccountRecord[];
}

export interface AccountRecord {
  id: number;
  accountName: string;
  months: { [key: string]: number | null }; // { m1: 0, m2: 0, ..., m12: 0 }
  total: number;
}

export interface MonthDisplay {
  key: string; // m1, m2, etc.
  label: string; // Mar, Apr, etc.
  monthNumber: number; // 3, 4, etc.
}