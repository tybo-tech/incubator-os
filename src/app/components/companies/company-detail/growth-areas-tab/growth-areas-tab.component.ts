import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, GrowthArea, OKRTask, initGrowthArea, initOKRTask } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

// Import the reusable task modal component and new section component
import { ObjectiveTaskModalComponent } from '../strategy-tab/components/objective-task-modal.component';
import { GrowthAreasSectionComponent } from './components/growth-areas-section.component';

@Component({
  selector: 'app-growth-areas-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ObjectiveTaskModalComponent, GrowthAreasSectionComponent],
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

      <!-- Growth Areas Section -->
      <app-growth-areas-section
        [growthAreas]="growthAreas"
        [tasks]="growthAreaTasks"
        (addGrowthArea)="openGrowthAreaModal()"
        (editGrowthArea)="editGrowthArea($event)"
        (deleteGrowthArea)="deleteGrowthArea($event)"
        (addTask)="createTaskFromGrowthArea($event)"
        (editTask)="editTask($event)"
        (deleteTask)="deleteTask($event)"
        (updateTaskStatus)="updateTaskStatusFromDropdown($event)">
      </app-growth-areas-section>

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
          // Filter tasks that belong to growth areas
          this.growthAreaTasks = (tasks as INode<OKRTask>[])
            .filter(task => task.data.task_type === 'growth_area');
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
    return this.growthAreaTasks.filter(task =>
      task.data.growth_area_id === String(growthAreaId)
    );
  }

  updateTaskStatusFromDropdown(event: {task: INode<OKRTask>, status: string}) {
    const updatedTask: INode<OKRTask> = {
      ...event.task,
      data: {
        ...event.task.data,
        status: event.status as any,
        completed_date: event.status === 'completed' ? new Date().toISOString().split('T')[0] : undefined
      }
    };

    const taskService = this.nodeService as NodeService<any>;
    taskService.updateNode(updatedTask)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const index = this.growthAreaTasks.findIndex(t => t.id === event.task.id);
          if (index >= 0) {
            this.growthAreaTasks[index] = result;
          }
        },
        error: (error: any) => {
          console.error('Error updating task status:', error);
        }
      });
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
