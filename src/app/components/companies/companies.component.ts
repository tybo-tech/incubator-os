import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../../services';
import { Company } from '../../../models/business.models';
import { INode } from '../../../models/schema';
import { CompanyModalComponent } from './company-modal/company-modal.component';
import { CompanyFormModalComponent } from './company-form-modal/company-form-modal.component';

@Component({
  selector: 'app-companies',
  imports: [CommonModule, CompanyModalComponent, CompanyFormModalComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent {
  companies: INode<Company>[] = [];
  selectedCompany: INode<Company> | null = null;
  isModalOpen = false;

  // Form modal properties
  isFormModalOpen = false;
  editMode = false;
  companyToEdit: INode<Company> | null = null;

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

  // Company Form Modal Methods
  openAddCompanyModal() {
    this.editMode = false;
    this.companyToEdit = null;
    this.isFormModalOpen = true;
  }

  openEditCompanyModal(company: INode<Company>) {
    this.editMode = true;
    this.companyToEdit = company;
    this.isFormModalOpen = true;
  }

  closeFormModal() {
    this.isFormModalOpen = false;
    this.editMode = false;
    this.companyToEdit = null;
  }

  onCompanySaved(company: INode<Company>) {
    if (this.editMode) {
      // Update existing company in list
      const index = this.companies.findIndex(c => c.id === company.id);
      if (index !== -1) {
        this.companies[index] = company;
      }
    } else {
      // Add new company to list
      this.companies.unshift(company);
    }

    // Optionally refresh the entire list to ensure data consistency
    this.getAllCompanies();
  }
}
