import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  FinancialOverviewComponent,
  FinancialCheckinModalComponent,
  FinancialCheckinOverviewComponent
} from './components';
import { FinancialCheckinQuarterlyViewComponent } from './components/financial-checkin-quarterly-view.component';
import { ICompany } from '../../../../../models/simple.schema';
import { CompanyFinancialsService, ICompanyFinancials } from '../../../../../services/company-financials.service';
import { CompanyService } from '../../../../../services/company.service';

@Component({
  selector: 'app-financial-tab',
  standalone: true,
  imports: [
    CommonModule,
    FinancialOverviewComponent,
    FinancialCheckinModalComponent,
    FinancialCheckinOverviewComponent,
    FinancialCheckinQuarterlyViewComponent
  ],
  templateUrl: './financial-tab.component.html'
})
export class FinancialTabComponent implements OnInit {
  @Input() company?: ICompany; // Made optional since it might come from route or input
  @ViewChild(FinancialCheckinOverviewComponent) checkinOverview!: FinancialCheckinOverviewComponent;
  @ViewChild(FinancialCheckinModalComponent) checkinModal!: FinancialCheckinModalComponent;

  // Company loading state
  loadingCompany = false;
  companyError: string | null = null;

  // Financial Check-ins data
  financialCheckIns: ICompanyFinancials[] = [];
  loadingCheckIns = false;
  checkInsError: string | null = null;

  // Financial Check-in modal properties
  showCheckInModal = false;
  isCheckInEditMode = false;
  editingCheckIn: ICompanyFinancials | null = null;

  constructor(
    private checkInService: CompanyFinancialsService,
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    // If company is not provided as input, load it from route parameters
    if (!this.company) {
      this.loadCompanyFromRoute();
    } else {
      this.loadFinancialCheckIns();
    }
  }

  loadCompanyFromRoute() {
    // Get company ID from parent route (company/:id)
    this.route.parent?.params.subscribe(params => {
      const companyId = params['id'];
      if (companyId) {
        this.loadCompanyData(parseInt(companyId, 10));
      }
    });
  }

  loadCompanyData(companyId: number) {
    this.loadingCompany = true;
    this.companyError = null;

    this.companyService.getCompanyById(companyId).subscribe({
      next: (company) => {
        this.company = company;
        this.loadingCompany = false;
        this.loadFinancialCheckIns();
      },
      error: (error) => {
        console.error('Error loading company:', error);
        this.companyError = 'Failed to load company information';
        this.loadingCompany = false;
      }
    });
  }

  loadFinancialCheckIns() {
    if (!this.company?.id) {
      return;
    }

    this.loadingCheckIns = true;
    this.checkInsError = null;

    // Fetch all financial check-ins for this company, sorted by date
    this.checkInService.listAllCompanyFinancials(this.company.id).subscribe({
      next: (checkIns: ICompanyFinancials[]) => {
        // Filter check-ins for this company
        this.financialCheckIns = checkIns
          .filter((checkIn: ICompanyFinancials) => checkIn.company_id === this.company!.id)
          .sort((a: ICompanyFinancials, b: ICompanyFinancials) => {
            // Sort by year and month descending (newest first)
            if (a.year !== b.year) {
              return b.year - a.year;
            }
            // Handle optional month field
            const aMonth = a.month || 0;
            const bMonth = b.month || 0;
            return bMonth - aMonth;
          });
        this.loadingCheckIns = false;
      },
      error: (err: any) => {
        console.error('Error loading financial check-ins:', err);
        this.checkInsError = 'Failed to load financial check-ins';
        this.loadingCheckIns = false;
      }
    });
  }
  // ===== PDF EXPORT METHODS =====

  onExportPDF() {
    if (!this.company?.id) return;

    // Navigate to the dedicated PDF export page in a new tab
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/companies', this.company.id, 'pdf-export'])
    );
    window.open(url, '_blank');
  }

  // ===== FINANCIAL CHECK-IN METHODS =====

  onNewCheckIn() {
    this.isCheckInEditMode = false;
    this.editingCheckIn = null;
    this.showCheckInModal = true;
  }

  onEditCheckIn(checkIn: ICompanyFinancials) {
    this.isCheckInEditMode = true;
    this.editingCheckIn = checkIn;
    this.showCheckInModal = true;
  }

  onCheckInModalClose() {
    this.showCheckInModal = false;
    this.isCheckInEditMode = false;
    this.editingCheckIn = null;
    // Reset the modal's saving state
    this.checkinModal?.resetSavingState();
  }

  onCheckInSaved(checkInData: ICompanyFinancials) {
    if (this.isCheckInEditMode && this.editingCheckIn) {
      // Update existing check-in
      const updatedCheckIn: ICompanyFinancials = {
        ...this.editingCheckIn,
      };

      this.checkInService.updateCompanyFinancials(updatedCheckIn.id, updatedCheckIn).subscribe({
        next: () => {
          this.onCheckInModalClose();
          // Refresh the overview component
          this.checkinOverview?.refreshData();
        },
        error: (err: any) => {
          console.error('Error updating check-in:', err);
        }
      });
    } else {
      // Create new check-in
      if (!this.company?.id) return;

      const newCheckIn: Partial<ICompanyFinancials> = {
        company_id: this.company.id,
      };

      this.checkInService.addCompanyFinancials(newCheckIn as ICompanyFinancials).subscribe({
        next: () => {
          this.onCheckInModalClose();
          // Refresh the overview component
          this.checkinOverview?.refreshData();
        },
        error: (err: any) => {
          console.error('Error creating check-in:', err);
        }
      });
    }
  }

  onViewTrends() {
    // TODO: Implement trends view - could be a separate modal or route
    console.log('View trends clicked - TODO: Implement trends view');
  }
}
