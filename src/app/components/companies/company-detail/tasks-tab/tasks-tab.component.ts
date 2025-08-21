import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, Task } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';
import { GlobalTaskModalComponent } from '../../../tasks/global-task-modal.component';
import { ICompany } from '../../../../../models/simple.schema';

@Component({
  selector: 'app-tasks-tab',
  standalone: true,
  imports: [CommonModule, GlobalTaskModalComponent],
  template: `
    <div class="space-y-6">
      <!-- Header with Actions -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Company Tasks</h2>
          <p class="text-gray-600">Manage tasks associated with {{ company?.name || 'this company' }}</p>
        </div>
        <button
          (click)="openTaskModal()"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <i class="fas fa-plus"></i>
          <span>New Task</span>
        </button>
      </div>

      <!-- Task Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-lg shadow-sm border">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-gray-600">{{ taskStats.total }}</div>
              <div class="text-xs text-gray-600">Total Tasks</div>
            </div>
            <i class="fas fa-tasks text-gray-500 text-lg"></i>
          </div>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-orange-600">{{ taskStats.todo }}</div>
              <div class="text-xs text-orange-700">To Do</div>
            </div>
            <i class="fas fa-circle text-orange-500 text-lg"></i>
          </div>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-blue-600">{{ taskStats.inProgress }}</div>
              <div class="text-xs text-blue-700">In Progress</div>
            </div>
            <i class="fas fa-play-circle text-blue-500 text-lg"></i>
          </div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-green-600">{{ taskStats.completed }}</div>
              <div class="text-xs text-green-700">Completed</div>
            </div>
            <i class="fas fa-check-circle text-green-500 text-lg"></i>
          </div>
        </div>
      </div>

      <!-- Tasks Table -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">All Tasks</h3>
          <p class="text-sm text-gray-600">Manage tasks for {{ company?.name || 'this company' }}</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Loading tasks...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && tasks.length === 0" class="p-8 text-center text-gray-500">
          <i class="fas fa-tasks text-4xl mb-4"></i>
          <h4 class="text-lg font-medium mb-2">No Tasks Yet</h4>
          <p class="mb-4">Create your first task for this company to get started.</p>
          <button
            (click)="openTaskModal()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Create First Task
          </button>
        </div>

        <!-- Tasks Table -->
        <div *ngIf="!loading && tasks.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let task of tasks" class="hover:bg-gray-50">
                <!-- Task -->
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900">{{ task.data.title }}</div>
                  <div class="text-sm text-gray-600 max-w-xs" *ngIf="task.data.description">
                    <p class="line-clamp-2">{{ task.data.description }}</p>
                  </div>
                </td>

                <!-- Status -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="getStatusClass(task.data.status || 'todo')"
                  >
                    <i
                      class="mr-1"
                      [ngClass]="{
                        'fas fa-circle': task.data.status === 'todo',
                        'fas fa-play-circle': task.data.status === 'in_progress',
                        'fas fa-check-circle': task.data.status === 'done'
                      }"
                    ></i>
                    {{ getStatusDisplay(task.data.status || 'todo') }}
                  </span>
                </td>

                <!-- Priority -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="getPriorityClass(task.data.priority || 'medium')"
                  >
                    <i
                      class="mr-1"
                      [ngClass]="{
                        'fas fa-arrow-up': task.data.priority === 'high',
                        'fas fa-minus': task.data.priority === 'medium',
                        'fas fa-arrow-down': task.data.priority === 'low'
                      }"
                    ></i>
                    {{ (task.data.priority || 'medium') | titlecase }}
                  </span>
                </td>

                <!-- Assigned To -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ task.data.assigned_to || 'Unassigned' }}
                  </div>
                </td>

                <!-- Due Date -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    <span *ngIf="task.data.due_date; else noDueDate">
                      {{ task.data.due_date | date:'MMM d, y' }}
                    </span>
                    <ng-template #noDueDate>
                      <span class="text-gray-400">No due date</span>
                    </ng-template>
                  </div>
                </td>

                <!-- Parent (Growth Area or other source) -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-600">
                    <span *ngIf="task.parent_id; else noParent" class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800">
                      <i class="fas fa-link mr-1"></i>
                      Growth Area
                    </span>
                    <ng-template #noParent>
                      <span class="text-gray-400">—</span>
                    </ng-template>
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <button
                      (click)="editTask(task)"
                      class="text-blue-600 hover:text-blue-700"
                      title="Edit Task"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button
                      (click)="deleteTask(task.id!)"
                      class="text-red-600 hover:text-red-700"
                      title="Delete Task"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Task Modal -->
    <app-global-task-modal
      [isVisible]="isTaskModalOpen"
      [editMode]="!!selectedTask"
      [taskToEdit]="selectedTask"
      [availableCompanies]="company ? [company] : []"
      [defaultCompanyId]="company?.id || null"
      (close)="closeTaskModal()"
      (taskSaved)="onTaskSaved()">
    </app-global-task-modal>
  `
})
export class TasksTabComponent implements OnInit, OnDestroy {
  @Input() company: ICompany | null = null;

  tasks: INode<Task>[] = [];
  loading = false;
  isTaskModalOpen = false;
  selectedTask: INode<Task> | null = null;

  taskStats = {
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0
  };

  private destroy$ = new Subject<void>();

  constructor(private nodeService: NodeService<Task>) {}

  ngOnInit() {
    if (this.company) {
      this.loadCompanyTasks();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCompanyTasks() {
    if (!this.company?.id) return;

    this.loading = true;
    this.nodeService.getNodesByCompany(this.company.id, 'task')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.tasks = tasks as INode<Task>[];
          this.calculateStats();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading tasks:', error);
          this.loading = false;
        }
      });
  }

  calculateStats() {
    this.taskStats = {
      total: this.tasks.length,
      todo: this.tasks.filter(t => t.data.status === 'todo').length,
      inProgress: this.tasks.filter(t => t.data.status === 'in_progress').length,
      completed: this.tasks.filter(t => t.data.status === 'done').length
    };
  }

  openTaskModal() {
    this.selectedTask = null;
    this.isTaskModalOpen = true;
  }

  closeTaskModal() {
    this.isTaskModalOpen = false;
    this.selectedTask = null;
  }

  editTask(task: INode<Task>) {
    this.selectedTask = task;
    this.isTaskModalOpen = true;
  }

  deleteTask(taskId: number) {
    if (!taskId) return;

    if (confirm('Are you sure you want to delete this task?')) {
      this.nodeService.deleteNode(taskId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadCompanyTasks();
          },
          error: (error: any) => {
            console.error('Error deleting task:', error);
          }
        });
    }
  }

  onTaskSaved() {
    this.closeTaskModal();
    this.loadCompanyTasks(); // Refresh the list
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'todo':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDisplay(status: string): string {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'done':
        return 'Completed';
      default:
        return status;
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
