import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from './project.service';
import { CreateProjectPayload, ProjectStatus, ProjectPriority } from './project.interfaces';

@Component({
  selector: 'app-add-project-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
         (click)="onBackdropClick($event)">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <!-- Dialog panel -->
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh]
                  overflow-y-auto z-10 animate-fade-in">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <i class="fas fa-diagram-project text-indigo-600"></i>
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-900">New Project</h2>
              <p class="text-xs text-gray-400">Fill in the details below to create a project</p>
            </div>
          </div>
          <button (click)="closed.emit()"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400
                         hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <!-- Form body -->
        <div class="px-6 py-5 space-y-5">

          <!-- Project Name -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">
              Project Name <span class="text-red-500">*</span>
            </label>
            <input type="text"
                   [(ngModel)]="form.name"
                   placeholder="e.g. Cohort 6 Onboarding"
                   class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                          focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"/>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea [(ngModel)]="form.description"
                      rows="3"
                      placeholder="Brief description of the project scope and objectives..."
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none
                             focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none">
            </textarea>
          </div>

          <!-- Row: Status + Priority -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
              <select [(ngModel)]="form.status"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                             focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Priority</label>
              <select [(ngModel)]="form.priority"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                             focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
            <select [(ngModel)]="form.category"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                           focus:ring-2 focus:ring-indigo-400 outline-none">
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Programme">Programme</option>
              <option value="Training">Training</option>
              <option value="Reporting">Reporting</option>
              <option value="Operations">Operations</option>
              <option value="Marketing">Marketing</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- Row: Start Date + Due Date -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
              <input type="date"
                     [(ngModel)]="form.startDate"
                     class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                            focus:ring-2 focus:ring-indigo-400 outline-none"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
              <input type="date"
                     [(ngModel)]="form.dueDate"
                     class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                            focus:ring-2 focus:ring-indigo-400 outline-none"/>
            </div>
          </div>

          <!-- Row: Budget + Manager -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Budget (ZAR)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R</span>
                <input type="number"
                       [(ngModel)]="form.budget"
                       min="0"
                       placeholder="0"
                       class="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg
                              focus:ring-2 focus:ring-indigo-400 outline-none"/>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Project Manager</label>
              <input type="text"
                     [(ngModel)]="form.manager"
                     placeholder="Full name"
                     class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                            focus:ring-2 focus:ring-indigo-400 outline-none"/>
            </div>
          </div>

          <!-- Tags -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">
              Tags
              <span class="font-normal text-gray-400 ml-1">(comma-separated)</span>
            </label>
            <input type="text"
                   [(ngModel)]="tagsRaw"
                   placeholder="e.g. technology, cohort-6, compliance"
                   class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                          focus:ring-2 focus:ring-indigo-400 outline-none"/>
            <!-- Tag preview -->
            <div class="flex flex-wrap gap-1.5 mt-2" *ngIf="parsedTags().length > 0">
              <span *ngFor="let t of parsedTags()"
                    class="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                {{ t }}
              </span>
            </div>
          </div>

          <!-- Validation error -->
          <p *ngIf="showError()" class="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <i class="fas fa-triangle-exclamation"></i>
            Project name is required.
          </p>

        </div>

        <!-- Footer actions -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button (click)="closed.emit()"
                  class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg
                         hover:bg-gray-100 transition-colors font-medium">
            Cancel
          </button>
          <button (click)="submit()"
                  [disabled]="isSaving()"
                  class="flex items-center gap-2 px-5 py-2 text-sm text-white bg-indigo-600
                         rounded-lg hover:bg-indigo-700 transition-colors font-semibold
                         disabled:opacity-50">
            <i *ngIf="isSaving()" class="fas fa-circle-notch fa-spin text-xs"></i>
            <i *ngIf="!isSaving()" class="fas fa-plus text-xs"></i>
            {{ isSaving() ? 'Creating...' : 'Create Project' }}
          </button>
        </div>

      </div>
    </div>
  `,
})
export class AddProjectDialogComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<number>();

  private readonly projectService = inject(ProjectService);

  isSaving = signal(false);
  showError = signal(false);
  tagsRaw = '';

  form: CreateProjectPayload = {
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    category: 'Technology',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    budget: 0,
    manager: '',
    tags: [],
  };

  parsedTags = () =>
    this.tagsRaw
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.closed.emit();
    }
  }

  submit(): void {
    if (!this.form.name.trim()) {
      this.showError.set(true);
      return;
    }
    this.showError.set(false);
    this.isSaving.set(true);

    this.form.tags = this.parsedTags();
    // Simulate async save
    setTimeout(() => {
      const project = this.projectService.add(this.form);
      this.isSaving.set(false);
      this.created.emit(project.id);
    }, 600);
  }
}
