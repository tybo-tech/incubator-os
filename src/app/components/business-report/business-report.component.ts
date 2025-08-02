import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface BusinessRecord {
  NameAndSurname: string;
  ContactDetails: string;
  CompanyName: string;
  ReasonForConsultingESDCentre: string;
  Sector: string;
  DateOfVisit: string;
  ActionOutcome: string;
  DirectorId: string;
  CompanyRegistrationNo: string;
  Gender: string;
  Race: string;
  DateOfBirth: string;
  EmailAddress: string;
  BBBEELevel: string;
  BBBEEExpiryDate: string;
  CompanyAnnualTurnover: string;
  ActualCompanyAnnualTurnover: string;
  CompanyAnnualTurnoverVerified: string;
  DescriptionOfBusiness: string;
  NoOfPermanentEmployees: string;
  NoOfTemporaryEmployees: string;
  AddressLine1: string;
  Suburb: string;
  TypesOfAddress: string;
  City: string;
  PostalCode: string;
}

interface ReportData {
  totalRecords: number;
  cityDistribution: { [key: string]: number };
  suburbDistribution: { [key: string]: number };
  addressTypeDistribution: { [key: string]: number };
  employeeStats: {
    withEmployeeData: number;
    averagePermanent: number;
    averageTemporary: number;
    totalPermanent: number;
    totalTemporary: number;
  };
  turnoverStats: {
    withTurnoverData: number;
    averageTurnover: number;
    turnoverRanges: { [key: string]: number };
  };
  bbbeeDistribution: { [key: string]: number };
  raceDistribution: { [key: string]: number };
  genderDistribution: { [key: string]: number };
  reasonsDistribution: { [key: string]: number };
  sectorDistribution: { [key: string]: number };
  monthlyTrends: { [key: string]: number };
}

@Component({
  selector: 'app-business-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">ESD Centre Business Report</h1>
              <p class="text-gray-600 mt-2">Comprehensive analysis of business consultations and registrations</p>
            </div>
            <div class="flex space-x-4">
              <button 
                (click)="exportToCSV('overview')"
                class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Export Overview CSV
              </button>
              <button 
                (click)="exportToCSV('detailed')"
                class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                Export Detailed CSV
              </button>
              <button 
                (click)="generatePDF()"
                class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
                <span>Export PDF Report</span>
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="isLoading" class="text-center py-8">
          <div class="text-lg text-gray-600">Loading data...</div>
        </div>

        <div *ngIf="!isLoading && reportData">
          
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-lg font-semibold text-gray-700">Total Records</h3>
              <p class="text-3xl font-bold text-blue-600">{{ reportData.totalRecords }}</p>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-lg font-semibold text-gray-700">Unique Cities</h3>
              <p class="text-3xl font-bold text-green-600">{{ getUniqueCount(reportData.cityDistribution) }}</p>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-lg font-semibold text-gray-700">Total Employees</h3>
              <p class="text-3xl font-bold text-purple-600">{{ reportData.employeeStats.totalPermanent + reportData.employeeStats.totalTemporary }}</p>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-lg font-semibold text-gray-700">Avg Turnover</h3>
              <p class="text-3xl font-bold text-orange-600">{{ formatCurrency(reportData.turnoverStats.averageTurnover) }}</p>
            </div>
          </div>

          <!-- Geographic Distribution -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">City Distribution</h2>
                <button (click)="exportToCSV('cities')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
              </div>
              <div class="overflow-y-auto max-h-64">
                <table class="min-w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr *ngFor="let item of getSortedEntries(reportData.cityDistribution)">
                      <td class="px-4 py-2 text-sm text-gray-900">{{ item.key || 'Not Specified' }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ item.value }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ getPercentage(item.value, reportData.totalRecords) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">Address Types</h2>
                <button (click)="exportToCSV('addressTypes')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
              </div>
              <div class="overflow-y-auto max-h-64">
                <table class="min-w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr *ngFor="let item of getSortedEntries(reportData.addressTypeDistribution)">
                      <td class="px-4 py-2 text-sm text-gray-900">{{ item.key || 'Not Specified' }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ item.value }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ getPercentage(item.value, reportData.totalRecords) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Demographics -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">Race Distribution</h2>
                <button (click)="exportToCSV('race')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
              </div>
              <div class="space-y-2">
                <div *ngFor="let item of getSortedEntries(reportData.raceDistribution)" 
                     class="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span class="text-sm font-medium">{{ item.key || 'Not Specified' }}</span>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">{{ item.value }}</span>
                    <span class="text-xs text-gray-500">({{ getPercentage(item.value, reportData.totalRecords) }}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">Gender Distribution</h2>
                <button (click)="exportToCSV('gender')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
              </div>
              <div class="space-y-2">
                <div *ngFor="let item of getSortedEntries(reportData.genderDistribution)" 
                     class="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span class="text-sm font-medium">{{ item.key || 'Not Specified' }}</span>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">{{ item.value }}</span>
                    <span class="text-xs text-gray-500">({{ getPercentage(item.value, reportData.totalRecords) }}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">BBBEE Levels</h2>
                <button (click)="exportToCSV('bbbee')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
              </div>
              <div class="space-y-2">
                <div *ngFor="let item of getSortedEntries(reportData.bbbeeDistribution)" 
                     class="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span class="text-sm font-medium">{{ item.key || 'Not Specified' }}</span>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">{{ item.value }}</span>
                    <span class="text-xs text-gray-500">({{ getPercentage(item.value, reportData.totalRecords) }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Business Analysis -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">Consultation Reasons</h2>
                <button (click)="exportToCSV('reasons')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
              </div>
              <div class="overflow-y-auto max-h-64">
                <table class="min-w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr *ngFor="let item of getSortedEntries(reportData.reasonsDistribution)">
                      <td class="px-4 py-2 text-sm text-gray-900">{{ item.key }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ item.value }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ getPercentage(item.value, reportData.totalRecords) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">Sector Distribution</h2>
                <button (click)="exportToCSV('sectors')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
              </div>
              <div class="overflow-y-auto max-h-64">
                <table class="min-w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sector</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr *ngFor="let item of getSortedEntries(reportData.sectorDistribution)">
                      <td class="px-4 py-2 text-sm text-gray-900">{{ item.key }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ item.value }}</td>
                      <td class="px-4 py-2 text-sm text-gray-600">{{ getPercentage(item.value, reportData.totalRecords) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Employee & Turnover Analysis -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4">Employee Statistics</h2>
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-blue-50 p-4 rounded">
                  <h3 class="font-semibold text-blue-900">Total Permanent</h3>
                  <p class="text-2xl font-bold text-blue-600">{{ reportData.employeeStats.totalPermanent }}</p>
                </div>
                <div class="bg-green-50 p-4 rounded">
                  <h3 class="font-semibold text-green-900">Total Temporary</h3>
                  <p class="text-2xl font-bold text-green-600">{{ reportData.employeeStats.totalTemporary }}</p>
                </div>
                <div class="bg-purple-50 p-4 rounded">
                  <h3 class="font-semibold text-purple-900">Avg Permanent</h3>
                  <p class="text-2xl font-bold text-purple-600">{{ reportData.employeeStats.averagePermanent.toFixed(1) }}</p>
                </div>
                <div class="bg-orange-50 p-4 rounded">
                  <h3 class="font-semibold text-orange-900">Companies with Data</h3>
                  <p class="text-2xl font-bold text-orange-600">{{ reportData.employeeStats.withEmployeeData }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-900">Turnover Ranges</h2>
                <button (click)="exportToCSV('turnover')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
              </div>
              <div class="space-y-2">
                <div *ngFor="let item of getSortedEntries(reportData.turnoverStats.turnoverRanges)" 
                     class="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span class="text-sm font-medium">{{ item.key }}</span>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">{{ item.value }}</span>
                    <span class="text-xs text-gray-500">({{ getPercentage(item.value, reportData.totalRecords) }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Monthly Trends -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-gray-900">Monthly Visit Trends</h2>
              <button (click)="exportToCSV('monthly')" class="text-blue-600 hover:text-blue-800">Export CSV</button>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Visits</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr *ngFor="let item of getSortedEntries(reportData.monthlyTrends)">
                    <td class="px-4 py-2 text-sm text-gray-900">{{ item.key }}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">{{ item.value }}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">{{ getPercentage(item.value, reportData.totalRecords) }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .overflow-y-auto {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e0 #f7fafc;
    }
    .overflow-y-auto::-webkit-scrollbar {
      width: 6px;
    }
    .overflow-y-auto::-webkit-scrollbar-track {
      background: #f7fafc;
    }
    .overflow-y-auto::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 3px;
    }
  `]
})
export class BusinessReportComponent implements OnInit {
  
  isLoading = true;
  reportData: ReportData | null = null;
  rawData: any[] = [];
  private pdfMake: any = null;

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    // Initialize pdfMake dynamically with try-catch for different import patterns
    try {
      const pdfMake = await import('pdfmake/build/pdfmake');
      const pdfFonts = await import('pdfmake/build/vfs_fonts');
      
      this.pdfMake = pdfMake.default || pdfMake;
      
      // Try different patterns for setting vfs
      if (pdfFonts && (pdfFonts as any).default) {
        if ((pdfFonts as any).default.pdfMake && (pdfFonts as any).default.pdfMake.vfs) {
          this.pdfMake.vfs = (pdfFonts as any).default.pdfMake.vfs;
        } else if ((pdfFonts as any).default.vfs) {
          this.pdfMake.vfs = (pdfFonts as any).default.vfs;
        }
      }
    } catch (error) {
      console.error('Error loading pdfMake:', error);
    }
    
    await this.loadData();
  }

  async loadData() {
    try {
      // Load the JSON data from public folder
      this.rawData = await firstValueFrom(
        this.http.get<BusinessRecord[]>('/tableConvert.com_f92q5m.json')
      );
      
      this.generateReport();
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading data:', error);
      this.isLoading = false;
    }
  }

  generateReport() {
    const data = this.rawData.map(x=>x.ItemValue);
    console.log(data);
    this.reportData = {
      totalRecords: data.length,
      cityDistribution: this.getDistribution(data, 'City'),
      suburbDistribution: this.getDistribution(data, 'Suburb'),
      addressTypeDistribution: this.getDistribution(data, 'TypesOfAddress'),
      employeeStats: this.calculateEmployeeStats(data),
      turnoverStats: this.calculateTurnoverStats(data),
      bbbeeDistribution: this.getDistribution(data, 'BBBEELevel'),
      raceDistribution: this.getDistribution(data, 'Race'),
      genderDistribution: this.getDistribution(data, 'Gender'),
      reasonsDistribution: this.categorizeReasons(data),
      sectorDistribution: this.getDistribution(data, 'Sector'),
      monthlyTrends: this.getMonthlyTrends(data)
    };
  }

  getDistribution(data: BusinessRecord[], field: keyof BusinessRecord): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    data.forEach(record => {
      const value = record[field]?.toString().trim() || '';
      let key = value || 'Not Specified';
      
      // Apply sector normalization if this is the Sector field
      if (field === 'Sector' && key !== 'Not Specified') {
        key = this.normalizeSectorName(key);
      }
      
      distribution[key] = (distribution[key] || 0) + 1;
    });
    
    return distribution;
  }

  normalizeSectorName(sector: string): string {
    // Convert to lowercase and remove special characters for comparison
    const normalized = sector.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace special chars with spaces
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .trim();
    
    // Define sector groupings based on keywords
    const sectorMappings: { [key: string]: string } = {
      // Engineering variations
      'engineering': 'Engineering Services',
      'engineering services': 'Engineering Services',
      'mechanical engineering': 'Engineering Services',
      'electrical engineering': 'Engineering Services',
      'civil engineering': 'Engineering Services',
      'engineering safety management': 'Engineering Services',
      
      // Construction variations
      'construction': 'Construction Services',
      'construction services': 'Construction Services',
      'civil construction': 'Construction Services',
      'building maintenance': 'Construction Services',
      'civil': 'Construction Services',
      
      // ICT variations
      'ict': 'ICT Services',
      'ict services': 'ICT Services',
      'tech': 'ICT Services',
      
      // Manufacturing variations
      'manufacturing': 'Manufacturing',
      'metal works': 'Manufacturing',
      'mining manufacturing': 'Manufacturing',
      
      // Transport and Logistics variations
      'transport and logistics': 'Transport & Logistics',
      'logistics': 'Transport & Logistics',
      'supply': 'Transport & Logistics',
      'supplier': 'Transport & Logistics',
      
      // Cleaning variations
      'cleaning': 'Cleaning Services',
      'cleaning services': 'Cleaning Services',
      'cleaning and gardening': 'Cleaning Services',
      'laundry services': 'Cleaning Services',
      
      // Food and Hospitality variations
      'catering and baking services': 'Food & Hospitality',
      'fast food kitchen': 'Food & Hospitality',
      'fast food and restaurant': 'Food & Hospitality',
      'accommodation': 'Food & Hospitality',
      
      // Design and Branding variations
      'graphic design and branding': 'Design & Marketing',
      'branding and graphic design': 'Design & Marketing',
      'branding': 'Design & Marketing',
      'marketing': 'Design & Marketing',
      'media production': 'Design & Marketing',
      
      // Training and Development variations
      'training and development': 'Training & Development',
      'skills development': 'Training & Development',
      'teaching and learning npo': 'Training & Development',
      'maintenance consultant and training': 'Training & Development',
      
      // NPO variations
      'npo': 'Non-Profit Organization',
      
      // Agriculture variations
      'agriculture': 'Agriculture',
      
      // Security variations
      'security': 'Security Services',
      
      // Development variations
      'development': 'Business Development',
      'sustainable development and investments': 'Business Development',
      
      // Other services
      'hair and beauty': 'Personal Services',
      'landscaping services': 'Landscaping Services',
      'water purification': 'Environmental Services',
      'recycling services': 'Environmental Services',
      'petrolium': 'Energy & Resources'
    };
    
    // Check for exact matches first
    if (sectorMappings[normalized]) {
      return sectorMappings[normalized];
    }
    
    // Check for partial matches using keywords
    for (const [key, value] of Object.entries(sectorMappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    // If no match found, return the original with proper formatting
    return sector.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  calculateEmployeeStats(data: BusinessRecord[]) {
    let totalPermanent = 0;
    let totalTemporary = 0;
    let recordsWithData = 0;
    
    data.forEach(record => {
      const permanent = parseInt(record.NoOfPermanentEmployees) || 0;
      const temporary = parseInt(record.NoOfTemporaryEmployees) || 0;
      
      if (permanent > 0 || temporary > 0) {
        recordsWithData++;
      }
      
      totalPermanent += permanent;
      totalTemporary += temporary;
    });
    
    return {
      withEmployeeData: recordsWithData,
      averagePermanent: recordsWithData > 0 ? totalPermanent / recordsWithData : 0,
      averageTemporary: recordsWithData > 0 ? totalTemporary / recordsWithData : 0,
      totalPermanent,
      totalTemporary
    };
  }

  calculateTurnoverStats(data: BusinessRecord[]) {
    const turnovers: number[] = [];
    const ranges: { [key: string]: number } = {
      'Under R100k': 0,
      'R100k - R500k': 0,
      'R500k - R1M': 0,
      'R1M - R5M': 0,
      'R5M+': 0,
      'Not Specified': 0
    };
    
    data.forEach(record => {
      const turnover = parseFloat(record.CompanyAnnualTurnover) || 0;
      
      if (turnover > 0) {
        turnovers.push(turnover);
        
        if (turnover < 100000) ranges['Under R100k']++;
        else if (turnover < 500000) ranges['R100k - R500k']++;
        else if (turnover < 1000000) ranges['R500k - R1M']++;
        else if (turnover < 5000000) ranges['R1M - R5M']++;
        else ranges['R5M+']++;
      } else {
        ranges['Not Specified']++;
      }
    });
    
    const averageTurnover = turnovers.length > 0 
      ? turnovers.reduce((a, b) => a + b, 0) / turnovers.length 
      : 0;
    
    return {
      withTurnoverData: turnovers.length,
      averageTurnover,
      turnoverRanges: ranges
    };
  }

  categorizeReasons(data: BusinessRecord[]): { [key: string]: number } {
    const categories: { [key: string]: number } = {
      'Funding': 0,
      'Supply Opportunities': 0,
      'Office Space': 0,
      'Business Development': 0,
      'Training & Skills': 0,
      'Equipment & Resources': 0,
      'Networking': 0,
      'Other': 0
    };
    
    data.forEach(record => {
      const reason = record.ReasonForConsultingESDCentre?.toLowerCase() || '';
      
      if (reason.includes('funding') || reason.includes('financial') || reason.includes('finance')) {
        categories['Funding']++;
      } else if (reason.includes('supply') || reason.includes('tender') || reason.includes('opportunity')) {
        categories['Supply Opportunities']++;
      } else if (reason.includes('space') || reason.includes('workshop') || reason.includes('office') || reason.includes('premises')) {
        categories['Office Space']++;
      } else if (reason.includes('development') || reason.includes('growth') || reason.includes('expand')) {
        categories['Business Development']++;
      } else if (reason.includes('training') || reason.includes('skill') || reason.includes('education') || reason.includes('course')) {
        categories['Training & Skills']++;
      } else if (reason.includes('equipment') || reason.includes('machinery') || reason.includes('tools') || reason.includes('resource')) {
        categories['Equipment & Resources']++;
      } else if (reason.includes('network') || reason.includes('connect') || reason.includes('partner') || reason.includes('collaboration')) {
        categories['Networking']++;
      } else {
        categories['Other']++;
      }
    });
    
    return categories;
  }

  getMonthlyTrends(data: BusinessRecord[]): { [key: string]: number } {
    const trends: { [key: string]: number } = {};
    
    data.forEach(record => {
        debugger
      if (record.DateOfVisit) {
        let date: Date | null = null;
        console.log(record.DateOfVisit);
        
        const raw = record.DateOfVisit.trim();
        // Try ISO format first (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          date = new Date(raw);
        }
        // Try DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
        else if (/^\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4}$/.test(raw)) {
          const parts = raw.split(/\/|\.|\-/);
          const [day, month, year] = parts;
          date = new Date(`${year}-${month}-${day}`);
        }
        // Try '25 February 2025', '25 Feb 2025', '25-February-2025', '25-Feb-2025'
        else if (/^\d{1,2}[\s\-]?[A-Za-z]{3,9}[\s\-]?\d{4}$/.test(raw.replace(/,/g, ''))) {
          console.log('Detected date format:', raw);
          // Normalize to '25 February 2025'
          const cleaned = raw.replace(/,/g, '').replace(/-/g, ' ');
          date = new Date(cleaned);
        }
        // Try 'Feb 25, 2025' or 'February 25, 2025'
        else if (/^[A-Za-z]{3,9} \d{1,2},? \d{4}$/.test(raw)) {
          date = new Date(raw.replace(',', ''));
        }
        // Fallback: try Date constructor
        else {
          date = new Date(raw);
        }
        if (date && !isNaN(date.getTime())) {
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          trends[monthYear] = (trends[monthYear] || 0) + 1;
        }
      }
    });
    
    return trends;
  }

  getSortedEntries(distribution: { [key: string]: number }): { key: string; value: number }[] {
    return Object.entries(distribution)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  getUniqueCount(distribution: { [key: string]: number }): number {
    return Object.keys(distribution).filter(key => key !== 'Not Specified').length;
  }

  getPercentage(value: number, total: number): string {
    return ((value / total) * 100).toFixed(1);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  exportToCSV(reportType: string) {
    if (!this.reportData) return;
    
    let csvContent = '';
    let filename = '';
    
    switch (reportType) {
      case 'overview':
        csvContent = this.generateOverviewCSV();
        filename = 'esd-overview-report.csv';
        break;
      case 'detailed':
        csvContent = this.generateDetailedCSV();
        filename = 'esd-detailed-report.csv';
        break;
      case 'cities':
        csvContent = this.generateDistributionCSV(this.reportData.cityDistribution, 'City');
        filename = 'esd-cities-report.csv';
        break;
      case 'addressTypes':
        csvContent = this.generateDistributionCSV(this.reportData.addressTypeDistribution, 'Address Type');
        filename = 'esd-address-types-report.csv';
        break;
      case 'race':
        csvContent = this.generateDistributionCSV(this.reportData.raceDistribution, 'Race');
        filename = 'esd-race-report.csv';
        break;
      case 'gender':
        csvContent = this.generateDistributionCSV(this.reportData.genderDistribution, 'Gender');
        filename = 'esd-gender-report.csv';
        break;
      case 'bbbee':
        csvContent = this.generateDistributionCSV(this.reportData.bbbeeDistribution, 'BBBEE Level');
        filename = 'esd-bbbee-report.csv';
        break;
      case 'reasons':
        csvContent = this.generateDistributionCSV(this.reportData.reasonsDistribution, 'Consultation Reason');
        filename = 'esd-reasons-report.csv';
        break;
      case 'sectors':
        csvContent = this.generateDistributionCSV(this.reportData.sectorDistribution, 'Sector');
        filename = 'esd-sectors-report.csv';
        break;
      case 'turnover':
        csvContent = this.generateDistributionCSV(this.reportData.turnoverStats.turnoverRanges, 'Turnover Range');
        filename = 'esd-turnover-report.csv';
        break;
      case 'monthly':
        csvContent = this.generateDistributionCSV(this.reportData.monthlyTrends, 'Month');
        filename = 'esd-monthly-trends-report.csv';
        break;
    }
    
    this.downloadCSV(csvContent, filename);
  }

  generateOverviewCSV(): string {
    if (!this.reportData) return '';
    
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Records', this.reportData.totalRecords.toString()],
      ['Unique Cities', this.getUniqueCount(this.reportData.cityDistribution).toString()],
      ['Total Permanent Employees', this.reportData.employeeStats.totalPermanent.toString()],
      ['Total Temporary Employees', this.reportData.employeeStats.totalTemporary.toString()],
      ['Average Turnover', this.reportData.turnoverStats.averageTurnover.toString()],
      ['Companies with Employee Data', this.reportData.employeeStats.withEmployeeData.toString()],
      ['Companies with Turnover Data', this.reportData.turnoverStats.withTurnoverData.toString()]
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\\n');
  }

  generateDetailedCSV(): string {
    const headers = [
      'Name', 'Contact', 'Company', 'Reason', 'Sector', 'Date', 'Gender', 'Race',
      'BBBEE Level', 'Turnover', 'Permanent Employees', 'Temporary Employees',
      'City', 'Suburb', 'Address Type', 'Email'
    ];
    
    const rows = this.rawData.map(record => [
      record.NameAndSurname || '',
      record.ContactDetails || '',
      record.CompanyName || '',
      record.ReasonForConsultingESDCentre || '',
      record.Sector || '',
      record.DateOfVisit || '',
      record.Gender || '',
      record.Race || '',
      record.BBBEELevel || '',
      record.CompanyAnnualTurnover || '',
      record.NoOfPermanentEmployees || '0',
      record.NoOfTemporaryEmployees || '0',
      record.City || '',
      record.Suburb || '',
      record.TypesOfAddress || '',
      record.EmailAddress || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\\n');
  }

  generateDistributionCSV(distribution: { [key: string]: number }, labelName: string): string {
    const headers = [labelName, 'Count', 'Percentage'];
    const rows = this.getSortedEntries(distribution).map(item => [
      item.key,
      item.value.toString(),
      this.getPercentage(item.value, this.reportData!.totalRecords)
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\\n');
  }

  downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  generatePDF(action: string = 'download') {
    if (!this.reportData || !this.pdfMake) return;
    
    const documentDefinition = this.getDocumentDefinition();
    
    switch (action) {
      case 'open': 
        this.pdfMake.createPdf(documentDefinition).open(); 
        break;
      case 'print': 
        this.pdfMake.createPdf(documentDefinition).print(); 
        break;
      case 'download': 
        this.pdfMake.createPdf(documentDefinition).download('ESD-Business-Report.pdf'); 
        break;
      default: 
        this.pdfMake.createPdf(documentDefinition).download('ESD-Business-Report.pdf'); 
        break;
    }
  }

  getDocumentDefinition(): any {
    const currentDate = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60] as [number, number, number, number],
      content: [
        // Header
        {
          text: 'ESD Centre Business Report',
          style: 'title',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        {
          text: `Generated on ${currentDate}`,
          style: 'subtitle',
          alignment: 'center',
          margin: [0, 0, 0, 30]
        },

        // Executive Summary
        {
          text: 'Executive Summary',
          style: 'header',
          pageBreakBefore: false
        },
        {
          columns: [
            {
              width: '25%',
              stack: [
                { text: 'Total Records', style: 'label' },
                { text: this.reportData!.totalRecords.toString(), style: 'value' }
              ]
            },
            {
              width: '25%',
              stack: [
                { text: 'Unique Cities', style: 'label' },
                { text: this.getUniqueCount(this.reportData!.cityDistribution).toString(), style: 'value' }
              ]
            },
            {
              width: '25%',
              stack: [
                { text: 'Total Employees', style: 'label' },
                { text: (this.reportData!.employeeStats.totalPermanent + this.reportData!.employeeStats.totalTemporary).toString(), style: 'value' }
              ]
            },
            {
              width: '25%',
              stack: [
                { text: 'Avg Turnover', style: 'label' },
                { text: this.formatCurrency(this.reportData!.turnoverStats.averageTurnover), style: 'value' }
              ]
            }
          ],
          margin: [0, 0, 0, 20]
        },

        // Geographic Distribution
        {
          text: 'Geographic Distribution',
          style: 'header',
          pageBreak: 'before'
        },
        {
          text: 'Top Cities',
          style: 'subheader'
        },
        this.createDistributionTable(this.reportData!.cityDistribution, ['City', 'Count', 'Percentage']),
        
        {
          text: 'Address Types',
          style: 'subheader',
          margin: [0, 20, 0, 10]
        },
        this.createDistributionTable(this.reportData!.addressTypeDistribution, ['Type', 'Count', 'Percentage']),

        // Demographics
        {
          text: 'Demographics Analysis',
          style: 'header',
          pageBreak: 'before'
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Race Distribution', style: 'subheader' },
                this.createDistributionTable(this.reportData!.raceDistribution, ['Race', 'Count', '%'], 5)
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'Gender Distribution', style: 'subheader' },
                this.createDistributionTable(this.reportData!.genderDistribution, ['Gender', 'Count', '%'], 5)
              ]
            }
          ]
        },

        // BBBEE Analysis
        {
          text: 'BBBEE Level Distribution',
          style: 'subheader',
          margin: [0, 20, 0, 10]
        },
        this.createDistributionTable(this.reportData!.bbbeeDistribution, ['BBBEE Level', 'Count', 'Percentage']),

        // Business Analysis
        {
          text: 'Business Analysis',
          style: 'header',
          pageBreak: 'before'
        },
        {
          text: 'Consultation Reasons',
          style: 'subheader'
        },
        this.createDistributionTable(this.reportData!.reasonsDistribution, ['Reason', 'Count', 'Percentage']),

        {
          text: 'Sector Distribution',
          style: 'subheader',
          margin: [0, 20, 0, 10]
        },
        this.createDistributionTable(this.reportData!.sectorDistribution, ['Sector', 'Count', 'Percentage']),

        // Financial Analysis
        {
          text: 'Financial Analysis',
          style: 'header',
          pageBreak: 'before'
        },
        {
          text: 'Company Turnover Ranges',
          style: 'subheader'
        },
        this.createDistributionTable(this.reportData!.turnoverStats.turnoverRanges, ['Turnover Range', 'Count', 'Percentage']),

        // Employee Statistics
        {
          text: 'Employee Statistics',
          style: 'subheader',
          margin: [0, 20, 0, 10]
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
              [{ text: 'Metric', style: 'tableHeader' }, { text: 'Value', style: 'tableHeader' }],
              ['Total Permanent Employees', this.reportData!.employeeStats.totalPermanent.toString()],
              ['Total Temporary Employees', this.reportData!.employeeStats.totalTemporary.toString()],
              ['Average Permanent per Company', this.reportData!.employeeStats.averagePermanent.toFixed(1)],
              ['Companies with Employee Data', this.reportData!.employeeStats.withEmployeeData.toString()]
            ]
          },
          layout: 'lightHorizontalLines'
        },

        // Monthly Trends
        {
          text: 'Monthly Visit Trends',
          style: 'header',
          pageBreak: 'before'
        },
        this.createDistributionTable(this.reportData!.monthlyTrends, ['Month', 'Visits', 'Percentage'], 12)
      ],
      
      styles: {
        title: {
          fontSize: 24,
          bold: true,
          color: '#2563eb'
        },
        subtitle: {
          fontSize: 12,
          italics: true,
          color: '#6b7280'
        },
        header: {
          fontSize: 18,
          bold: true,
          color: '#1f2937',
          margin: [0, 20, 0, 10]
        },
        subheader: {
          fontSize: 14,
          bold: true,
          color: '#374151',
          margin: [0, 15, 0, 8]
        },
        tableHeader: {
          bold: true,
          fillColor: '#f3f4f6',
          color: '#1f2937'
        },
        label: {
          fontSize: 10,
          color: '#6b7280',
          margin: [0, 0, 0, 2]
        },
        value: {
          fontSize: 16,
          bold: true,
          color: '#2563eb'
        }
      },

      info: {
        title: 'ESD Centre Business Report',
        author: 'ESD Centre',
        subject: 'Business Consultation Analysis',
        keywords: 'business, consultation, analysis, report'
      }
    };
  }

  createDistributionTable(distribution: { [key: string]: number }, headers: string[], maxRows?: number): any {
    const sortedEntries = this.getSortedEntries(distribution);
    const dataRows = (maxRows ? sortedEntries.slice(0, maxRows) : sortedEntries).map(item => [
      item.key || 'Not Specified',
      item.value.toString(),
      this.getPercentage(item.value, this.reportData!.totalRecords) + '%'
    ]);

    return {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto'],
        body: [
          headers.map(header => ({ text: header, style: 'tableHeader' })),
          ...dataRows
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 15]
    };
  }
}
