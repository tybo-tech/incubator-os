import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../../services';
import { Company } from '../../../models/business.models';
import { INode } from '../../../models/schema';
import { CompanyModalComponent } from './company-modal/company-modal.component';

@Component({
  selector: 'app-companies',
  imports: [CommonModule, CompanyModalComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent {
  companies: INode<Company>[] = [];
  selectedCompany: INode<Company> | null = null;
  isModalOpen = false;
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

  openCompanyModal(company: INode<Company>) {
    this.selectedCompany = company;
    this.isModalOpen = true;
  }

  closeCompanyModal() {
    this.selectedCompany = null;
    this.isModalOpen = false;
  }
}
