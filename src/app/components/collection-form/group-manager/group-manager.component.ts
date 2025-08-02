import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IGroup } from '../../../../models/schema';
import { LucideAngularModule, Plus, X, Edit, Trash2, FolderOpen } from 'lucide-angular';

@Component({
  selector: 'app-group-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-md font-medium text-gray-900">Groups</h4>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-500">{{ groups.length }} group(s)</span>
          <button type="button" 
                  (click)="toggleGroupForm()"
                  class="inline-flex items-center px-3 py-1 border border-green-600 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            <lucide-icon [img]="isGroupFormExpanded ? XIcon : PlusIcon" class="h-4 w-4 mr-1"></lucide-icon>
            {{ isGroupFormExpanded ? 'Cancel' : 'Add Group' }}
          </button>
        </div>
      </div>

      <!-- Existing Groups List -->
      <div *ngIf="groups.length > 0" class="mb-4 space-y-2">
        <div *ngFor="let group of groups; let i = index; trackBy: trackByIndex"
             class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
          <div class="flex-1">
            <div class="flex items-center space-x-3">
              <span class="font-medium text-gray-900">{{ group.name }}</span>
              <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Group
              </span>
            </div>
            <div class="text-sm text-gray-500 mt-1">
              ID: <code class="bg-gray-200 px-1 rounded">{{ group.id }}</code>
              <span *ngIf="group.description"> • {{ group.description }}</span>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button type="button" 
                    (click)="editGroup(i)"
                    class="text-green-600 hover:text-green-800 p-1">
              <lucide-icon [img]="EditIcon" class="h-4 w-4"></lucide-icon>
            </button>
            <button type="button" 
                    (click)="removeGroup(i)"
                    class="text-red-600 hover:text-red-800 p-1">
              <lucide-icon [img]="Trash2Icon" class="h-4 w-4"></lucide-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- No Groups Message -->
      <div *ngIf="groups.length === 0 && !isGroupFormExpanded" class="text-center py-6 text-gray-500">
        <lucide-icon [img]="FolderOpenIcon" class="mx-auto h-8 w-8 text-gray-400 mb-2"></lucide-icon>
        <p class="text-sm">No groups created yet</p>
        <p class="text-xs text-gray-400 mt-1">Groups help organize your fields for better form layout</p>
      </div>

      <!-- Add New Group Form (Collapsible) -->
      <div *ngIf="isGroupFormExpanded" class="border border-green-300 rounded-lg p-4 bg-green-50 animate-in slide-in-from-top duration-200">
        <div class="flex items-center justify-between mb-3">
          <h5 class="text-sm font-medium text-gray-900">Add New Group</h5>
          <button type="button" 
                  (click)="toggleGroupForm()"
                  class="text-green-600 hover:text-green-800 p-1">
            <lucide-icon [img]="XIcon" class="h-4 w-4"></lucide-icon>
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <!-- Group Name -->
          <div>
            <label for="group-name" class="block text-sm font-medium text-gray-700 mb-1">
              Group Name <span class="text-red-500">*</span>
            </label>
            <input type="text" 
                   id="group-name"
                   [(ngModel)]="newGroup.name"
                   (input)="generateGroupKey()"
                   name="groupName"
                   placeholder="e.g., Personal Details"
                   class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
          </div>

          <!-- Group Description -->
          <div>
            <label for="group-description" class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input type="text" 
                   id="group-description"
                   [(ngModel)]="newGroup.description"
                   name="groupDescription"
                   placeholder="Optional description"
                   class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm">
          </div>
        </div>

        <div class="flex space-x-3">
          <button type="button" 
                  (click)="addGroup()"
                  [disabled]="!isNewGroupValid()"
                  class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
            <lucide-icon [img]="PlusIcon" class="h-4 w-4 mr-1 inline-block"></lucide-icon>
            Create Group
          </button>
          <button type="button" 
                  (click)="toggleGroupForm()"
                  class="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md shadow-sm hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `
})
export class GroupManagerComponent {
  @Input() groups: IGroup[] = [];
  @Output() groupsChange = new EventEmitter<IGroup[]>();

  // Lucide Icons
  readonly PlusIcon = Plus;
  readonly XIcon = X;
  readonly EditIcon = Edit;
  readonly Trash2Icon = Trash2;
  readonly FolderOpenIcon = FolderOpen;

  // UI state
  isGroupFormExpanded = false;
  newGroup: Partial<IGroup> = this.createEmptyGroup();

  toggleGroupForm() {
    this.isGroupFormExpanded = !this.isGroupFormExpanded;
    
    // Reset form when closing
    if (!this.isGroupFormExpanded) {
      this.newGroup = this.createEmptyGroup();
    }
  }

  addGroup() {
    if (!this.isNewGroupValid()) {
      return;
    }

    // Check for duplicate group names
    if (this.groups.some(group => group.name === this.newGroup.name)) {
      console.warn('Group name already exists:', this.newGroup.name);
      return;
    }

    const group: IGroup = {
      id: this.newGroup.id!,
      name: this.newGroup.name!,
      description: this.newGroup.description || '',
      order: this.groups.length
    };

    this.groups.push(group);
    this.groupsChange.emit([...this.groups]);
    this.newGroup = this.createEmptyGroup();
    
    // Auto-collapse the form after adding a group
    this.isGroupFormExpanded = false;
  }

  removeGroup(index: number) {
    this.groups.splice(index, 1);
    this.groupsChange.emit([...this.groups]);
  }

  editGroup(index: number) {
    const group = this.groups[index];
    this.newGroup = { ...group };
    this.removeGroup(index);
    
    // Expand the form for editing
    this.isGroupFormExpanded = true;
  }

  generateGroupKey() {
    if (this.newGroup.name && !this.newGroup.id) {
      this.newGroup.id = this.generateSecureKey(this.newGroup.name);
    }
  }

  private generateSecureKey(label: string): string {
    const baseKey = label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    
    // Add timestamp and random string to ensure uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${baseKey}_${timestamp}_${random}`;
  }

  private createEmptyGroup(): Partial<IGroup> {
    return {
      id: '',
      name: '',
      description: '',
      order: this.groups.length
    };
  }

  isNewGroupValid(): boolean {
    return !!(
      this.newGroup.id?.trim() &&
      this.newGroup.name?.trim()
    );
  }

  trackByIndex(index: number): number {
    return index;
  }
}
