import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { INode } from '../../../../../models/schema';
import { Company } from '../../../../../models/business.models';
import { FinancialCheckIn } from '../../../../../models/busines.financial.checkin.models';
import { NodeService } from '../../../../../services';
import {
  FinancialOverviewComponent,
  FinancialCheckinModalComponent,
  FinancialCheckinOverviewComponent
} from './components';
import { FinancialCheckinQuarterlyViewComponent } from './components/financial-checkin-quarterly-view.component';
import { ICompany } from '../../../../../models/simple.schema';

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
  @Input() company!: ICompany;
  @ViewChild(FinancialCheckinOverviewComponent) checkinOverview!: FinancialCheckinOverviewComponent;
  @ViewChild(FinancialCheckinModalComponent) checkinModal!: FinancialCheckinModalComponent;

  // Financial Check-ins data
  financialCheckIns: INode<FinancialCheckIn>[] = [];
  loadingCheckIns = false;
  checkInsError: string | null = null;

  // Financial Check-in modal properties
  showCheckInModal = false;
  isCheckInEditMode = false;
  editingCheckIn: INode<FinancialCheckIn> | null = null;

  constructor(
    private checkInService: NodeService<FinancialCheckIn>,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.company?.id) {
      this.loadFinancialCheckIns();
    }
  }

  loadFinancialCheckIns() {
    this.loadingCheckIns = true;
    this.checkInsError = null;

    // Fetch financial check-ins for this company
    this.checkInService.getNodesByType('financial_checkin').subscribe({
      next: (checkIns: INode<FinancialCheckIn>[]) => {
        // Filter check-ins for this company
        this.financialCheckIns = checkIns
          .filter((checkIn: INode<FinancialCheckIn>) => checkIn.company_id === this.company.id)
          .sort((a: INode<FinancialCheckIn>, b: INode<FinancialCheckIn>) => {
            // Sort by year and month descending (newest first)
            if (a.data.year !== b.data.year) {
              return b.data.year - a.data.year;
            }
            // Handle optional month field
            const aMonth = a.data.month || 0;
            const bMonth = b.data.month || 0;
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

  onEditCheckIn(checkIn: INode<FinancialCheckIn>) {
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

  onCheckInSaved(checkInData: FinancialCheckIn) {
    if (this.isCheckInEditMode && this.editingCheckIn) {
      // Update existing check-in
      const updatedCheckIn: INode<FinancialCheckIn> = {
        ...this.editingCheckIn,
        data: checkInData
      };

      this.checkInService.updateNode(updatedCheckIn).subscribe({
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
      const newCheckIn: Partial<INode<FinancialCheckIn>> = {
        type: 'financial_checkin',
        company_id: this.company.id,
        data: checkInData
      };

      this.checkInService.addNode(newCheckIn as INode<FinancialCheckIn>).subscribe({
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
