import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-financial-checkin-notes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="latestNotes" class="bg-gray-50 rounded-lg p-4 mb-6">
      <h4 class="font-medium text-gray-900 mb-2 flex items-center">
        <i class="fas fa-sticky-note mr-2"></i>
        Recent Notes
      </h4>
      <p class="text-gray-700 text-sm italic">"{{ latestNotes }}"</p>
    </div>
  `
})
export class FinancialCheckinNotesComponent {
  @Input() latestNotes: string | null = null;
}
