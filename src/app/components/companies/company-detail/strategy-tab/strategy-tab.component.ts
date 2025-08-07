import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, CompanyVision, ProductService, StrategicGoal, initCompanyVision, initProductService, initStrategicGoal } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

@Component({
  selector: 'app-strategy-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
              <div class="text-xl font-bold text-purple-600">{{ strategicGoals.length }}</div>
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
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 flex items-center">
              <i class="fas fa-box mr-2 text-green-600"></i>
              Products & Services
            </h3>
            <p class="text-sm text-gray-600">Catalog your current and planned offerings</p>
          </div>
          <button
            (click)="openProductModal()"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <i class="fas fa-plus"></i>
            <span>Add Product/Service</span>
          </button>
        </div>

        <div class="p-6">
          <div *ngIf="productsServices.length === 0" class="text-center text-gray-500 py-8">
            <i class="fas fa-box text-4xl mb-4"></i>
            <h4 class="text-lg font-medium mb-2">No Products or Services Yet</h4>
            <p class="mb-4">Add your products and services to build your offering catalog.</p>
            <button
              (click)="openProductModal()"
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Add First Product/Service
            </button>
          </div>

          <div *ngIf="productsServices.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue %</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let item of productsServices" class="hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900">{{ item.data.name }}</div>
                    <div class="text-sm text-gray-600 max-w-xs">{{ item.data.description | slice:0:100 }}{{ item.data.description.length > 100 ? '...' : '' }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="item.data.type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
                      <i [ngClass]="item.data.type === 'product' ? 'fas fa-cube' : 'fas fa-handshake'" class="mr-1"></i>
                      {{ item.data.type | titlecase }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="getStatusClass(item.data.current_status)">
                      {{ getStatusDisplay(item.data.current_status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-900">{{ item.data.category }}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-900">{{ item.data.revenue_contribution || 0 }}%</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                      <button (click)="editProduct(item)" class="text-blue-600 hover:text-blue-700" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button (click)="deleteProduct(item)" class="text-red-600 hover:text-red-700" title="Delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Strategic Goals Section -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 flex items-center">
              <i class="fas fa-target mr-2 text-purple-600"></i>
              Strategic Goals
            </h3>
            <p class="text-sm text-gray-600">Define long-term objectives and track progress</p>
          </div>
          <button
            (click)="openGoalModal()"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <i class="fas fa-plus"></i>
            <span>Add Strategic Goal</span>
          </button>
        </div>

        <div class="p-6">
          <div *ngIf="strategicGoals.length === 0" class="text-center text-gray-500 py-8">
            <i class="fas fa-target text-4xl mb-4"></i>
            <h4 class="text-lg font-medium mb-2">No Strategic Goals Yet</h4>
            <p class="mb-4">Set long-term objectives to guide your company's direction.</p>
            <button
              (click)="openGoalModal()"
              class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Add First Strategic Goal
            </button>
          </div>

          <div *ngIf="strategicGoals.length > 0" class="space-y-4">
            <div *ngFor="let goal of strategicGoals" class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h4 class="text-lg font-medium text-gray-900 flex items-center">
                    {{ goal.data.title }}
                    <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="getPriorityClass(goal.data.priority)">
                      {{ goal.data.priority | titlecase }}
                    </span>
                  </h4>
                  <p class="text-sm text-gray-600 mt-1">{{ goal.data.description }}</p>
                </div>
                <div class="flex space-x-2 ml-4">
                  <button (click)="editGoal(goal)" class="text-blue-600 hover:text-blue-700" title="Edit">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button (click)="deleteGoal(goal)" class="text-red-600 hover:text-red-700" title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span class="text-xs font-medium text-gray-500">Category</span>
                  <p class="text-sm text-gray-900">{{ goal.data.category | titlecase }}</p>
                </div>
                <div>
                  <span class="text-xs font-medium text-gray-500">Timeline</span>
                  <p class="text-sm text-gray-900">{{ getTimelineDisplay(goal.data.timeline) }}</p>
                </div>
                <div>
                  <span class="text-xs font-medium text-gray-500">Target Date</span>
                  <p class="text-sm text-gray-900">{{ goal.data.target_date | date:'MMM d, y' }}</p>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="mb-4">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-xs font-medium text-gray-500">Progress</span>
                  <span class="text-xs text-gray-500">{{ goal.data.progress_percentage }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    [style.width.%]="goal.data.progress_percentage"
                  ></div>
                </div>
              </div>

              <!-- Status -->
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="getGoalStatusClass(goal.data.current_status)">
                  {{ getGoalStatusDisplay(goal.data.current_status) }}
                </span>
                <span *ngIf="goal.data.mentor_notes" class="text-xs text-blue-600 italic">
                  💬 Has mentor notes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
      <!-- Strategic Goal Modal -->
      <!-- Implementation will be added in subsequent parts -->
    </div>
  `
})
export class StrategyTabComponent implements OnInit, OnDestroy {
  @Input() company: INode<Company> | null = null;

  private destroy$ = new Subject<void>();

  // Data arrays
  visionData: INode<CompanyVision> | null = null;
  productsServices: INode<ProductService>[] = [];
  strategicGoals: INode<StrategicGoal>[] = [];

  // Loading states
  loading = false;
  saving = false;

  // Modal states
  showVisionModal = false;
  showProductModal = false;
  showGoalModal = false;

  // Edit states
  editingVision: INode<CompanyVision> | null = null;
  editingProduct: INode<ProductService> | null = null;
  editingGoal: INode<StrategicGoal> | null = null;

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

    // Load strategic goals
    this.nodeService.getNodesByCompany(this.company.id, 'strategic_goal')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (goals) => {
          this.strategicGoals = goals as INode<StrategicGoal>[];
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading goals:', error);
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
    this.productFormData = initProductService();
    this.productFormData.company_id = this.company?.id?.toString() || '';
    this.editingProduct = null;
    this.showProductModal = true;
  }

  editProduct(product: INode<ProductService>) {
    this.productFormData = { ...product.data };
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

  // Strategic Goal methods
  openGoalModal() {
    this.goalFormData = initStrategicGoal();
    this.goalFormData.company_id = this.company?.id?.toString() || '';
    this.editingGoal = null;
    this.showGoalModal = true;
  }

  editGoal(goal: INode<StrategicGoal>) {
    this.goalFormData = { ...goal.data };
    this.editingGoal = goal;
    this.showGoalModal = true;
  }

  deleteGoal(goal: INode<StrategicGoal>) {
    if (!goal.id) return;

    if (confirm('Are you sure you want to delete this strategic goal?')) {
      this.nodeService.deleteNode(goal.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.loadStrategyData(),
          error: (error: any) => console.error('Error deleting goal:', error)
        });
    }
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

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getTimelineDisplay(timeline: string): string {
    switch (timeline) {
      case '3_months': return '3 Months';
      case '6_months': return '6 Months';
      case '1_year': return '1 Year';
      case '2_years': return '2 Years';
      case '5_years': return '5 Years';
      default: return timeline;
    }
  }

  getGoalStatusClass(status: string): string {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_track': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getGoalStatusDisplay(status: string): string {
    return status.replace('_', ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
