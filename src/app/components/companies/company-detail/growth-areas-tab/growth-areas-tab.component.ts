import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, GrowthArea, OKRTask, initGrowthArea, initOKRTask } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

// Import the reusable task modal component
import { ObjectiveTaskModalComponent } from '../strategy-tab/components/objective-task-modal.component';

@Component({
  selector: 'app-growth-areas-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ObjectiveTaskModalComponent],
  template: `
    <div class="space-y-6">
      <!-- Header with Actions -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Growth Areas & SWOT Analysis</h2>
          <p class="text-gray-600">Identify strengths, weaknesses, opportunities, and threats for {{ company?.data?.name || 'this company' }}</p>
        </div>
        <button
          (click)="openGrowthAreaModal()"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <i class="fas fa-plus"></i>
          <span>Add Growth Area</span>
        </button>
      </div>

      <!-- SWOT Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-green-600">{{ swotStats.strengths }}</div>
              <div class="text-xs text-green-700">Strengths</div>
            </div>
            <i class="fas fa-thumbs-up text-green-500 text-lg"></i>
          </div>
        </div>
        <div class="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-red-600">{{ swotStats.weaknesses }}</div>
              <div class="text-xs text-red-700">Weaknesses</div>
            </div>
            <i class="fas fa-exclamation-triangle text-red-500 text-lg"></i>
          </div>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-blue-600">{{ swotStats.opportunities }}</div>
              <div class="text-xs text-blue-700">Opportunities</div>
            </div>
            <i class="fas fa-lightbulb text-blue-500 text-lg"></i>
          </div>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold text-orange-600">{{ swotStats.threats }}</div>
              <div class="text-xs text-orange-700">Threats</div>
            </div>
            <i class="fas fa-shield-alt text-orange-500 text-lg"></i>
          </div>
        </div>
      </div>

      <!-- Growth Areas Table -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">All Growth Areas</h3>
          <p class="text-sm text-gray-600">Complete SWOT analysis for {{ company?.data?.name || 'this company' }}</p>
        </div>

        <div *ngIf="loading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Loading growth areas...</p>
        </div>

        <div *ngIf="!loading && growthAreas.length === 0" class="p-8 text-center text-gray-500">
          <i class="fas fa-chart-line text-4xl mb-4"></i>
          <h4 class="text-lg font-medium mb-2">No Growth Areas Yet</h4>
          <p class="mb-4">Start building your SWOT analysis by adding strengths, weaknesses, opportunities, and threats.</p>
          <button
            (click)="openGrowthAreaModal()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add First Growth Area
          </button>
        </div>

        <div *ngIf="!loading && growthAreas.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact Area</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor Notes</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <ng-container *ngFor="let area of growthAreas">
                <!-- Main Growth Area Row -->
                <tr class="hover:bg-gray-50">
                <!-- Type -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800': area.data.type === 'strength',
                      'bg-red-100 text-red-800': area.data.type === 'weakness',
                      'bg-blue-100 text-blue-800': area.data.type === 'opportunity',
                      'bg-orange-100 text-orange-800': area.data.type === 'threat'
                    }"
                  >
                    <i
                      class="mr-1"
                      [ngClass]="{
                        'fas fa-thumbs-up': area.data.type === 'strength',
                        'fas fa-exclamation-triangle': area.data.type === 'weakness',
                        'fas fa-lightbulb': area.data.type === 'opportunity',
                        'fas fa-shield-alt': area.data.type === 'threat'
                      }"
                    ></i>
                    {{ area.data.type | titlecase }}
                  </span>
                </td>

                <!-- Area -->
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900">{{ area.data.area }}</div>
                </td>

                <!-- Description -->
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-600 max-w-xs">
                    <p class="line-clamp-2">{{ area.data.description }}</p>
                  </div>
                </td>

                <!-- Impact Area -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800">
                    {{ area.data.impact_area }}
                  </span>
                </td>

                <!-- Rating -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex mr-2">
                      <i
                        *ngFor="let star of getStarArray(area.data.rating)"
                        class="fas fa-star text-yellow-400 text-sm"
                      ></i>
                      <i
                        *ngFor="let star of getStarArray(5 - area.data.rating)"
                        class="fas fa-star text-gray-300 text-sm"
                      ></i>
                    </div>
                    <span class="text-xs text-gray-500">{{ area.data.rating }}/5</span>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    {{ getRatingDescription(area.data.rating, area.data.type) }}
                  </div>
                </td>

                <!-- Mentor Notes -->
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-600 max-w-xs">
                    <p *ngIf="area.data.mentor_notes" class="line-clamp-2 italic">
                      💬 {{ area.data.mentor_notes }}
                    </p>
                    <span *ngIf="!area.data.mentor_notes" class="text-gray-400">—</span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <button
                      (click)="toggleGrowthAreaExpansion(area.id!)"
                      class="text-purple-600 hover:text-purple-700 px-2 py-1"
                      title="Toggle Tasks"
                    >
                      <i class="fas" [ngClass]="isGrowthAreaExpanded(area.id!) ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                      <span class="ml-1 text-xs">{{ getTasksForGrowthArea(area.id!).length }}</span>
                    </button>
                    <button
                      (click)="createTaskFromGrowthArea(area)"
                      class="text-green-600 hover:text-green-700 px-2 py-1 bg-green-50 rounded border border-green-200"
                      title="Add Task"
                    >
                      <i class="fas fa-plus mr-1"></i>Task
                    </button>
                    <button
                      (click)="editGrowthArea(area)"
                      class="text-blue-600 hover:text-blue-700 px-2 py-1"
                      title="Edit"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button
                      (click)="deleteGrowthArea(area)"
                      class="text-red-600 hover:text-red-700 px-2 py-1"
                      title="Delete"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Inline Tasks Row -->
              <tr *ngIf="isGrowthAreaExpanded(area.id!)" class="bg-gray-50">
                <td colspan="7" class="px-6 py-4">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-sm font-medium text-gray-900">
                        Action Tasks ({{ getTasksForGrowthArea(area.id!).length }})
                      </h4>
                      <button
                        (click)="createTaskFromGrowthArea(area)"
                        class="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                      >
                        <i class="fas fa-plus mr-1"></i>Add Task
                      </button>
                    </div>

                    <!-- Tasks List -->
                    <div *ngIf="getTasksForGrowthArea(area.id!).length === 0" class="text-center py-4">
                      <p class="text-sm text-gray-500">No tasks yet. Create your first action task!</p>
                    </div>

                    <div *ngFor="let task of getTasksForGrowthArea(area.id!)"
                         class="border rounded-lg p-3 transition-all duration-200"
                         [ngClass]="getTaskBackgroundClass(task.data)">
                      <div class="flex items-start justify-between">
                        <!-- Task Content -->
                        <div class="flex-1">
                          <div class="flex items-center space-x-2 mb-2">
                            <!-- Status checkbox -->
                            <button
                              (click)="toggleTaskStatus(task)"
                              class="flex-shrink-0"
                            >
                              <i class="fas"
                                 [ngClass]="task.data.status === 'completed' ? 'fa-check-circle text-green-600' : 'fa-circle text-gray-400'">
                              </i>
                            </button>

                            <!-- Task title -->
                            <h5 class="font-medium text-sm text-gray-900"
                                [ngClass]="task.data.status === 'completed' ? 'line-through text-gray-500' : ''">
                              {{ task.data.title }}
                            </h5>

                            <!-- Priority badge -->
                            <span class="px-2 py-1 text-xs rounded-full"
                                  [ngClass]="{
                                    'bg-red-100 text-red-800': task.data.priority === 'critical',
                                    'bg-orange-100 text-orange-800': task.data.priority === 'high',
                                    'bg-yellow-100 text-yellow-800': task.data.priority === 'medium',
                                    'bg-green-100 text-green-800': task.data.priority === 'low'
                                  }">
                              {{ task.data.priority }}
                            </span>
                          </div>

                          <!-- Task details -->
                          <div class="text-xs text-gray-600 space-y-1">
                            <p *ngIf="task.data.description" class="line-clamp-2">{{ task.data.description }}</p>
                            <div class="flex items-center space-x-4">
                              <span *ngIf="task.data.assigned_to">
                                <i class="fas fa-user mr-1"></i>{{ task.data.assigned_to }}
                              </span>
                              <span>
                                <i class="fas fa-calendar mr-1"></i>{{ task.data.due_date | date:'shortDate' }}
                              </span>
                              <span *ngIf="task.data.impact_weight">
                                <i class="fas fa-weight-hanging mr-1"></i>Impact: {{ task.data.impact_weight }}/10
                              </span>
                            </div>
                          </div>
                        </div>

                        <!-- Task Actions -->
                        <div class="flex items-center space-x-1 ml-3">
                          <button
                            (click)="editTask(task)"
                            class="text-blue-600 hover:text-blue-700 p-1"
                            title="Edit Task"
                          >
                            <i class="fas fa-edit text-xs"></i>
                          </button>
                          <button
                            (click)="deleteTask(task)"
                            class="text-red-600 hover:text-red-700 p-1"
                            title="Delete Task"
                          >
                            <i class="fas fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Growth Area Modal -->
      <div *ngIf="showGrowthAreaModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-900">
              {{ editingGrowthArea ? 'Edit' : 'Add' }} Growth Area
            </h3>
            <button (click)="closeGrowthAreaModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form (ngSubmit)="saveGrowthArea()" #growthAreaForm="ngForm">
            <div class="space-y-4">
              <!-- Type Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div class="grid grid-cols-2 gap-2">
                  <label class="flex items-center p-3 border rounded-lg cursor-pointer" [class.border-green-500]="formData.type === 'strength'" [class.bg-green-50]="formData.type === 'strength'">
                    <input type="radio" [(ngModel)]="formData.type" value="strength" name="type" class="sr-only">
                    <i class="fas fa-thumbs-up mr-2 text-green-600"></i>
                    <span class="text-sm">Strength</span>
                  </label>
                  <label class="flex items-center p-3 border rounded-lg cursor-pointer" [class.border-red-500]="formData.type === 'weakness'" [class.bg-red-50]="formData.type === 'weakness'">
                    <input type="radio" [(ngModel)]="formData.type" value="weakness" name="type" class="sr-only">
                    <i class="fas fa-exclamation-triangle mr-2 text-red-600"></i>
                    <span class="text-sm">Weakness</span>
                  </label>
                  <label class="flex items-center p-3 border rounded-lg cursor-pointer" [class.border-blue-500]="formData.type === 'opportunity'" [class.bg-blue-50]="formData.type === 'opportunity'">
                    <input type="radio" [(ngModel)]="formData.type" value="opportunity" name="type" class="sr-only">
                    <i class="fas fa-lightbulb mr-2 text-blue-600"></i>
                    <span class="text-sm">Opportunity</span>
                  </label>
                  <label class="flex items-center p-3 border rounded-lg cursor-pointer" [class.border-orange-500]="formData.type === 'threat'" [class.bg-orange-50]="formData.type === 'threat'">
                    <input type="radio" [(ngModel)]="formData.type" value="threat" name="type" class="sr-only">
                    <i class="fas fa-shield-alt mr-2 text-orange-600"></i>
                    <span class="text-sm">Threat</span>
                  </label>
                </div>
              </div>

              <!-- Area -->
              <div>
                <label for="area" class="block text-sm font-medium text-gray-700 mb-2">Area/Title</label>
                <input
                  type="text"
                  id="area"
                  [(ngModel)]="formData.area"
                  name="area"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Strong customer relationships, Limited online presence"
                >
              </div>

              <!-- Description -->
              <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  id="description"
                  [(ngModel)]="formData.description"
                  name="description"
                  required
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed description of this growth area..."
                ></textarea>
              </div>

              <!-- Impact Area -->
              <div>
                <label for="impact_area" class="block text-sm font-medium text-gray-700 mb-2">Impact Area</label>
                <select
                  id="impact_area"
                  [(ngModel)]="formData.impact_area"
                  name="impact_area"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select impact area...</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Technology">Technology</option>
                  <option value="Strategy">Strategy</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Customer Service">Customer Service</option>
                  <option value="Product Development">Product Development</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>

              <!-- Rating -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  {{ formData.type === 'strength' ? 'Strength Level' :
                     formData.type === 'weakness' ? 'Priority Level' :
                     formData.type === 'opportunity' ? 'Potential Impact' : 'Threat Level' }}
                </label>
                <div class="flex space-x-2">
                  <button
                    type="button"
                    *ngFor="let star of [1,2,3,4,5]"
                    (click)="formData.rating = star"
                    class="text-2xl focus:outline-none"
                    [class.text-yellow-400]="star <= formData.rating"
                    [class.text-gray-300]="star > formData.rating"
                  >
                    <i class="fas fa-star"></i>
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ getRatingDescription(formData.rating, formData.type) }}</p>
              </div>

              <!-- Mentor Notes -->
              <div>
                <label for="mentor_notes" class="block text-sm font-medium text-gray-700 mb-2">Mentor Notes (Optional)</label>
                <textarea
                  id="mentor_notes"
                  [(ngModel)]="formData.mentor_notes"
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
                (click)="closeGrowthAreaModal()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="!growthAreaForm.form.valid || saving"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ saving ? 'Saving...' : (editingGrowthArea ? 'Update' : 'Save') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Task Modal (Reusable from OKR system) -->
      <app-objective-task-modal
        [isOpen]="showTaskModal"
        [taskData]="selectedTask"
        [objectiveId]="selectedGrowthAreaId"
        (close)="closeTaskModal()"
        (save)="saveTask($event)"
      ></app-objective-task-modal>
    </div>
  `
})
export class GrowthAreasTabComponent implements OnInit, OnDestroy {
  @Input() company: INode<Company> | null = null;

  private destroy$ = new Subject<void>();

  growthAreas: INode<GrowthArea>[] = [];
  growthAreaTasks: INode<OKRTask>[] = []; // Tasks linked to growth areas
  loading = false;
  showGrowthAreaModal = false;
  showTaskModal = false; // For the reusable task modal
  editingGrowthArea: INode<GrowthArea> | null = null;
  selectedGrowthAreaId: string | null = null; // For task creation
  selectedTask: INode<OKRTask> | null = null; // For task editing
  expandedGrowthAreaId: string | null = null; // To track which growth area is expanded
  formData: GrowthArea = initGrowthArea();
  saving = false;

  swotStats = {
    strengths: 0,
    weaknesses: 0,
    opportunities: 0,
    threats: 0
  };

  constructor(
    private nodeService: NodeService<GrowthArea>
  ) {}

  ngOnInit() {
    this.loadGrowthAreas();
    this.loadGrowthAreaTasks();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGrowthAreas() {
    if (!this.company?.id) return;

    this.loading = true;
    this.nodeService.getNodesByCompany(this.company.id, 'growth_area')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.growthAreas = areas as INode<GrowthArea>[];
          this.updateStats();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading growth areas:', error);
          this.loading = false;
        }
      });
  }

  loadGrowthAreaTasks() {
    if (!this.company?.id) return;

    // Use the generic NodeService to get OKRTask nodes
    const taskService = this.nodeService as NodeService<any>;
    taskService.getNodesByCompany(this.company.id, 'okr_task')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          console.log('🔍 All OKR tasks loaded:', tasks);
          // Filter tasks that belong to growth areas
          this.growthAreaTasks = (tasks as INode<OKRTask>[])
            .filter(task => task.data.task_type === 'growth_area');
          console.log('🎯 Growth area tasks filtered:', this.growthAreaTasks);
        },
        error: (error: any) => {
          console.error('Error loading growth area tasks:', error);
        }
      });
  }

  updateStats() {
    this.swotStats = {
      strengths: this.growthAreas.filter(a => a.data.type === 'strength').length,
      weaknesses: this.growthAreas.filter(a => a.data.type === 'weakness').length,
      opportunities: this.growthAreas.filter(a => a.data.type === 'opportunity').length,
      threats: this.growthAreas.filter(a => a.data.type === 'threat').length
    };
  }

  getGrowthAreasByType(type: 'strength' | 'weakness' | 'opportunity' | 'threat'): INode<GrowthArea>[] {
    return this.growthAreas.filter(area => area.data.type === type);
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  getRatingDescription(rating: number, type: string): string {
    const descriptions: Record<string, string[]> = {
      strength: ['Very Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'],
      weakness: ['Low Priority', 'Minor', 'Moderate', 'High Priority', 'Critical'],
      opportunity: ['Low Impact', 'Minor', 'Moderate', 'High Impact', 'Game Changer'],
      threat: ['Low Risk', 'Minor', 'Moderate', 'High Risk', 'Critical Threat']
    };
    return descriptions[type]?.[rating - 1] || '';
  }

  openGrowthAreaModal() {
    this.formData = initGrowthArea();
    this.formData.company_id = this.company?.id?.toString() || '';
    this.editingGrowthArea = null;
    this.showGrowthAreaModal = true;
  }

  addQuickGrowthArea(type: 'strength' | 'weakness' | 'opportunity' | 'threat') {
    this.formData = initGrowthArea();
    this.formData.company_id = this.company?.id?.toString() || '';
    this.formData.type = type;
    this.editingGrowthArea = null;
    this.showGrowthAreaModal = true;
  }

  editGrowthArea(area: INode<GrowthArea>) {
    this.formData = { ...area.data };
    this.editingGrowthArea = { ...area, data: { ...area.data } };
    this.showGrowthAreaModal = true;
  }

  closeGrowthAreaModal() {
    this.showGrowthAreaModal = false;
    this.editingGrowthArea = null;
    this.formData = initGrowthArea();
  }

  saveGrowthArea() {
    if (!this.company?.id) return;

    this.saving = true;
    this.formData.company_id = this.company.id.toString();

    const operation = this.editingGrowthArea
      ? this.nodeService.updateNode({ ...this.editingGrowthArea, data: this.formData })
      : this.nodeService.addNode({
          company_id: this.company.id,
          type: 'growth_area',
          data: this.formData
        } as INode<GrowthArea>);

    operation.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeGrowthAreaModal();
          this.loadGrowthAreas();
        },
        error: (error: any) => {
          console.error('Error saving growth area:', error);
          this.saving = false;
        }
      });
  }

  deleteGrowthArea(area: INode<GrowthArea>) {
    if (!area.id) return;

    if (confirm('Are you sure you want to delete this growth area?')) {
      this.nodeService.deleteNode(area.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadGrowthAreas();
          },
          error: (error: any) => {
            console.error('Error deleting growth area:', error);
          }
        });
    }
  }

  createTaskFromGrowthArea(area: INode<GrowthArea>) {
    this.selectedGrowthAreaId = String(area.id);
    this.selectedTask = null; // Creating new task
    this.showTaskModal = true;
  }

  // Helper methods for tasks
  getTasksForGrowthArea(growthAreaId: number): INode<OKRTask>[] {
    const tasks = this.growthAreaTasks.filter(task =>
      task.data.growth_area_id === String(growthAreaId)
    );
    console.log(`📋 Tasks for growth area ${growthAreaId}:`, tasks);
    return tasks;
  }

  toggleGrowthAreaExpansion(growthAreaId: number) {
    console.log(`🔄 Toggling growth area ${growthAreaId}, currently expanded: ${this.expandedGrowthAreaId}`);
    this.expandedGrowthAreaId = this.expandedGrowthAreaId === String(growthAreaId)
      ? null
      : String(growthAreaId);
    console.log(`✅ New expanded ID: ${this.expandedGrowthAreaId}`);
  }

  isGrowthAreaExpanded(growthAreaId: number): boolean {
    return this.expandedGrowthAreaId === String(growthAreaId);
  }

  editTask(task: INode<OKRTask>) {
    this.selectedTask = task;
    this.selectedGrowthAreaId = task.data.growth_area_id || null;
    this.showTaskModal = true;
  }

  deleteTask(task: INode<OKRTask>) {
    if (confirm('Are you sure you want to delete this task?')) {
      const taskService = this.nodeService as NodeService<any>;
      taskService.deleteNode(task.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.growthAreaTasks = this.growthAreaTasks.filter(t => t.id !== task.id);
          },
          error: (error: any) => {
            console.error('Error deleting task:', error);
          }
        });
    }
  }

  toggleTaskStatus(task: INode<OKRTask>) {
    const newStatus = task.data.status === 'completed' ? 'not_started' : 'completed';
    const updatedTask: INode<OKRTask> = {
      ...task,
      data: {
        ...task.data,
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined
      }
    };

    const taskService = this.nodeService as NodeService<any>;
    taskService.updateNode(updatedTask)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const index = this.growthAreaTasks.findIndex(t => t.id === task.id);
          if (index >= 0) {
            this.growthAreaTasks[index] = result;
          }
        },
        error: (error: any) => {
          console.error('Error updating task status:', error);
        }
      });
  }

  closeTaskModal() {
    this.showTaskModal = false;
    this.selectedTask = null;
    this.selectedGrowthAreaId = null;
  }

  saveTask(taskData: OKRTask) {
    // Set the growth area context
    taskData.company_id = String(this.company?.id || '');
    taskData.growth_area_id = this.selectedGrowthAreaId || '';
    taskData.task_type = 'growth_area';

    const taskService = this.nodeService as NodeService<any>;

    if (this.selectedTask) {
      // Update existing task
      const updatedTask: INode<OKRTask> = {
        ...this.selectedTask,
        data: taskData
      };

      taskService.updateNode(updatedTask)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const index = this.growthAreaTasks.findIndex(t => t.id === this.selectedTask!.id);
            if (index >= 0) {
              this.growthAreaTasks[index] = result;
            }
            this.closeTaskModal();
          },
          error: (error: any) => {
            console.error('Error updating task:', error);
          }
        });
    } else {
      // Create new task
      const newTask: INode<OKRTask> = {
        id: 0, // Will be set by backend
        company_id: this.company?.id || 0,
        type: 'okr_task',
        data: taskData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      taskService.addNode(newTask)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.growthAreaTasks.push(result);
            this.closeTaskModal();
          },
          error: (error: any) => {
            console.error('Error creating task:', error);
          }
        });
    }
  }

  // Background color helper for tasks (reuse from OKR system)
  getTaskBackgroundClass(task: OKRTask): string {
    switch (task.background_color) {
      case 'light-orange': return 'bg-orange-50 border-orange-200';
      case 'light-red': return 'bg-red-50 border-red-200';
      case 'light-green': return 'bg-green-50 border-green-200';
      case 'light-yellow': return 'bg-yellow-50 border-yellow-200';
      case 'light-purple': return 'bg-purple-50 border-purple-200';
      case 'light-blue': return 'bg-blue-50 border-blue-200';
      case 'light-pink': return 'bg-pink-50 border-pink-200';
      default: return 'bg-white border-gray-200';
    }
  }
}
