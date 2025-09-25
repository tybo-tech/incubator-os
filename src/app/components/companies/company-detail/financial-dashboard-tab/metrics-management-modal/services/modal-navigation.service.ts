import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IMetricGroup, IMetricType } from '../../../../../../../models/metrics.model';

export type ModalView =
  | 'groups-list'
  | 'create-group'
  | 'edit-group'
  | 'types-list'
  | 'create-type'
  | 'edit-type'
  | 'order-groups';

export interface ModalState {
  currentView: ModalView;
  selectedGroup: IMetricGroup | null;
  editingGroup: IMetricGroup | null;
  editingType: IMetricType | null;
}

@Injectable()
export class ModalNavigationService {
  private stateSubject = new BehaviorSubject<ModalState>({
    currentView: 'groups-list',
    selectedGroup: null,
    editingGroup: null,
    editingType: null
  });

  state$ = this.stateSubject.asObservable();

  get currentState(): ModalState {
    return this.stateSubject.value;
  }

  // Navigation Methods
  showGroupsList(): void {
    this.stateSubject.next({
      currentView: 'groups-list',
      selectedGroup: null,
      editingGroup: null,
      editingType: null
    });
  }

  showCreateGroup(): void {
    this.stateSubject.next({
      ...this.currentState,
      currentView: 'create-group',
      editingGroup: null
    });
  }

  showEditGroup(group: IMetricGroup): void {
    this.stateSubject.next({
      ...this.currentState,
      currentView: 'edit-group',
      editingGroup: group
    });
  }

  showGroupTypes(group: IMetricGroup): void {
    this.stateSubject.next({
      ...this.currentState,
      currentView: 'types-list',
      selectedGroup: group,
      editingType: null
    });
  }

  showCreateType(group: IMetricGroup): void {
    this.stateSubject.next({
      ...this.currentState,
      currentView: 'create-type',
      selectedGroup: group,
      editingType: null
    });
  }

  showEditType(type: IMetricType): void {
    this.stateSubject.next({
      ...this.currentState,
      currentView: 'edit-type',
      editingType: type
    });
  }

  showOrderGroups(): void {
    this.stateSubject.next({
      ...this.currentState,
      currentView: 'order-groups'
    });
  }

  // Breadcrumb helpers
  getBreadcrumbs(): string[] {
    const state = this.currentState;
    const breadcrumbs: string[] = ['Manage Groups'];

    switch (state.currentView) {
      case 'create-group':
        breadcrumbs.push('Create Group');
        break;
      case 'edit-group':
        if (state.editingGroup) {
          breadcrumbs.push(`Edit ${state.editingGroup.name}`);
        }
        break;
      case 'types-list':
        if (state.selectedGroup) {
          breadcrumbs.push(state.selectedGroup.name);
        }
        break;
      case 'create-type':
        if (state.selectedGroup) {
          breadcrumbs.push(state.selectedGroup.name, 'Create Type');
        }
        break;
      case 'edit-type':
        if (state.selectedGroup && state.editingType) {
          breadcrumbs.push(state.selectedGroup.name, `Edit ${state.editingType.name}`);
        }
        break;
      case 'order-groups':
        breadcrumbs.push('Order Groups');
        break;
    }

    return breadcrumbs;
  }

  getSubtitle(): string {
    const state = this.currentState;

    switch (state.currentView) {
      case 'groups-list':
        return 'Organize and manage metric groups and types';
      case 'create-group':
        return 'Create a new metric group to organize related metrics';
      case 'edit-group':
        return 'Modify the properties of this metric group';
      case 'types-list':
        return `Manage metric types within ${state.selectedGroup?.name || 'this group'}`;
      case 'create-type':
        return 'Create a new metric type within this group';
      case 'edit-type':
        return 'Modify the properties of this metric type';
      case 'order-groups':
        return 'Rearrange the display order of metric groups';
      default:
        return '';
    }
  }

  canGoBack(): boolean {
    return this.currentState.currentView !== 'groups-list';
  }

  goBack(): void {
    const state = this.currentState;

    switch (state.currentView) {
      case 'create-group':
      case 'edit-group':
      case 'order-groups':
        this.showGroupsList();
        break;
      case 'types-list':
        this.showGroupsList();
        break;
      case 'create-type':
      case 'edit-type':
        if (state.selectedGroup) {
          this.showGroupTypes(state.selectedGroup);
        } else {
          this.showGroupsList();
        }
        break;
      default:
        this.showGroupsList();
    }
  }
}
