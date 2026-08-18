import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../services/node.service';
import { INode } from '../../models/schema';
import { IStatutoryTask } from '../../models/statutory-task.model';

@Component({
  selector: 'app-statutory-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ isEdit() ? 'Edit' : 'New' }} Statutory Task</h3>
          <button (click)="close.emit()" class="p-1 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
            <input type="text" [(ngModel)]="form.taskName" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g., B-BBEE Certification Application" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Responsible Person</label>
            <input type="text" [(ngModel)]="form.responsiblePerson" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g., Compliance Officer" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" [(ngModel)]="form.dueDate" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select [(ngModel)]="form.status" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea [(ngModel)]="form.notes" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Additional notes..."></textarea>
          </div>
        </div>
        <div class="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button (click)="close.emit()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button (click)="save()" [disabled]="saving()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{{ saving() ? 'Saving...' : 'Save' }}</button>
        </div>
      </div>
    </div>
  `
})
export class StatutoryTaskFormComponent implements OnInit {
  nodeType = input.required<string>();
  editNode = input<INode<any> | null>(null);
  companyId = input<number>(0);
  close = output<void>();
  saved = output<void>();

  isEdit = computed(() => !!this.editNode());

  form: IStatutoryTask = {
    taskName: 'New Statutory Task',
    responsiblePerson: 'Assign Person',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Planned',
    notes: '',
  };

  saving = signal(false);

  constructor(private nodeService: NodeService<any>) {}

  ngOnInit(): void {
    const node = this.editNode();
    if (node) {
      this.form = { ...node.data };
    }
  }

  save(): void {
    this.saving.set(true);
    const node = this.editNode();
    const cid = this.companyId();
    const payload: any = {
      type: this.nodeType(),
      company_id: cid,
      data: this.form,
    };

    const obs = node?.id
      ? this.nodeService.updateNode({ ...node, company_id: cid, data: this.form })
      : this.nodeService.addNode(payload);

    obs.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: () => { this.saving.set(false); }
    });
  }
}
