import { Injectable } from '@angular/core';

/**
 * Persists per-screen view preferences (view mode, filters, sort, grouping,
 * expansion) to localStorage so a browser refresh — or navigating away and
 * coming back — restores the user's settings.
 *
 * Convention (see AGENTS.md "View persistence"): every list/table view must
 * keep its view state in localStorage via this service, keyed by feature and
 * company so different companies keep independent settings.
 */
@Injectable({ providedIn: 'root' })
export class ViewStateService {
  private readonly prefix = 'ios:view:';

  /**
   * Merge persisted state over the given defaults. Always returns a complete
   * object; malformed/absent storage falls back to defaults.
   */
  load<T extends object>(key: string, defaults: T): T {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<T> | null;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }

  /**
   * Best-effort save — silently ignores storage being unavailable or full
   * (private browsing, quota) so persistence never breaks the UI.
   */
  save<T extends object>(key: string, state: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(state));
    } catch {
      /* storage unavailable — persistence is best-effort */
    }
  }

  clear(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      /* ignore */
    }
  }

  /** Safe coercion for a persisted value that should be an array (e.g. Set contents). */
  array<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }
}
