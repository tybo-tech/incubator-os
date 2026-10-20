import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../../shared/components/app-icon/app-icon';
import { DirectorSummary } from '../../../../../../services/company-capability.service';

/**
 * Director table — same table language as the Financial Indicators list.
 */
@Component({
  selector: 'app-director-roster',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Director</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Race / Gender</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Age</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SA ID</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ownership</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let director of directors()" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">{{ director.fullName }}</div>
                <div class="text-xs text-gray-500 truncate max-w-[220px]">
                  {{ director.email || director.phone || '—' }}
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">{{ director.role }}</td>
              <td class="px-4 py-3">
                <div class="text-sm text-gray-900">{{ director.race || '—' }}</div>
                <div class="text-xs text-gray-500">{{ director.gender || 'Not captured' }}</div>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="text-sm" [class.text-gray-900]="director.idValid" [class.text-gray-400]="!director.idValid">
                  {{ director.age !== null ? director.age : '—' }}
                </div>
                <div *ngIf="!director.idValid" class="text-[11px] text-amber-600" title="Age is derived from a valid 13-digit SA ID">
                  no valid ID
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-xs" [class.text-gray-900]="director.idValid" [class.text-gray-400]="!director.idValid">
                  {{ director.idNumber || '—' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span
                    *ngFor="let chip of chips(director)"
                    [ngClass]="chip.className"
                    class="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full">
                    {{ chip.label }}
                  </span>
                  <span *ngIf="chips(director).length === 0" class="text-xs text-gray-400">No contribution</span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end space-x-1">
                  <button
                    type="button"
                    (click)="edit.emit(director)"
                    class="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="Edit director"
                    [attr.aria-label]="'Edit ' + director.fullName">
                    <app-icon name="pencil-square" class="text-[16px]"></app-icon>
                  </button>
                  <button
                    type="button"
                    (click)="remove.emit(director)"
                    class="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Remove director"
                    [attr.aria-label]="'Remove ' + director.fullName">
                    <app-icon name="trash" class="text-[16px]"></app-icon>
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="directors().length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-gray-500">
                <app-icon name="users" class="text-[32px] text-gray-300"></app-icon>
                <p class="mt-2 text-sm">No directors registered yet.</p>
                <p class="text-xs text-gray-400">Click "Add Director" to build the roster.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class DirectorRosterComponent {
  directors = input.required<DirectorSummary[]>();
  edit = output<DirectorSummary>();
  remove = output<DirectorSummary>();

  chips(director: DirectorSummary): Array<{ label: string; className: string }> {
    const chips: Array<{ label: string; className: string }> = [];

    if (director.isBlack) {
      chips.push({ label: 'Black', className: 'bg-blue-100 text-blue-700' });
    }
    if (director.isBlackWoman) {
      chips.push({ label: 'Black woman', className: 'bg-purple-100 text-purple-700' });
    }
    if (director.isYouth) {
      chips.push({ label: 'Youth', className: 'bg-green-100 text-green-700' });
    }
    if (director.idValid && director.age !== null && !director.isYouth) {
      chips.push({ label: `${director.age} yrs`, className: 'bg-gray-100 text-gray-600' });
    }

    return chips;
  }
}
