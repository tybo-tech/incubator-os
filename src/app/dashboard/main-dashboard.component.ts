import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRecentActivitiesComponent } from './dashboard-recent-activities/dashboard-recent-activities.component';
import { ReportsOverviewComponent } from '../admin/reports/reports-overview.component';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardRecentActivitiesComponent, ReportsOverviewComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-6 py-8">

        <!-- Dashboard Header -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p class="mt-1 text-sm text-gray-500">
            Welcome back! Here's an overview of your business incubator activity.
          </p>
        </div>

        <!-- Dashboard Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <!-- Recent Activities Panel -->
          <div class="lg:col-span-1">
            <app-dashboard-recent-activities></app-dashboard-recent-activities>
          </div>

          <!-- Reports Overview Panel -->
          <div class="lg:col-span-2">
            <app-reports-overview></app-reports-overview>
          </div>

        </div>

      </div>
    </div>
  `
})
export class MainDashboardComponent {

}
