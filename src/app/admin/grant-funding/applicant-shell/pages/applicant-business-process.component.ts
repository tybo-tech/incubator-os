import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-applicant-business-process',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Business Process</h2>
        <p class="text-xs text-gray-500 mt-1">Review and manage the business process for this application.</p>
      </div>
      <div class="p-5">
        <div class="text-center py-8">
          <svg class="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="mt-4 text-sm text-gray-500">Business process components will be displayed here.</p>
          <p class="text-xs text-gray-400 mt-1">This is a placeholder for future business process functionality.</p>
        </div>
      </div>
    </div>
  `
})
export class ApplicantBusinessProcessComponent {}