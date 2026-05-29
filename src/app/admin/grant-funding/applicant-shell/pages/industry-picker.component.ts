import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  signal, HostListener, inject, ElementRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { IndustryService } from '../../../../../services/industry.service';
import { Industry } from '../../../../../models/simple.schema';

export interface IndustrySelection {
  id: number;
  name: string;
}

@Component({
  selector: 'app-industry-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" #triggerRef>

      <!-- Selected chip / trigger -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          (click)="toggle()"
          class="flex-1 text-left flex items-center gap-2 px-3 py-2 text-sm border rounded-lg
                 transition-colors bg-white
                 {{ isOpen() ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400' }}">
          <span *ngIf="currentName(); else placeholder"
                class="flex-1 truncate text-gray-900 font-medium">
            {{ currentName() }}
          </span>
          <ng-template #placeholder>
            <span class="flex-1 truncate text-gray-400">Select or create industry…</span>
          </ng-template>
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform"
               [class.rotate-180]="isOpen()"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <!-- Clear button -->
        <button *ngIf="currentId()"
                type="button"
                (click)="clear()"
                title="Clear industry"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                       hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Dropdown panel — rendered fixed to escape overflow:hidden parents -->
      <div *ngIf="isOpen()"
           [style.position]="'fixed'"
           [style.top.px]="dropdownTop()"
           [style.left.px]="dropdownLeft()"
           [style.width.px]="dropdownWidth()"
           [style.z-index]="9999"
           class="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">

        <!-- Search input -->
        <div class="p-2 border-b border-gray-100">
          <div class="relative">
            <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              #searchInput
              type="text"
              [(ngModel)]="query"
              (ngModelChange)="onQueryChange($event)"
              (keydown.enter)="onSearchEnter(); $event.preventDefault()"
              placeholder="Search industries…"
              class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
        </div>

        <!-- Results -->
        <ul class="max-h-52 overflow-y-auto divide-y divide-gray-50">

          <!-- Loading -->
          <li *ngIf="isSearching()" class="px-3 py-4 text-center">
            <span class="text-xs text-gray-400">
              <svg class="inline w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
              </svg>
              Searching…
            </span>
          </li>

          <!-- Industry row -->
          <li *ngFor="let ind of results()"
              class="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer group transition-colors"
              [class.bg-blue-50]="ind.id === currentId()"
              (click)="select(ind)">

            <span class="flex-1 text-sm truncate"
                  [class.font-semibold]="ind.id === currentId()"
                  [class.text-blue-700]="ind.id === currentId()">
              {{ ind.name }}
            </span>

            <!-- Rename inline -->
            <ng-container *ngIf="renamingId() === ind.id; else renameBtn">
              <input
                type="text"
                [(ngModel)]="renameValue"
                (click)="$event.stopPropagation()"
                (keydown.enter)="saveRename(ind); $event.preventDefault()"
                (keydown.escape)="cancelRename(); $event.preventDefault()"
                class="w-36 px-2 py-1 text-xs border border-violet-400 rounded-md
                       focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="New name">
              <button type="button" (click)="saveRename(ind); $event.stopPropagation()"
                      class="text-xs text-violet-600 hover:text-violet-800 font-medium px-1">
                Save
              </button>
              <button type="button" (click)="cancelRename(); $event.stopPropagation()"
                      class="text-xs text-gray-400 hover:text-gray-600 px-1">
                ✕
              </button>
            </ng-container>
            <ng-template #renameBtn>
              <button type="button"
                      (click)="startRename(ind); $event.stopPropagation()"
                      title="Rename"
                      class="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400
                             hover:text-violet-600 hover:bg-violet-50 transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
            </ng-template>
          </li>

          <!-- No results + create option -->
          <li *ngIf="!isSearching() && results().length === 0 && query.trim()"
              class="px-3 py-3">
            <button type="button"
                    (click)="createNew()"
                    [disabled]="isCreating()"
                    class="w-full flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900
                           font-medium transition-colors disabled:opacity-50">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span *ngIf="!isCreating()">Create "{{ query.trim() }}"</span>
              <span *ngIf="isCreating()">Creating…</span>
            </button>
          </li>

          <!-- Empty (no query yet) -->
          <li *ngIf="!isSearching() && results().length === 0 && !query.trim()"
              class="px-3 py-4 text-center text-xs text-gray-400">
            Start typing to search…
          </li>
        </ul>

        <!-- Create footer hint -->
        <div *ngIf="query.trim() && !isSearching()"
             class="px-3 py-2 bg-gray-50 border-t border-gray-100">
          <button type="button"
                  (click)="createNew()"
                  [disabled]="isCreating()"
                  class="w-full flex items-center gap-2 text-xs text-emerald-700 hover:text-emerald-900
                         font-medium transition-colors disabled:opacity-50">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span *ngIf="!isCreating()">Create “{{ query.trim() }}”  &mdash; or press Enter</span>
            <span *ngIf="isCreating()">Creating…</span>
          </button>
        </div>
        <div *ngIf="!query.trim() && !isSearching() && results().length > 0"
             class="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          Type a new name and press Enter to create it
        </div>
      </div>
    </div>
  `
})
export class IndustryPickerComponent implements OnInit, OnDestroy {
  @Input() set industryId(val: number | null | undefined) { this.currentId.set(val ?? null); }
  @Input() set industryName(val: string | null | undefined) { this.currentName.set(val ?? null); }
  @Output() industryChanged = new EventEmitter<IndustrySelection | null>();

  @ViewChild('triggerRef') triggerRef!: ElementRef<HTMLElement>;

  currentId = signal<number | null>(null);
  currentName = signal<string | null>(null);
  isOpen = signal(false);
  isSearching = signal(false);
  isCreating = signal(false);
  results = signal<Industry[]>([]);
  renamingId = signal<number | null>(null);
  renameValue = '';
  query = '';

  dropdownTop = signal(0);
  dropdownLeft = signal(0);
  dropdownWidth = signal(240);

  private search$ = new Subject<string>();
  private readonly industrySvc = inject(IndustryService);
  private readonly elRef = inject(ElementRef);

  private updateDropdownPosition(): void {
    const rect = this.triggerRef?.nativeElement?.getBoundingClientRect();
    if (!rect) return;
    this.dropdownTop.set(rect.bottom + 4);
    this.dropdownLeft.set(rect.left);
    this.dropdownWidth.set(rect.width);
  }

  @HostListener('window:scroll', ['$event'])
  @HostListener('window:resize')
  onScrollOrResize(): void {
    if (this.isOpen()) this.updateDropdownPosition();
  }

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        this.isSearching.set(true);
        return this.industrySvc.listIndustries({ search: q || undefined, limit: 30, parent_id: null }).pipe(
          catchError(() => of({ data: [] as any[], pagination: {} as any }))
        );
      })
    ).subscribe(resp => {
      this.results.set(resp.data.map((n: any) => n.data as Industry));
      this.isSearching.set(false);
    });
  }

  ngOnDestroy(): void {
    this.search$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggle(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    } else {
      this.updateDropdownPosition();
      this.isOpen.set(true);
      this.query = '';
      this.results.set([]);
      this.search$.next('');
      // focus search after render
      setTimeout(() => {
        const input = document.querySelector('app-industry-picker input[placeholder="Search industries…"]') as HTMLInputElement;
        input?.focus();
      }, 50);
    }
  }

  onQueryChange(q: string): void {
    this.search$.next(q);
  }

  onSearchEnter(): void {
    if (!this.query.trim() || this.isCreating()) return;
    // If exactly one result matches the query, select it
    const exact = this.results().find(r => r.name.toLowerCase() === this.query.trim().toLowerCase());
    if (exact) { this.select(exact); return; }
    // Otherwise create new
    this.createNew();
  }

  select(ind: Industry): void {
    this.currentId.set(ind.id);
    this.currentName.set(ind.name);
    this.industryChanged.emit({ id: ind.id, name: ind.name });
    this.isOpen.set(false);
    this.query = '';
  }

  clear(): void {
    this.currentId.set(null);
    this.currentName.set(null);
    this.industryChanged.emit(null);
  }

  startRename(ind: Industry): void {
    this.renamingId.set(ind.id);
    this.renameValue = ind.name;
  }

  cancelRename(): void {
    this.renamingId.set(null);
    this.renameValue = '';
  }

  saveRename(ind: Industry): void {
    const newName = this.renameValue.trim();
    if (!newName || newName === ind.name) { this.cancelRename(); return; }

    this.industrySvc.updateIndustry(ind.id, { name: newName }).subscribe({
      next: (node) => {
        // Update result in list
        this.results.update(list => list.map(i => i.id === ind.id ? { ...i, name: newName } : i));
        // If this was the selected one, update display
        if (this.currentId() === ind.id) {
          this.currentName.set(newName);
          this.industryChanged.emit({ id: ind.id, name: newName });
        }
        this.cancelRename();
      },
      error: () => this.cancelRename()
    });
  }

  createNew(): void {
    const name = this.query.trim();
    if (!name) return;

    this.isCreating.set(true);
    this.industrySvc.addIndustry({ name }).subscribe({
      next: (node) => {
        const created = node.data as Industry;
        this.isCreating.set(false);
        this.select(created);
      },
      error: () => this.isCreating.set(false)
    });
  }
}
