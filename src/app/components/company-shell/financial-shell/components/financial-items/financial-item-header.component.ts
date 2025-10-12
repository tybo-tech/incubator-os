import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-financial-item-header',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="flex justify-between items-center mb-4">
  <div>
    <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
    @if (subtitle) {
      <p class="text-sm text-gray-500">{{ subtitle }}</p>
    }
  </div>

  <!-- <button
    type="button"
    (click)="onAdd.emit()"
    class="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-md transition-all"
  >
    + {{ buttonLabel }}
  </button> -->
</div>
  `,
})
export class FinancialItemHeaderComponent {
  @Input() title = 'Section Title';
  @Input() subtitle = '';
  @Input() buttonLabel = 'Add Item';
  @Output() onAdd = new EventEmitter<void>();
}
