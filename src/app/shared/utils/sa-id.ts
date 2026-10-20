/**
 * South African ID number helpers (YYMMDD SSSS C A Z).
 *
 * The only identity fields the platform can verify without a Home Affairs
 * lookup are the date of birth (digits 1-6), gender (digits 7-10) and the
 * Luhn checksum (digit 13). Everything derived here is a calculation, never a
 * stored value, so the UI can always explain where a number came from.
 */

export interface SaIdDetails {
  raw: string;
  valid: boolean;
  dateOfBirth: string | null;
  age: number | null;
  isYouth: boolean;
  gender: 'Female' | 'Male' | null;
  /** Human-readable reason when the ID cannot be used. */
  problem: string | null;
}

const EMPTY: SaIdDetails = {
  raw: '',
  valid: false,
  dateOfBirth: null,
  age: null,
  isYouth: false,
  gender: null,
  problem: 'No SA ID captured',
};

export function parseSaId(raw: string | null | undefined): SaIdDetails {
  const value = (raw ?? '').trim();
  if (!value) return { ...EMPTY };

  if (!/^\d+$/.test(value)) {
    return { ...EMPTY, raw: value, problem: 'SA ID must contain digits only' };
  }

  if (value.length !== 13) {
    return {
      ...EMPTY,
      raw: value,
      problem: `SA ID must be 13 digits (currently ${value.length})`,
    };
  }

  if (!passesLuhn(value)) {
    return { ...EMPTY, raw: value, problem: 'SA ID checksum failed — check for a typo' };
  }

  const yy = Number(value.slice(0, 2));
  const mm = Number(value.slice(2, 4));
  const dd = Number(value.slice(4, 6));

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return { ...EMPTY, raw: value, problem: 'SA ID contains an invalid date of birth' };
  }

  const currentYY = new Date().getFullYear() % 100;
  const century = yy > currentYY ? 1900 : 2000;
  const year = century + yy;

  const dob = new Date(Date.UTC(year, mm - 1, dd));
  if (
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== mm - 1 ||
    dob.getUTCDate() !== dd
  ) {
    return { ...EMPTY, raw: value, problem: 'SA ID contains an invalid date of birth' };
  }

  const today = new Date();
  if (dob.getTime() > today.getTime()) {
    return { ...EMPTY, raw: value, problem: 'SA ID date of birth is in the future' };
  }

  const age = calculateAge(dob);
  if (age > 120) {
    return { ...EMPTY, raw: value, problem: 'SA ID date of birth is not plausible' };
  }

  const genderSequence = Number(value.slice(6, 10));

  return {
    raw: value,
    valid: true,
    dateOfBirth: `${year}-${pad(mm)}-${pad(dd)}`,
    age,
    isYouth: age < 40,
    gender: genderSequence < 5000 ? 'Female' : 'Male',
    problem: null,
  };
}

export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = today.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/** Luhn checksum used by the 13th digit of a South African ID. */
export function passesLuhn(idNumber: string): boolean {
  let sum = 0;
  let double = false;

  for (let i = idNumber.length - 1; i >= 0; i--) {
    let digit = Number(idNumber[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

/**
 * BBBEE race grouping — Coloured and Indian directors also count towards
 * black ownership. Mirrors DirectorSummary::isBlackRace() on the backend.
 */
export function isBlackRace(race: string | null | undefined): boolean {
  const value = (race ?? '').trim().toLowerCase();
  return ['black', 'african', 'coloured', 'indian'].includes(value);
}

export function isFemale(gender: string | null | undefined): boolean {
  return (gender ?? '').trim().toLowerCase() === 'female';
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
