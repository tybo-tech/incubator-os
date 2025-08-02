import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MultiSelectComponent } from '../multi-select/multi-select.component';
import { NodeService } from '../../../services/node.service';
import { IHydratedNode } from '../../../models/schema';

@Component({
  selector: 'app-multi-select-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MultiSelectComponent],
  template: `
    <div class="container">
      <h2>Multi-Select Relationship Demo</h2>
      
      <!-- Form-based Multi-Select -->
      <div class="demo-section">
        <h3>Reactive Form Example</h3>
        <form [formGroup]="demoForm" (ngSubmit)="onSubmit()">
          
          <!-- Company Multi-Select -->
          <div class="form-group">
            <label for="companies">Related Companies:</label>
            <app-multi-select
              formControlName="companies"
              [sourceCollectionId]="companyCollectionId"
              labelField="name"
              placeholder="Select companies..."
              emptyText="No companies selected">
            </app-multi-select>
          </div>
          
          <!-- Directors Multi-Select -->
          <div class="form-group">
            <label for="directors">Related Directors:</label>
            <app-multi-select
              formControlName="directors"
              [sourceCollectionId]="directorCollectionId"
              labelField="name"
              placeholder="Select directors..."
              emptyText="No directors selected">
            </app-multi-select>
          </div>
          
          <!-- Form Actions -->
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Multi-Select Data</button>
            <button type="button" class="btn btn-secondary" (click)="loadTestData()">Load Test Data</button>
            <button type="button" class="btn btn-info" (click)="clearForm()">Clear Form</button>
          </div>
        </form>
      </div>
      
      <!-- Current Form Values Display -->
      <div class="demo-section">
        <h3>Current Form Values</h3>
        <div class="form-values">
          <pre>{{ demoForm.value | json }}</pre>
        </div>
      </div>
      
      <!-- Test Node Creation/Update -->
      <div class="demo-section">
        <h3>Node Operations</h3>
        <div class="node-actions">
          <button class="btn btn-success" (click)="createTestNode()">Create Test Node with Multi-Select</button>
          <button class="btn btn-warning" (click)="updateTestNode()" [disabled]="!lastCreatedNodeId">
            Update Test Node (ID: {{ lastCreatedNodeId || 'none' }})
          </button>
          <button class="btn btn-danger" (click)="deleteTestNode()" [disabled]="!lastCreatedNodeId">
            Delete Test Node
          </button>
        </div>
      </div>
      
      <!-- Created Node Display -->
      <div class="demo-section" *ngIf="lastCreatedNode">
        <h3>Last Created/Updated Node</h3>
        <div class="node-display">
          <h4>Node ID: {{ lastCreatedNode.id }}</h4>
          <h5>Raw Data:</h5>
          <pre>{{ lastCreatedNode.data | json }}</pre>
          
          <h5>Hydrated Companies:</h5>
          <div class="hydrated-display" *ngIf="lastCreatedNode.data['__companies']">
            <div class="hydrated-item" *ngFor="let company of lastCreatedNode.data['__companies']">
              <strong>{{ company.name || company.id }}</strong>
              <span class="item-details"> (ID: {{ company.id }})</span>
            </div>
          </div>
          <p *ngIf="!lastCreatedNode.data['__companies']">No companies hydrated</p>
          
          <h5>Hydrated Directors:</h5>
          <div class="hydrated-display" *ngIf="lastCreatedNode.data['__directors']">
            <div class="hydrated-item" *ngFor="let director of lastCreatedNode.data['__directors']">
              <strong>{{ director.name || director.id }}</strong>
              <span class="item-details"> (ID: {{ director.id }})</span>
            </div>
          </div>
          <p *ngIf="!lastCreatedNode.data['__directors']">No directors hydrated</p>
        </div>
      </div>
      
      <!-- Available Collections Info -->
      <div class="demo-section">
        <h3>Available Collections</h3>
        <div class="collections-info">
          <div class="collection-item">
            <strong>Companies Collection ID:</strong> {{ companyCollectionId || 'Loading...' }}
          </div>
          <div class="collection-item">
            <strong>Directors Collection ID:</strong> {{ directorCollectionId || 'Loading...' }}
          </div>
          <div class="collection-item">
            <strong>Test Collection ID:</strong> {{ testCollectionId || 'Loading...' }}
          </div>
        </div>
      </div>
      
      <!-- Error Display -->
      <div class="alert alert-danger" *ngIf="errorMessage">
        <strong>Error:</strong> {{ errorMessage }}
      </div>
      
      <!-- Success Display -->
      <div class="alert alert-success" *ngIf="successMessage">
        <strong>Success:</strong> {{ successMessage }}
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .demo-section {
      margin-bottom: 30px;
      padding: 20px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      background-color: #f8f9fa;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #495057;
    }
    
    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-info {
      background-color: #17a2b8;
      color: white;
    }
    
    .btn-success {
      background-color: #28a745;
      color: white;
    }
    
    .btn-warning {
      background-color: #ffc107;
      color: #212529;
    }
    
    .btn-danger {
      background-color: #dc3545;
      color: white;
    }
    
    .btn:hover:not(:disabled) {
      opacity: 0.8;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .form-values pre {
      background-color: #f1f3f4;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #dee2e6;
      overflow-x: auto;
    }
    
    .node-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .node-display {
      background-color: white;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #dee2e6;
    }
    
    .node-display h4, .node-display h5 {
      margin-top: 15px;
      margin-bottom: 10px;
      color: #495057;
    }
    
    .node-display h4 {
      margin-top: 0;
    }
    
    .hydrated-display {
      margin-left: 15px;
    }
    
    .hydrated-item {
      padding: 8px;
      margin-bottom: 5px;
      background-color: #e9ecef;
      border-radius: 4px;
      border-left: 4px solid #007bff;
    }
    
    .item-details {
      color: #6c757d;
      font-size: 0.875rem;
    }
    
    .collections-info {
      background-color: white;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #dee2e6;
    }
    
    .collection-item {
      padding: 8px 0;
      border-bottom: 1px solid #f1f3f4;
    }
    
    .collection-item:last-child {
      border-bottom: none;
    }
    
    .alert {
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    .alert-danger {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }
    
    .alert-success {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }
  `]
})
export class MultiSelectDemoComponent implements OnInit {
  demoForm: FormGroup;
  
  companyCollectionId?: number;
  directorCollectionId?: number;
  testCollectionId?: number;
  
  lastCreatedNode?: IHydratedNode;
  lastCreatedNodeId?: number;
  
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private nodeService: NodeService
  ) {
    this.demoForm = this.fb.group({
      companies: [[]],
      directors: [[]]
    });
  }

  ngOnInit() {
    this.loadCollectionIds();
  }

  private async loadCollectionIds() {
    try {
      // Load all collections to find the ones we need
      this.nodeService.getNodesByType('collection').subscribe({
        next: (collections: IHydratedNode[]) => {
          // Find company collection
          const companyCollection = collections.find(c => 
            c.data['name']?.toLowerCase().includes('company') ||
            c.data['key']?.toLowerCase().includes('company')
          );
          if (companyCollection) {
            this.companyCollectionId = companyCollection.id;
          }

          // Find director collection
          const directorCollection = collections.find(c => 
            c.data['name']?.toLowerCase().includes('director') ||
            c.data['key']?.toLowerCase().includes('director')
          );
          if (directorCollection) {
            this.directorCollectionId = directorCollection.id;
          }

          // Find or create test collection
          const testCollection = collections.find(c => 
            c.data['name']?.toLowerCase().includes('test') ||
            c.data['key']?.toLowerCase().includes('test')
          );
          if (testCollection) {
            this.testCollectionId = testCollection.id;
          } else {
            this.createTestCollection();
          }
        },
        error: (error: any) => {
          this.errorMessage = 'Failed to load collections: ' + error.message;
        }
      });
    } catch (error) {
      this.errorMessage = 'Error loading collection IDs: ' + (error as Error).message;
    }
  }

  private createTestCollection() {
    const testCollectionData = {
      type: 'collection',
      data: {
        name: 'Multi-Select Test Collection',
        key: 'multiSelectTest',
        fields: [
          {
            key: 'name',
            label: 'Test Name',
            type: 'text',
            required: true
          },
          {
            key: 'companies',
            label: 'Related Companies',
            type: 'select',
            multiple: true,
            source: 'collection',
            sourceCollectionId: this.companyCollectionId,
            labelField: 'name'
          },
          {
            key: 'directors',
            label: 'Related Directors',
            type: 'select',
            multiple: true,
            source: 'collection',
            sourceCollectionId: this.directorCollectionId,
            labelField: 'name'
          }
        ]
      }
    };

    this.nodeService.addNode(testCollectionData).subscribe({
      next: (newCollection: any) => {
        this.testCollectionId = newCollection.id;
        this.successMessage = 'Test collection created successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        this.errorMessage = 'Failed to create test collection: ' + error.message;
      }
    });
  }

  loadTestData() {
    // Set some test IDs (you might need to adjust these based on your actual data)
    this.demoForm.patchValue({
      companies: [1, 2, 3], // Example company IDs
      directors: [1, 2] // Example director IDs
    });
    this.successMessage = 'Test data loaded into form';
    setTimeout(() => this.successMessage = '', 3000);
  }

  clearForm() {
    this.demoForm.patchValue({
      companies: [],
      directors: []
    });
    this.successMessage = 'Form cleared';
    setTimeout(() => this.successMessage = '', 3000);
  }

  onSubmit() {
    const formValue = this.demoForm.value;
    this.successMessage = `Form submitted with: Companies: ${formValue.companies.length}, Directors: ${formValue.directors.length}`;
    setTimeout(() => this.successMessage = '', 5000);
  }

  createTestNode() {
    if (!this.testCollectionId) {
      this.errorMessage = 'Test collection not available yet';
      return;
    }

    const formValues = this.demoForm.value;
    const testNodeData = {
      type: String(this.testCollectionId),
      data: {
        name: `Multi-Select Test Node ${Date.now()}`,
        companies: formValues.companies,
        directors: formValues.directors
      }
    };

    this.nodeService.addNode(testNodeData).subscribe({
      next: (newNode: any) => {
        this.lastCreatedNode = newNode;
        this.lastCreatedNodeId = newNode.id;
        this.successMessage = 'Test node created successfully with hydrated relationships!';
        setTimeout(() => this.successMessage = '', 5000);
        this.errorMessage = '';
      },
      error: (error: any) => {
        this.errorMessage = 'Failed to create test node: ' + error.message;
      }
    });
  }

  updateTestNode() {
    if (!this.lastCreatedNodeId) {
      this.errorMessage = 'No test node to update';
      return;
    }

    const formValues = this.demoForm.value;
    const updateData = {
      id: this.lastCreatedNodeId,
      type: String(this.testCollectionId),
      data: {
        name: `Updated Multi-Select Test Node ${Date.now()}`,
        companies: formValues.companies,
        directors: formValues.directors
      }
    };

    this.nodeService.updateNode(updateData).subscribe({
      next: (updatedNode: any) => {
        this.lastCreatedNode = updatedNode;
        this.successMessage = 'Test node updated successfully with new relationships!';
        setTimeout(() => this.successMessage = '', 5000);
        this.errorMessage = '';
      },
      error: (error: any) => {
        this.errorMessage = 'Failed to update test node: ' + error.message;
      }
    });
  }

  deleteTestNode() {
    if (!this.lastCreatedNodeId) {
      this.errorMessage = 'No test node to delete';
      return;
    }

    this.nodeService.deleteNode(this.lastCreatedNodeId).subscribe({
      next: () => {
        this.successMessage = `Test node ${this.lastCreatedNodeId} deleted successfully!`;
        this.lastCreatedNode = undefined;
        this.lastCreatedNodeId = undefined;
        setTimeout(() => this.successMessage = '', 5000);
        this.errorMessage = '';
      },
      error: (error: any) => {
        this.errorMessage = 'Failed to delete test node: ' + error.message;
      }
    });
  }
}
