import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { CompanyVision, ProductService, StrategicGoal } from '../../../../../../models/business.models';

@Component({
  selector: 'app-strategy-progress-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
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
  `
})
export class StrategyProgressOverviewComponent {
  @Input() visionData: INode<CompanyVision> | null = null;
  @Input() productsServices: INode<ProductService>[] = [];
  @Input() strategicGoals: INode<StrategicGoal>[] = [];

  get visionComplete(): boolean {
    return !!(this.visionData?.data?.vision_statement && this.visionData?.data?.mission_statement);
  }
}
