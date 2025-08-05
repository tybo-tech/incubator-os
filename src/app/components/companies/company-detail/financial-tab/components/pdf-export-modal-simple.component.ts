import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { INode } from '../../../../../../models/schema';
import { Company, BankStatement } from '../../../../../../models/business.models';

@Component({
  selector: 'app-pdf-export-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center">
              <i class="fas fa-file-pdf text-red-600 mr-2"></i>
              <h3 class="text-lg font-medium text-gray-900">PDF Export</h3>
            </div>
            <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="text-center">
            <div class="mb-4">
              <i class="fas fa-file-pdf text-6xl text-red-500 mb-4"></i>
              <h4 class="text-lg font-medium text-gray-900 mb-2">Generate Financial Report</h4>
              <p class="text-gray-600 mb-6">Create a comprehensive PDF report for {{ company.data.name }}</p>
            </div>

            <div class="flex space-x-3 justify-center">
              <button (click)="closeModal()"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300 transition-colors">
                Cancel
              </button>
              <button (click)="generatePDF()"
                      [disabled]="isGenerating"
                      class="px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors disabled:opacity-50">
                <i class="fas fa-external-link-alt mr-2"></i>
                {{ isGenerating ? 'Opening...' : 'Open PDF Generator' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PdfExportModalComponent implements OnInit {
  @Input() showModal = false;
  @Input() company!: INode<Company>;
  @Input() bankStatements: INode<BankStatement>[] = [];
  @Output() closeModalEvent = new EventEmitter<void>();

  currentDate = new Date();
  isGenerating = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Component initialization
  }

  closeModal() {
    this.closeModalEvent.emit();
  }

  async generatePDF() {
    this.isGenerating = true;
    // Navigate to the dedicated PDF export page
    this.router.navigate(['/companies', this.company.id, 'pdf-export']);
    // Close modal after a short delay
    setTimeout(() => {
      this.isGenerating = false;
      this.closeModal();
    }, 500);
  }
}
