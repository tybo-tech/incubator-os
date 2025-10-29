import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface MarketingCampaign {
  id: number;
  campaignName: string;
  channel: 'Social Media' | 'Google Ads' | 'Email' | 'Content Marketing' | 'Traditional' | 'Referral';
  budget: number;
  leads: number;
  conversions: number;
  conversionRate: number;
  status: 'Planned' | 'Active' | 'Completed' | 'Paused';
  dueDate: string;
  notes?: string;
}

@Component({
  selector: 'app-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <!-- Header Section -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-bullhorn text-orange-600 mr-3"></i>
            Marketing Strategies
          </h2>
          <p class="text-gray-600 mt-1">
            Plan and track your marketing campaigns and lead generation efforts
          </p>
        </div>
        <div class="text-right">
          <div class="text-sm text-gray-500">Total Monthly Budget</div>
          <div class="text-2xl font-bold text-orange-600">
            R {{ getTotalBudget() | number:'1.0-0' }}
          </div>
        </div>
      </div>

      <!-- Add New Button -->
      <div class="mb-6">
        <button
          class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          (click)="onAddNew()"
        >
          <i class="fas fa-plus mr-2"></i>
          Add New Campaign
        </button>
      </div>

      <!-- Campaigns Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-rocket mr-2"></i>Campaign
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-broadcast-tower mr-2"></i>Channel
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-dollar-sign mr-2"></i>Budget
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-users mr-2"></i>Leads
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-handshake mr-2"></i>Conversions
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-percentage mr-2"></i>Rate
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-traffic-light mr-2"></i>Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-calendar mr-2"></i>Due Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-sticky-note mr-2"></i>Notes
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-cog mr-2"></i>Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              *ngFor="let campaign of campaigns; trackBy: trackByFn"
              class="hover:bg-gray-50 transition-colors"
              [class.border-l-4]="campaign.id === editingId"
              [class.border-orange-500]="campaign.id === editingId">

              <!-- Campaign Name -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  [(ngModel)]="campaign.campaignName"
                  (ngModelChange)="onCampaignChange(campaign)"
                  (focus)="setEditing(campaign.id)"
                  placeholder="Enter campaign name"
                />
              </td>

              <!-- Channel -->
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  [(ngModel)]="campaign.channel"
                  (ngModelChange)="onCampaignChange(campaign)"
                  (focus)="setEditing(campaign.id)"
                >
                  <option value="Social Media">Social Media</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Email">Email</option>
                  <option value="Content Marketing">Content Marketing</option>
                  <option value="Traditional">Traditional</option>
                  <option value="Referral">Referral</option>
                </select>
              </td>

              <!-- Budget -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">R</span>
                  <input
                    type="number"
                    class="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    [(ngModel)]="campaign.budget"
                    (ngModelChange)="onCampaignChange(campaign)"
                    (focus)="setEditing(campaign.id)"
                    min="0"
                    step="100"
                    placeholder="0"
                  />
                </div>
              </td>

              <!-- Leads -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <input
                  type="number"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  [(ngModel)]="campaign.leads"
                  (ngModelChange)="onCampaignChange(campaign)"
                  (focus)="setEditing(campaign.id)"
                  min="0"
                  placeholder="0"
                />
              </td>

              <!-- Conversions -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <input
                  type="number"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  [(ngModel)]="campaign.conversions"
                  (ngModelChange)="onCampaignChange(campaign)"
                  (focus)="setEditing(campaign.id)"
                  min="0"
                  placeholder="0"
                />
              </td>

              <!-- Conversion Rate (calculated) -->
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="text-sm font-semibold" [class]="getConversionRateClass(campaign.conversionRate)">
                  {{ campaign.conversionRate | number:'1.1-1' }}%
                </div>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  [(ngModel)]="campaign.status"
                  (focus)="setEditing(campaign.id)"
                >
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Paused">Paused</option>
                </select>
              </td>

              <!-- Due Date -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="date"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  [(ngModel)]="campaign.dueDate"
                  (focus)="setEditing(campaign.id)"
                />
              </td>

              <!-- Notes -->
              <td class="px-6 py-4">
                <textarea
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  [(ngModel)]="campaign.notes"
                  (focus)="setEditing(campaign.id)"
                  placeholder="Add notes..."
                  rows="2"
                ></textarea>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center space-x-2">
                  <button
                    class="inline-flex items-center px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm"
                    (click)="onDelete(campaign)"
                    title="Delete campaign"
                  >
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="campaigns.length === 0" class="text-center py-12">
        <i class="fas fa-bullhorn text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No marketing campaigns yet</h3>
        <p class="text-gray-500 mb-4">Start planning your marketing strategy by adding your first campaign</p>
        <button
          class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          (click)="onAddNew()"
        >
          <i class="fas fa-plus mr-2"></i>
          Add Your First Campaign
        </button>
      </div>

      <!-- Summary Stats -->
      <div *ngIf="campaigns.length > 0" class="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Marketing Performance</h3>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{{ campaigns.length }}</div>
            <div class="text-sm text-gray-500">Total Campaigns</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ getActiveCampaigns() }}</div>
            <div class="text-sm text-gray-500">Active</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{{ getTotalLeads() }}</div>
            <div class="text-sm text-gray-500">Total Leads</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ getTotalConversions() }}</div>
            <div class="text-sm text-gray-500">Conversions</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">{{ getOverallConversionRate() | number:'1.1-1' }}%</div>
            <div class="text-sm text-gray-500">Conversion Rate</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Custom scrollbar for table */
    .overflow-x-auto::-webkit-scrollbar {
      height: 8px;
    }

    .overflow-x-auto::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `]
})
export class MarketingComponent implements OnInit {
  campaigns: MarketingCampaign[] = [];
  editingId: number | null = null;
  private nextId = 1;

  ngOnInit(): void {
    this.loadMockData();
  }

  loadMockData(): void {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    this.campaigns = [
      {
        id: this.nextId++,
        campaignName: 'Social Media Brand Awareness',
        channel: 'Social Media',
        budget: 5000,
        leads: 120,
        conversions: 15,
        conversionRate: 0,
        status: 'Active',
        dueDate: futureDate.toISOString().split('T')[0],
        notes: 'Focus on Instagram and Facebook with engaging visual content'
      },
      {
        id: this.nextId++,
        campaignName: 'Google Ads - Service Keywords',
        channel: 'Google Ads',
        budget: 8000,
        leads: 85,
        conversions: 22,
        conversionRate: 0,
        status: 'Active',
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Targeting high-intent keywords for our main services'
      },
      {
        id: this.nextId++,
        campaignName: 'Email Newsletter Campaign',
        channel: 'Email',
        budget: 1200,
        leads: 200,
        conversions: 35,
        conversionRate: 0,
        status: 'Active',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Weekly newsletter with industry insights and service updates'
      },
      {
        id: this.nextId++,
        campaignName: 'Content Marketing Blog Series',
        channel: 'Content Marketing',
        budget: 3000,
        leads: 50,
        conversions: 8,
        conversionRate: 0,
        status: 'Planned',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Educational blog series about industry best practices'
      },
      {
        id: this.nextId++,
        campaignName: 'Referral Program Launch',
        channel: 'Referral',
        budget: 2500,
        leads: 30,
        conversions: 12,
        conversionRate: 0,
        status: 'Completed',
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Incentivized referral program for existing customers'
      }
    ];

    // Calculate initial conversion rates for all campaigns
    this.campaigns.forEach(campaign => this.updateConversionRate(campaign));
  }

  onCampaignChange(campaign: MarketingCampaign): void {
    this.updateConversionRate(campaign);
  }

  updateConversionRate(campaign: MarketingCampaign): void {
    if (campaign.leads > 0) {
      campaign.conversionRate = (campaign.conversions / campaign.leads) * 100;
    } else {
      campaign.conversionRate = 0;
    }
  }

  setEditing(id: number): void {
    this.editingId = id;
  }

  onAddNew(): void {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    const newCampaign: MarketingCampaign = {
      id: this.nextId++,
      campaignName: '',
      channel: 'Social Media',
      budget: 0,
      leads: 0,
      conversions: 0,
      conversionRate: 0,
      status: 'Planned',
      dueDate: futureDate.toISOString().split('T')[0],
      notes: ''
    };

    this.campaigns.unshift(newCampaign);
    this.setEditing(newCampaign.id);
  }

  onDelete(campaign: MarketingCampaign): void {
    const confirmed = confirm(`Are you sure you want to delete "${campaign.campaignName || 'this campaign'}"?`);
    if (confirmed) {
      this.campaigns = this.campaigns.filter(c => c.id !== campaign.id);
      if (this.editingId === campaign.id) {
        this.editingId = null;
      }
    }
  }

  getTotalBudget(): number {
    return this.campaigns.reduce((total, campaign) => total + campaign.budget, 0);
  }

  getActiveCampaigns(): number {
    return this.campaigns.filter(campaign => campaign.status === 'Active').length;
  }

  getTotalLeads(): number {
    return this.campaigns.reduce((total, campaign) => total + campaign.leads, 0);
  }

  getTotalConversions(): number {
    return this.campaigns.reduce((total, campaign) => total + campaign.conversions, 0);
  }

  getOverallConversionRate(): number {
    const totalLeads = this.getTotalLeads();
    if (totalLeads > 0) {
      return (this.getTotalConversions() / totalLeads) * 100;
    }
    return 0;
  }

  getConversionRateClass(rate: number): string {
    if (rate >= 20) return 'text-green-600';
    if (rate >= 10) return 'text-yellow-600';
    return 'text-red-600';
  }

  trackByFn(index: number, campaign: MarketingCampaign): number {
    return campaign.id;
  }
}
