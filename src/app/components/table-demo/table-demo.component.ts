import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../models/schema';
import { TestDataService } from '../../services/test-data.service';
import { CollectionTableComponent } from '../collection-table/collection-table.component';
import { ViewControlsComponent } from '../view-controls/view-controls.component';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';

@Component({
  selector: 'app-table-demo',
  standalone: true,
  imports: [CommonModule, CollectionTableComponent, ViewControlsComponent, DynamicFormComponent],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Dynamic Table Configuration Demo</h1>

      <!-- Demo Controls -->
      <div class="mb-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Collection Selector</h2>
        <div class="flex space-x-4">
          <button
            (click)="loadCompanyDemo()"
            [class]="selectedDemo === 'company' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
            class="px-4 py-2 rounded-md font-medium transition-colors">
            Company Collection
          </button>
          <button
            (click)="loadDirectorDemo()"
            [class]="selectedDemo === 'director' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
            class="px-4 py-2 rounded-md font-medium transition-colors">
            Director Collection
          </button>
          <button
            (click)="loadEmptyDemo()"
            [class]="selectedDemo === 'empty' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
            class="px-4 py-2 rounded-md font-medium transition-colors">
            Empty Collection
          </button>
        </div>
      </div>

      <!-- Schema Information -->
      <div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4" *ngIf="currentCollection">
        <h3 class="text-lg font-medium text-blue-900 mb-2">Collection Schema</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span class="font-medium text-blue-800">Name:</span>
            {{ currentCollection.data?.name }}
          </div>
          <div>
            <span class="font-medium text-blue-800">Target Type:</span>
            {{ currentCollection.data?.targetType }}
          </div>
          <div>
            <span class="font-medium text-blue-800">Fields:</span>
            {{ currentCollection.data?.fields?.length || 0 }}
          </div>
        </div>
        <div class="mt-3">
          <span class="font-medium text-blue-800">Groups:</span>
          <span class="ml-2" *ngFor="let group of currentCollection.data?.groups; let last = last">
            {{ group.name }}<span *ngIf="!last">, </span>
          </span>
        </div>
      </div>

      <!-- View Controls -->
      <div class="mb-6" *ngIf="currentCollection">
        <app-view-controls
          [collection]="currentCollection"
          [views]="availableViews"
          (viewSelected)="onViewSelected($event)"
          (searchChanged)="onSearchChanged($event)"
          (addRecord)="onAddRecord()"
        ></app-view-controls>
      </div>

      <!-- Dynamic Table -->
      <div class="bg-white rounded-lg shadow-sm">
        <app-collection-table
          [collection]="currentCollection"
          [collectionData]="collectionData"
          [selectedView]="selectedView"
          (selectRow)="onSelectRow($event)"
          (editRow)="onEditRow($event)"
          (deleteRow)="onDeleteRow($event)"
        ></app-collection-table>
      </div>

      <!-- Debug Information -->
      <div class="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4" *ngIf="debugMode">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Debug Information</h3>
        <div class="space-y-2 text-sm font-mono">
          <div><strong>Selected Demo:</strong> {{ selectedDemo }}</div>
          <div><strong>Collection ID:</strong> {{ currentCollection?.id }}</div>
          <div><strong>Data Records:</strong> {{ collectionData.length }}</div>
          <div><strong>Available Views:</strong> {{ availableViews.length }}</div>
          <div><strong>Selected View:</strong> {{ selectedView?.data?.name || 'None' }}</div>
        </div>
      </div>

      <!-- Toggle Debug -->
      <div class="mt-4 text-center">
        <button
          (click)="debugMode = !debugMode"
          class="text-sm text-gray-500 hover:text-gray-700">
          {{ debugMode ? 'Hide' : 'Show' }} Debug Info
        </button>
      </div>

      <!-- Dynamic Form Modal -->
      <app-dynamic-form
        [isVisible]="showFormModal"
        [collection]="currentCollection"
        [editingRecord]="editingRecord"
        (close)="onFormClose()"
        (save)="onFormSave($event)"
      ></app-dynamic-form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TableDemoComponent implements OnInit {
  currentCollection: INode | null = null;
  collectionData: INode[] = [];
  availableViews: INode[] = [];
  selectedView: INode | null = null;
  selectedDemo: string = '';
  debugMode: boolean = false;

  // Form modal state
  showFormModal: boolean = false;
  editingRecord: INode | null = null;

  constructor(private testDataService: TestDataService) {}

  ngOnInit() {
    // Load company demo by default
    this.loadCompanyDemo();
  }

  loadCompanyDemo() {
    this.selectedDemo = 'company';
    this.currentCollection = this.testDataService.getCompanyCollection();
    this.collectionData = this.testDataService.getCompanyData();
    this.availableViews = this.testDataService.getCompanyViews();
    this.selectedView = null;
    console.log('Company demo loaded:', this.currentCollection, this.collectionData);
  }

  loadDirectorDemo() {
    this.selectedDemo = 'director';
    this.currentCollection = this.testDataService.getDirectorCollection();
    this.collectionData = []; // No sample director data for now
    this.availableViews = [];
    this.selectedView = null;
    console.log('Director demo loaded:', this.currentCollection);
  }

  loadEmptyDemo() {
    this.selectedDemo = 'empty';
    this.currentCollection = null;
    this.collectionData = [];
    this.availableViews = [];
    this.selectedView = null;
    console.log('Empty demo loaded');
  }

  onViewSelected(view: INode) {
    this.selectedView = view;
    console.log('View selected in demo:', view.data?.name);
  }

  onSearchChanged(searchTerm: string) {
    console.log('Search changed in demo:', searchTerm);
    // TODO: Implement search filtering
  }

  onSelectRow(node: INode) {
    console.log('Row selected in demo:', node.id, node.data?.name);
  }

  onEditRow(node: INode) {
    console.log('Edit row in demo:', node.id, node.data?.name);
    this.editingRecord = node;
    this.showFormModal = true;
  }

  onDeleteRow(node: INode) {
    console.log('Delete row in demo:', node.id, node.data?.name);
  }

  // Form modal handlers
  onAddRecord() {
    console.log('Add record clicked in demo');
    this.editingRecord = null;
    this.showFormModal = true;
  }

  onFormClose() {
    console.log('Form modal closed in demo');
    this.showFormModal = false;
    this.editingRecord = null;
  }

  onFormSave(formResult: any) {
    console.log('Form saved in demo:', formResult);

    const { data, isEdit, originalRecord } = formResult;

    if (isEdit && originalRecord) {
      // Simulate updating existing record
      const index = this.collectionData.findIndex(item => item.id === originalRecord.id);
      if (index !== -1) {
        this.collectionData[index] = {
          ...originalRecord,
          data: { ...originalRecord.data, ...data },
          updated_at: new Date().toISOString()
        };
        console.log('Record updated in demo data');
      }
    } else {
      // Simulate creating new record
      const newRecord: INode = {
        id: Math.max(...this.collectionData.map(r => r.id || 0)) + 1,
        type: this.currentCollection?.data?.targetType || 'unknown',
        data: data,
        created_at: new Date().toISOString()
      };
      this.collectionData = [...this.collectionData, newRecord];
      console.log('New record added to demo data:', newRecord);
    }

    // Close the modal
    this.showFormModal = false;
    this.editingRecord = null;
  }
}
