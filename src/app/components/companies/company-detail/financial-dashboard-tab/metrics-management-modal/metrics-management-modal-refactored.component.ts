import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IMetricGroup, IMetricType } from '../../../../../../models/metrics.model';
import { MetricsService } from '../../../../../../services/metrics.service';

// Import all the child components
import { GroupsListComponent } from './components/groups-list/groups-list.component';
import { GroupFormComponent } from './components/group-form/group-form.component';
import { TypesListComponent } from './components/types-list/types-list.component';
import { TypeFormComponent } from './components/type-form/type-form.component';
import { GroupOrderingComponent } from './components/group-ordering/group-ordering.component';

// Import the navigation service
import { ModalNavigationService, ModalState } from './services/modal-navigation.service';

@Component({
  selector: 'app-metrics-management-modal',
  standalone: true,
  imports: [
    CommonModule,
    GroupsListComponent,
    GroupFormComponent,
    TypesListComponent,
    TypeFormComponent,
    GroupOrderingComponent
  ],
  providers: [ModalNavigationService],
  template: `
    <!-- Modal Backdrop -->
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="closeModal()">

      <!-- Modal Content -->
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden" (click)="$event.stopPropagation()">

        <!-- Modal Header with Dynamic Breadcrumbs -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Back Button (only show if not on main view) -->
              <button
                *ngIf="navigation.canGoBack()"
                (click)="navigation.goBack()"
                class="text-white hover:text-blue-200"
                title="Go Back"
              >
                <i class="fas fa-arrow-left"></i>
              </button>

              <div class="p-2 bg-black bg-opacity-20 rounded-lg">
                <i class="fas fa-cog text-white text-lg"></i>
              </div>

              <div>
                <!-- Dynamic Breadcrumbs -->
                <nav class="flex items-center gap-2 text-sm">
                  <span *ngFor="let crumb of navigation.getBreadcrumbs(); let i = index" class="flex items-center gap-2">
                    <h2 *ngIf="i === 0" class="text-xl font-bold">{{ crumb }}</h2>
                    <span *ngIf="i > 0" class="text-blue-200">/ {{ crumb }}</span>
                  </span>
                </nav>
                <p class="text-blue-100 text-sm mt-1">{{ navigation.getSubtitle() }}</p>
              </div>
            </div>

            <button
              (click)="closeModal()"
              class="text-white hover:text-blue-200"
              title="Close Modal"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="p-6 max-h-[600px] overflow-y-auto">

          <!-- Groups List View -->
          <app-groups-list
            *ngIf="modalState.currentView === 'groups-list'"
            [clientId]="clientId"
            [types]="types"
            (createGroup)="navigation.showCreateGroup()"
            (editGroup)="navigation.showEditGroup($event)"
            (viewGroupTypes)="navigation.showGroupTypes($event)"
            (orderGroups)="navigation.showOrderGroups()"
          ></app-groups-list>

          <!-- Create/Edit Group Form -->
          <app-group-form
            *ngIf="modalState.currentView === 'create-group' || modalState.currentView === 'edit-group'"
            [editingGroup]="modalState.editingGroup"
            [clientId]="clientId"
            (save)="onGroupSaved()"
            (cancel)="navigation.goBack()"
          ></app-group-form>

          <!-- Types List View -->
          <app-types-list
            *ngIf="modalState.currentView === 'types-list' && modalState.selectedGroup"
            [group]="modalState.selectedGroup"
            [types]="getTypesForGroup(modalState.selectedGroup.id)"
            (createType)="navigation.showCreateType(modalState.selectedGroup!)"
            (editType)="navigation.showEditType($event)"
          ></app-types-list>

          <!-- Create/Edit Type Form -->
          <app-type-form
            *ngIf="(modalState.currentView === 'create-type' || modalState.currentView === 'edit-type') && modalState.selectedGroup"
            [editingType]="modalState.editingType"
            [groupId]="modalState.selectedGroup.id"
            (save)="onTypeSaved()"
            (cancel)="navigation.goBack()"
          ></app-type-form>

          <!-- Group Ordering -->
          <app-group-ordering
            *ngIf="modalState.currentView === 'order-groups'"
            [groups]="groups"
            [types]="types"
            (save)="onOrderSaved()"
            (cancel)="navigation.goBack()"
          ></app-group-ordering>

        </div>

        <!-- Modal Footer -->
        <div class="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div class="text-sm text-gray-500">
            {{ groups.length }} groups • {{ types.length }} total types
          </div>
          <button
            (click)="closeModal()"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  `
})
export class MetricsManagementModalComponent implements OnInit {
  @Input() clientId: number = 1;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() dataUpdated = new EventEmitter<void>();

  // Modal State
  isOpen = false;
  modalState: ModalState = {
    currentView: 'groups-list',
    selectedGroup: null,
    editingGroup: null,
    editingType: null
  };

  // Data
  groups: IMetricGroup[] = [];
  types: IMetricType[] = [];

  constructor(
    public navigation: ModalNavigationService,
    private metricsService: MetricsService
  ) {}

  ngOnInit(): void {
    // Subscribe to navigation state changes
    this.navigation.state$.subscribe(state => {
      this.modalState = state;
    });
  }

  // Modal Controls
  open(): void {
    this.isOpen = true;
    this.navigation.showGroupsList();
    this.loadData();
  }

  openModal(): void {
    this.open();
  }

  closeModal(): void {
    this.isOpen = false;
    this.navigation.showGroupsList();
    this.modalClosed.emit();
  }

  // Data Operations
  async loadData(): Promise<void> {
    try {
      // Load groups
      const groups = await this.metricsService.listGroups(this.clientId).toPromise();
      this.groups = (groups || []).sort((a: IMetricGroup, b: IMetricGroup) => (a.order_no || 0) - (b.order_no || 0));

      // Load types for all groups
      this.types = [];
      for (const group of this.groups) {
        try {
          const groupTypes = await this.metricsService.listTypes(group.id).toPromise();
          if (groupTypes) {
            this.types.push(...groupTypes);
          }
        } catch (error) {
          console.error(`Failed to load types for group ${group.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load metrics data:', error);
    }
  }

  getTypesForGroup(groupId: number): IMetricType[] {
    return this.types.filter(type => type.group_id === groupId);
  }

  // Event Handlers
  async onGroupSaved(): Promise<void> {
    await this.loadData();
    this.dataUpdated.emit();
    this.navigation.showGroupsList();
  }

  async onTypeSaved(): Promise<void> {
    await this.loadData();
    this.dataUpdated.emit();
    if (this.modalState.selectedGroup) {
      this.navigation.showGroupTypes(this.modalState.selectedGroup);
    }
  }

  async onOrderSaved(): Promise<void> {
    await this.loadData();
    this.dataUpdated.emit();
    this.navigation.showGroupsList();
  }
}
