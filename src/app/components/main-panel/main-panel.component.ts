import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { INode } from '../../../models/schema';
import { NodeService } from '../../../services';
import { CollectionTableComponent } from '../collection-table/collection-table.component';
import { ViewControlsComponent } from '../view-controls/view-controls.component';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-main-panel',
  standalone: true,
  imports: [
    CommonModule,
    ViewControlsComponent,
    CollectionTableComponent,
    BreadcrumbComponent,
    DynamicFormComponent,
  ],
  template: `
    <div class="flex flex-col h-full" *ngIf="currentCollection">
      <!-- Collection Header -->
      <div class="mb-6">
        <!-- Breadcrumb Navigation -->
        <app-breadcrumb
          [items]="getBreadcrumbItems(currentCollection)"
        ></app-breadcrumb>

        <!-- Collection Title -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              {{ currentCollection.data?.name || 'Untitled Collection' }}
            </h1>
            <p
              class="text-gray-600 mt-1"
              *ngIf="currentCollection.data?.description"
            >
              {{ currentCollection.data.description }}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {{ currentCollection.data?.fields?.length || 0 }} fields
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              {{ collectionData.length }} records
            </span>
          </div>
        </div>
      </div>

      <!-- View Controls Section -->
      <div class="mb-6">
        <app-view-controls
          [collection]="currentCollection"
          [views]="collectionViews"
          (viewSelected)="onViewSelected($event)"
          (searchChanged)="onSearchChanged($event)"
          (addRecord)="onAddRecord()"
        ></app-view-controls>
      </div>

      <!-- Collection Table Section -->
      <div class="flex-1 min-h-0">
        <app-collection-table
          [collection]="currentCollection"
          [collectionData]="collectionData"
          [selectedView]="selectedView"
          (selectRow)="onSelectRow($event)"
          (editRow)="onEditRow($event)"
          (deleteRow)="onDeleteRow($event)"
        >
        </app-collection-table>
      </div>
    </div>

    <!-- Dynamic Form Modal -->
    <app-dynamic-form
      [isVisible]="showFormModal"
      [collection]="currentCollection || null"
      [editingRecord]="editingRecord"
      (close)="onFormClose()"
      (save)="onFormSave($event)"
    ></app-dynamic-form>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
    `,
  ],
})
export class MainPanelComponent implements OnInit, OnDestroy {
  currentCollection?: INode;
  collectionData: INode[] = [];
  collectionViews: INode[] = [];
  selectedView: INode | null = null;
  collectionId!: string;

  // Form modal state
  showFormModal: boolean = false;
  editingRecord: INode | null = null;

  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to route changes to reload data when collection changes
    this.routeSubscription = this.route.params.subscribe((params) => {
      this.collectionId = params['collectionId'];
      if (this.collectionId) {
        console.log('Route changed to collection ID:', this.collectionId);
        this.loadCollection();
      }
    });
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private loadCollection() {
    const collectionIdNum = parseInt(this.collectionId);
    // Call 1: Get collection metadata
    this.nodeService.getNodeById(collectionIdNum).subscribe((collection) => {
      console.log('Call 1 - Collection loaded:', collection.data?.['name']);
      this.currentCollection = collection;
      this.loadData(collection);
      this.loadViews(collection);
    });
  }

  loadData(collection: INode) {
    const targetType = collection.id?.toString();
    if (targetType) {
      // Call 2: Get collection data using the targetType
      this.nodeService.getNodesByType(targetType).subscribe((data) => {
        console.log('Call 2 - Collection data loaded:', data.length, 'records');
        console.log('Target type:', targetType);
        console.log('Sample record:', data[0]);
        this.collectionData = data;
      });
    } else {
      console.warn('No targetType found in collection:', collection);
      this.collectionData = [];
    }
  }

  loadViews(collection: INode) {
    // Load views for this collection
    // Views are typically child nodes of type 'view' that belong to this collection
    this.nodeService.getNodesByType('view').subscribe((allViews) => {
      // Filter views that belong to this collection
      this.collectionViews = allViews.filter(
        (view) => view.data?.['collectionId'] === collection.id
      );
      console.log('Views loaded for collection:', this.collectionViews.length);
    });
  }
  navigateToOverview() {
    this.router.navigate(['/']);
  }

  getBreadcrumbItems(collection: INode): BreadcrumbItem[] {
    return [
      {
        label: 'Overview',
        action: () => this.navigateToOverview(),
      },
      {
        label: collection.data?.name || 'Untitled Collection',
        isActive: true,
      },
    ];
  }

  // Table event handlers
  onSelectRow(node: INode) {
    console.log('Main panel - Row selected:', node.id, node.type);
    // TODO: Handle row selection (show details, navigate, etc.)
  }

  onEditRow(node: INode) {
    console.log('Main panel - Edit row:', node.id);
    this.editingRecord = node;
    this.showFormModal = true;
  }

  onDeleteRow(node: INode) {
    console.log('Main panel - Delete row:', node.id);
    // TODO: Show confirmation dialog and handle deletion
  }

  // View controls event handlers
  onViewSelected(view: INode) {
    console.log('Main panel - View selected:', view.data?.name);
    this.selectedView = view;
    // TODO: Apply view filters to collection data
  }

  onSearchChanged(searchTerm: string) {
    console.log('Main panel - Search changed:', searchTerm);
    // TODO: Filter collection data based on search term
  }

  // Form modal event handlers
  onAddRecord() {
    console.log('Main panel - Add record requested');
    this.editingRecord = null;
    this.showFormModal = true;
  }

  onFormClose() {
    console.log('Main panel - Form modal closed');
    this.showFormModal = false;
    this.editingRecord = null;
  }

  onFormSave(formResult: any) {
    if (!this.currentCollection || !this.currentCollection.id) return;
    console.log('Main panel - Form saved:', formResult);

    const { data, isEdit, originalRecord } = formResult;

    if (isEdit && originalRecord) {
      this.nodeService
        .updateNode({
          ...originalRecord,
          data: data,
        })
        .subscribe(() => {
          console.log('Record updated successfully');
          this.loadData(this.currentCollection!);
        });
    } else {
      // Handle create mode
      console.log('Creating new record with data:', data);
      this.nodeService
        .addNode({
          type: this.currentCollection.id.toString(),
          data: data,
          parent_id: this.currentCollection?.id,
        })
        .subscribe((newRecord) => {
          console.log('New record created:', newRecord.id);
          // Optionally reload collection data
          this.loadData(this.currentCollection!);
        });
    }

    // Close the modal
    this.showFormModal = false;
    this.editingRecord = null;

    // TODO: Reload collection data after save
    // this.loadData(this.currentCollection!);
  }
}
