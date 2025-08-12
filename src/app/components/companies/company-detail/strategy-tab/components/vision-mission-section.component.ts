import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { CompanyVision } from '../../../../../../models/business.models';

@Component({
  selector: 'app-vision-mission-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border my-4">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <i class="fas fa-eye mr-2 text-blue-600"></i>
            Vision & Mission
          </h3>
          <p class="text-sm text-gray-600">Define your company's purpose and direction</p>
        </div>
        <button
          (click)="editVision.emit()"
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
            (click)="editVision.emit()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Create Vision Statement
          </button>
        </div>

        <div *ngIf="visionData" class="space-y-6">
          <!-- Purpose Statement -->
          <div>
            <h4 class="text-md font-semibold text-gray-900 mb-2 flex items-center">
              <i class="fas fa-compass mr-2 text-indigo-600"></i>
              Purpose Statement
            </h4>
            <p class="text-gray-700 bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-400">{{ visionData.data.purpose_statement }}</p>
          </div>

          <!-- Vision Statement -->
          <div>
            <h4 class="text-md font-semibold text-gray-900 mb-2 flex items-center">
              <i class="fas fa-eye mr-2 text-blue-600"></i>
              Vision Statement
            </h4>
            <p class="text-gray-700 bg-blue-50 p-4 rounded-lg">{{ visionData.data.vision_statement }}</p>
          </div>

          <!-- Mission Statement -->
          <div>
            <h4 class="text-md font-semibold text-gray-900 mb-2 flex items-center">
              <i class="fas fa-target mr-2 text-green-600"></i>
              Mission Statement
            </h4>
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
  `
})
export class VisionMissionSectionComponent {
  @Input() visionData: INode<CompanyVision> | null = null;
  @Output() editVision = new EventEmitter<void>();
}
