import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ICompany } from '../../../../models/simple.schema';

@Component({
  selector: 'app-rich-company-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-6">
      <div class="flex items-center justify-between">
        <!-- Left Section: Company Info -->
        <div class="flex items-center space-x-4 flex-1">
          <!-- Company Avatar/Icon -->
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            {{ company.name.charAt(0) }}
          </div>

          <!-- Company Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-3 mb-1">
              <h3 class="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                  (click)="onCardClick()">
                {{ company.name }}
              </h3>
              @if (company.sector_name) {
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ company.sector_name }}
                </span>
              }
              @if (company.bbbee_level) {
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {{ company.bbbee_level }}
                </span>
              }
            </div>

            <div class="flex items-center space-x-6 text-sm text-gray-600">
              <!-- Registration -->
              @if (company.registration_no) {
                <div class="flex items-center space-x-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span>{{ company.registration_no }}</span>
                </div>
              }

              <!-- Location -->
              @if (company.business_location || company.city) {
                <div class="flex items-center space-x-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span>{{ company.business_location || company.city }}</span>
                </div>
              }

              <!-- Contact Person -->
              @if (company.contact_person) {
                <div class="flex items-center space-x-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <span>{{ company.contact_person }}</span>
                </div>
              }

              <!-- Service -->
              @if (company.description) {
                <div class="flex items-center space-x-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6"></path>
                  </svg>
                  <span class="truncate max-w-32">{{ company.description }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Center Section: Financial & Demographics -->
        <div class="flex items-center space-x-8">
          <!-- Turnover -->
          @if (company.turnover_estimated) {
            <div class="text-center">
              <div class="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
                <span>Turnover</span>
              </div>
              <div class="text-lg font-semibold text-gray-900">
                {{ company.turnover_estimated | currency:'ZAR':'symbol':'1.0-0' }}
              </div>
            </div>
          }

          <!-- Demographics -->
          @if (company.black_ownership || company.black_women_ownership || company.youth_owned) {
            <div class="flex flex-col items-center">
              <!-- <div class="text-xs text-gray-600 mb-2">Demographics</div> -->
              <div class="flex space-x-1">
                @if (company.black_ownership) {
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        title="Black Owned">
                    B
                  </span>
                }
                @if (company.black_women_ownership) {
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
                        title="Women Owned">
                    W
                  </span>
                }
                @if (company.youth_owned) {
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                        title="Youth Owned">
                    Y
                  </span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Right Section: Status & Actions -->
        <div class="flex items-center space-x-6">
          <!-- Compliance Status -->
          <div class="flex flex-col items-center">
            <div class="text-xs text-gray-600 mb-2">Compliance</div>
            <div class="flex space-x-1">
              <div class="w-3 h-3 rounded-full"
                   [class]="company.has_cipc_registration ? 'bg-green-400' : 'bg-red-400'"
                   title="CIPC Registration">
              </div>
              <div class="w-3 h-3 rounded-full"
                   [class]="company.has_tax_clearance ? 'bg-green-400' : 'bg-red-400'"
                   title="Tax Clearance">
              </div>
              <div class="w-3 h-3 rounded-full"
                   [class]="company.has_valid_bbbbee ? 'bg-green-400' : 'bg-red-400'"
                   title="BBBEE Certificate">
              </div>
            </div>
          </div>

          <!-- Performance Score -->
          <div class="text-center">
            <div class="w-12 h-12 rounded-full border-4 flex items-center justify-center text-sm font-bold"
                 [class]="getScoreClasses(getComplianceScore())">
              {{ getComplianceScore() }}
            </div>
            <div class="text-xs text-gray-600 mt-1">Score</div>
          </div>

          <!-- Stage/Status -->
          <div class="text-center min-w-20">
            <div class="text-xs text-gray-600 mb-1">Stage</div>
            <div class="px-3 py-1 rounded-full text-xs font-medium"
                 [class]="getStatusClasses(company.cipc_status)">
              {{ getStatusText(company.cipc_status) }}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2">
            <button (click)="onViewClick(company); $event.stopPropagation()"
                    class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View Details">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>

            @if (showEditAction) {
              <button (click)="onEditClick(company); $event.stopPropagation()"
                      class="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit Company">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
            }

            @if (showRemoveAction) {
              <button (click)="onRemoveClick(company); $event.stopPropagation()"
                      class="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove from Cohort">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            }

            @if (!showEditAction && !showRemoveAction) {
              <button (click)="onMoreClick(company); $event.stopPropagation()"
                      class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="More Options">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                </svg>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class RichCompanyCardComponent {
  @Input() company!: ICompany;
  @Input() showEditAction = false;
  @Input() showRemoveAction = false;

  @Output() cardClick = new EventEmitter<ICompany>();
  @Output() viewClick = new EventEmitter<ICompany>();
  @Output() editClick = new EventEmitter<ICompany>();
  @Output() removeClick = new EventEmitter<ICompany>();
  @Output() moreClick = new EventEmitter<ICompany>();

  onCardClick(): void {
    this.cardClick.emit(this.company);
  }

  onViewClick(company: ICompany): void {
    this.viewClick.emit(company);
  }

  onEditClick(company: ICompany): void {
    this.editClick.emit(company);
  }

  onRemoveClick(company: ICompany): void {
    this.removeClick.emit(company);
  }

  onMoreClick(company: ICompany): void {
    this.moreClick.emit(company);
  }

  getComplianceScore(): number {
    const checks = [
      this.company.has_cipc_registration,
      this.company.has_tax_clearance,
      this.company.has_valid_bbbbee
    ];
    const passedChecks = checks.filter(check => check).length;
    return Math.round((passedChecks / checks.length) * 100);
  }

  getScoreClasses(score: number): string {
    if (score >= 80) {
      return 'border-green-400 text-green-600 bg-green-50';
    } else if (score >= 60) {
      return 'border-yellow-400 text-yellow-600 bg-yellow-50';
    } else {
      return 'border-red-400 text-red-600 bg-red-50';
    }
  }

  getStatusClasses(status: string | null): string {
    switch (status?.toLowerCase()) {
      case 'in business':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'deregistered':
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string | null): string {
    switch (status?.toLowerCase()) {
      case 'in business':
        return 'Active';
      case 'deregistered':
        return 'Inactive';
      default:
        return status || 'Unknown';
    }
  }
}
