import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface GrantFundingTab {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-grant-funding-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Shell Header -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div class="px-4 sm:px-6 lg:px-8">

          <!-- Title Section -->
          <div class="flex items-center justify-between py-4 border-b border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                  </path>
                </svg>
              </div>
              <div>
                <h1 class="text-lg font-semibold text-gray-900">Grant Funding</h1>
                <p class="text-sm text-gray-500">Manage applications, clients and cohort assignments</p>
              </div>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="flex space-x-8 overflow-x-auto">
            <a
              *ngFor="let tab of tabs"
              [routerLink]="[tab.route]"
              [class]="'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ' +
                (isTabActive(tab.route)
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')">
              <span class="flex items-center space-x-2">
                <i [class]="tab.icon"></i>
                <span>{{ tab.label }}</span>
              </span>
            </a>
          </div>

        </div>
      </div>

      <!-- Routed content -->
      <div class="flex-1">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class GrantFundingShellComponent implements OnInit {
  currentUrl = '';

  tabs: GrantFundingTab[] = [
    {
      label: 'Clients',
      route: '/admin/grant-funding/clients',
      icon: 'fas fa-building'
    },
    {
      label: 'Applications',
      route: '/admin/grant-funding/applications',
      icon: 'fas fa-file-alt'
    },
    {
      label: 'SEDA Assessment',
      route: '/admin/grant-funding/seda-assessment',
      icon: 'fas fa-clipboard-check'
    },
    {
      label: 'Itemized List',
      route: '/admin/grant-funding/purchases',
      icon: 'fas fa-shopping-cart'
    },
    {
      label: 'Payments Tracker',
      route: '/admin/grant-funding/seed-funding',
      icon: 'fas fa-seedling'
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUrl = this.router.url;

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.url;
    });
  }

  isTabActive(tabRoute: string): boolean {
    return this.currentUrl.startsWith(tabRoute);
  }
}
