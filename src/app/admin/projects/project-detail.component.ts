import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from './project.service';
import { Project, ProjectStatus, ProjectPriority } from './project.interfaces';

type DetailTab = 'overview' | 'tasks' | 'team' | 'budget';

interface MockTask {
  id: number;
  title: string;
  assignee: string;
  dueDate: string;
  done: boolean;
  priority: ProjectPriority;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Not found -->
    <div *ngIf="!project()" class="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <i class="fas fa-folder-open text-gray-300 text-5xl mb-4"></i>
      <p class="text-gray-500 font-semibold">Project not found</p>
      <a routerLink="/projects"
         class="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline">
        <i class="fas fa-arrow-left text-xs"></i>
        Back to Projects
      </a>
    </div>

    <!-- Detail page -->
    <div *ngIf="project() as p" class="min-h-screen bg-gray-50">

      <!-- ── Top bar ─────────────────────────────────────────────────────── -->
      <div class="bg-white border-b border-gray-200">
        <div class="px-6 pt-5 pb-0">

          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <a routerLink="/projects"
               class="hover:text-indigo-600 transition-colors flex items-center gap-1">
              <i class="fas fa-diagram-project text-[10px]"></i>
              Projects
            </a>
            <i class="fas fa-chevron-right text-[9px]"></i>
            <span class="text-gray-700 font-medium">{{ p.name }}</span>
          </nav>

          <!-- Project header -->
          <div class="flex items-start justify-between gap-4 flex-wrap pb-5">
            <div class="flex items-start gap-4">
              <!-- Icon block -->
              <div class="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-diagram-project text-indigo-600 text-lg"></i>
              </div>
              <div>
                <div class="flex items-center flex-wrap gap-2 mb-1">
                  <h1 class="text-lg font-bold text-gray-900">{{ p.name }}</h1>
                  <span [class]="statusBadge(p.status)"
                        class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                    {{ statusLabel(p.status) }}
                  </span>
                  <span [class]="priorityBadge(p.priority)"
                        class="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <i [class]="priorityIcon(p.priority) + ' text-[9px]'"></i>
                    {{ p.priority }}
                  </span>
                </div>
                <p class="text-sm text-gray-500 max-w-2xl">{{ p.description }}</p>
                <div class="flex items-center flex-wrap gap-4 mt-2 text-xs text-gray-400">
                  <span class="flex items-center gap-1">
                    <i class="fas fa-tag text-[10px]"></i> {{ p.category }}
                  </span>
                  <span class="flex items-center gap-1">
                    <i class="fas fa-calendar-plus text-[10px]"></i>
                    Started {{ p.startDate | date:'d MMM y' }}
                  </span>
                  <span class="flex items-center gap-1" [class.text-red-500]="isOverdue(p)">
                    <i class="fas fa-calendar-xmark text-[10px]"></i>
                    Due {{ p.dueDate | date:'d MMM y' }}
                    <span *ngIf="isOverdue(p)" class="font-semibold">(overdue)</span>
                  </span>
                  <span class="flex items-center gap-1">
                    <i class="fas fa-user-tie text-[10px]"></i> {{ p.manager }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <button (click)="router.navigate(['/projects'])"
                      class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg
                             hover:bg-gray-50 transition-colors flex items-center gap-2">
                <i class="fas fa-arrow-left text-xs"></i>
                Back
              </button>
              <button class="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg
                             hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold">
                <i class="fas fa-pen text-xs"></i>
                Edit
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex items-center gap-0 -mb-px">
            <button *ngFor="let tab of tabs"
                    (click)="activeTab.set(tab.id)"
                    [class]="activeTab() === tab.id
                      ? 'border-b-2 border-indigo-600 text-indigo-700 font-semibold bg-white'
                      : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'"
                    class="flex items-center gap-2 px-4 py-3 text-sm transition-colors">
              <i [class]="'fas ' + tab.icon + ' text-xs'"></i>
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Tab content ───────────────────────────────────────────────────── -->
      <div class="px-6 py-6">

        <!-- ═══ OVERVIEW TAB ═════════════════════════════════════════════════ -->
        <ng-container *ngIf="activeTab() === 'overview'">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

            <!-- Left: KPI cards -->
            <div class="lg:col-span-2 space-y-5">

              <!-- KPI row -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p class="text-2xl font-bold text-indigo-600">{{ p.progress }}%</p>
                  <p class="text-xs text-gray-500 mt-0.5">Progress</p>
                </div>
                <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p class="text-2xl font-bold text-green-600">{{ p.tasksDone }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">Tasks Done</p>
                </div>
                <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p class="text-2xl font-bold text-gray-700">{{ p.tasksTotal - p.tasksDone }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">Remaining</p>
                </div>
                <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p class="text-2xl font-bold text-amber-600">{{ p.members.length }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">Members</p>
                </div>
              </div>

              <!-- Progress detail -->
              <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-sm font-bold text-gray-700">Overall Progress</p>
                  <span class="text-sm font-bold text-indigo-600">{{ p.progress }}%</span>
                </div>
                <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500"
                       [class]="progressColor(p.progress)"
                       [style.width.%]="p.progress"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{{ p.tasksDone }} tasks completed</span>
                  <span>{{ p.tasksTotal }} total</span>
                </div>
              </div>

              <!-- Tags -->
              <div *ngIf="p.tags.length" class="bg-white rounded-xl border border-gray-200 p-5">
                <p class="text-sm font-bold text-gray-700 mb-3">
                  <i class="fas fa-tags text-indigo-400 mr-2"></i>Tags
                </p>
                <div class="flex flex-wrap gap-2">
                  <span *ngFor="let tag of p.tags"
                        class="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium border border-indigo-100">
                    # {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: Budget + timeline -->
            <div class="space-y-5">

              <!-- Budget card -->
              <div class="bg-white rounded-xl border border-gray-200 p-5">
                <p class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-wallet text-indigo-400"></i>Budget
                </p>
                <div class="space-y-3">
                  <div>
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Spent</span>
                      <span class="font-semibold text-gray-700">R {{ p.spent | number }}</span>
                    </div>
                    <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full bg-indigo-500 rounded-full"
                           [style.width.%]="p.budget ? (p.spent / p.budget * 100) : 0"></div>
                    </div>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-gray-500">Total Budget</span>
                    <span class="font-bold text-gray-800">R {{ p.budget | number }}</span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-gray-500">Remaining</span>
                    <span [class]="(p.budget - p.spent) < 0 ? 'font-bold text-red-600' : 'font-bold text-green-600'">
                      R {{ (p.budget - p.spent) | number }}
                    </span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-gray-500">Utilisation</span>
                    <span class="font-bold text-gray-700">
                      {{ p.budget ? (p.spent / p.budget * 100 | number:'1.0-0') : 0 }}%
                    </span>
                  </div>
                </div>
              </div>

              <!-- Timeline -->
              <div class="bg-white rounded-xl border border-gray-200 p-5">
                <p class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <i class="fas fa-calendar-days text-indigo-400"></i>Timeline
                </p>
                <div class="space-y-3 text-xs">
                  <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <i class="fas fa-flag text-green-500 text-[10px]"></i>
                    </div>
                    <div>
                      <p class="text-gray-400">Start Date</p>
                      <p class="font-semibold text-gray-700">{{ p.startDate | date:'d MMMM y' }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                         [class]="isOverdue(p) ? 'bg-red-50' : 'bg-amber-50'">
                      <i [class]="isOverdue(p) ? 'fas fa-triangle-exclamation text-red-500 text-[10px]' : 'fas fa-bullseye text-amber-500 text-[10px]'"></i>
                    </div>
                    <div>
                      <p class="text-gray-400">Due Date</p>
                      <p [class]="isOverdue(p) ? 'font-semibold text-red-600' : 'font-semibold text-gray-700'">
                        {{ p.dueDate | date:'d MMMM y' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <i class="fas fa-clock text-indigo-500 text-[10px]"></i>
                    </div>
                    <div>
                      <p class="text-gray-400">Created</p>
                      <p class="font-semibold text-gray-700">{{ p.createdAt | date:'d MMMM y' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- ═══ TASKS TAB ════════════════════════════════════════════════════ -->
        <ng-container *ngIf="activeTab() === 'tasks'">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p class="text-sm font-bold text-gray-700 flex items-center gap-2">
                <i class="fas fa-list-check text-indigo-500"></i>
                Tasks
                <span class="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">
                  {{ mockTasks.length }}
                </span>
              </p>
              <button class="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold
                             hover:text-indigo-800 transition-colors">
                <i class="fas fa-plus text-[10px]"></i>
                Add Task
              </button>
            </div>
            <div class="divide-y divide-gray-100">
              <div *ngFor="let task of mockTasks"
                   class="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <!-- Checkbox -->
                <div [class]="task.done
                      ? 'w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0'
                      : 'w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0'">
                  <i *ngIf="task.done" class="fas fa-check text-white text-[9px]"></i>
                </div>
                <!-- Title -->
                <div class="flex-1 min-w-0">
                  <p [class]="task.done ? 'text-sm text-gray-400 line-through' : 'text-sm text-gray-800 font-medium'">
                    {{ task.title }}
                  </p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ task.assignee }}</p>
                </div>
                <!-- Priority + due -->
                <div class="flex items-center gap-3 flex-shrink-0">
                  <span [class]="priorityBadge(task.priority)"
                        class="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:block">
                    {{ task.priority }}
                  </span>
                  <span class="text-xs text-gray-400">{{ task.dueDate | date:'d MMM' }}</span>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- ═══ TEAM TAB ═════════════════════════════════════════════════════ -->
        <ng-container *ngIf="activeTab() === 'team'">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div *ngFor="let m of project()!.members"
                 class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4
                        hover:border-indigo-300 hover:shadow-sm transition-all">
              <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center
                          text-indigo-700 font-bold text-lg flex-shrink-0">
                {{ m.name.charAt(0) }}
              </div>
              <div>
                <p class="text-sm font-bold text-gray-900">{{ m.name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ m.role }}</p>
                <div class="flex items-center gap-1.5 mt-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  <span class="text-[10px] text-green-600 font-medium">Active</span>
                </div>
              </div>
            </div>

            <!-- Add member placeholder -->
            <div class="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-5
                        flex flex-col items-center justify-center gap-2 cursor-pointer
                        hover:border-indigo-400 hover:bg-indigo-50 transition-all group min-h-[100px]">
              <div class="w-10 h-10 rounded-full bg-white border-2 border-gray-300
                          flex items-center justify-center group-hover:border-indigo-400 transition-colors">
                <i class="fas fa-plus text-gray-400 group-hover:text-indigo-500 transition-colors"></i>
              </div>
              <p class="text-xs text-gray-400 group-hover:text-indigo-600 font-medium transition-colors">
                Add Team Member
              </p>
            </div>
          </div>
        </ng-container>

        <!-- ═══ BUDGET TAB ════════════════════════════════════════════════════ -->
        <ng-container *ngIf="activeTab() === 'budget'">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <!-- Budget summary -->
            <div class="bg-white rounded-xl border border-gray-200 p-6">
              <p class="text-sm font-bold text-gray-700 mb-5 flex items-center gap-2">
                <i class="fas fa-wallet text-indigo-500"></i>Budget Summary
              </p>
              <div class="space-y-4">
                <div *ngFor="let row of budgetRows(p)"
                     class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div class="flex items-center gap-3">
                    <div [class]="'w-8 h-8 rounded-lg flex items-center justify-center ' + row.bg">
                      <i [class]="'fas ' + row.icon + ' text-sm ' + row.color"></i>
                    </div>
                    <span class="text-sm text-gray-600">{{ row.label }}</span>
                  </div>
                  <span [class]="'text-sm font-bold ' + row.color">{{ row.value }}</span>
                </div>
              </div>
            </div>

            <!-- Spend breakdown (mock) -->
            <div class="bg-white rounded-xl border border-gray-200 p-6">
              <p class="text-sm font-bold text-gray-700 mb-5 flex items-center gap-2">
                <i class="fas fa-chart-pie text-indigo-500"></i>Spend Breakdown
              </p>
              <div class="space-y-3">
                <div *ngFor="let item of spendBreakdown(p)"
                     class="flex items-center gap-3">
                  <span class="text-xs text-gray-500 w-28 flex-shrink-0">{{ item.label }}</span>
                  <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" [class]="item.color" [style.width.%]="item.pct"></div>
                  </div>
                  <span class="text-xs font-bold text-gray-700 w-10 text-right">{{ item.pct }}%</span>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

      </div>
    </div>
  `,
})
export class ProjectDetailComponent implements OnInit {
  readonly projectService = inject(ProjectService);
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  project = signal<Project | undefined>(undefined);
  activeTab = signal<DetailTab>('overview');

  tabs = [
    { id: 'overview' as DetailTab, label: 'Overview', icon: 'fa-gauge-high' },
    { id: 'tasks' as DetailTab, label: 'Tasks', icon: 'fa-list-check' },
    { id: 'team' as DetailTab, label: 'Team', icon: 'fa-users' },
    { id: 'budget' as DetailTab, label: 'Budget', icon: 'fa-wallet' },
  ];

  mockTasks: MockTask[] = [
    { id: 1, title: 'Define project scope and objectives', assignee: 'Marius W', dueDate: '2026-05-20', done: true, priority: 'high' },
    { id: 2, title: 'Set up project repository and CI/CD', assignee: 'Celamandla B', dueDate: '2026-05-25', done: true, priority: 'high' },
    { id: 3, title: 'Design wireframes and UI mockups', assignee: 'Thabo M', dueDate: '2026-06-01', done: false, priority: 'medium' },
    { id: 4, title: 'Implement user authentication module', assignee: 'Celamandla B', dueDate: '2026-06-10', done: false, priority: 'critical' },
    { id: 5, title: 'Write unit and integration tests', assignee: 'Marius W', dueDate: '2026-06-20', done: false, priority: 'medium' },
    { id: 6, title: 'Stakeholder review and sign-off', assignee: 'Nomvula D', dueDate: '2026-06-30', done: false, priority: 'high' },
    { id: 7, title: 'Deploy to staging environment', assignee: 'Celamandla B', dueDate: '2026-07-05', done: false, priority: 'medium' },
    { id: 8, title: 'User acceptance testing (UAT)', assignee: 'Priya R', dueDate: '2026-07-15', done: false, priority: 'high' },
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.project.set(this.projectService.getById(id));
  }

  isOverdue(p: Project): boolean {
    return p.status !== 'completed' && p.dueDate ? new Date(p.dueDate) < new Date() : false;
  }

  statusLabel(s: ProjectStatus): string {
    const map: Record<ProjectStatus, string> = {
      planning: 'Planning', active: 'Active', 'on-hold': 'On Hold',
      completed: 'Completed', cancelled: 'Cancelled',
    };
    return map[s];
  }

  statusBadge(s: ProjectStatus): string {
    const map: Record<ProjectStatus, string> = {
      planning: 'bg-sky-100 text-sky-700',
      active: 'bg-green-100 text-green-700',
      'on-hold': 'bg-amber-100 text-amber-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return map[s];
  }

  priorityBadge(p: ProjectPriority): string {
    const map: Record<ProjectPriority, string> = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return map[p];
  }

  priorityIcon(p: ProjectPriority): string {
    const map: Record<ProjectPriority, string> = {
      low: 'fas fa-arrow-down',
      medium: 'fas fa-minus',
      high: 'fas fa-arrow-up',
      critical: 'fas fa-fire',
    };
    return map[p];
  }

  progressColor(pct: number): string {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-indigo-500';
    if (pct >= 25) return 'bg-amber-500';
    return 'bg-red-400';
  }

  budgetRows(p: Project) {
    const util = p.budget ? Math.round(p.spent / p.budget * 100) : 0;
    return [
      { label: 'Total Budget', value: `R ${p.budget.toLocaleString()}`, icon: 'fa-sack-dollar', bg: 'bg-indigo-50', color: 'text-indigo-600' },
      { label: 'Spent to Date', value: `R ${p.spent.toLocaleString()}`, icon: 'fa-receipt', bg: 'bg-amber-50', color: 'text-amber-600' },
      { label: 'Remaining', value: `R ${(p.budget - p.spent).toLocaleString()}`, icon: 'fa-piggy-bank', bg: 'bg-green-50', color: 'text-green-600' },
      { label: 'Utilisation', value: `${util}%`, icon: 'fa-percent', bg: 'bg-gray-50', color: 'text-gray-600' },
    ];
  }

  spendBreakdown(p: Project) {
    const total = p.spent || 1;
    return [
      { label: 'Personnel', pct: Math.round(total * 0.55 / total * 100), color: 'bg-indigo-500' },
      { label: 'Technology', pct: Math.round(total * 0.20 / total * 100), color: 'bg-sky-400' },
      { label: 'Operations', pct: Math.round(total * 0.15 / total * 100), color: 'bg-amber-400' },
      { label: 'Other', pct: Math.round(total * 0.10 / total * 100), color: 'bg-gray-300' },
    ];
  }
}
