import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { Company } from '../../../../../../models/business.models';

@Component({
  selector: 'app-business-description',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Business Description</h3>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-gray-500">Service Offering</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.data.service_offering || company.data.description || 'N/A' }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-500">Locations</label>
          <p class="text-sm text-gray-900 mt-1">{{ company.data.locations || 'N/A' }}</p>
        </div>
      </div>
    </div>
  `
})
export class BusinessDescriptionComponent {
  @Input() company!: INode<Company>;
}
