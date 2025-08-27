import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { GroupingStateService } from './grouping-state.service';
import { BreadcrumbItem } from './types';
import { ICategory } from '../../../models/simple.schema';
import { catchError, EMPTY, switchMap } from 'rxjs';

@Component({
  selector: 'app-top-bar-context',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <!-- Breadcrumb -->
      <div class="mb-4">
        <nav class="flex" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-2">
            @if (breadcrumbItems().length === 0) {
              <li class="text-gray-500">
                <span class="text-sm">Select a client to begin</span>
              </li>
            }
            @for (item of breadcrumbItems(); track item.id; let isLast = $last) {
              <li class="flex items-center">
                @if (!isLast) {
                  <span class="text-gray-900 text-sm font-medium">{{ item.name }}</span>
                  <svg class="h-5 w-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else {
                  <span class="text-gray-500 text-sm">{{ item.name }}</span>
                }
              </li>
            }
          </ol>
        </nav>
      </div>

      <!-- Context Pickers -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Client Picker -->
        <div>
          <label for="client-select" class="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          <select
            id="client-select"
            [(ngModel)]="selectedClientId"
            (ngModelChange)="onClientChange($event)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            [disabled]="isLoadingClients()"
          >
            <option value="">Select a client...</option>
            @for (client of clients(); track client.id) {
              <option [value]="client.id">{{ client.name }}</option>
            }
          </select>
          @if (isLoadingClients()) {
            <div class="mt-1 text-xs text-gray-500">Loading clients...</div>
          }
        </div>

        <!-- Program Picker -->
        <div>
          <label for="program-select" class="block text-sm font-medium text-gray-700 mb-1">
            Program
          </label>
          <select
            id="program-select"
            [(ngModel)]="selectedProgramId"
            (ngModelChange)="onProgramChange($event)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            [disabled]="!selectedClientId || isLoadingPrograms()"
          >
            <option value="">Select a program...</option>
            @for (program of programs(); track program.id) {
              <option [value]="program.id">{{ program.name }}</option>
            }
          </select>
          @if (isLoadingPrograms()) {
            <div class="mt-1 text-xs text-gray-500">Loading programs...</div>
          }
        </div>

        <!-- Cohort Picker -->
        <div>
          <label for="cohort-select" class="block text-sm font-medium text-gray-700 mb-1">
            Cohort
          </label>
          <select
            id="cohort-select"
            [(ngModel)]="selectedCohortId"
            (ngModelChange)="onCohortChange($event)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            [disabled]="!selectedProgramId || isLoadingCohorts()"
          >
            <option value="">Select a cohort...</option>
            @for (cohort of cohorts(); track cohort.id) {
              <option [value]="cohort.id">{{ cohort.name }}</option>
            }
          </select>
          @if (isLoadingCohorts()) {
            <div class="mt-1 text-xs text-gray-500">Loading cohorts...</div>
          }
        </div>
      </div>
    </div>
  `
})
export class TopBarContextComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private groupingState = inject(GroupingStateService);
  private route = inject(ActivatedRoute);

  // Loading states
  isLoadingClients = signal(false);
  isLoadingPrograms = signal(false);
  isLoadingCohorts = signal(false);
  isLoadingBreadcrumb = signal(false);

  // Data
  clients = signal<ICategory[]>([]);
  programs = signal<ICategory[]>([]);
  cohorts = signal<ICategory[]>([]);
  breadcrumbItems = signal<BreadcrumbItem[]>([]);

  // Current selections
  selectedClientId = signal<number | null>(null);
  selectedProgramId = signal<number | null>(null);
  selectedCohortId = signal<number | null>(null);

  private context = this.groupingState.context;

  constructor() {
    // Sync internal state with global context
    effect(() => {
      const ctx = this.context();
      this.selectedClientId.set(ctx.clientId);
      this.selectedProgramId.set(ctx.programId);
      this.selectedCohortId.set(ctx.cohortId);
    });

    // Load programs when client changes
    effect(() => {
      const clientId = this.selectedClientId();
      if (clientId) {
        this.loadPrograms(clientId);
      } else {
        this.programs.set([]);
      }
    });

    // Load cohorts when program changes
    effect(() => {
      const programId = this.selectedProgramId();
      if (programId) {
        this.loadCohorts(programId);
      } else {
        this.cohorts.set([]);
      }
    });

    // Load breadcrumb when any selection changes
    effect(() => {
      const cohortId = this.selectedCohortId();
      const programId = this.selectedProgramId();
      const clientId = this.selectedClientId();

      const deepestId = cohortId || programId || clientId;
      if (deepestId) {
        this.loadBreadcrumb(deepestId);
      } else {
        this.breadcrumbItems.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.loadClients();

    // Load from query params on init
    this.route.queryParams.subscribe(params => {
      if (params['clientId'] || params['programId'] || params['cohortId']) {
        this.groupingState.updateContext({
          clientId: params['clientId'] ? +params['clientId'] : null,
          programId: params['programId'] ? +params['programId'] : null,
          cohortId: params['cohortId'] ? +params['cohortId'] : null
        });
      }
    });
  }

  onClientChange(clientId: string): void {
    const id = clientId ? +clientId : null;
    this.groupingState.updateContext({ clientId: id });
  }

  onProgramChange(programId: string): void {
    const id = programId ? +programId : null;
    this.groupingState.updateContext({ programId: id });
  }

  onCohortChange(cohortId: string): void {
    const id = cohortId ? +cohortId : null;
    this.groupingState.updateContext({ cohortId: id });
  }

  private loadClients(): void {
    this.isLoadingClients.set(true);
    this.categoryService.listCategories({ type: 'client', depth: 1 })
      .pipe(
        catchError(error => {
          console.error('Failed to load clients:', error);
          return EMPTY;
        })
      )
      .subscribe(clients => {
        this.clients.set(clients);
        this.isLoadingClients.set(false);
      });
  }

  private loadPrograms(clientId: number): void {
    this.isLoadingPrograms.set(true);
    this.categoryService.listProgramsForClient(clientId)
      .pipe(
        catchError(error => {
          console.error('Failed to load programs:', error);
          return EMPTY;
        })
      )
      .subscribe(programs => {
        this.programs.set(programs);
        this.isLoadingPrograms.set(false);
      });
  }

  private loadCohorts(programId: number): void {
    this.isLoadingCohorts.set(true);
    this.categoryService.listCohortsForProgram(programId)
      .pipe(
        catchError(error => {
          console.error('Failed to load cohorts:', error);
          return EMPTY;
        })
      )
      .subscribe(cohorts => {
        this.cohorts.set(cohorts);
        this.isLoadingCohorts.set(false);
      });
  }

  private loadBreadcrumb(categoryId: number): void {
    this.isLoadingBreadcrumb.set(true);
    this.categoryService.breadcrumb(categoryId)
      .pipe(
        catchError(error => {
          console.error('Failed to load breadcrumb:', error);
          return EMPTY;
        })
      )
      .subscribe(items => {
        this.breadcrumbItems.set(items);
        this.isLoadingBreadcrumb.set(false);
      });
  }
}
