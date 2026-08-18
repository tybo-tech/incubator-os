import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NodeService } from '../../../services/node.service';
import { StatutoryTaskFormComponent } from '../../shared/statutory-task-form.component';
import { ToastService } from '../../services/toast.service';
import { INode } from '../../../models/schema';
import { IStatutoryTask } from '../../../models/statutory-task.model';

const NODE_TYPE = 'statutory_task';

@Component({
  selector: 'app-other-statutory-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, StatutoryTaskFormComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Other Statutory Tasks</h2>
          <p class="mt-1 text-sm text-gray-500">
            Track additional compliance activities such as B-BBEE certification, sectoral licenses, and industry-specific regulations.
          </p>
        </div>
        <button
          (click)="openNew()"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus w-4 h-4 mr-2"></i>
          Add Task
        </button>
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
              <p class="text-lg font-semibold text-gray-900">{{ records().length }}</p>
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

      <div *ngIf="loading()" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{{ error() }}</div>

      <!-- Table -->
      <div *ngIf="!loading()" class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let item of records()" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.data.taskName }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ item.data.responsiblePerson }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm"
                  [class.text-red-600]="isOverdue(item)"
                  [class.text-amber-600]="isDueSoon(item) && !isOverdue(item)"
                  [class.text-gray-900]="!isOverdue(item) && !isDueSoon(item)">
                  {{ item.data.dueDate | date:'mediumDate' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    [class.bg-gray-100]="item.data.status === 'Planned'"
                    [class.text-gray-800]="item.data.status === 'Planned'"
                    [class.bg-blue-100]="item.data.status === 'In Progress'"
                    [class.text-blue-800]="item.data.status === 'In Progress'"
                    [class.bg-green-100]="item.data.status === 'Completed'"
                    [class.text-green-800]="item.data.status === 'Completed'">
                    {{ item.data.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{{ item.data.notes || '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button (click)="edit(item)" class="text-blue-600 hover:text-blue-900 transition-colors mr-3" title="Edit record">
                    <i class="fas fa-edit w-4 h-4"></i>
                  </button>
                  <button (click)="delete(item)" class="text-red-600 hover:text-red-900 transition-colors" title="Delete record">
                    <i class="fas fa-trash w-4 h-4"></i>
                  </button>
                </td>
              </tr>

              <tr *ngIf="records().length === 0">
                <td colspan="6" class="px-6 py-12 text-center">
                  <i class="fas fa-balance-scale text-gray-400 text-3xl mb-4"></i>
                  <p class="text-gray-500 text-sm">No statutory tasks for this company yet.</p>
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

      <!-- Statutory Task Form Dialog -->
      <app-statutory-task-form
        *ngIf="showForm()"
        [nodeType]="NODE_TYPE"
        [editNode]="editingNode()"
        [companyId]="companyId()"
        (close)="closeForm()"
        (saved)="onFormSaved()" />
    </div>
  `,
})
export class OtherStatutoryTasksComponent implements OnInit {
  protected readonly NODE_TYPE = 'statutory_task';
  protected companyId = signal<number>(0);
  records = signal<INode<IStatutoryTask>[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showForm = signal(false);
  editingNode = signal<INode<IStatutoryTask> | null>(null);
  private toast = inject(ToastService);

  commonTasks = [
    {
      name: 'B-BBEE Certification',
      description: 'Annual B-BBEE certificate application or renewal',
      icon: 'fas fa-certificate',
      template: {
        taskName: 'B-BBEE Certification Application',
        responsiblePerson: 'Compliance Officer',
        status: 'Planned',
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
        status: 'Planned',
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
        status: 'Planned',
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
        status: 'Planned',
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
        status: 'Planned',
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
        status: 'Planned',
        notes: 'Required for companies with 50+ employees'
      }
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService<IStatutoryTask>,
  ) {}

  ngOnInit(): void {
    this.route.parent?.parent?.params.subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (id) { this.companyId.set(id); this.loadAll(); }
    });
  }

  loadAll(): void {
    const cid = this.companyId();
    if (!cid) return;
    this.loading.set(true); this.error.set(null);
    this.nodeService.getNodesByCompany(cid, NODE_TYPE).subscribe({
      next: (r) => { this.records.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  openNew(): void { this.editingNode.set(null); this.showForm.set(true); }
  edit(item: INode<IStatutoryTask>): void { this.editingNode.set(item); this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); this.editingNode.set(null); }
  onFormSaved(): void { this.showForm.set(false); this.editingNode.set(null); this.loadAll(); this.toast.saveSuccess('Task'); }

  delete(item: INode<IStatutoryTask>): void {
    if (!confirm('Delete this statutory task?')) return;
    this.nodeService.deleteNode(item.id!).subscribe({
      next: () => { this.loadAll(); this.toast.deleteSuccess('Task'); },
      error: (err) => { this.error.set(err.error?.error || 'Failed to delete'); this.toast.deleteError('task'); }
    });
  }

  addTaskFromTemplate(template: any): void {
    const cid = this.companyId();
    if (!cid) return;
    const payload: any = {
      type: NODE_TYPE,
      company_id: cid,
      data: {
        ...template.template,
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    };

    this.nodeService.addNode(payload).subscribe({
      next: () => { this.loadAll(); this.toast.saveSuccess('Task'); },
      error: (err) => { this.error.set(err.error?.error || 'Failed to add task'); this.toast.saveError('task'); }
    });
  }

  isOverdue(item: INode<IStatutoryTask>): boolean {
    if (item.data.status === 'Completed') return false;
    return new Date(item.data.dueDate) < new Date();
  }

  isDueSoon(item: INode<IStatutoryTask>): boolean {
    if (item.data.status === 'Completed') return false;
    const due = new Date(item.data.dueDate);
    const today = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return due <= thirtyDays && due >= today;
  }

  getDueSoonCount(): number {
    return this.records().filter(r => this.isDueSoon(r)).length;
  }

  getInProgressCount(): number {
    return this.records().filter(r => r.data.status === 'In Progress').length;
  }

  getCompletedCount(): number {
    return this.records().filter(r => r.data.status === 'Completed').length;
  }
}
