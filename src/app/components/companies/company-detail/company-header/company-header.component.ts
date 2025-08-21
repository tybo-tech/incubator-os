import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';

@Component({
  selector: 'app-company-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              (click)="onGoBack()"
              class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>

            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              {{ company.name.charAt(0) }}
            </div>

            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ company.name }}</h1>
              <div class="flex items-center space-x-3 mt-1">
                <span class="text-gray-600">{{ company.sector_name }}</span>
                <span class="text-gray-400">•</span>
                <span class="text-gray-600">{{ company.registration_no }}</span>
                <span [class]="'px-2 py-1 rounded-full text-xs font-medium text-white ' + getBbbeeColor(company.bbbee_level || '')">
                  {{ company.bbbee_level || 'N/A' }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <button
              (click)="exportToPDF.emit()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Export
            </button>
            <button
              (click)="onEditCompany()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors">
              Edit Company
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CompanyHeaderComponent {
  @Input() company!: ICompany;
  @Output() goBack = new EventEmitter<void>();
  @Output() editCompany = new EventEmitter<void>();
  @Output() exportToPDF = new EventEmitter<void>();

  onGoBack(): void {
    this.goBack.emit();
  }

  onEditCompany(): void {
    this.editCompany.emit();
  }

  getBbbeeColor(level: string): string {
    const levelMap: { [key: string]: string } = {
      'Level 1': 'bg-green-600',
      'Level 2': 'bg-green-500',
      'Level 3': 'bg-yellow-500',
      'Level 4': 'bg-yellow-600',
      'Level 5': 'bg-orange-500',
      'Level 6': 'bg-orange-600',
      'Level 7': 'bg-red-500',
      'Level 8': 'bg-red-600',
      'Non-compliant': 'bg-gray-500'
    };
    return levelMap[level] || 'bg-gray-400';
  }
}
