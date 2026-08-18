import { Component, input, signal, computed, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OverlayModule, Overlay, OverlayRef, ConnectedPosition } from '@angular/cdk/overlay';

export interface TabItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, OverlayModule],
  template: `
    <nav class="flex items-center space-x-1">
      <!-- Visible Tabs -->
      <a
        *ngFor="let tab of visibleTabs()"
        [routerLink]="[tab.route]"
        [queryParams]="queryParams()"
        [class]="'whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ' +
                (isActive(tab) ? activeClass() : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')">
        <i [class]="tab.icon + ' w-4 h-4'"></i>
        <span>{{ tab.label }}</span>
      </a>

      <!-- Overflow Dropdown -->
      <div *ngIf="overflowTabs().length > 0" class="relative">
        <button
          #trigger
          (click)="toggleDropdown()"
          [class]="'whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ' +
                  (hasActiveOverflow() ? activeClass() : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/>
          </svg>
          <span>More</span>
        </button>
      </div>
    </nav>

    <!-- CDK Overlay Dropdown Panel -->
    <ng-template cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="trigger"
      [cdkConnectedOverlayOpen]="dropdownOpen()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayBackdropClass]="'cdk-overlay-transparent-backdrop'"
      [cdkConnectedOverlayHasBackdrop]="true"
      (backdropClick)="closeDropdown()"
      (detach)="closeDropdown()">
      <div class="w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
        <a
          *ngFor="let tab of overflowTabs()"
          [routerLink]="[tab.route]"
          [queryParams]="queryParams()"
          (click)="closeDropdown()"
          [class]="'flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors ' +
                  (isActive(tab) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50')">
          <i [class]="tab.icon + ' w-4 h-4'"></i>
          <span>{{ tab.label }}</span>
        </a>
      </div>
    </ng-template>
  `,
})
export class TabBarComponent {
  tabs = input.required<TabItem[]>();
  maxVisible = input<number>(7);
  queryParams = input<any>({});
  activeRoute = input<string>('');
  activeClass = input<string>('border-blue-500 text-blue-600');
  isActiveFn = input<(tab: TabItem) => boolean>();

  @ViewChild('trigger') trigger!: ElementRef<HTMLElement>;

  dropdownOpen = signal(false);

  positions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetY: 4,
    },
  ];

  visibleTabs = computed(() => this.tabs().slice(0, this.maxVisible()));
  overflowTabs = computed(() => this.tabs().slice(this.maxVisible()));

  hasActiveOverflow = computed(() => this.overflowTabs().some(tab => this.isActive(tab)));

  toggleDropdown(): void {
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  isActive(tab: TabItem): boolean {
    const fn = this.isActiveFn();
    if (fn) return fn(tab);
    return this.activeRoute().includes(`/${tab.route}`);
  }
}
