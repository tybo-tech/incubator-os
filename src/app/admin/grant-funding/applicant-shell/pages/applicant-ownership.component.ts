import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IGrantApplicationData } from '../../interfaces/grant-application.interfaces';
import { GrantApplicationApiService } from '../../services/grant-application-api.service';

@Component({
  selector: 'app-applicant-ownership',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Ownership</h2>
        <button *ngIf="!isEditing()" (click)="startEdit()"
                class="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
          Edit
        </button>
        <div *ngIf="isEditing()" class="flex space-x-2">
          <button (click)="cancel()"
                  class="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button (click)="save()" [disabled]="isSaving()"
                  class="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {{ isSaving() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>

      <!-- View mode -->
      <div *ngIf="!isEditing()" class="px-5 py-4 flex flex-wrap gap-6">
        <div class="flex items-center space-x-2">
          <div [class]="flagDot(data.youth_owned)"></div>
          <span class="text-sm text-gray-700">Youth Owned</span>
          <span [class]="flagBadge(data.youth_owned)">{{ data.youth_owned ? 'Yes' : 'No' }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <div [class]="flagDot(data.black_owned)"></div>
          <span class="text-sm text-gray-700">Black Ownership</span>
          <span [class]="flagBadge(data.black_owned)">{{ data.black_owned ? 'Yes' : 'No' }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <div [class]="flagDot(data.black_women_owned)"></div>
          <span class="text-sm text-gray-700">Black Women Ownership</span>
          <span [class]="flagBadge(data.black_women_owned)">{{ data.black_women_owned ? 'Yes' : 'No' }}</span>
        </div>
      </div>

      <!-- Edit mode -->
      <div *ngIf="isEditing()" class="px-5 py-4 flex flex-wrap gap-6">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" [(ngModel)]="draft.youth_owned"
                 class="w-4 h-4 text-blue-600 border-gray-300 rounded">
          <span class="text-sm text-gray-700">Youth Owned</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" [(ngModel)]="draft.black_owned"
                 class="w-4 h-4 text-blue-600 border-gray-300 rounded">
          <span class="text-sm text-gray-700">Black Ownership</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" [(ngModel)]="draft.black_women_owned"
                 class="w-4 h-4 text-blue-600 border-gray-300 rounded">
          <span class="text-sm text-gray-700">Black Women Ownership</span>
        </label>
      </div>
    </div>
  `
})
export class ApplicantOwnershipComponent {
  @Input() applicantId = 0;
  @Input() data: IGrantApplicationData = { company_name: '' };
  @Output() dataUpdated = new EventEmitter<IGrantApplicationData>();

  isEditing = signal(false);
  isSaving = signal(false);
  draft: Partial<IGrantApplicationData> = {};

  constructor(private api: GrantApplicationApiService) {}

  startEdit(): void {
    this.draft = {
      youth_owned: this.data.youth_owned,
      black_owned: this.data.black_owned,
      black_women_owned: this.data.black_women_owned,
    };
    this.isEditing.set(true);
  }

  cancel(): void { this.isEditing.set(false); }

  save(): void {
    this.isSaving.set(true);
    this.api.updateApplication(this.applicantId, {
      youth_owned: this.draft.youth_owned,
      black_owned: this.draft.black_owned,
      black_women_owned: this.draft.black_women_owned,
    }).subscribe({
      next: node => {
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.dataUpdated.emit(node.data);
      },
      error: () => this.isSaving.set(false)
    });
  }

  flagDot(val?: boolean): string {
    return `w-2 h-2 rounded-full ${val ? 'bg-green-500' : 'bg-gray-300'}`;
  }

  flagBadge(val?: boolean): string {
    const base = 'text-xs font-medium px-2 py-0.5 rounded-full ';
    return base + (val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500');
  }
}
