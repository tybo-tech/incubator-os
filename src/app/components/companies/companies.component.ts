import { Component } from '@angular/core';
import { NodeService } from '../../../services';

@Component({
  selector: 'app-companies',
  imports: [],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent {
  constructor(private nodeService: NodeService) {
    // Component initialization logic can go here
    this.getAllCompanies();
  }

  getAllCompanies() {
    this.nodeService.getNodesByType('company').subscribe({
      next: (companies) => {
        console.log('Companies:', companies);
      },
      error: (err) => {
        console.error('Error fetching companies:', err);
      },
    });
  }
}
