import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { GrantApplicationService } from '../services/grant-application.service';
import { IGrantApplicationData } from '../interfaces/grant-application.interfaces';
import { WorkflowService } from '../services/workflow.service';

@Component({
  selector: 'app-applicant-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Shell Header -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div class="px-4 sm:px-6 lg:px-8">

          <!-- Top row: back + applicant identity -->
          <div class="flex items-center justify-between py-4 border-b border-gray-100">
            <div class="flex items-center space-x-4">
              <!-- Back -->
              <button
                (click)="navigateBack()"
                class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Back to Applications">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>

              <!-- Identity -->
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg
                            flex items-center justify-center text-white font-bold text-sm">
                  {{ initial }}
                </div>
                <div class="hidden sm:block">
                  <h1 class="text-lg font-semibold text-gray-900">
                    {{ application()?.data?.company_name || 'Loading…' }}
                  </h1>
                  <p class="text-sm text-gray-500">
                    <span *ngIf="application()?.data?.registration_number">
                      Reg: {{ application()!.data.registration_number }}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Current stage badge -->
            <div *ngIf="currentStage()" class="flex items-center gap-2">
              <span class="text-xs text-gray-400 hidden sm:inline">Current stage</span>
              <span [class]="currentStageBgClass()"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border">
                <span class="w-2 h-2 rounded-full flex-shrink-0" [class]="currentStageDotClass()"></span>
                {{ currentStage()!.label }}
              </span>
            </div>
          </div>

          <!-- Navigation Tabs removed — stages live inside the Overview workspace -->

        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex justify-center items-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span class="ml-3 text-gray-500">Loading applicant…</span>
      </div>

      <!-- Content -->
      <div *ngIf="!isLoading()" class="flex-1">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class ApplicantShellComponent implements OnInit {
  private readonly WORKFLOW_ID = 'grant-2026';

  applicantId: number = 0;
  application = signal<{ data: IGrantApplicationData; id?: number } | null>(null);
  isLoading = signal(true);

  get initial(): string {
    const name = this.application()?.data?.company_name;
    return name ? name.charAt(0).toUpperCase() : 'A';
  }

  currentStage = computed(() => {
    const status = this.application()?.data?.status;
    if (!status) return null;
    return this.workflowSvc.getWorkflow(this.WORKFLOW_ID).stages.find(s => s.key === status) ?? null;
  });

  currentStageBgClass = computed(() => {
    const color = this.currentStage()?.color ?? 'gray';
    const map: Record<string, string> = {
      blue:   'bg-blue-50 text-blue-700 border-blue-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      green:  'bg-green-50 text-green-700 border-green-200',
      teal:   'bg-teal-50 text-teal-700 border-teal-200',
      red:    'bg-red-50 text-red-700 border-red-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      gray:   'bg-gray-50 text-gray-600 border-gray-200',
    };
    return map[color] ?? map['gray'];
  });

  currentStageDotClass = computed(() => {
    const color = this.currentStage()?.color ?? 'gray';
    const map: Record<string, string> = {
      blue: 'bg-blue-500', indigo: 'bg-indigo-500', purple: 'bg-purple-500',
      orange: 'bg-orange-500', green: 'bg-green-500', teal: 'bg-teal-500',
      red: 'bg-red-500', yellow: 'bg-yellow-400', gray: 'bg-gray-400',
    };
    return map[color] ?? 'bg-gray-400';
  });

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private grantService: GrantApplicationService,
    private workflowSvc: WorkflowService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.applicantId = +params['id'];
      if (this.applicantId) {
        // Load workflow first so the stage badge resolves immediately when app data arrives
        this.workflowSvc.loadWorkflow(this.WORKFLOW_ID).subscribe(() => this.loadApplication());
      }
    });
  }

  loadApplication(): void {
    this.isLoading.set(true);
    this.grantService.getApplicationById(this.applicantId).subscribe({
      next: node => {
        this.application.set({ id: node.id, data: node.data });
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  navigateBack(): void {
    this.router.navigate(['/admin/grant-funding/applications']);
  }
}
