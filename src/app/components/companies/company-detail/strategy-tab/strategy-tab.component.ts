import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, CompanyVision, ProductService, StrategicGoal, Objective, KeyResult, OKRTask, initCompanyVision, initProductService, initStrategicGoal, initObjective, initKeyResult, initOKRTask } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

// Import our new sub-components
import { ProductsServicesSectionComponent } from './components/products-services-section.component';
import { OKRSectionComponent } from './components/okr-section.component';
import { ProductServiceModalComponent } from './components/product-service-modal.component';
import { ObjectiveModalComponent } from './components/objective-modal.component';
import { ObjectiveTaskModalComponent } from './components/objective-task-modal.component';
import { KeyResultModalComponent } from './components/key-result-modal.component';

@Component({
  selector: 'app-strategy-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductsServicesSectionComponent,
    OKRSectionComponent,
    ProductServiceModalComponent,
    ObjectiveModalComponent,
    ObjectiveTaskModalComponent,
    KeyResultModalComponent
  ],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Vision & Strategy</h2>
          <p class="text-gray-600">Define the strategic direction and vision for {{ company?.data?.name || 'this company' }}</p>
        </div>
      </div>

      <!-- Progress Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-blue-600">{{ visionComplete ? '✓' : '○' }}</div>
              <div class="text-xs text-blue-700">Vision & Mission</div>
            </div>
            <i class="fas fa-eye text-blue-500 text-lg"></i>
          </div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-green-600">{{ productsServices.length }}</div>
              <div class="text-xs text-green-700">Products & Services</div>
            </div>
            <i class="fas fa-box text-green-500 text-lg"></i>
          </div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-purple-600">{{ objectives.length }}</div>
              <div class="text-xs text-purple-700">Strategic Goals</div>
            </div>
            <i class="fas fa-target text-purple-500 text-lg"></i>
          </div>
        </div>
      </div>

      <!-- Vision & Mission Section -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 flex items-center">
              <i class="fas fa-eye mr-2 text-blue-600"></i>
              Vision & Mission
            </h3>
            <p class="text-sm text-gray-600">Define your company's purpose and direction</p>
          </div>
          <button
            (click)="editVision()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <i class="fas fa-edit"></i>
            <span>{{ visionData ? 'Edit' : 'Create' }} Vision</span>
          </button>
        </div>

        <div class="p-6">
          <div *ngIf="!visionData" class="text-center text-gray-500 py-8">
            <i class="fas fa-eye text-4xl mb-4"></i>
            <h4 class="text-lg font-medium mb-2">No Vision Statement Yet</h4>
            <p class="mb-4">Start by defining your company's vision, mission, and core values.</p>
            <button
              (click)="editVision()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Create Vision Statement
            </button>
          </div>

          <div *ngIf="visionData" class="space-y-6">
            <!-- Vision Statement -->
            <div>
              <h4 class="text-md font-semibold text-gray-900 mb-2">Vision Statement</h4>
              <p class="text-gray-700 bg-blue-50 p-4 rounded-lg">{{ visionData.data.vision_statement }}</p>
            </div>

            <!-- Mission Statement -->
            <div>
              <h4 class="text-md font-semibold text-gray-900 mb-2">Mission Statement</h4>
              <p class="text-gray-700 bg-green-50 p-4 rounded-lg">{{ visionData.data.mission_statement }}</p>
            </div>

            <!-- Core Values -->
            <div>
              <h4 class="text-md font-semibold text-gray-900 mb-2">Core Values</h4>
              <div class="flex flex-wrap gap-2">
                <span
                  *ngFor="let value of visionData.data.core_values"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                >
                  {{ value }}
                </span>
              </div>
            </div>

            <!-- Value Proposition -->
            <div>
              <h4 class="text-md font-semibold text-gray-900 mb-2">Value Proposition</h4>
              <p class="text-gray-700 bg-yellow-50 p-4 rounded-lg">{{ visionData.data.value_proposition }}</p>
            </div>

            <!-- Additional Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="text-md font-semibold text-gray-900 mb-2">Target Market</h4>
                <p class="text-gray-700">{{ visionData.data.target_market }}</p>
              </div>
              <div>
                <h4 class="text-md font-semibold text-gray-900 mb-2">Competitive Advantage</h4>
                <p class="text-gray-700">{{ visionData.data.competitive_advantage }}</p>
              </div>
            </div>

            <!-- Mentor Notes -->
            <div *ngIf="visionData.data.mentor_notes">
              <h4 class="text-md font-semibold text-gray-900 mb-2">Mentor Notes</h4>
              <p class="text-blue-600 italic bg-blue-50 p-4 rounded-lg">💬 {{ visionData.data.mentor_notes }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Products & Services Section -->
      <app-products-services-section
        [productsServices]="productsServices"
        (addProduct)="openProductModal()"
        (editProduct)="editProduct($event)"
        (deleteProduct)="deleteProduct($event)"
      ></app-products-services-section>

      <!-- OKR Section -->
      <app-okr-section
        [objectives]="objectives"
        [keyResults]="keyResults"
        [tasks]="objectiveTasks"
        (addObjective)="openObjectiveModal()"
        (editObjective)="editObjective($event)"
        (deleteObjective)="deleteObjective($event)"
        (addKeyResult)="openKeyResultModal($event)"
        (editKeyResult)="editKeyResult($event)"
        (deleteKeyResult)="deleteKeyResult($event)"
        (addTask)="openTaskModalForKeyResult($event)"
        (editTask)="editTask($event)"
        (deleteTask)="deleteTask($event)"
        (toggleTaskStatus)="toggleTaskStatus($event)"
      ></app-okr-section>

      <!-- Vision Modal -->
      <div *ngIf="showVisionModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-900">
              {{ editingVision ? 'Edit' : 'Create' }} Vision & Mission
            </h3>
            <button (click)="closeVisionModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form (ngSubmit)="saveVision()" #visionForm="ngForm">
            <div class="space-y-6">
              <!-- Vision Statement -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Vision Statement *</label>
                <textarea
                  [(ngModel)]="visionFormData.vision_statement"
                  name="vision_statement"
                  required
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Where do you see your company in 5-10 years?"
                ></textarea>
              </div>

              <!-- Mission Statement -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Mission Statement *</label>
                <textarea
                  [(ngModel)]="visionFormData.mission_statement"
                  name="mission_statement"
                  required
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What is your company's purpose and how do you serve your customers?"
                ></textarea>
              </div>

              <!-- Core Values -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Core Values</label>
                <div class="space-y-2">
                  <div *ngFor="let value of visionFormData.core_values; let i = index" class="flex items-center space-x-2">
                    <input
                      type="text"
                      [(ngModel)]="visionFormData.core_values[i]"
                      [name]="'core_value_' + i"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter a core value"
                    >
                    <button type="button" (click)="removeValue(i)" class="text-red-600 hover:text-red-700">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                  <button type="button" (click)="addValue()" class="text-blue-600 hover:text-blue-700 text-sm">
                    <i class="fas fa-plus mr-1"></i> Add Value
                  </button>
                </div>
              </div>

              <!-- Value Proposition -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Value Proposition *</label>
                <textarea
                  [(ngModel)]="visionFormData.value_proposition"
                  name="value_proposition"
                  required
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What unique value do you provide to your customers?"
                ></textarea>
              </div>

              <!-- Target Market & Competitive Advantage -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Target Market</label>
                  <textarea
                    [(ngModel)]="visionFormData.target_market"
                    name="target_market"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Who are your ideal customers?"
                  ></textarea>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Competitive Advantage</label>
                  <textarea
                    [(ngModel)]="visionFormData.competitive_advantage"
                    name="competitive_advantage"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What sets you apart from competitors?"
                  ></textarea>
                </div>
              </div>

              <!-- Mentor Notes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Mentor Notes (Optional)</label>
                <textarea
                  [(ngModel)]="visionFormData.mentor_notes"
                  name="mentor_notes"
                  rows="2"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional insights or recommendations..."
                ></textarea>
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                (click)="closeVisionModal()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="!visionForm.form.valid || saving"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ saving ? 'Saving...' : (editingVision ? 'Update' : 'Save') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Product/Service Modal -->
      <app-product-service-modal
        [isOpen]="showProductModal"
        [productData]="selectedProduct"
        (close)="closeProductModal()"
        (save)="saveProduct($event)"
      ></app-product-service-modal>

      <!-- Objective Modal -->
      <app-objective-modal
        [isOpen]="showObjectiveModal"
        [objectiveData]="selectedObjective"
        (close)="closeObjectiveModal()"
        (save)="saveObjective($event)"
      ></app-objective-modal>

      <!-- Key Result Modal -->
      <app-key-result-modal
        [isOpen]="showKeyResultModal"
        [keyResultData]="selectedKeyResult"
        [objectiveId]="selectedObjectiveId"
        (close)="closeKeyResultModal()"
        (save)="saveKeyResult($event)"
      ></app-key-result-modal>

      <!-- Objective Task Modal -->
      <app-objective-task-modal
        [isOpen]="showTaskModal"
        [taskData]="selectedTask"
        [objectiveId]="selectedObjectiveId"
        (close)="closeTaskModal()"
        (save)="saveTask($event)"
      ></app-objective-task-modal>
    </div>
  `
})
export class StrategyTabComponent implements OnInit, OnDestroy {
  @Input() company: INode<Company> | null = null;

  private destroy$ = new Subject<void>();

  // Data arrays
  visionData: INode<CompanyVision> | null = null;
  productsServices: INode<ProductService>[] = [];
  objectives: INode<Objective>[] = [];
  objectiveTasks: INode<OKRTask>[] = [];
  keyResults: INode<KeyResult>[] = [];

  // Loading states
  loading = false;
  saving = false;

  // Modal states
  showVisionModal = false;
  showProductModal = false;
  showObjectiveModal = false;
  showTaskModal = false;
  showKeyResultModal = false;

  // Edit states
  editingVision: INode<CompanyVision> | null = null;
  editingProduct: INode<ProductService> | null = null;
  selectedProduct: INode<ProductService> | null = null;
  selectedObjective: INode<Objective> | null = null;
  selectedTask: INode<OKRTask> | null = null;
  selectedKeyResult: INode<KeyResult> | null = null;
  selectedObjectiveId: string | null = null;

  // Form data
  visionFormData: CompanyVision = initCompanyVision();
  productFormData: ProductService = initProductService();
  goalFormData: StrategicGoal = initStrategicGoal();

  constructor(
    private nodeService: NodeService<any>
  ) {}

  ngOnInit() {
    this.loadStrategyData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Computed properties
  get visionComplete(): boolean {
    return !!(this.visionData?.data?.vision_statement && this.visionData?.data?.mission_statement);
  }

  // Data loading
  loadStrategyData() {
    if (!this.company?.id) return;

    this.loading = true;

    // Load vision data
    this.nodeService.getNodesByCompany(this.company.id, 'company_vision')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (visions) => {
          this.visionData = visions.length > 0 ? visions[0] as INode<CompanyVision> : null;
        },
        error: (error: any) => console.error('Error loading vision:', error)
      });

    // Load products/services
    this.nodeService.getNodesByCompany(this.company.id, 'product_service')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.productsServices = products as INode<ProductService>[];
        },
        error: (error: any) => console.error('Error loading products:', error)
      });

    // Load objectives
    this.nodeService.getNodesByCompany(this.company.id, 'objective')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (objectives) => {
          this.objectives = objectives as INode<Objective>[];
        },
        error: (error: any) => console.error('Error loading objectives:', error)
      });

    // Load objective tasks
    this.nodeService.getNodesByCompany(this.company.id, 'okr_task')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.objectiveTasks = tasks as INode<OKRTask>[];
        },
        error: (error: any) => console.error('Error loading OKR tasks:', error)
      });

    // Load key results
    this.nodeService.getNodesByCompany(this.company.id, 'key_result')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (keyResults) => {
          this.keyResults = keyResults as INode<KeyResult>[];
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading key results:', error);
          this.loading = false;
        }
      });
  }

  // Vision methods
  editVision() {
    this.visionFormData = this.visionData ? { ...this.visionData.data } : initCompanyVision();
    this.visionFormData.company_id = this.company?.id?.toString() || '';
    this.editingVision = this.visionData;
    this.showVisionModal = true;
  }

  closeVisionModal() {
    this.showVisionModal = false;
    this.editingVision = null;
    this.visionFormData = initCompanyVision();
  }

  addValue() {
    this.visionFormData.core_values.push('');
  }

  removeValue(index: number) {
    this.visionFormData.core_values.splice(index, 1);
  }

  saveVision() {
    if (!this.company?.id) return;

    this.saving = true;
    this.visionFormData.company_id = this.company.id.toString();
    this.visionFormData.last_updated = new Date().toISOString().split('T')[0];

    const operation = this.editingVision
      ? this.nodeService.updateNode({ ...this.editingVision, data: this.visionFormData })
      : this.nodeService.addNode({
          company_id: this.company.id,
          type: 'company_vision',
          data: this.visionFormData
        } as INode<CompanyVision>);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeVisionModal();
          this.loadStrategyData();
        },
        error: (error: any) => {
          console.error('Error saving vision:', error);
          this.saving = false;
        }
      });
  }

  // Product/Service methods
  openProductModal() {
    this.selectedProduct = null;
    this.editingProduct = null;
    this.showProductModal = true;
  }

  editProduct(product: INode<ProductService>) {
    this.selectedProduct = product;
    this.editingProduct = product;
    this.showProductModal = true;
  }

  deleteProduct(product: INode<ProductService>) {
    if (!product.id) return;

    if (confirm('Are you sure you want to delete this product/service?')) {
      this.nodeService.deleteNode(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.loadStrategyData(),
          error: (error: any) => console.error('Error deleting product:', error)
        });
    }
  }

  closeProductModal() {
    this.showProductModal = false;
    this.selectedProduct = null;
    this.editingProduct = null;
  }

  saveProduct(productData: ProductService) {
    this.saving = true;
    const isEditing = !!this.editingProduct;

    if (isEditing && this.editingProduct) {
      // Update existing product
      this.nodeService.updateNode({ ...this.editingProduct, data: productData })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeProductModal();
            this.loadStrategyData();
          },
          error: (error: any) => {
            console.error('Error updating product:', error);
            this.saving = false;
          }
        });
    } else {
      // Create new product
      this.nodeService.addNode({
        company_id: this.company?.id || 0,
        type: 'product_service',
        data: productData
      } as INode<ProductService>)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeProductModal();
            this.loadStrategyData();
          },
          error: (error: any) => {
            console.error('Error creating product:', error);
            this.saving = false;
          }
        });
    }
  }

  // Objective methods
  openObjectiveModal() {
    this.selectedObjective = null;
    this.showObjectiveModal = true;
  }

  editObjective(objective: INode<Objective>) {
    this.selectedObjective = objective;
    this.showObjectiveModal = true;
  }

  deleteObjective(objective: INode<Objective>) {
    if (!objective.id) return;

    if (confirm('Are you sure you want to delete this objective?')) {
      this.nodeService.deleteNode(objective.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.loadStrategyData(),
          error: (error: any) => console.error('Error deleting objective:', error)
        });
    }
  }

  closeObjectiveModal() {
    this.showObjectiveModal = false;
    this.selectedObjective = null;
  }

  saveObjective(objectiveData: Objective) {
    this.saving = true;
    const isEditing = !!this.selectedObjective;

    if (isEditing && this.selectedObjective) {
      // Update existing objective
      this.nodeService.updateNode({ ...this.selectedObjective, data: objectiveData })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeObjectiveModal();
            this.loadStrategyData();
          },
          error: (error: any) => {
            console.error('Error updating objective:', error);
            this.saving = false;
          }
        });
    } else {
      // Create new objective
      this.nodeService.addNode({
        company_id: this.company?.id || 0,
        type: 'objective',
        data: objectiveData
      } as INode<Objective>)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeObjectiveModal();
            this.loadStrategyData();
          },
          error: (error: any) => {
            console.error('Error creating objective:', error);
            this.saving = false;
          }
        });
    }
  }

  // Key Result methods
  openKeyResultModal(objective: INode<Objective>) {
    this.selectedKeyResult = null;
    this.selectedObjectiveId = String(objective.id || '');
    this.showKeyResultModal = true;
  }

  editKeyResult(keyResult: INode<KeyResult>) {
    this.selectedKeyResult = keyResult;
    this.selectedObjectiveId = keyResult.data.objective_id;
    this.showKeyResultModal = true;
  }

  closeKeyResultModal() {
    this.showKeyResultModal = false;
    this.selectedKeyResult = null;
    this.selectedObjectiveId = null;
  }

  saveKeyResult(keyResultData: KeyResult) {
    this.saving = true;
    const isEditing = !!this.selectedKeyResult;

    if (isEditing && this.selectedKeyResult) {
      // Update existing key result
      this.nodeService.updateNode({ ...this.selectedKeyResult, data: keyResultData })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeKeyResultModal();
            this.loadStrategyData();
          },
          error: (error: any) => {
            console.error('Error updating key result:', error);
            this.saving = false;
          }
        });
    } else {
      // Create new key result
      keyResultData.objective_id = this.selectedObjectiveId || '';
      this.nodeService.addNode({
        company_id: this.company?.id || 0,
        type: 'key_result',
        data: keyResultData
      } as INode<KeyResult>)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeKeyResultModal();
            this.loadStrategyData();
          },
          error: (error: any) => {
            console.error('Error creating key result:', error);
            this.saving = false;
          }
        });
    }
  }

  deleteKeyResult(keyResult: INode<KeyResult>) {
    if (!keyResult.id) return;

    if (confirm('Are you sure you want to delete this key result?')) {
      this.nodeService.deleteNode(keyResult.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.loadStrategyData(),
          error: (error: any) => console.error('Error deleting key result:', error)
        });
    }
  }

  // Objective Task methods
  openTaskModalForObjective(objective: INode<Objective>) {
    this.openTaskModal(String(objective.id || ''));
  }

  openTaskModalForKeyResult(keyResult: INode<KeyResult>) {
    this.openTaskModal(String(keyResult.id || ''));
  }

  openTaskModal(keyResultId: string) {
    this.selectedTask = null;
    this.selectedObjectiveId = keyResultId;
    this.showTaskModal = true;
  }

  editTask(task: INode<OKRTask>) {
    this.selectedTask = task;
    this.selectedObjectiveId = task.data.key_result_id;
    this.showTaskModal = true;
  }

  deleteTask(task: INode<OKRTask>) {
    if (!task.id) return;

    if (confirm('Are you sure you want to delete this task?')) {
      this.nodeService.deleteNode(task.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.loadStrategyData(),
          error: (error: any) => console.error('Error deleting task:', error)
        });
    }
  }

  closeTaskModal() {
    this.showTaskModal = false;
    this.selectedTask = null;
    this.selectedObjectiveId = null;
  }

  saveTask(taskData: OKRTask) {
    this.saving = true;
    const isEditing = !!this.selectedTask;

    if (isEditing && this.selectedTask) {
      // Update existing task
      this.nodeService.updateNode({ ...this.selectedTask, data: taskData })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeTaskModal();
            this.loadStrategyData();
          },
          error: (error: any) => {
            console.error('Error updating task:', error);
            this.saving = false;
          }
        });
    } else {
      // Create new task
      taskData.key_result_id = this.selectedObjectiveId || '';
      this.nodeService.addNode({
        company_id: this.company?.id || 0,
        type: 'okr_task',
        data: taskData
      } as INode<OKRTask>)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.saving = false;
            this.closeTaskModal();
            this.loadStrategyData();
          },
          error: (error: any) => {
            console.error('Error creating task:', error);
            this.saving = false;
          }
        });
    }
  }

  toggleTaskStatus(task: INode<OKRTask>) {
    const newStatus = task.data.status === 'completed' ? 'in_progress' : 'completed';
    this.updateTaskStatus({task, status: newStatus});
  }

  updateTaskStatus(event: {task: INode<OKRTask>, status: string}) {
    const { task, status } = event;

    const updatedTaskData: OKRTask = {
      ...task.data,
      status: status as any,
      completed_date: status === 'completed' ? new Date().toISOString() : ''
    };

    this.nodeService.updateNode({ ...task, data: updatedTaskData })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadStrategyData(),
        error: (error: any) => console.error('Error updating task status:', error)
      });
  }

  // Utility methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'concept': return 'bg-gray-100 text-gray-800';
      case 'development': return 'bg-yellow-100 text-yellow-800';
      case 'testing': return 'bg-blue-100 text-blue-800';
      case 'launched': return 'bg-green-100 text-green-800';
      case 'discontinued': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDisplay(status: string): string {
    return status.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
