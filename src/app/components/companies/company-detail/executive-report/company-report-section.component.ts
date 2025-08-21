import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICompany } from '../../../../../models/simple.schema';

@Component({
  selector: 'app-company-report-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Title -->
    <h1 class="text-center text-base font-bold tracking-wide uppercase border-b border-[#111827] pb-3 text-[#111827]">
      Take on Baseline – Entrepreneur Information
    </h1>

    <!-- Grid: left/right -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <!-- Left table -->
      <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <tbody>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] w-44 text-left font-semibold text-[#374151] p-2">Business Name</th>
              <td class="p-2 text-[#111827]">{{ c?.name || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Trading Name</th>
              <td class="p-2 text-[#111827]">{{ c?.trading_name || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Entrepreneur</th>
              <td class="p-2 text-[#111827]">{{ c?.contact_person || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Phone</th>
              <td class="p-2 text-[#111827]">{{ c?.contact_number || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Email</th>
              <td class="p-2 text-[#111827]">{{ c?.email_address || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Industry</th>
              <td class="p-2 text-[#111827]">{{ c?.sector_name || '—' }}</td>
            </tr>
            <tr>
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Type of Business</th>
              <td class="p-2 text-[#111827]">{{ c?.service_offering || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Right table -->
      <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <tbody>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] w-44 text-left font-semibold text-[#374151] p-2">Company Reg. No</th>
              <td class="p-2 text-[#111827]">{{ c?.registration_no || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">VAT Number</th>
              <td class="p-2 text-[#111827]">{{ c?.vat_number || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">BBBEE Level</th>
              <td class="p-2 text-[#111827]">{{ c?.bbbee_level || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">BBBEE Status</th>
              <td class="p-2 text-[#111827]">{{ c?.bbbee_valid_status || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">BBBEE Expiry</th>
              <td class="p-2 text-[#111827]">{{ c?.bbbee_expiry_date || '—' }}</td>
            </tr>
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Youth Owned</th>
              <td class="p-2 text-[#111827]">{{ c?.youth_owned || '—' }}</td>
            </tr>
            <tr>
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">CIPC Status</th>
              <td class="p-2 text-[#111827]">{{ c?.cipc_status || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Address & Location -->
    <div class="mt-6">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-[#374151] mb-2">
        Registered Address
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-40">Address</th>
              <td class="p-2 text-[#111827]">{{ c?.address || '—' }}</td>
            </tr>
            <tr>
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Suburb</th>
              <td class="p-2 text-[#111827]">{{ c?.suburb || '—' }}</td>
            </tr>
          </table>
        </div>
        <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-40">City/Town</th>
              <td class="p-2 text-[#111827]">{{ c?.city || c?.business_location || '—' }}</td>
            </tr>
            <tr>
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Postal Code</th>
              <td class="p-2 text-[#111827]">{{ c?.postal_code || '—' }}</td>
            </tr>
          </table>
        </div>
        <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <tr class="border-b border-[#e5e7eb]">
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-40">Locations</th>
              <td class="p-2 text-[#111827]">{{ c?.locations || '—' }}</td>
            </tr>
            <tr>
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2">Service Offering</th>
              <td class="p-2 text-[#111827]">{{ c?.service_offering || '—' }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- Employment Snapshot -->
    <div class="mt-6">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-[#374151] mb-2">
        Employment Snapshot
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <tr>
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-44">Permanent Employees</th>
              <td class="p-2 text-[#111827]">{{ c?.permanent_employees ?? '—' }}</td>
            </tr>
          </table>
        </div>
        <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <tr>
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-44">Temporary/Contract</th>
              <td class="p-2 text-[#111827]">{{ c?.temporary_employees ?? '—' }}</td>
            </tr>
          </table>
        </div>
        <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <tr>
              <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-44">Description</th>
              <td class="p-2 text-[#111827]">{{ c?.description || '—' }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- Compliance Snapshot -->
    <div class="mt-6">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-[#374151] mb-2">
        Compliance (Snapshot)
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="flex items-center gap-2 border border-[#e5e7eb] rounded-lg p-2">
          <span class="h-2.5 w-2.5 rounded-full" [ngClass]="c?.is_sars_registered ? 'bg-[#10b981]' : 'bg-[#ef4444]'"></span>
          <span class="text-sm text-[#111827]">SARS Registered</span>
        </div>
        <div class="flex items-center gap-2 border border-[#e5e7eb] rounded-lg p-2">
          <span class="h-2.5 w-2.5 rounded-full" [ngClass]="c?.has_tax_clearance ? 'bg-[#10b981]' : 'bg-[#ef4444]'"></span>
          <span class="text-sm text-[#111827]">Tax Clearance</span>
        </div>
        <div class="flex items-center gap-2 border border-[#e5e7eb] rounded-lg p-2">
          <span class="h-2.5 w-2.5 rounded-full" [ngClass]="c?.has_cipc_registration ? 'bg-[#10b981]' : 'bg-[#ef4444]'"></span>
          <span class="text-sm text-[#111827]">CIPC Registration</span>
        </div>
        <div class="flex items-center gap-2 border border-[#e5e7eb] rounded-lg p-2">
          <span class="h-2.5 w-2.5 rounded-full" [ngClass]="c?.has_valid_bbbbee ? 'bg-[#10b981]' : 'bg-[#ef4444]'"></span>
          <span class="text-sm text-[#111827]">Valid BBBEE</span>
        </div>
      </div>

      <!-- <div class="mt-2 text-sm text-[#111827] border border-[#e5e7eb] rounded-lg p-2 bg-[#f9fafb]">
        <span class="font-semibold">Notes:</span>
        <span class="ml-1">{{ c?.notes || '—' }}</span>
      </div> -->
    </div>

    <!-- Placeholder for later sections -->
    <div class="mt-6">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-[#374151] mb-1">Introduction to the Business</h2>
      <p class="text-sm text-[#6b7280]">Coming from Questionnaire — to be plugged in later.</p>
    </div>
  `,
})
export class CompanyReportSectionComponent {
  @Input() company: ICompany | null = null;
  get c() { return this.company; }
}
