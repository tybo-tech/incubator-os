import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../models/schema';
import { Company } from '../../../../../models/business.models';
import { ICompany } from '../../../../../models/simple.schema';

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">Documents & Certificates</h3>
          <button class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors">
            Upload Document
          </button>
        </div>

        <!-- Document Categories -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <!-- Registration Documents -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div class="text-gray-400 mb-2">
              <svg class="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h4 class="text-sm font-medium text-gray-900 mb-1">Registration Documents</h4>
            <p class="text-xs text-gray-500">CIPC Certificate, Company Documents</p>
          </div>

          <!-- Tax Documents -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div class="text-gray-400 mb-2">
              <svg class="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h4 class="text-sm font-medium text-gray-900 mb-1">Tax Documents</h4>
            <p class="text-xs text-gray-500">Tax Clearance, SARS Certificates</p>
          </div>

          <!-- BBBEE Certificates -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div class="text-gray-400 mb-2">
              <svg class="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
              </svg>
            </div>
            <h4 class="text-sm font-medium text-gray-900 mb-1">BBBEE Certificates</h4>
            <p class="text-xs text-gray-500">BBBEE Certificate, Affidavits</p>
          </div>

          <!-- Bank Statements -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div class="text-gray-400 mb-2">
              <svg class="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <h4 class="text-sm font-medium text-gray-900 mb-1">Bank Statements</h4>
            <p class="text-xs text-gray-500">Monthly Statements, Financial Records</p>
          </div>

          <!-- Insurance Documents -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div class="text-gray-400 mb-2">
              <svg class="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <h4 class="text-sm font-medium text-gray-900 mb-1">Insurance Documents</h4>
            <p class="text-xs text-gray-500">Liability Insurance, Coverage Certificates</p>
          </div>

          <!-- Other Documents -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div class="text-gray-400 mb-2">
              <svg class="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
              </svg>
            </div>
            <h4 class="text-sm font-medium text-gray-900 mb-1">Other Documents</h4>
            <p class="text-xs text-gray-500">Contracts, Agreements, References</p>
          </div>
        </div>

        <!-- Document Upload Instructions -->
        <div class="mt-6 bg-blue-50 rounded-lg p-4">
          <h4 class="text-sm font-medium text-blue-900 mb-2">Upload Guidelines</h4>
          <ul class="text-sm text-blue-700 space-y-1">
            <li>• Supported formats: PDF, DOC, DOCX, JPG, PNG</li>
            <li>• Maximum file size: 10MB per document</li>
            <li>• Ensure documents are clear and legible</li>
            <li>• Use descriptive file names for easy identification</li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class DocumentsTabComponent {
  @Input() company!: ICompany;
}
