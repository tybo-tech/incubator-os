import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { INode } from '../../../../../models/schema';
import { Company, GrowthArea, initGrowthArea } from '../../../../../models/business.models';
import { NodeService } from '../../../../../services';

@Component({
  selector: 'app-growth-areas-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

      <!-- SWOT Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-green-50 p-6 rounded-lg shadow-sm border border-green-200">
          <div class="text-2xl font-bold text-green-600">{{ swotStats.strengths }}</div>
          <div class="text-sm text-green-700 flex items-center">
            <i class="fas fa-thumbs-up mr-1"></i>
            Strengths
          </div>
        </div>
        <div class="bg-red-50 p-6 rounded-lg shadow-sm border border-red-200">
          <div class="text-2xl font-bold text-red-600">{{ swotStats.weaknesses }}</div>
          <div class="text-sm text-red-700 flex items-center">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            Weaknesses
          </div>
        </div>
        <div class="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-200">
          <div class="text-2xl font-bold text-blue-600">{{ swotStats.opportunities }}</div>
          <div class="text-sm text-blue-700 flex items-center">
            <i class="fas fa-lightbulb mr-1"></i>
            Opportunities
          </div>
        </div>
        <div class="bg-orange-50 p-6 rounded-lg shadow-sm border border-orange-200">
          <div class="text-2xl font-bold text-orange-600">{{ swotStats.threats }}</div>
          <div class="text-sm text-orange-700 flex items-center">
            <i class="fas fa-shield-alt mr-1"></i>
            Threats
          </div>
        </div>
      </div>

      <!-- SWOT Categories -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Strengths -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="bg-green-50 px-6 py-4 border-b border-green-200">
            <h3 class="text-lg font-semibold text-green-800 flex items-center">
              <i class="fas fa-thumbs-up mr-2"></i>
              Strengths
            </h3>
          </div>
          <div class="p-6">
            <div *ngIf="getGrowthAreasByType('strength').length === 0" class="text-center text-gray-500 py-8">
              <i class="fas fa-plus-circle text-3xl mb-2"></i>
              <p>No strengths identified yet</p>
              <button (click)="addQuickGrowthArea('strength')" class="text-green-600 hover:text-green-700 mt-2">
                Add a strength
              </button>
            </div>
            <div *ngFor="let item of getGrowthAreasByType('strength')" class="border-b border-gray-100 pb-4 mb-4 last:border-b-0 last:mb-0">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ item.data.area }}</h4>
                  <p class="text-sm text-gray-600 mt-1">{{ item.data.description }}</p>
                  <div class="flex items-center mt-2 space-x-4">
                    <div class="flex items-center">
                      <span class="text-xs text-gray-500 mr-1">Impact:</span>
                      <span class="text-xs bg-gray-100 px-2 py-1 rounded">{{ item.data.impact_area }}</span>
                    </div>
                    <div class="flex items-center">
                      <span class="text-xs text-gray-500 mr-1">Rating:</span>
                      <div class="flex">
                        <i *ngFor="let star of getStarArray(item.data.rating)" class="fas fa-star text-yellow-400 text-xs"></i>
                      </div>
                    </div>
                  </div>
                  <p *ngIf="item.data.mentor_notes" class="text-xs text-blue-600 mt-2 italic">
                    💬 {{ item.data.mentor_notes }}
                  </p>
                </div>
                <div class="flex space-x-2 ml-4">
                  <button (click)="editGrowthArea(item)" class="text-gray-400 hover:text-blue-600">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button (click)="createTaskFromGrowthArea(item)" class="text-gray-400 hover:text-green-600" title="Create Task">
                    <i class="fas fa-tasks"></i>
                  </button>
                  <button (click)="deleteGrowthArea(item)" class="text-gray-400 hover:text-red-600">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weaknesses -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="bg-red-50 px-6 py-4 border-b border-red-200">
            <h3 class="text-lg font-semibold text-red-800 flex items-center">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              Weaknesses
            </h3>
          </div>
          <div class="p-6">
            <div *ngIf="getGrowthAreasByType('weakness').length === 0" class="text-center text-gray-500 py-8">
              <i class="fas fa-plus-circle text-3xl mb-2"></i>
              <p>No weaknesses identified yet</p>
              <button (click)="addQuickGrowthArea('weakness')" class="text-red-600 hover:text-red-700 mt-2">
                Add a weakness
              </button>
            </div>
            <div *ngFor="let item of getGrowthAreasByType('weakness')" class="border-b border-gray-100 pb-4 mb-4 last:border-b-0 last:mb-0">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ item.data.area }}</h4>
                  <p class="text-sm text-gray-600 mt-1">{{ item.data.description }}</p>
                  <div class="flex items-center mt-2 space-x-4">
                    <div class="flex items-center">
                      <span class="text-xs text-gray-500 mr-1">Impact:</span>
                      <span class="text-xs bg-gray-100 px-2 py-1 rounded">{{ item.data.impact_area }}</span>
                    </div>
                    <div class="flex items-center">
                      <span class="text-xs text-gray-500 mr-1">Priority:</span>
                      <div class="flex">
                        <i *ngFor="let star of getStarArray(item.data.rating)" class="fas fa-star text-yellow-400 text-xs"></i>
                      </div>
                    </div>
                  </div>
                  <p *ngIf="item.data.mentor_notes" class="text-xs text-blue-600 mt-2 italic">
                    💬 {{ item.data.mentor_notes }}
                  </p>
                </div>
                <div class="flex space-x-2 ml-4">
                  <button (click)="editGrowthArea(item)" class="text-gray-400 hover:text-blue-600">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button (click)="createTaskFromGrowthArea(item)" class="text-gray-400 hover:text-green-600" title="Create Task to Address">
                    <i class="fas fa-tasks"></i>
                  </button>
                  <button (click)="deleteGrowthArea(item)" class="text-gray-400 hover:text-red-600">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Opportunities -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="bg-blue-50 px-6 py-4 border-b border-blue-200">
            <h3 class="text-lg font-semibold text-blue-800 flex items-center">
              <i class="fas fa-lightbulb mr-2"></i>
              Opportunities
            </h3>
          </div>
          <div class="p-6">
            <div *ngIf="getGrowthAreasByType('opportunity').length === 0" class="text-center text-gray-500 py-8">
              <i class="fas fa-plus-circle text-3xl mb-2"></i>
              <p>No opportunities identified yet</p>
              <button (click)="addQuickGrowthArea('opportunity')" class="text-blue-600 hover:text-blue-700 mt-2">
                Add an opportunity
              </button>
            </div>
            <div *ngFor="let item of getGrowthAreasByType('opportunity')" class="border-b border-gray-100 pb-4 mb-4 last:border-b-0 last:mb-0">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ item.data.area }}</h4>
                  <p class="text-sm text-gray-600 mt-1">{{ item.data.description }}</p>
                  <div class="flex items-center mt-2 space-x-4">
                    <div class="flex items-center">
                      <span class="text-xs text-gray-500 mr-1">Impact:</span>
                      <span class="text-xs bg-gray-100 px-2 py-1 rounded">{{ item.data.impact_area }}</span>
                    </div>
                    <div class="flex items-center">
                      <span class="text-xs text-gray-500 mr-1">Potential:</span>
                      <div class="flex">
                        <i *ngFor="let star of getStarArray(item.data.rating)" class="fas fa-star text-yellow-400 text-xs"></i>
                      </div>
                    </div>
                  </div>
                  <p *ngIf="item.data.mentor_notes" class="text-xs text-blue-600 mt-2 italic">
                    💬 {{ item.data.mentor_notes }}
                  </p>
                </div>
                <div class="flex space-x-2 ml-4">
                  <button (click)="editGrowthArea(item)" class="text-gray-400 hover:text-blue-600">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button (click)="createTaskFromGrowthArea(item)" class="text-gray-400 hover:text-green-600" title="Create Task to Pursue">
                    <i class="fas fa-tasks"></i>
                  </button>
                  <button (click)="deleteGrowthArea(item)" class="text-gray-400 hover:text-red-600">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Threats -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="bg-orange-50 px-6 py-4 border-b border-orange-200">
            <h3 class="text-lg font-semibold text-orange-800 flex items-center">
              <i class="fas fa-shield-alt mr-2"></i>
              Threats
            </h3>
          </div>
          <div class="p-6">
            <div *ngIf="getGrowthAreasByType('threat').length === 0" class="text-center text-gray-500 py-8">
              <i class="fas fa-plus-circle text-3xl mb-2"></i>
              <p>No threats identified yet</p>
              <button (click)="addQuickGrowthArea('threat')" class="text-orange-600 hover:text-orange-700 mt-2">
                Add a threat
              </button>
            </div>
            <div *ngFor="let item of getGrowthAreasByType('threat')" class="border-b border-gray-100 pb-4 mb-4 last:border-b-0 last:mb-0">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ item.data.area }}</h4>
                  <p class="text-sm text-gray-600 mt-1">{{ item.data.description }}</p>
                  <div class="flex items-center mt-2 space-x-4">
                    <div class="flex items-center">
                      <span class="text-xs text-gray-500 mr-1">Impact:</span>
                      <span class="text-xs bg-gray-100 px-2 py-1 rounded">{{ item.data.impact_area }}</span>
                    </div>
                    <div class="flex items-center">
                      <span class="text-xs text-gray-500 mr-1">Severity:</span>
                      <div class="flex">
                        <i *ngFor="let star of getStarArray(item.data.rating)" class="fas fa-star text-yellow-400 text-xs"></i>
                      </div>
                    </div>
                  </div>
                  <p *ngIf="item.data.mentor_notes" class="text-xs text-blue-600 mt-2 italic">
                    💬 {{ item.data.mentor_notes }}
                  </p>
                </div>
                <div class="flex space-x-2 ml-4">
                  <button (click)="editGrowthArea(item)" class="text-gray-400 hover:text-blue-600">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button (click)="createTaskFromGrowthArea(item)" class="text-gray-400 hover:text-green-600" title="Create Task to Mitigate">
                    <i class="fas fa-tasks"></i>
                  </button>
                  <button (click)="deleteGrowthArea(item)" class="text-gray-400 hover:text-red-600">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
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
    </div>
  `
})
export class GrowthAreasTabComponent implements OnInit, OnDestroy {
  @Input() company: INode<Company> | null = null;

  private destroy$ = new Subject<void>();
  
  growthAreas: INode<GrowthArea>[] = [];
  loading = false;
  showGrowthAreaModal = false;
  editingGrowthArea: INode<GrowthArea> | null = null;
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
    // This will be implemented to create a task with parent_id pointing to the growth area
    const taskTitle = this.generateTaskTitle(area.data);
    const taskDescription = this.generateTaskDescription(area.data);
    
    console.log('Creating task from growth area:', {
      title: taskTitle,
      description: taskDescription,
      parent_id: area.id,
      company_id: this.company?.id
    });
    
    // TODO: Implement task creation with parent_id
    alert(`Task creation will be implemented:\n\nTitle: ${taskTitle}\nDescription: ${taskDescription}`);
  }

  private generateTaskTitle(area: GrowthArea): string {
    const prefixes = {
      strength: 'Leverage',
      weakness: 'Address',
      opportunity: 'Pursue',
      threat: 'Mitigate'
    };
    return `${prefixes[area.type]}: ${area.area}`;
  }

  private generateTaskDescription(area: GrowthArea): string {
    const actionWords = {
      strength: 'Develop a plan to leverage and maximize',
      weakness: 'Create action items to improve',
      opportunity: 'Develop strategy to capitalize on',
      threat: 'Implement measures to protect against'
    };
    return `${actionWords[area.type]} ${area.area.toLowerCase()}. ${area.description}`;
  }
}
