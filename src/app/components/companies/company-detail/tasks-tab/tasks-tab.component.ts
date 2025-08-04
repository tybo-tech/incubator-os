import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, Task } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';
import { GlobalTaskModalComponent } from '../../../tasks/global-task-modal.component';

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
          <p class="text-gray-600">Manage tasks associated with {{ company?.data?.name || 'this company' }}</p>
        </div>
        <button
          (click)="openTaskModal()"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <i class="fas fa-plus"></i>
          <span>New Task</span>
        </button>
      </div>

      <!-- Task Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <div class="text-2xl font-bold text-blue-600">{{ taskStats.total }}</div>
          <div class="text-sm text-gray-600">Total Tasks</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <div class="text-2xl font-bold text-orange-600">{{ taskStats.todo }}</div>
          <div class="text-sm text-gray-600">To Do</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <div class="text-2xl font-bold text-blue-600">{{ taskStats.inProgress }}</div>
          <div class="text-sm text-gray-600">In Progress</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border">
          <div class="text-2xl font-bold text-green-600">{{ taskStats.completed }}</div>
          <div class="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      <!-- Tasks List -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900">Tasks</h3>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-2 text-gray-600">Loading tasks...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && tasks.length === 0" class="p-8 text-center">
          <i class="fas fa-tasks text-4xl text-gray-300 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p class="text-gray-600 mb-4">Create your first task for this company to get started.</p>
          <button
            (click)="openTaskModal()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let task of tasks" class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div>
                    <div class="font-medium text-gray-900">{{ task.data.title }}</div>
                    <div class="text-sm text-gray-500" *ngIf="task.data.description">
                      {{ task.data.description | slice:0:100 }}{{ task.data.description.length > 100 ? '...' : '' }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span [class]="getStatusClass(task.data.status || 'todo')" class="px-2 py-1 text-xs font-medium rounded-full">
                    {{ getStatusDisplay(task.data.status || 'todo') }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span [class]="getPriorityClass(task.data.priority || 'medium')" class="px-2 py-1 text-xs font-medium rounded-full">
                    {{ (task.data.priority || 'medium') | titlecase }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  {{ task.data.assigned_to || 'Unassigned' }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  {{ task.data.due_date | date:'MMM d, y' }}
                </td>
                <td class="px-6 py-4 text-sm">
                  <button
                    (click)="editTask(task)"
                    class="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    (click)="deleteTask(task.id!)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
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
      (close)="closeTaskModal()"
      (taskSaved)="onTaskSaved()">
    </app-global-task-modal>
  `
})
export class TasksTabComponent implements OnInit, OnDestroy {
  @Input() company: INode<Company> | null = null;

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

  async loadCompanyTasks() {
    if (!this.company) return;

    this.loading = true;
    try {
      // Get all tasks and filter by company_id
      const allTasks = await this.nodeService.getNodesByCompany(this.company?.id || 0, 'task').toPromise();
      this.tasks = allTasks?.filter(task => task.data.company_id === this.company!.id) || [];

      this.calculateStats();
    } catch (error) {
      console.error('❌ Error loading company tasks:', error);
    } finally {
      this.loading = false;
    }
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

  async deleteTask(taskId: number) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await this.nodeService.deleteNode(taskId).toPromise();
      await this.loadCompanyTasks(); // Refresh the list
    } catch (error) {
      console.error('❌ Error deleting task:', error);
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
