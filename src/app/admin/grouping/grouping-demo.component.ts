import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopBarContextComponent } from './top-bar-context.component';
import { CompaniesViewComponent } from './companies-view.component';

@Component({
  selector: 'app-grouping-demo',
  standalone: true,
  imports: [CommonModule, TopBarContextComponent, CompaniesViewComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <app-top-bar-context />

      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Admin Grouping Demo</h1>
          <p class="text-gray-600 mt-1">Interactive demo of the client/program/cohort grouping system</p>
        </div>

        <app-companies-view />
      </div>
    </div>
  `
})
export class GroupingDemoComponent {}
