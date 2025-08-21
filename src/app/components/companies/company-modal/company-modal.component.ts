import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ICompany } from '../../../../models/simple.schema';

@Component({
  selector: 'app-company-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-modal.component.html',
  styleUrl: './company-modal.component.scss'
})
export class CompanyModalComponent {
  @Input() company: ICompany | null = null;
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();

  constructor(private router: Router) {}

  onClose() {
    this.closeModal.emit();
  }

  onViewFullDetails() {
    if (this.company) {
      this.router.navigate(['/companies', this.company.id]);
      this.onClose();
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  getComplianceColor(status: boolean): string {
    return status ? 'bg-green-500' : 'bg-red-500';
  }

  getComplianceText(status: boolean): string {
    return status ? 'Valid' : 'Invalid';
  }

  getBbbeeColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'eme': return 'bg-green-500';
      case 'qse': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
