import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrantFundingStateService } from './services/grant-funding-state.service';

@Component({
  selector: 'app-grant-funding-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Status pills -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        (click)="state.setStatusFilter('')"
        [class]="state.pillClass('gray', state.activeStatusFilter() === '')"
      >
        All
        <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
          {{ state.applications().length }}
        </span>
      </button>
      <button
        *ngFor="let stage of state.workflowStages()"
        (click)="state.setStatusFilter(stage.key)"
        [class]="state.pillClass(stage.color, state.activeStatusFilter() === stage.key)"
      >
        {{ stage.label }}
        <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
          {{ state.stageCount(stage.key) }}
        </span>
      </button>
    </div>

    <!-- Search + turnover toggles + sort -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <input
        type="text"
        placeholder="Search by company name\u2026"
        [(ngModel)]="state.searchQuery"
        (input)="state.applyFilter()"
        class="flex-1 min-w-[180px] max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm
               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      <button
        (click)="state.toggleHasTurnover()"
        [class]="state.turnoverToggleClass(state.hasTurnoverFilter())"
      >
        <i class="fas fa-chart-simple text-xs"></i>
        Has turnover
        <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
          {{ state.countHasTurnover() }}
        </span>
      </button>

      <button
        (click)="state.toggleUnder1M()"
        [class]="state.turnoverToggleClass(state.under1MFilter())"
      >
        <i class="fas fa-money-bill-1 text-xs"></i>
        R1M & under
        <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
          {{ state.countUnder1M() }}
        </span>
      </button>

      <button
        (click)="state.toggleHas12Months()"
        [class]="state.turnoverToggleClass(state.has12MonthsFilter())"
      >
        <i class="fas fa-calendar text-xs"></i>
        12+ months
        <span class="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums">
          {{ state.countHas12Months() }}
        </span>
      </button>

      <div class="flex items-center gap-1 ml-auto">
        <select
          [(ngModel)]="state.sortField"
          (change)="state.applyFilter()"
          class="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-700
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="name">Company name</option>
          <option value="turnover">Turnover</option>
        </select>
        <button
          (click)="state.toggleSortDir()"
          class="p-2 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50
                 hover:border-gray-400 transition-colors"
          [title]="state.sortDir === 'asc' ? 'Ascending' : 'Descending'"
        >
          <i *ngIf="state.sortDir === 'asc'" class="fas fa-arrow-up-wide-short text-xs"></i>
          <i *ngIf="state.sortDir === 'desc'" class="fas fa-arrow-down-wide-short text-xs"></i>
        </button>
      </div>
    </div>
  `,
})
export class GrantFundingFiltersComponent {
  state = inject(GrantFundingStateService);
}
