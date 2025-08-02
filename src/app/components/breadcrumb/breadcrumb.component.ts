import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Home, ChevronRight } from 'lucide-angular';

export interface BreadcrumbItem {
  label: string;
  action?: () => void;
  isActive?: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <nav class="flex mb-4" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-4">
        <!-- Home Icon -->
        <li>
          <div>
            <a (click)="navigateToOverview()" class="text-gray-400 hover:text-gray-500 cursor-pointer">
              <lucide-icon [img]="HomeIcon" class="flex-shrink-0 h-5 w-5"></lucide-icon>
              <span class="sr-only">Home</span>
            </a>
          </div>
        </li>
        
        <!-- Breadcrumb Items -->
        <li *ngFor="let item of items; let last = last">
          <div class="flex items-center">
            <lucide-icon [img]="ChevronRightIcon" class="flex-shrink-0 h-5 w-5 text-gray-300"></lucide-icon>
            <span 
              *ngIf="last || !item.action" 
              class="ml-4 text-sm font-medium text-gray-900">
              {{ item.label }}
            </span>
            <a 
              *ngIf="!last && item.action" 
              (click)="item.action!()" 
              class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer">
              {{ item.label }}
            </a>
          </div>
        </li>
      </ol>
    </nav>
  `
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];

  // Lucide Icons
  readonly HomeIcon = Home;
  readonly ChevronRightIcon = ChevronRight;

  constructor(private router: Router) {}

  navigateToOverview() {
    this.router.navigate(['/']);
  }
}
