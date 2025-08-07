import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, CompanyVision, ProductService, StrategicGoal, Objective, KeyResult, OKRTask, initCompanyVision, initProductService, initStrategicGoal, initObjective, initKeyResult, initOKRTask } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

// Import our new sub-components
import { VisionMissionSectionComponent } from './components/vision-mission-section.component';
import { VisionModalComponent } from './components/vision-modal.component';
import { ProductsServicesSectionComponent } from './components/products-services-section.component';
import { OKRSectionComponent } from './components/okr-section.component';
import { ProductServiceModalComponent } from './components/product-service-modal.component';
import { ObjectiveModalComponent } from './components/objective-modal.component';
import { ObjectiveTaskModalComponent } from './components/objective-task-modal.component';
import { KeyResultModalComponent } from './components/key-result-modal.component';
import { KeyResultProgressModalComponent } from './components/key-result-progress-modal.component';

@Component({
  selector: 'app-strategy-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VisionMissionSectionComponent,
    VisionModalComponent,
    ProductsServicesSectionComponent,
    OKRSectionComponent,
    ProductServiceModalComponent,
    ObjectiveModalComponent,
    ObjectiveTaskModalComponent,
    KeyResultModalComponent,
    KeyResultProgressModalComponent
  ],
  template: `
    <div class="space-y-16">
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
      <app-vision-mission-section
        [visionData]="visionData"
        (editVision)="editVision()"
      ></app-vision-mission-section>

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
        (updateProgress)="openProgressModal($event)"
        (addTask)="openTaskModalForKeyResult($event)"
        (editTask)="editTask($event)"
        (deleteTask)="deleteTask($event)"
        (toggleTaskStatus)="toggleTaskStatus($event)"
        (taskStatusChange)="onTaskStatusChange($event)"
      ></app-okr-section>

      <!-- Vision Modal -->
      <app-vision-modal
        [isOpen]="showVisionModal"
        [visionData]="editingVision"
        (close)="closeVisionModal()"
        (save)="saveVision($event)"
      ></app-vision-modal>

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

      <!-- Key Result Progress Modal -->
      <app-key-result-progress-modal
        [isOpen]="showProgressModal"
        [keyResultData]="selectedKeyResultForProgress"
        (close)="closeProgressModal()"
        (save)="saveProgress($event)"
      ></app-key-result-progress-modal>
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
  showProgressModal = false;

  // Edit states
  editingVision: INode<CompanyVision> | null = null;
  editingProduct: INode<ProductService> | null = null;
  selectedProduct: INode<ProductService> | null = null;
  selectedObjective: INode<Objective> | null = null;
  selectedTask: INode<OKRTask> | null = null;
  selectedKeyResult: INode<KeyResult> | null = null;
  selectedKeyResultForProgress: INode<KeyResult> | null = null;
  selectedObjectiveId: string | null = null;

  // Form data
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
    this.editingVision = this.visionData;
    this.showVisionModal = true;
  }

  closeVisionModal() {
    this.showVisionModal = false;
    this.editingVision = null;
  }

  saveVision(visionFormData: CompanyVision) {
    if (!this.company?.id) return;

    this.saving = true;
    visionFormData.company_id = this.company.id.toString();
    visionFormData.last_updated = new Date().toISOString().split('T')[0];

    const operation = this.editingVision
      ? this.nodeService.updateNode({ ...this.editingVision, data: visionFormData })
      : this.nodeService.addNode({
          company_id: this.company.id,
          type: 'company_vision',
          data: visionFormData
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
    console.log('editObjective called with:', objective);
    this.selectedObjective = objective;
    this.showObjectiveModal = true;
    console.log('Modal opened with selectedObjective:', this.selectedObjective);
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
        next: () => {
          this.loadStrategyData();
          // Auto-update key result progress when task status changes
          this.updateKeyResultProgressFromTasks(task.data.key_result_id);
        },
        error: (error: any) => console.error('Error updating task status:', error)
      });
  }

  onTaskStatusChange(event: {task: INode<OKRTask>, status: string}) {
    this.updateTaskStatus(event);
  }

  // Progress Modal methods
  openProgressModal(keyResult: INode<KeyResult>) {
    this.selectedKeyResultForProgress = keyResult;
    this.showProgressModal = true;
  }

  closeProgressModal() {
    this.selectedKeyResultForProgress = null;
    this.showProgressModal = false;
  }

  saveProgress(progressData: Partial<KeyResult>) {
    if (!this.selectedKeyResultForProgress) return;

    this.saving = true;
    const updatedKeyResult = {
      ...this.selectedKeyResultForProgress,
      data: { ...this.selectedKeyResultForProgress.data, ...progressData }
    };

    this.nodeService.updateNode(updatedKeyResult)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeProgressModal();
          this.loadStrategyData();
          // Auto-update objective progress based on key results
          this.updateObjectiveProgress();
        },
        error: (error: any) => {
          console.error('Error updating key result progress:', error);
          this.saving = false;
        }
      });
  }

  // Auto-update key result progress based on task completion
  updateKeyResultProgressFromTasks(keyResultId: string) {
    const tasks = this.objectiveTasks.filter(task => task.data.key_result_id === keyResultId);
    if (tasks.length === 0) return;

    const completedTasks = tasks.filter(task => task.data.status === 'completed').length;
    const progressPercentage = Math.round((completedTasks / tasks.length) * 100);

    // Find the key result
    const keyResult = this.keyResults.find(kr => kr.id === Number(keyResultId));
    if (keyResult) {
      // Update current value based on task completion percentage
      const newCurrentValue = Math.round((progressPercentage / 100) * keyResult.data.target_value);

      const updatedKeyResultData: KeyResult = {
        ...keyResult.data,
        current_value: newCurrentValue,
        progress_percentage: progressPercentage
      };

      this.nodeService.updateNode({ ...keyResult, data: updatedKeyResultData })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Refresh data and update objective progress
            this.loadStrategyData();
            this.updateObjectiveProgress();
          },
          error: (error: any) => console.error('Error auto-updating key result progress:', error)
        });
    }
  }

  // Auto-calculate objective progress based on key results
  updateObjectiveProgress() {
    this.objectives.forEach(objective => {
      const keyResults = this.keyResults.filter(kr => kr.data.objective_id === String(objective.id));
      if (keyResults.length > 0) {
        const totalProgress = keyResults.reduce((sum, kr) => sum + kr.data.progress_percentage, 0);
        const averageProgress = Math.round(totalProgress / keyResults.length);

        // Update objective status based on progress
        let newStatus = objective.data.current_status;
        if (averageProgress >= 100) {
          newStatus = 'completed';
        } else if (averageProgress >= 70) {
          newStatus = 'on_track';
        } else if (averageProgress >= 30) {
          newStatus = 'in_progress';
        } else if (averageProgress > 0) {
          newStatus = 'in_progress';
        }

        // Update objective if status changed
        if (newStatus !== objective.data.current_status) {
          const updatedObjective = {
            ...objective,
            data: { ...objective.data, current_status: newStatus }
          };

          this.nodeService.updateNode(updatedObjective)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => console.log('Objective status updated to:', newStatus),
              error: (error: any) => console.error('Error updating objective status:', error)
            });
        }
      }
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
