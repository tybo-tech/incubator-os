import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from './project.service';
import { Project, ProjectStatus, ProjectPriority } from './project.interfaces';
import { AddProjectDialogComponent } from './add-project-dialog.component';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AddProjectDialogComponent],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- ── Page Header ──────────────────────────────────────────────────── -->
      <div class="bg-white border-b border-gray-200 px-6 py-5">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i class="fas fa-diagram-project text-indigo-600"></i>
              Project Management
            </h1>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ projectService.projects().length }} projects &bull;
              {{ activeCount() }} active
            </p>
          </div>
          <button (click)="openAddDialog()"
                  class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm
                         font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <i class="fas fa-plus text-xs"></i>
            New Project
          </button>
        </div>

        <!-- Filters row -->
        <div class="flex flex-wrap items-center gap-3 mt-4">
          <!-- Search -->
          <div class="relative flex-1 min-w-[200px] max-w-xs">
            <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search projects..."
              class="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"/>
          </div>

          <!-- Status filter -->
          <select [(ngModel)]="statusFilter"
                  class="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                         focus:ring-2 focus:ring-indigo-400 outline-none">
            <option value="">All Statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <!-- Priority filter -->
          <select [(ngModel)]="priorityFilter"
                  class="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                         focus:ring-2 focus:ring-indigo-400 outline-none">
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <!-- View toggle -->
          <div class="flex items-center border border-gray-300 rounded-lg overflow-hidden ml-auto">
            <button (click)="viewMode = 'grid'"
                    [class]="viewMode === 'grid'
                      ? 'px-3 py-2 bg-indigo-600 text-white'
                      : 'px-3 py-2 text-gray-500 hover:bg-gray-50'"
                    title="Grid view">
              <i class="fas fa-grip text-sm"></i>
            </button>
            <button (click)="viewMode = 'list'"
                    [class]="viewMode === 'list'
                      ? 'px-3 py-2 bg-indigo-600 text-white'
                      : 'px-3 py-2 text-gray-500 hover:bg-gray-50'"
                    title="List view">
              <i class="fas fa-list text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Stats bar ─────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4">
        <div *ngFor="let s of stats()"
             class="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div [class]="'w-9 h-9 rounded-lg flex items-center justify-center ' + s.bg">
            <i [class]="'fas ' + s.icon + ' text-sm ' + s.color"></i>
          </div>
          <div>
            <p class="text-xl font-bold text-gray-800">{{ s.value }}</p>
            <p class="text-xs text-gray-500">{{ s.label }}</p>
          </div>
        </div>
      </div>

      <!-- ── Project Grid ──────────────────────────────────────────────────── -->
      <div class="px-6 pb-8">

        <!-- Empty state -->
        <div *ngIf="filteredProjects().length === 0"
             class="text-center py-20">
          <i class="fas fa-folder-open text-gray-300 text-5xl mb-4"></i>
          <p class="text-gray-500 font-medium">No projects found</p>
          <p class="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new project.</p>
          <button (click)="openAddDialog()"
                  class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white
                         text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <i class="fas fa-plus text-xs"></i>
            New Project
          </button>
        </div>

        <!-- GRID view -->
        <div *ngIf="viewMode === 'grid' && filteredProjects().length > 0"
             class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <div *ngFor="let p of filteredProjects()"
               (click)="openProject(p.id)"
               class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md
                      hover:border-indigo-300 transition-all cursor-pointer group overflow-hidden">

            <!-- Card top bar -->
            <div [class]="'h-1.5 ' + priorityBar(p.priority)"></div>

            <div class="p-5">
              <!-- Header -->
              <div class="flex items-start justify-between gap-2 mb-3">
                <div class="flex-1 min-w-0">
                  <span [class]="statusBadge(p.status)" class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5 inline-block">
                    {{ statusLabel(p.status) }}
                  </span>
                  <h3 class="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug">
                    {{ p.name }}
                  </h3>
                  <p class="text-xs text-gray-400 mt-0.5">{{ p.category }}</p>
                </div>
                <span [class]="priorityBadge(p.priority)"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                  <i [class]="priorityIcon(p.priority) + ' text-[9px]'"></i>
                  {{ p.priority }}
                </span>
              </div>

              <!-- Description -->
              <p class="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">{{ p.description }}</p>

              <!-- Progress -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] text-gray-500">Progress</span>
                  <span class="text-[11px] font-bold text-indigo-600">{{ p.progress }}%</span>
                </div>
                <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all"
                       [class]="progressColor(p.progress)"
                       [style.width.%]="p.progress"></div>
                </div>
              </div>

              <!-- Meta row -->
              <div class="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 pt-3">
                <span class="flex items-center gap-1">
                  <i class="fas fa-check-circle text-green-500"></i>
                  {{ p.tasksDone }}/{{ p.tasksTotal }} tasks
                </span>
                <span class="flex items-center gap-1">
                  <i class="fas fa-calendar-days"></i>
                  {{ p.dueDate | date:'d MMM y' }}
                </span>
                <!-- Member avatars -->
                <div class="flex items-center -space-x-1">
                  <div *ngFor="let m of p.members.slice(0, 3)"
                       class="w-5 h-5 rounded-full bg-indigo-100 border border-white
                              flex items-center justify-center text-[9px] font-bold text-indigo-700"
                       [title]="m.name">
                    {{ m.name.charAt(0) }}
                  </div>
                  <div *ngIf="p.members.length > 3"
                       class="w-5 h-5 rounded-full bg-gray-200 border border-white
                              flex items-center justify-center text-[9px] font-bold text-gray-500">
                    +{{ p.members.length - 3 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- LIST view -->
        <div *ngIf="viewMode === 'list' && filteredProjects().length > 0"
             class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200 text-left">
                <th class="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Project</th>
                <th class="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th class="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Priority</th>
                <th class="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Progress</th>
                <th class="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Tasks</th>
                <th class="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Due</th>
                <th class="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Manager</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let p of filteredProjects()"
                  (click)="openProject(p.id)"
                  class="hover:bg-indigo-50 cursor-pointer transition-colors group">
                <td class="px-5 py-3.5">
                  <p class="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors text-sm">{{ p.name }}</p>
                  <p class="text-xs text-gray-400">{{ p.category }}</p>
                </td>
                <td class="px-4 py-3.5 hidden sm:table-cell">
                  <span [class]="statusBadge(p.status)" class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                    {{ statusLabel(p.status) }}
                  </span>
                </td>
                <td class="px-4 py-3.5 hidden md:table-cell">
                  <span [class]="priorityBadge(p.priority)"
                        class="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                    <i [class]="priorityIcon(p.priority) + ' text-[9px]'"></i>
                    {{ p.priority }}
                  </span>
                </td>
                <td class="px-4 py-3.5 hidden lg:table-cell" style="min-width:120px">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full"
                           [class]="progressColor(p.progress)"
                           [style.width.%]="p.progress"></div>
                    </div>
                    <span class="text-[11px] font-bold text-indigo-600 w-8 text-right">{{ p.progress }}%</span>
                  </div>
                </td>
                <td class="px-4 py-3.5 hidden lg:table-cell text-xs text-gray-600">
                  {{ p.tasksDone }}/{{ p.tasksTotal }}
                </td>
                <td class="px-4 py-3.5 hidden md:table-cell text-xs text-gray-500">
                  {{ p.dueDate | date:'d MMM y' }}
                </td>
                <td class="px-4 py-3.5 text-xs text-gray-600 font-medium">
                  {{ p.manager }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>

    <!-- Add Project dialog -->
    <app-add-project-dialog
      *ngIf="showAddDialog()"
      (closed)="showAddDialog.set(false)"
      (created)="onProjectCreated($event)">
    </app-add-project-dialog>
  `,
})
export class ProjectsListComponent {
  readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);

  searchQuery = '';
  statusFilter = '';
  priorityFilter = '';
  viewMode: 'grid' | 'list' = 'grid';
  showAddDialog = signal(false);

  activeCount = computed(() =>
    this.projectService.projects().filter(p => p.status === 'active').length
  );

  filteredProjects = computed<Project[]>(() => {
    const q = this.searchQuery.toLowerCase();
    return this.projectService.projects().filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchStatus = !this.statusFilter || p.status === this.statusFilter;
      const matchPriority = !this.priorityFilter || p.priority === this.priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  });

  stats = computed(() => {
    const projects = this.projectService.projects();
    return [
      { label: 'Total Projects', value: projects.length, icon: 'fa-diagram-project', bg: 'bg-indigo-50', color: 'text-indigo-600' },
      { label: 'Active', value: projects.filter(p => p.status === 'active').length, icon: 'fa-circle-play', bg: 'bg-green-50', color: 'text-green-600' },
      { label: 'On Hold', value: projects.filter(p => p.status === 'on-hold').length, icon: 'fa-circle-pause', bg: 'bg-amber-50', color: 'text-amber-600' },
      { label: 'Completed', value: projects.filter(p => p.status === 'completed').length, icon: 'fa-circle-check', bg: 'bg-blue-50', color: 'text-blue-600' },
    ];
  });

  openAddDialog(): void { this.showAddDialog.set(true); }

  onProjectCreated(id: any): void {
    this.showAddDialog.set(false);
    this.router.navigate(['/projects', id]);
  }

  openProject(id: number): void {
    this.router.navigate(['/projects', id]);
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

  priorityBar(p: ProjectPriority): string {
    const map: Record<ProjectPriority, string> = {
      low: 'bg-gray-300',
      medium: 'bg-yellow-400',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return map[p];
  }

  progressColor(pct: number): string {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-indigo-500';
    if (pct >= 25) return 'bg-amber-500';
    return 'bg-red-400';
  }
}
