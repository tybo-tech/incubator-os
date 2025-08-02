import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../models/schema';
import { Company } from '../../../../../models/business.models';
import { CompanyInformationComponent } from './company-information/company-information.component';
import { ContactInformationComponent } from './contact-information/contact-information.component';
import { BusinessDescriptionComponent } from './business-description/business-description.component';
import { CompanySidebarComponent } from './company-sidebar/company-sidebar.component';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [
    CommonModule,
    CompanyInformationComponent,
    ContactInformationComponent,
    BusinessDescriptionComponent,
    CompanySidebarComponent
  ],
  template: `
    <div class="space-y-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Company Information -->
        <div class="lg:col-span-2 space-y-6">
          <app-company-information [company]="company"></app-company-information>
          <app-contact-information [company]="company"></app-contact-information>
          <app-business-description [company]="company"></app-business-description>
        </div>

        <!-- Sidebar -->
        <app-company-sidebar [company]="company"></app-company-sidebar>
      </div>
    </div>
  `
})
export class OverviewTabComponent {
  @Input() company!: INode<Company>;
}
