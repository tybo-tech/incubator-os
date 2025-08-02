import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../../services';
import { Company } from '../../../models/business.models';
import { INode } from '../../../models/schema';

@Component({
  selector: 'app-companies',
  imports: [CommonModule],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent {
  companies: INode<Company>[] = [];
  constructor(private nodeService: NodeService<Company>) {
    // Component initialization logic can go here
    this.getAllCompanies();
  }

  getAllCompanies() {
    this.nodeService.getNodesByType('company').subscribe({
      next: (companies) => {
        console.log('Companies:', companies);
        this.companies = companies
      },
      error: (err) => {
        console.error('Error fetching companies:', err);
      },
    });
  }
}
