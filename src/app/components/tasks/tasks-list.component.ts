import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Task } from '../../../models/business.models';
import { INode } from '../../../models/schema';
import { NodeService, ToastService } from '../../../services';
import { GlobalTaskModalComponent } from './global-task-modal.component';
import { ICompany } from '../../../models/simple.schema';

interface BoardColumn {
  key: string;
  name: string;
  tasks: INode<Task>[];
}

const STATUS_META: Record<string, { name: string; dot: string }> = {
  todo: { name: 'To Do', dot: 'bg-gray-400' },
  in_progress: { name: 'In Progress', dot: 'bg-blue-500' },
  done: { name: 'Done', dot: 'bg-green-500' },
};

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalTaskModalComponent, DragDropModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-tasks mr-3 text-blue-600"></i>
            Task Management
          </h2>
          <p class="text-gray-600 mt-1">Organize and track your business tasks</p>
        </div>
        <div class="flex items-center space-x-3">
          <!-- Company Filter -->
          <select *ngIf="viewMode === 'board'" [(ngModel)]="boardCompanyFilter"
                  class="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Companies</option>
            <option *ngFor="let company of availableCompanies" [value]="company.id">
              {{ company.name }}
            </option>
            <option value="unassigned">Unassigned</option>
          </select>
          <!-- View Toggle -->
          <div class="flex bg-gray-100 rounded-lg p-1">
            <button (click)="viewMode = 'list'"
                    [class]="viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'"
                    class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center">
              <i class="fas fa-list mr-1.5"></i>
              List
            </button>
            <button (click)="viewMode = 'board'"
                    [class]="viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'"
                    class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center">
              <i class="fas fa-columns mr-1.5"></i>
              Board
            </button>
          </div>
          <button (click)="openTaskModal()"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
            <i class="fas fa-plus mr-2"></i>
            New Task
          </button>
        </div>
      </div>

      <!-- Task Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div class="flex items-center">
            <i class="fas fa-clipboard-list text-blue-600 text-xl mr-3"></i>
            <div>
              <p class="text-sm font-medium text-blue-600">Total Tasks</p>
              <p class="text-2xl font-bold text-blue-800">{{ tasks.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div class="flex items-center">
            <i class="fas fa-clock text-yellow-600 text-xl mr-3"></i>
            <div>
              <p class="text-sm font-medium text-yellow-600">Pending</p>
              <p class="text-2xl font-bold text-yellow-800">{{ getTasksByStatus('todo').length + getTasksByStatus('in_progress').length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-green-50 rounded-lg p-4 border border-green-200">
          <div class="flex items-center">
            <i class="fas fa-check-circle text-green-600 text-xl mr-3"></i>
            <div>
              <p class="text-sm font-medium text-green-600">Completed</p>
              <p class="text-2xl font-bold text-green-800">{{ getTasksByStatus('done').length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-red-50 rounded-lg p-4 border border-red-200">
          <div class="flex items-center">
            <i class="fas fa-exclamation-triangle text-red-600 text-xl mr-3"></i>
            <div>
              <p class="text-sm font-medium text-red-600">Overdue</p>
              <p class="text-2xl font-bold text-red-800">{{ getOverdueTasks().length }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex space-x-1 mb-6">
        <button *ngFor="let filter of filterOptions"
                (click)="activeFilter = filter.value"
                [class]="getFilterButtonClass(filter.value)"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-colors">
          <i [class]="filter.icon" class="mr-2"></i>
          {{ filter.label }}
          <span class="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
            {{ getFilteredTasks(filter.value).length }}
          </span>
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading tasks...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="text-center py-12">
        <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Tasks</h3>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button (click)="loadTasks()"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          <i class="fas fa-redo mr-2"></i>
          Retry
        </button>
      </div>

      <!-- List View -->
      <div *ngIf="viewMode === 'list' && !loading && !error" class="space-y-4">
        <!-- Empty State -->
        <div *ngIf="getFilteredTasks(activeFilter).length === 0" class="text-center py-12">
          <i class="fas fa-tasks text-gray-300 text-4xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
          <p class="text-gray-600 mb-4">
            {{ activeFilter === 'all' ? 'Create your first task to get started' : 'No tasks match the current filter' }}
          </p>
          <button *ngIf="activeFilter === 'all'" (click)="openTaskModal()"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            <i class="fas fa-plus mr-2"></i>
            Create First Task
          </button>
        </div>

        <!-- Task Cards -->
        <div *ngFor="let task of getFilteredTasks(activeFilter)"
             class="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
          <div class="p-4">
            <div class="flex items-start justify-between">
              <!-- Task Info -->
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <h3 class="text-lg font-medium text-gray-900 mr-3">{{ task.data.title }}</h3>
                  <span [class]="getPriorityClass(task.data.priority!)">
                    {{ getPriorityLabel(task.data.priority!) }}
                  </span>
                  <span [class]="getStatusClass(task.data.status!)" class="ml-2">
                    {{ getStatusLabel(task.data.status!) }}
                  </span>
                </div>

                <p *ngIf="task.data.description" class="text-gray-600 mb-3">{{ task.data.description }}</p>

                <div class="flex items-center text-sm text-gray-500 space-x-4">
                  <div class="flex items-center">
                    <i class="fas fa-calendar mr-1"></i>
                    Due: {{ task.data.due_date | date:'shortDate' }}
                    <span *ngIf="isOverdue(task)" class="text-red-600 ml-1">(Overdue)</span>
                  </div>
                  <div *ngIf="task.data.assigned_to" class="flex items-center">
                    <i class="fas fa-user mr-1"></i>
                    {{ task.data.assigned_to }}
                  </div>
                  <div *ngIf="task.company_id" class="flex items-center">
                    <i class="fas fa-building mr-1"></i>
                    Company Task
                  </div>
                </div>
              </div>

              <!-- Task Actions -->
              <div class="flex items-center space-x-2 ml-4">
                <button (click)="toggleTaskStatus(task)"
                        [class]="task.data.status === 'done' ? 'text-gray-600' : 'text-green-600'"
                        class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        [title]="task.data.status === 'done' ? 'Mark as pending' : 'Mark as done'">
                  <i [class]="task.data.status === 'done' ? 'fas fa-undo' : 'fas fa-check'"></i>
                </button>
                <button (click)="editTask(task)"
                        class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit task">
                  <i class="fas fa-edit"></i>
                </button>
                <button (click)="deleteTask(task)"
                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete task">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Board View -->
      <div *ngIf="viewMode === 'board' && !loading && !error">
        <!-- Empty State -->
        <div *ngIf="getFilteredTasks(activeFilter).length === 0" class="text-center py-12">
          <i class="fas fa-columns text-gray-300 text-4xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
          <p class="text-gray-600 mb-4">
            {{ activeFilter === 'all' ? 'Create your first task to get started' : 'No tasks match the current filter' }}
          </p>
          <button *ngIf="activeFilter === 'all'" (click)="openTaskModal()"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            <i class="fas fa-plus mr-2"></i>
            Create First Task
          </button>
        </div>

        <!-- Board Columns -->
        <div *ngIf="getFilteredTasks(activeFilter).length > 0"
             cdkDropListGroup
             class="flex items-start gap-4 overflow-x-auto pb-4">
          <div *ngFor="let col of getBoardColumns()"
               class="flex-shrink-0 rounded-xl bg-gray-50 border border-gray-200 flex flex-col"
               [style.width.px]="columnWidths[col.key] || 320">
            <!-- Column Header -->
            <div class="px-3 py-2.5 border-b border-gray-200 bg-white rounded-t-xl flex items-center justify-between">
              <div class="flex items-center min-w-0">
                <span class="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                      [class]="getColumnDot(col.key)"></span>
                <span class="text-sm font-semibold text-gray-800 truncate">{{ col.name }}</span>
                <span class="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium flex-shrink-0">
                  {{ col.tasks.length }}
                </span>
              </div>
              <div class="w-1.5 h-6 cursor-col-resize rounded hover:bg-blue-300 active:bg-blue-400 transition-colors flex-shrink-0"
                   (mousedown)="startResize(col.key, $event)"
                   title="Drag to resize column"></div>
            </div>

            <!-- Cards -->
            <div cdkDropList
                 [id]="col.key"
                 [cdkDropListData]="col.tasks"
                 (cdkDropListDropped)="onDrop($event)"
                 class="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]">
              <div *ngFor="let task of col.tasks"
                   cdkDrag
                   [cdkDragData]="task"
                   [class]="'bg-white rounded-lg border border-gray-200 border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ' + getPriorityAccent(task.data.priority)">
                <div class="p-3">
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="text-sm font-medium text-gray-900 leading-snug">{{ task.data.title }}</h4>
                    <span [class]="getStatusClass(task.data.status!)" class="flex-shrink-0">
                      {{ getStatusShort(task.data.status!) }}
                    </span>
                  </div>
                  <p *ngIf="task.data.description" class="text-xs text-gray-500 mt-1.5 line-clamp-2">{{ task.data.description }}</p>
                  <div class="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span class="flex items-center" [class.text-red-600]="isOverdue(task)">
                      <i class="fas fa-calendar mr-1"></i>
                      {{ task.data.due_date | date:'MMM d' }}
                    </span>
                    <span *ngIf="task.company_id" class="flex items-center min-w-0 ml-2">
                      <i class="fas fa-building mr-1 flex-shrink-0"></i>
                      <span class="truncate">{{ getCompanyName(task) }}</span>
                    </span>
                  </div>
                  <div class="flex items-center mt-2 text-xs text-gray-500" *ngIf="task.data.assigned_to">
                    <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold mr-1 flex-shrink-0">
                      {{ getInitials(task.data.assigned_to) }}
                    </span>
                    <span class="truncate">{{ task.data.assigned_to }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Global Task Modal -->
    <app-global-task-modal
      [isVisible]="showTaskModal"
      [editMode]="isEditMode"
      [taskToEdit]="editingTask"
      [availableCompanies]="availableCompanies"
      (close)="closeTaskModal()"
      (taskSaved)="onTaskSaved($event)">
    </app-global-task-modal>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class TasksListComponent implements OnInit {
  tasks: INode<Task>[] = [];
  availableCompanies: ICompany[] = [];
  loading = false;
  error: string | null = null;

  // View mode
  viewMode: 'list' | 'board' = 'list';
  boardCompanyFilter: string | number = 'all';
  columnWidths: Record<string, number> = {};

  // Modal properties
  showTaskModal = false;
  isEditMode = false;
  editingTask: INode<Task> | null = null;

  // Filter properties
  activeFilter: string = 'all';
  filterOptions = [
    { value: 'all', label: 'All Tasks', icon: 'fas fa-list' },
    { value: 'todo', label: 'To Do', icon: 'fas fa-clipboard-list' },
    { value: 'in_progress', label: 'In Progress', icon: 'fas fa-cog' },
    { value: 'done', label: 'Completed', icon: 'fas fa-check-circle' },
    { value: 'overdue', label: 'Overdue', icon: 'fas fa-exclamation-triangle' },
    { value: 'high', label: 'High Priority', icon: 'fas fa-fire' }
  ];

  constructor(
    private nodeService: NodeService<Task>,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadTasks();
    this.loadCompanies();
  }

  async loadTasks() {
    this.loading = true;
    this.error = null;

    try {
      const allTasks = await this.nodeService.getNodesByType('task').toPromise();
      this.tasks = (allTasks || []).sort((a, b) => {
        const aTime = new Date(a.created_at || a.data.created_date || 0).getTime();
        const bTime = new Date(b.created_at || b.data.created_date || 0).getTime();
        return bTime - aTime;
      });
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      this.error = 'Failed to load tasks. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async loadCompanies() {
    try {
      // Load companies for task assignment
      const companyService = this.nodeService as any;
      const companies = await companyService.getNodes('company').toPromise();
      this.availableCompanies = companies || [];
    } catch (error) {
      console.error('❌ Error loading companies:', error);
    }
  }

  getFilteredTasks(filter: string): INode<Task>[] {
    switch (filter) {
      case 'todo':
        return this.getTasksByStatus('todo');
      case 'in_progress':
        return this.getTasksByStatus('in_progress');
      case 'done':
        return this.getTasksByStatus('done');
      case 'overdue':
        return this.getOverdueTasks();
      case 'high':
        return this.tasks.filter(task => task.data.priority === 'high');
      default:
        return this.tasks;
    }
  }

  getTasksByStatus(status: string): INode<Task>[] {
    return this.tasks.filter(task => task.data.status === status);
  }

  getOverdueTasks(): INode<Task>[] {
    const today = new Date().toISOString().split('T')[0];
    return this.tasks.filter(task =>
      task.data.due_date < today && task.data.status !== 'done'
    );
  }

  isOverdue(task: INode<Task>): boolean {
    const today = new Date().toISOString().split('T')[0];
    return task.data.due_date < today && task.data.status !== 'done';
  }

  getFilterButtonClass(filter: string): string {
    return this.activeFilter === filter
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  }

  getPriorityClass(priority: string): string {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium ';
    switch (priority) {
      case 'high': return baseClass + 'bg-red-100 text-red-800';
      case 'medium': return baseClass + 'bg-yellow-100 text-yellow-800';
      case 'low': return baseClass + 'bg-blue-100 text-blue-800';
      default: return baseClass + 'bg-gray-100 text-gray-800';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'high': return '🔴 High';
      case 'medium': return '🟡 Medium';
      case 'low': return '🔵 Low';
      default: return priority;
    }
  }

  getPriorityAccent(priority?: string): string {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-400';
      case 'low': return 'border-l-blue-400';
      default: return 'border-l-gray-300';
    }
  }

  getStatusClass(status: string): string {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium ';
    switch (status) {
      case 'done': return baseClass + 'bg-green-100 text-green-800';
      case 'in_progress': return baseClass + 'bg-blue-100 text-blue-800';
      case 'todo': return baseClass + 'bg-gray-100 text-gray-800';
      default: return baseClass + 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'done': return '✅ Done';
      case 'in_progress': return '⚙️ In Progress';
      case 'todo': return '📋 To Do';
      default: return status;
    }
  }

  getStatusShort(status: string): string {
    switch (status) {
      case 'done': return 'Done';
      case 'in_progress': return 'In Progress';
      case 'todo': return 'To Do';
      default: return status;
    }
  }

  getInitials(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  // Board methods
  getBoardColumns(): BoardColumn[] {
    const filtered = this.getFilteredTasks(this.activeFilter).filter(task => {
      if (this.boardCompanyFilter === 'all') return true;
      if (this.boardCompanyFilter === 'unassigned') return !task.company_id;
      return task.company_id === this.boardCompanyFilter;
    });

    const groups = new Map<string, INode<Task>[]>();
    for (const task of filtered) {
      const key = task.data.status || 'todo';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    }

    return ['todo', 'in_progress', 'done'].map(key => ({
      key,
      name: STATUS_META[key].name,
      tasks: groups.get(key) || []
    }));
  }

  getColumnDot(key: string): string {
    return STATUS_META[key]?.dot || 'bg-gray-400';
  }

  getCompanyName(task: INode<Task>): string {
    if (!task.company_id) return 'Unassigned';
    const company = this.availableCompanies.find(c => c.id === task.company_id);
    return company ? company.name : 'Company';
  }

  startResize(key: string, event: MouseEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.columnWidths[key] || 320;

    const onMove = (e: MouseEvent) => {
      const width = Math.max(240, Math.min(480, startWidth + (e.clientX - startX)));
      this.columnWidths[key] = width;
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  onDrop(event: CdkDragDrop<INode<Task>[]>) {
    const task = event.item.data;
    const targetStatus = event.container.id;

    if (task.data.status === targetStatus) return;

    const updated: INode<Task> = {
      ...task,
      data: {
        ...task.data,
        status: targetStatus,
        completed: targetStatus === 'done'
      }
    };

    this.nodeService.updateNode(updated).toPromise()
      .then(saved => {
        if (saved) {
          const index = this.tasks.findIndex(t => t.id === task.id);
          if (index !== -1) {
            this.tasks[index] = saved;
          }
        }
      })
      .catch(err => {
        console.error('❌ Error moving task:', err);
        this.toast.error('Failed to move task. Please try again.');
      });
  }

  // Modal methods
  openTaskModal() {
    this.isEditMode = false;
    this.editingTask = null;
    this.showTaskModal = true;
  }

  editTask(task: INode<Task>) {
    this.isEditMode = true;
    this.editingTask = task;
    this.showTaskModal = true;
  }

  closeTaskModal() {
    this.showTaskModal = false;
    this.isEditMode = false;
    this.editingTask = null;
  }

  onTaskSaved(task: INode<Task>) {
    if (this.isEditMode) {
      // Update existing task in list
      const index = this.tasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
        this.tasks[index] = task;
      }
    } else {
      // Add new task to list
      this.tasks.unshift(task);
    }
  }

  async toggleTaskStatus(task: INode<Task>) {
    try {
      const newStatus = task.data.status === 'done' ? 'todo' : 'done';
      const updatedTask: INode<Task> = {
        ...task,
        data: {
          ...task.data,
          status: newStatus,
          completed: newStatus === 'done'
        }
      };

      const savedTask = await this.nodeService.updateNode(updatedTask).toPromise();
      if (savedTask) {
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          this.tasks[index] = savedTask;
        }
      }
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      this.toast.error('Failed to update task status. Please try again.');
    }
  }

  async deleteTask(task: INode<Task>) {
    if (!confirm(`Are you sure you want to delete the task "${task.data.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await this.nodeService.deleteNode(task.id!).toPromise();
      this.tasks = this.tasks.filter(t => t.id !== task.id);
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      this.toast.error('Failed to delete task. Please try again.');
    }
  }
}
