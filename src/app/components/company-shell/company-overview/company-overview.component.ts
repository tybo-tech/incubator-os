import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MetricsOverviewComponent, MetricCard } from '../../shared/metrics-overview/metrics-overview.component';

@Component({
  selector: 'app-company-overview',
  standalone: true,
  imports: [CommonModule, MetricsOverviewComponent],
  template: `
    <div class="p-4 lg:p-8">
      <div class="max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Company Overview</h2>
          <p class="text-gray-600">Complete view of company information and key metrics</p>
        </div>

        <!-- Company Metrics Overview -->
        <app-metrics-overview [metrics]="companyMetrics"></app-metrics-overview>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Company Information -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                  <p class="text-gray-900">{{ companyId ? 'Company ' + companyId : 'Sample Company Ltd' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Registration Number</label>
                  <p class="text-gray-900">2021/123456/07</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Industry</label>
                  <p class="text-gray-900">Technology Services</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Location</label>
                  <p class="text-gray-900">Cape Town, South Africa</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Founded</label>
                  <p class="text-gray-900">2021</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div>
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>

              <div class="space-y-4">
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-900">Financial report updated</p>
                    <p class="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>

                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-900">Compliance check completed</p>
                    <p class="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>

                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-900">New task assigned</p>
                    <p class="text-xs text-gray-500">3 days ago</p>
                  </div>
                </div>

                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-900">Strategy session completed</p>
                    <p class="text-xs text-gray-500">1 week ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CompanyOverviewComponent implements OnInit {
  companyId: string | null = null;

  companyMetrics: MetricCard[] = [
    {
      title: 'Revenue',
      value: 'R 2.4M',
      change: '+12.5% from last year',
      changeType: 'positive',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      title: 'Compliance',
      value: '85%',
      change: '+5% this quarter',
      changeType: 'positive',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      title: 'Tasks',
      value: '12',
      change: '3 pending',
      changeType: 'neutral',
      icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Employees',
      value: '45',
      change: '+3 this month',
      changeType: 'positive',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    }
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      this.companyId = params['id'];
    });
  }
}
