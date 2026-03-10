import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-grant-applications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div class="flex items-center mb-6">
        <i class="fas fa-file-alt text-green-600 text-2xl mr-3"></i>
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Grant Applications</h2>
          <p class="text-gray-600 mt-1">Track grant applications and their statuses.</p>
        </div>
      </div>

      <!-- Placeholder content -->
      <div class="flex flex-col items-center justify-center py-16 text-gray-400">
        <i class="fas fa-file-alt text-6xl mb-4 text-green-200"></i>
        <p class="text-lg font-medium text-gray-500">Grant Applications</p>
        <p class="text-sm text-gray-400 mt-1">Application records will be displayed here.</p>
      </div>
    </div>
  `,
})
export class GrantApplicationsComponent {}
