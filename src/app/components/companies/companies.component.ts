import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyModalComponent } from './company-modal/company-modal.component';
import { CompanyFormModalComponent } from './company-form-modal/company-form-modal.component';
import { CompanyService } from '../../../services/company.service';
import { ICompany } from '../../../models/simple.schema';
import { Router } from '@angular/router';

@Component({
  selector: 'app-companies',
  imports: [CommonModule, CompanyModalComponent, CompanyFormModalComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent {
  companies: ICompany[] = [];
  selectedCompany: ICompany | null = null;
  isModalOpen = false;

  // Form modal properties
  isFormModalOpen = false;
  editMode = false;
  companyToEdit: ICompany | null = null;

  constructor(private nodeService: CompanyService, private router: Router) {
    // Component initialization logic can go here
    this.getAllCompanies();
    // nodeService.fixCompanyTurnOver();
  }

  getAllCompanies() {
    this.nodeService.listCompanies().subscribe({
      next: (companies) => {
        console.log('Companies:', companies);
        this.companies = companies
      },
      error: (err) => {
        console.error('Error fetching companies:', err);
      },
    });
  }

  openCompanyModal(company: ICompany) {
    this.selectedCompany = company;
    this.isModalOpen = true;
      this.router.navigate(['/companies', company.id]);
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

  openEditCompanyModal(company: ICompany) {
    // this.editMode = true;
    // this.companyToEdit = company;
    // this.isFormModalOpen = true;

    //companies/1
    this.router.navigate(['/companies', company.id]);
  }

  closeFormModal() {
    this.isFormModalOpen = false;
    this.editMode = false;
    this.companyToEdit = null;
  }

  onCompanySaved(company: ICompany) {
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
