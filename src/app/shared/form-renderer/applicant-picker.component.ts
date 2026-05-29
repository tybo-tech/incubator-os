import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../../services/node.service';
import { IPickerConfig } from '../../admin/form-templates/interfaces/form-template.interfaces';

export interface ApplicantPickerValue {
  id: number;
  company_name: string;
  registration_number: string;
  status: string;
}

interface ApplicantNode {
  id: number;
  data: {
    company_name: string;
    registration_number: string;
    status: string;
  };
}

@Component({
  selector: 'app-applicant-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">

      <!-- Selected state -->
      <div *ngIf="selected" class="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-300
                                  rounded-xl mb-2">
        <div class="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center
                    text-violet-700 font-bold text-sm flex-shrink-0">
          {{ selected!.company_name.charAt(0) }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ selected!.company_name }}</p>
          <p class="text-xs text-gray-500">Reg: {{ selected!.registration_number }}</p>
        </div>
        <button type="button" (click)="clearSelection()"
          class="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Search input -->
      <div *ngIf="!selected" class="relative">
        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg *ngIf="!isLoading()" class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <svg *ngIf="isLoading()" class="w-4 h-4 text-violet-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <input
          type="text"
          [(ngModel)]="query"
          (input)="onQueryChange()"
          (focus)="showDropdown = true"
          [placeholder]="config?.placeholder ?? 'Search for a company...'"
          class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
      </div>

      <!-- Dropdown -->
      <div *ngIf="!selected && showDropdown && (filtered().length > 0 || (config?.allowFreeText && query.trim()))"
           class="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg
                  max-h-60 overflow-y-auto">

        <!-- Free-text option -->
        <button *ngIf="config?.allowFreeText && query.trim()"
          type="button"
          (click)="selectFreeText()"
          class="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2
                 border-b border-gray-100 text-sm">
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="text-gray-600">Use "<strong>{{ query }}</strong>" as company name</span>
        </button>

        <!-- Results -->
        <button *ngFor="let item of filtered()"
          type="button"
          (click)="selectItem(item)"
          class="w-full text-left px-4 py-2.5 hover:bg-violet-50 flex items-center gap-3 transition-colors">
          <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center
                      text-gray-600 font-bold text-xs flex-shrink-0">
            {{ item.data.company_name.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ item.data.company_name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ item.data.registration_number }}</p>
          </div>
          <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                [class]="stageBadgeClass(item.data.status)">
            {{ stageLabel(item.data.status) }}
          </span>
        </button>

        <!-- No results -->
        <div *ngIf="filtered().length === 0 && !config?.allowFreeText"
             class="px-4 py-4 text-sm text-gray-400 text-center">
          No companies found{{ query ? ' for "' + query + '"' : '' }}.
        </div>
      </div>

      <!-- Click-outside overlay -->
      <div *ngIf="showDropdown" class="fixed inset-0 z-10" (click)="showDropdown = false"></div>

    </div>
  `,
})
export class ApplicantPickerComponent implements OnInit {
  @Input() config?: IPickerConfig;
  @Input() value?: ApplicantPickerValue | null;
  @Output() valueChange = new EventEmitter<ApplicantPickerValue | null>();

  isLoading = signal(false);
  private allItems = signal<ApplicantNode[]>([]);

  query = '';
  showDropdown = false;
  selected: ApplicantPickerValue | null = null;

  filtered = computed(() => {
    const items = this.allItems();
    const q = this.query.toLowerCase().trim();
    return items.filter(a =>
      !q ||
      a.data.company_name.toLowerCase().includes(q) ||
      a.data.registration_number.toLowerCase().includes(q)
    ).slice(0, 30);
  });

  private readonly STAGE_LABELS: Record<string, string> = {
    applied: 'Applied',
    due_diligence: 'Due Diligence',
    demo: 'Pitch Workshop',
    approved: 'Approved',
    declined: 'Declined',
  };

  constructor(private nodeService: NodeService) {}

  ngOnInit(): void {
    if (this.value) this.selected = this.value;
    this.loadApplicants();
  }

  private loadApplicants(): void {
    this.isLoading.set(true);
    this.nodeService.getNodesByType('grant_application').subscribe({
      next: (nodes: any[]) => {
        let items = nodes as ApplicantNode[];
        // Apply stage filter if configured
        const stages = this.config?.stages;
        if (stages?.length) {
          items = items.filter(a => stages.includes(a.data.status));
        }
        // Sort alphabetically
        items.sort((a, b) => a.data.company_name.localeCompare(b.data.company_name));
        this.allItems.set(items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onQueryChange(): void {
    this.showDropdown = true;
  }

  selectItem(item: ApplicantNode): void {
    this.selected = {
      id: item.id,
      company_name: item.data.company_name,
      registration_number: item.data.registration_number,
      status: item.data.status,
    };
    this.query = '';
    this.showDropdown = false;
    this.valueChange.emit(this.selected);
  }

  selectFreeText(): void {
    this.selected = {
      id: 0,
      company_name: this.query.trim(),
      registration_number: '',
      status: '',
    };
    this.query = '';
    this.showDropdown = false;
    this.valueChange.emit(this.selected);
  }

  clearSelection(): void {
    this.selected = null;
    this.valueChange.emit(null);
  }

  stageLabel(status: string): string {
    return this.STAGE_LABELS[status] ?? status;
  }

  stageBadgeClass(status: string): string {
    const map: Record<string, string> = {
      applied: 'bg-blue-100 text-blue-700',
      due_diligence: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }
}
