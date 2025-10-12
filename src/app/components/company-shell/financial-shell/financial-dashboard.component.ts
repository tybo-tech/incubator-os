import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialDomainRegistry, FinancialDomainDefinition } from '../../../../services/financial-domain-registry.service';
import { FinancialCalculationService, FinancialMetrics } from '../../../../services/financial-calculation.service';

/**
 * 🏦 Financial Dashboard Component
 * 
 * Enterprise financial cockpit that provides a unified view of all financial domains.
 * This is the "CFO Assistant" - a comprehensive financial analysis center.
 * 
 * Features:
 * - Dynamic loading of registered financial domain components
 * - Real-time financial metrics aggregation
 * - Cross-domain trend analysis
 * - Executive summary view
 * - Configurable domain layout
 * - Multi-company and multi-period support
 * 
 * Architecture:
 * Financial Dashboard → Domain Registry → Individual Domain Components
 * 
 * This follows the same pattern as SAP Fiori Launchpad and Odoo's dashboard system.
 */
@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="financial-dashboard p-6 bg-gray-50 min-h-screen">
      <!-- Dashboard Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 flex items-center">
              <i class="fas fa-tachometer-alt text-blue-600 mr-3"></i>
              Financial Dashboard
            </h1>
            <p class="text-gray-600 mt-1">
              {{ subtitle || 'Comprehensive financial analysis and reporting center' }}
            </p>
          </div>
          
          <!-- Dashboard Controls -->
          <div class="flex items-center space-x-4">
            <select [(ngModel)]="selectedYear" (change)="onYearChanged()" 
                    class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
            </select>
            
            <select [(ngModel)]="selectedCurrency" (change)="onCurrencyChanged()"
                    class="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="ZAR">ZAR (R)</option>
            </select>
            
            <button (click)="refreshAllDomains()" 
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <i class="fas fa-sync-alt mr-2"></i>Refresh
            </button>
          </div>
        </div>

        <!-- Executive Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">Total Revenue</p>
                <p class="text-2xl font-bold text-gray-900">{{ executiveSummary().formattedRevenue }}</p>
                <p class="text-sm" [class]="getGrowthColor(executiveSummary().revenueGrowth)">
                  {{ formatGrowth(executiveSummary().revenueGrowth) }} vs last year
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i class="fas fa-dollar-sign text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">Operating Profit</p>
                <p class="text-2xl font-bold text-gray-900">{{ executiveSummary().formattedProfit }}</p>
                <p class="text-sm" [class]="getGrowthColor(executiveSummary().profitGrowth)">
                  {{ formatGrowth(executiveSummary().profitGrowth) }} vs last year
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i class="fas fa-chart-line text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">Profit Margin</p>
                <p class="text-2xl font-bold text-gray-900">{{ executiveSummary().formattedMargin }}</p>
                <p class="text-sm" [class]="getMarginHealthColor(executiveSummary().marginChange)">
                  {{ formatMarginChange(executiveSummary().marginChange) }} vs last year
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i class="fas fa-percentage text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">Financial Health</p>
                <p class="text-lg font-semibold" [class]="executiveSummary().healthColor">
                  {{ executiveSummary().healthStatus | titlecase }}
                </p>
                <p class="text-sm text-gray-600">{{ executiveSummary().healthMessage }}</p>
              </div>
              <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <i class="fas fa-heartbeat text-indigo-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Domain Navigation -->
      <div class="mb-6">
        <div class="flex items-center space-x-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button *ngFor="let category of domainCategories; let i = index"
                  (click)="selectedCategory = category"
                  [class]="selectedCategory === category ? 
                    'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'"
                  class="px-4 py-2 rounded-md text-sm font-medium transition-colors">
            {{ getCategoryDisplayName(category) }}
          </button>
        </div>
      </div>

      <!-- Financial Domain Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div *ngFor="let domain of getDomainsForCategory(selectedCategory)" 
             class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          
          <!-- Domain Header -->
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i [class]="domain.icon + ' text-blue-600 text-lg mr-3'"></i>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ domain.displayName }}</h3>
                  <p class="text-sm text-gray-600">{{ domain.description }}</p>
                </div>
              </div>
              <button (click)="expandDomain(domain.name)"
                      class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors">
                <i class="fas fa-expand-alt mr-1"></i>Expand
              </button>
            </div>
          </div>

          <!-- Domain Preview Content -->
          <div class="p-6">
            <!-- This is where domain-specific preview content would go -->
            <!-- Each domain component could provide a "preview mode" -->
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Status:</span>
                <span class="px-2 py-1 text-xs rounded-full" 
                      [class]="domain.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'">
                  {{ domain.isEnabled ? 'Active' : 'Inactive' }}
                </span>
              </div>
              
              <!-- Placeholder for domain-specific metrics -->
              <div class="text-center py-8 text-gray-500">
                <i [class]="domain.icon + ' text-4xl mb-2'"></i>
                <p class="text-sm">{{ domain.displayName }} Preview</p>
                <p class="text-xs">Click Expand for full analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button class="flex items-center justify-center px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <i class="fas fa-file-pdf text-red-600 mr-2"></i>
            <span class="text-sm font-medium">Export PDF</span>
          </button>
          
          <button class="flex items-center justify-center px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <i class="fas fa-file-excel text-green-600 mr-2"></i>
            <span class="text-sm font-medium">Export Excel</span>
          </button>
          
          <button class="flex items-center justify-center px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <i class="fas fa-calendar-alt text-blue-600 mr-2"></i>
            <span class="text-sm font-medium">Schedule Report</span>
          </button>
          
          <button class="flex items-center justify-center px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <i class="fas fa-cog text-gray-600 mr-2"></i>
            <span class="text-sm font-medium">Settings</span>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center text-sm text-gray-500">
        <p>Inkubeta Financial SDK v1.0 | Last updated: {{ getCurrentDate() }}</p>
      </div>
    </div>
  `
})
export class FinancialDashboardComponent implements OnInit {
  @Input() companyId!: number;
  @Input() subtitle = '';

  // Dashboard state
  selectedYear = new Date().getFullYear();
  selectedCurrency = 'USD';
  selectedCategory = 'financial_statements';

  // Available options
  availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  domainCategories = ['financial_statements', 'cost_analysis', 'revenue_analysis', 'performance_metrics'];

  // Dashboard data
  registeredDomains = computed(() => this.domainRegistry.getAllDomains());

  constructor(
    private domainRegistry: FinancialDomainRegistry,
    private calculationService: FinancialCalculationService
  ) {}

  ngOnInit() {
    this.initializeDashboard();
  }

  /**
   * 🏗️ Initialize dashboard with registered domains
   */
  initializeDashboard() {
    // Initialize core financial domains if not already registered
    this.domainRegistry.initializeCoreDomains();
    
    console.log('🏦 Financial Dashboard initialized');
    console.log('📊 Available domains:', this.domainRegistry.list());
  }

  /**
   * 📊 Executive summary calculations
   */
  executiveSummary = computed(() => {
    // This would aggregate data from all active domains
    // For now, return mock data structure
    return {
      formattedRevenue: this.calculationService.formatCurrency(500000, this.selectedCurrency),
      formattedProfit: this.calculationService.formatCurrency(75000, this.selectedCurrency),
      formattedMargin: '15.0%',
      revenueGrowth: 12.5,
      profitGrowth: 18.2,
      marginChange: 2.1,
      healthStatus: 'good' as const,
      healthMessage: 'Strong financial performance',
      healthColor: 'text-green-600'
    };
  });

  /**
   * 🎯 Get domains for selected category
   */
  getDomainsForCategory(category: string): FinancialDomainDefinition[] {
    return this.domainRegistry.getDomainsByCategory(category as any);
  }

  /**
   * 🏷️ Get display name for category
   */
  getCategoryDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      'financial_statements': 'Financial Statements',
      'cost_analysis': 'Cost Analysis',
      'revenue_analysis': 'Revenue Analysis',
      'performance_metrics': 'Performance Metrics'
    };
    return categoryNames[category] || category;
  }

  /**
   * 📈 Format growth percentage
   */
  formatGrowth(growth: number): string {
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  }

  /**
   * 🎨 Get color class for growth indicators
   */
  getGrowthColor(growth: number): string {
    return growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600';
  }

  /**
   * 📊 Format margin change
   */
  formatMarginChange(change: number): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}pp`;
  }

  /**
   * 🎨 Get color for margin health
   */
  getMarginHealthColor(change: number): string {
    return change > 0 ? 'text-green-600' : change < -2 ? 'text-red-600' : 'text-gray-600';
  }

  /**
   * 📅 Get current date for footer
   */
  getCurrentDate(): string {
    return new Date().toLocaleDateString();
  }

  /**
   * 🔄 Event handlers
   */
  onYearChanged() {
    console.log('Year changed to:', this.selectedYear);
    // Trigger refresh of all domain data
  }

  onCurrencyChanged() {
    console.log('Currency changed to:', this.selectedCurrency);
    // Update all currency displays
  }

  refreshAllDomains() {
    console.log('Refreshing all financial domains...');
    // Trigger refresh of all registered domains
  }

  expandDomain(domainName: string) {
    console.log('Expanding domain:', domainName);
    // Navigate to full domain view or open modal
    // Example: this.router.navigate(['/financial', domainName]);
  }
}