import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ActionItemFormComponent, ActionItemData } from '../action-item-form/action-item-form.component';
import { ActionItemDisplayComponent } from '../action-item-display/action-item-display.component';
import { SwotDataService, SwotItem } from '../../../../services/swot-data.service';
import { SwotUIStateService, SwotCategory } from '../../../../services/swot-ui-state.service';
import { SwotConfigService, SwotCategoryType } from '../../../../services/swot-config.service';

@Component({
  selector: 'app-swot-category-section',
  standalone: true,
  imports: [
    CommonModule,
    ActionItemFormComponent,
    ActionItemDisplayComponent
  ],
  template: `
    <!-- SWOT Category Accordion -->
    <div 
      class="rounded-xl shadow-sm p-6"
      [ngClass]="config.getCategoryClasses(category) + ' border ' + config.getCategoryClasses(category, 'border')"
    >
      <!-- Category Header - Collapsible -->
      <div
        (click)="toggleSection()"
        class="cursor-pointer rounded-lg p-2 -m-2 transition-colors"
        [ngClass]="config.getCategoryClasses(category, 'hover')"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i 
              class="mr-3 text-lg"
              [ngClass]="categoryConfig.icon + ' ' + config.getCategoryClasses(category, 'text')"
            ></i>
            <div>
              <h4 
                class="text-lg font-semibold"
                [ngClass]="config.getCategoryClasses(category, 'text').replace('600', '800')"
              >
                {{ categoryConfig.name }}s
                <span 
                  class="ml-2 text-sm font-normal"
                  [ngClass]="config.getCategoryClasses(category, 'text')"
                >
                  ({{ (items$ | async)?.length || 0 }} items)
                </span>
              </h4>
              <p 
                class="text-sm mt-1"
                [ngClass]="config.getCategoryClasses(category, 'text').replace('600', '700')"
              >
                {{ categoryConfig.description }}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <button
              (click)="addItem(); $event.stopPropagation()"
              class="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
              [ngClass]="config.getButtonClasses(category) + ' focus:ring-' + categoryConfig.colorClass + '-500'"
            >
              <i class="fas fa-plus mr-2"></i>Add {{ categoryConfig.name }}
            </button>
            <i
              class="fas transform transition-transform duration-200"
              [ngClass]="config.getCategoryClasses(category, 'text')"
              [class.fa-chevron-down]="isOpen$ | async"
              [class.fa-chevron-right]="!(isOpen$ | async)"
            ></i>
          </div>
        </div>
      </div>

      <!-- Category Content - Collapsible -->
      <div
        *ngIf="isOpen$ | async"
        class="mt-6 pt-6 pb-2 px-4 space-y-4 rounded-b-lg"
        [ngClass]="'border-t ' + config.getCategoryClasses(category, 'border')"
      >
        <!-- Category Items -->
        <ng-container *ngFor="let item of items$ | async; trackBy: trackByFn">
          <!-- Display Mode -->
          <app-action-item-display
            *ngIf="!(isEditing$ | async)?.has(item.id!)"
            [item]="convertToActionItemData(item)"
            [categoryColor]="categoryConfig.colorClass"
            (edit)="startEditing(item)"
            (quickDelete)="deleteItem(item)"
          ></app-action-item-display>

          <!-- Edit Mode -->
          <app-action-item-form
            *ngIf="(isEditing$ | async)?.has(item.id!)"
            [item]="convertToActionItemData(item)"
            [config]="categoryConfig.formConfig"
            (save)="saveItem(item, $event)"
            (cancel)="cancelEdit(item)"
            (delete)="deleteItem(item)"
          ></app-action-item-form>
        </ng-container>

        <!-- Enhanced Empty State -->
        <div 
          *ngIf="(items$ | async)?.length === 0"
          class="text-center py-12 bg-white rounded-lg border-2 border-dashed"
          [ngClass]="'border-' + categoryConfig.colorClass + '-300'"
        >
          <i 
            class="text-4xl mb-4"
            [ngClass]="categoryConfig.icon + ' text-' + categoryConfig.colorClass + '-300'"
          ></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ emptyStateConfig.title }}
          </h3>
          <p class="text-gray-600 mb-4">
            {{ emptyStateConfig.description }}
          </p>
          <button
            (click)="addItem()"
            class="px-4 py-2 text-white rounded-lg transition-colors"
            [ngClass]="config.getButtonClasses(category)"
          >
            <i class="fas fa-plus mr-2"></i>{{ emptyStateConfig.buttonText }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class SwotCategorySectionComponent implements OnInit {
  @Input() category!: SwotCategoryType;
  @Input() companyId!: number;
  @Output() itemAdded = new EventEmitter<SwotItem>();
  @Output() itemUpdated = new EventEmitter<SwotItem>();
  @Output() itemDeleted = new EventEmitter<SwotItem>();

  items$!: Observable<SwotItem[]>;
  isOpen$!: Observable<boolean>;
  isEditing$!: Observable<Set<number>>;
  
  categoryConfig!: any;
  emptyStateConfig!: any;

  constructor(
    public swotDataService: SwotDataService,
    public uiStateService: SwotUIStateService,
    public config: SwotConfigService
  ) {}

  ngOnInit(): void {
    this.categoryConfig = this.config.getCategoryConfig(this.category);
    this.emptyStateConfig = this.config.getEmptyStateConfig(this.category);
    
    // Set up observables
    this.items$ = this.swotDataService.getItemsByCategory(this.category);
    this.isOpen$ = this.uiStateService.isSectionOpen(this.category + 's' as SwotCategory);
    this.isEditing$ = this.uiStateService.getEditingItems();
  }

  toggleSection(): void {
    this.uiStateService.toggleAccordion(this.category + 's' as SwotCategory);
  }

  addItem(): void {
    this.swotDataService.addSwotItem(this.companyId, this.category).subscribe({
      next: (item) => {
        this.itemAdded.emit(item);
        // Auto-start editing for new items
        if (item.id) {
          this.uiStateService.startEditing(item.id);
        }
      }
    });
  }

  startEditing(item: SwotItem): void {
    if (item.id) {
      this.uiStateService.startEditing(item.id);
    }
  }

  saveItem(item: SwotItem, actionData: ActionItemData): void {
    // Update item content
    item.content = actionData.description;
    
    this.swotDataService.updateSwotItem(item).subscribe({
      next: (updatedItem) => {
        this.itemUpdated.emit(updatedItem);
        if (item.id) {
          this.uiStateService.stopEditing(item.id);
        }
      }
    });
  }

  cancelEdit(item: SwotItem): void {
    if (item.id) {
      this.uiStateService.stopEditing(item.id);
    }
  }

  deleteItem(item: SwotItem): void {
    this.swotDataService.deleteSwotItem(item).subscribe({
      next: () => {
        this.itemDeleted.emit(item);
        if (item.id) {
          this.uiStateService.stopEditing(item.id);
        }
      }
    });
  }

  trackByFn(index: number, item: SwotItem): any {
    return item.id || index;
  }

  convertToActionItemData(item: SwotItem): ActionItemData {
    return {
      id: item.id,
      description: item.content || '',
      action_required: '',
      assigned_to: '',
      target_date: '',
      status: 'identified',
      priority: 'medium',
      impact: 'medium'
    };
  }
}