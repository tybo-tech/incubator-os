import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../../../services/service';

// ── Data shapes ───────────────────────────────────────────────────────────────

export interface IScheduleBreak {
  /** After which slot number (1-based) this break is inserted. */
  after_slot: number;
  /** Duration in minutes. */
  duration: number;
  /** Display label, e.g. "15 Minute Break". */
  label: string;
}

export interface IScheduleSlot {
  /** 1-based presentation number. */
  number: number;
  /** Linked grant applicant node id (null if manually added). */
  applicant_id: number | null;
  /** Display name for the applicant / presenter. */
  applicant_name: string;
}

/** Full schedule record — returned by GET ?action=get and POST/PUT. */
export interface IPresentationSchedule {
  id?: number;
  title: string;
  workflow_id: string;
  /** ISO date string, e.g. "2026-05-19". */
  date: string;
  location: string;
  description: string;
  /** "HH:mm" 24-hour start time of the first slot. */
  start_time: string;
  /** Duration of each presentation slot in minutes. */
  slot_duration: number;
  breaks: IScheduleBreak[];
  slots: IScheduleSlot[];
  created_at?: string;
}

/** Lightweight list item returned by GET ?action=list. */
export interface IScheduleListItem {
  id: number;
  title: string;
  workflow_id: string;
  date: string;
  location: string;
  slot_count: number;
  created_at: string;
}

// ── Computed timetable row (derived client-side from schedule data) ────────────

export interface ITimetableRow {
  type: 'slot' | 'break';
  /** Only for type=slot */
  number?: number;
  applicant_name?: string;
  applicant_id?: number | null;
  /** Only for type=break */
  label?: string;
  /** "HH:mm" */
  start_time: string;
  end_time: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PresentationScheduleService {

  private readonly base = `${Constants.ApiBase}/api-nodes/grant/schedule.php`;

  constructor(private http: HttpClient) {}

  list(workflowId?: string): Observable<IScheduleListItem[]> {
    let params = new HttpParams().set('action', 'list');
    if (workflowId) params = params.set('workflow_id', workflowId);
    return this.http.get<IScheduleListItem[]>(this.base, { params });
  }

  get(id: number): Observable<IPresentationSchedule> {
    const params = new HttpParams().set('action', 'get').set('id', id);
    return this.http.get<IPresentationSchedule>(this.base, { params });
  }

  create(schedule: Omit<IPresentationSchedule, 'id' | 'created_at'>): Observable<IPresentationSchedule> {
    return this.http.post<IPresentationSchedule>(this.base, schedule);
  }

  update(id: number, schedule: Omit<IPresentationSchedule, 'id' | 'created_at'>): Observable<IPresentationSchedule> {
    const params = new HttpParams().set('id', id);
    return this.http.put<IPresentationSchedule>(this.base, schedule, { params });
  }

  delete(id: number): Observable<{ success: boolean; deleted_id: number }> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<{ success: boolean; deleted_id: number }>(this.base, { params });
  }

  // ── Timetable computation ─────────────────────────────────────────────────

  /**
   * Builds the ordered timetable rows (slots interleaved with breaks)
   * from the raw schedule data, computing start/end times for each row.
   */
  buildTimetable(schedule: IPresentationSchedule): ITimetableRow[] {
    const rows: ITimetableRow[] = [];
    const [startH, startM] = schedule.start_time.split(':').map(Number);
    let cursor = startH * 60 + startM; // total minutes from midnight

    for (const slot of schedule.slots) {
      // Add any breaks that come before this slot (after_slot < slot.number)
      const breaksHere = schedule.breaks.filter(b => b.after_slot === slot.number - 1);
      for (const brk of breaksHere) {
        rows.push({
          type: 'break',
          label: brk.label,
          start_time: this._fmtTime(cursor),
          end_time: this._fmtTime(cursor + brk.duration),
        });
        cursor += brk.duration;
      }

      rows.push({
        type: 'slot',
        number: slot.number,
        applicant_id: slot.applicant_id,
        applicant_name: slot.applicant_name,
        start_time: this._fmtTime(cursor),
        end_time: this._fmtTime(cursor + schedule.slot_duration),
      });
      cursor += schedule.slot_duration;
    }

    // Trailing breaks (after last slot)
    const trailing = schedule.breaks.filter(b => b.after_slot >= schedule.slots.length);
    for (const brk of trailing) {
      rows.push({
        type: 'break',
        label: brk.label,
        start_time: this._fmtTime(cursor),
        end_time: this._fmtTime(cursor + brk.duration),
      });
      cursor += brk.duration;
    }

    return rows;
  }

  private _fmtTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
