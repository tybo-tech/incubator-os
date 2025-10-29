import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface StatutoryTask {
  id: number;
  taskName: string;
  responsiblePerson: string;
  dueDate: string;
  status: 'Planned' | 'In Progress' | 'Completed';
  notes?: string;
}

@Component({
  selector: 'app-other-statutory-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header with Add Button -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Other Statutory Tasks</h2>
          <p class="mt-1 text-sm text-gray-500">
            Track additional compliance activities such as B-BBEE certification, sectoral licenses, and industry-specific regulations.
          </p>
        </div>
        <button
          (click)="addNewTask()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Task
        </button>
      </div>

      <!-- Status Filter -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            *ngFor="let filter of statusFilters"
            (click)="selectedStatusFilter = filter.value"
            [class]="'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ' +
                    (selectedStatusFilter === filter.value ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')">
            {{ filter.label }}
            <span class="ml-2 px-2 py-1 text-xs rounded-full"
                  [class]="selectedStatusFilter === filter.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'">
              {{ getFilterCount(filter.value) }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-balance-scale text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Tasks</p>
              <p class="text-lg font-semibold text-gray-900">{{ filteredTasks.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-clock text-amber-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Due Soon (30 days)</p>
              <p class="text-lg font-semibold text-amber-600">{{ getDueSoonCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-spinner text-blue-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">In Progress</p>
              <p class="text-lg font-semibold text-blue-600">{{ getInProgressCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-check-circle text-green-500 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Completed</p>
              <p class="text-lg font-semibold text-green-600">{{ getCompletedCount() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Statutory Tasks</h3>
          <p class="text-sm text-gray-500 mt-1">Track compliance activities beyond standard CIPC and SARS requirements</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsible Person</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let task of filteredTasks; trackBy: trackById" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === task.id; else taskNameDisplay"
                    [(ngModel)]="task.taskName"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #taskNameDisplay>
                    <div
                      (click)="startEditing(task.id, 'taskName')"
                      class="text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ task.taskName }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === task.id; else responsiblePersonDisplay"
                    [(ngModel)]="task.responsiblePerson"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #responsiblePersonDisplay>
                    <div
                      (click)="startEditing(task.id, 'responsiblePerson')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      {{ task.responsiblePerson }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    *ngIf="editingId === task.id; else dueDateDisplay"
                    [(ngModel)]="task.dueDate"
                    type="date"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #dueDateDisplay>
                    <div
                      (click)="startEditing(task.id, 'dueDate')"
                      class="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                      [class.text-red-600]="isOverdue(task)"
                      [class.text-amber-600]="isDueSoon(task) && !isOverdue(task)"
                      [class.text-gray-900]="!isOverdue(task) && !isDueSoon(task)">
                      {{ task.dueDate | date:'mediumDate' }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <select
                    *ngIf="editingId === task.id; else statusDisplay"
                    [(ngModel)]="task.status"
                    (blur)="stopEditing()"
                    (change)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <ng-template #statusDisplay>
                    <span
                      (click)="startEditing(task.id, 'status')"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80"
                      [class.bg-gray-100]="task.status === 'Planned'"
                      [class.text-gray-800]="task.status === 'Planned'"
                      [class.bg-blue-100]="task.status === 'In Progress'"
                      [class.text-blue-800]="task.status === 'In Progress'"
                      [class.bg-green-100]="task.status === 'Completed'"
                      [class.text-green-800]="task.status === 'Completed'">
                      {{ task.status }}
                    </span>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        class="h-2 rounded-full transition-all duration-300"
                        [class.bg-gray-400]="task.status === 'Planned'"
                        [class.bg-blue-500]="task.status === 'In Progress'"
                        [class.bg-green-500]="task.status === 'Completed'"
                        [style.width]="getProgressWidth(task.status)">
                      </div>
                    </div>
                    <span class="text-xs text-gray-500 font-medium">
                      {{ getProgressPercentage(task.status) }}%
                    </span>
                  </div>
                </td>

                <td class="px-6 py-4">
                  <input
                    *ngIf="editingId === task.id; else notesDisplay"
                    [(ngModel)]="task.notes"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <ng-template #notesDisplay>
                    <div
                      (click)="startEditing(task.id, 'notes')"
                      class="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded max-w-xs truncate">
                      {{ task.notes || 'Add notes...' }}
                    </div>
                  </ng-template>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    (click)="deleteTask(task.id)"
                    class="text-red-600 hover:text-red-900 transition-colors">
                    <i class="fas fa-trash w-4 h-4"></i>
                  </button>
                </td>
              </tr>

              <!-- Empty state -->
              <tr *ngIf="filteredTasks.length === 0">
                <td colspan="7" class="px-6 py-12 text-center">
                  <i class="fas fa-balance-scale text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No statutory tasks for this filter.</p>
                  <p class="text-gray-400 text-xs mt-1">Click "Add Task" to get started.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Common Statutory Tasks Templates -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-900">Common Statutory Tasks</h3>
          <p class="text-xs text-gray-500">Click to add as a new task</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            *ngFor="let template of commonTasks"
            (click)="addTaskFromTemplate(template)"
            class="text-left p-3 bg-white border border-gray-200 rounded-md hover:border-blue-300 hover:shadow-sm transition-all">
            <div class="flex items-start">
              <i [class]="template.icon + ' text-blue-500 mt-1 mr-2'"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{{ template.name }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ template.description }}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class OtherStatutoryTasksComponent implements OnInit {
  statutoryTasks: StatutoryTask[] = [
    {
      id: 1,
      taskName: 'B-BBEE Affidavit Submission',
      responsiblePerson: 'Legal Advisor',
      dueDate: '2024-12-31',
      status: 'Planned',
      notes: 'Required for public sector tenders'
    },
    {
      id: 2,
      taskName: 'Professional Indemnity Insurance Renewal',
      responsiblePerson: 'Operations Manager',
      dueDate: '2024-11-30',
      status: 'In Progress',
      notes: 'Essential for professional services license'
    },
    {
      id: 3,
      taskName: 'Labour Relations Act Compliance Review',
      responsiblePerson: 'HR Manager',
      dueDate: '2024-12-15',
      status: 'Planned',
      notes: 'Annual review of employment contracts and policies'
    },
    {
      id: 4,
      taskName: 'Financial Services Board License Renewal',
      responsiblePerson: 'Compliance Officer',
      dueDate: '2024-10-31',
      status: 'Completed',
      notes: 'FSB license renewed for another year'
    },
    {
      id: 5,
      taskName: 'Occupational Health & Safety Audit',
      responsiblePerson: 'Safety Officer',
      dueDate: '2024-11-15',
      status: 'In Progress',
      notes: 'Annual OHS compliance audit with external consultants'
    },
    {
      id: 6,
      taskName: 'POPIA Compliance Assessment',
      responsiblePerson: 'IT Manager',
      dueDate: '2024-12-01',
      status: 'Planned',
      notes: 'Protection of Personal Information Act compliance review'
    }
  ];

  selectedStatusFilter = 'All';
  editingId: number | null = null;
  nextId = 7;

  statusFilters = [
    { label: 'All', value: 'All' },
    { label: 'Planned', value: 'Planned' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Completed', value: 'Completed' }
  ];

  commonTasks = [
    {
      name: 'B-BBEE Certification',
      description: 'Annual B-BBEE certificate application or renewal',
      icon: 'fas fa-certificate',
      template: {
        taskName: 'B-BBEE Certification Application',
        responsiblePerson: 'Compliance Officer',
        dueDate: '',
        status: 'Planned' as const,
        notes: 'Required for public sector tenders and corporate compliance'
      }
    },
    {
      name: 'Professional Indemnity Insurance',
      description: 'Renewal of professional indemnity insurance',
      icon: 'fas fa-shield-alt',
      template: {
        taskName: 'Professional Indemnity Insurance Renewal',
        responsiblePerson: 'Operations Manager',
        dueDate: '',
        status: 'Planned' as const,
        notes: 'Essential for professional services and client protection'
      }
    },
    {
      name: 'POPIA Compliance',
      description: 'Protection of Personal Information Act compliance review',
      icon: 'fas fa-user-shield',
      template: {
        taskName: 'POPIA Compliance Assessment',
        responsiblePerson: 'IT Manager',
        dueDate: '',
        status: 'Planned' as const,
        notes: 'Annual review of data protection policies and procedures'
      }
    },
    {
      name: 'OHS Audit',
      description: 'Occupational Health & Safety compliance audit',
      icon: 'fas fa-hard-hat',
      template: {
        taskName: 'Occupational Health & Safety Audit',
        responsiblePerson: 'Safety Officer',
        dueDate: '',
        status: 'Planned' as const,
        notes: 'Annual workplace safety compliance assessment'
      }
    },
    {
      name: 'Industry License Renewal',
      description: 'Sector-specific license or permit renewal',
      icon: 'fas fa-file-contract',
      template: {
        taskName: 'Industry License Renewal',
        responsiblePerson: 'Compliance Officer',
        dueDate: '',
        status: 'Planned' as const,
        notes: 'Sector-specific licensing requirements'
      }
    },
    {
      name: 'Employment Equity Report',
      description: 'Annual Employment Equity report submission',
      icon: 'fas fa-users',
      template: {
        taskName: 'Employment Equity Report Submission',
        responsiblePerson: 'HR Manager',
        dueDate: '',
        status: 'Planned' as const,
        notes: 'Required for companies with 50+ employees'
      }
    }
  ];

  ngOnInit(): void {
    // Component initialization
  }

  get filteredTasks(): StatutoryTask[] {
    if (this.selectedStatusFilter === 'All') {
      return this.statutoryTasks;
    }
    return this.statutoryTasks.filter(task => task.status === this.selectedStatusFilter);
  }

  getFilterCount(filterValue: string): number {
    if (filterValue === 'All') {
      return this.statutoryTasks.length;
    }
    return this.statutoryTasks.filter(task => task.status === filterValue).length;
  }

  trackById(index: number, item: StatutoryTask): number {
    return item.id;
  }

  startEditing(id: number, field: string): void {
    this.editingId = id;
    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('input:focus, select:focus') as HTMLInputElement;
      if (input) {
        input.select();
      }
    });
  }

  stopEditing(): void {
    this.editingId = null;
  }

  addNewTask(): void {
    const newTask: StatutoryTask = {
      id: this.nextId++,
      taskName: 'New Statutory Task',
      responsiblePerson: 'Assign Person',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      status: 'Planned',
      notes: ''
    };

    this.statutoryTasks.unshift(newTask);
    this.startEditing(newTask.id, 'taskName');
  }

  addTaskFromTemplate(template: any): void {
    const newTask: StatutoryTask = {
      id: this.nextId++,
      ...template.template,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days from now
    };

    this.statutoryTasks.unshift(newTask);
    this.startEditing(newTask.id, 'dueDate');
  }

  deleteTask(id: number): void {
    if (confirm('Are you sure you want to delete this statutory task?')) {
      this.statutoryTasks = this.statutoryTasks.filter(task => task.id !== id);
    }
  }

  isOverdue(task: StatutoryTask): boolean {
    if (task.status === 'Completed') return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < today;
  }

  isDueSoon(task: StatutoryTask): boolean {
    if (task.status === 'Completed') return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return dueDate <= thirtyDaysFromNow && dueDate >= today;
  }

  getDueSoonCount(): number {
    return this.filteredTasks.filter(task => this.isDueSoon(task)).length;
  }

  getInProgressCount(): number {
    return this.filteredTasks.filter(task => task.status === 'In Progress').length;
  }

  getCompletedCount(): number {
    return this.filteredTasks.filter(task => task.status === 'Completed').length;
  }

  getProgressWidth(status: string): string {
    switch (status) {
      case 'Planned': return '0%';
      case 'In Progress': return '50%';
      case 'Completed': return '100%';
      default: return '0%';
    }
  }

  getProgressPercentage(status: string): number {
    switch (status) {
      case 'Planned': return 0;
      case 'In Progress': return 50;
      case 'Completed': return 100;
      default: return 0;
    }
  }
}
