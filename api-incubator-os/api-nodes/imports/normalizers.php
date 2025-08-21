<?php
declare(strict_types=1);

/** Trim, collapse spaces */
function clean_str(?string $s): ?string {
    if ($s === null) return null;
    $s = trim($s);
    // remove enclosing quotes/spaces
    $s = preg_replace('/\s+/u', ' ', $s);
    return $s === '' ? null : $s;
}

/** Parse "Yes"/"No" -> bool(1/0) */
function yn(?string $s): int {
    $s = strtolower(trim((string)$s));
    return (int) in_array($s, ['y','yes','true','1','valid'], true);
}

/** Extract email if string like "Name <email@x.com>" */
function extract_email(?string $s): ?string {
    if ($s === null) return null;
    if (preg_match('/<\s*([^>]+@[^>]+)\s*>/u', $s, $m)) return strtolower(trim($m[1]));
    // fallback to raw email if present
    if (preg_match('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/iu', $s, $m)) return strtolower($m[0]);
    return null;
}

/** Parse phone-ish text -> digits with leading + preserved if present */
function normalize_phone(?string $s): ?string {
    if ($s === null) return null;
    $s = trim($s);
    // keep + and digits
    if (preg_match('/^\+?\d[\d\s\-()]+$/', $s)) {
        return preg_replace('/[^\d+]/', '', $s);
    }
    return null;
}

/** " R281,826.00 " or " 14,236 " -> decimal string "281826.00" */
function parse_money(?string $s): ?string {
    if ($s === null) return null;
    $s = trim($s);
    // strip R, spaces, commas
    $s = preg_replace('/[R\s,]/i', '', $s);
    if ($s === '') return null;
    // ensure decimal with 2 places
    if (!str_contains($s, '.')) $s .= '.00';
    if (!is_numeric($s)) return null;
    return number_format((float)$s, 2, '.', '');
}

/** "11 March 2026" -> "2026-03-11" (returns null if not parsed) */
function parse_date(?string $s): ?string {
    if ($s === null) return null;
    $ts = strtotime($s);
    return $ts ? date('Y-m-d', $ts) : null;
}

/** Key canonicalizers */
function keyify(string $s): string {
    return strtolower(trim(preg_replace('/\s+/', ' ', $s)));
}

/** For matching companies across files by name */
function canon_company_key(?string $name): ?string {
    if ($name === null) return null;
    $n = strtolower(trim($name));
    $n = preg_replace('/\s+/',' ',$n);
    return $n;
}
