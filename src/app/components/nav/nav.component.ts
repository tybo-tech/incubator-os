import { Component, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent implements OnInit {
  @Output() onQuickTaskClick = new EventEmitter<void>();

  isCollapsed = false;

  constructor(public auth: AuthService, private router: Router) {}

  navItems: NavItem[] = [
    { icon: 'fa-gauge-high', label: 'Overview', route: '/' },
    { icon: 'fa-hand-holding-dollar', label: 'Grant Funding', route: '/admin/grant-funding' },
    { icon: 'fa-building', label: 'All Companies', route: '/companies' },
    { icon: 'fa-list-check', label: 'Tasks', route: '/tasks' },
    { icon: 'fa-industry', label: 'Industries', route: '/industries' },
    { icon: 'fa-users', label: 'Users', route: '/users' },
    { icon: 'fa-file-invoice', label: 'Form Templates', route: '/admin/form-templates' },
    { icon: 'fa-diagram-project', label: 'Project Management', route: '/projects' },
    { icon: 'fa-code', label: 'Developer', route: '/import' },
  ];

  ngOnInit() {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      this.isCollapsed = stored === 'true';
    } else {
      // Auto-collapse on tablet screens (768px–1023px) by default
      this.isCollapsed = window.innerWidth < 1024;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = (event.target as Window).innerWidth;
    // If no explicit preference stored, auto-collapse below 1024px
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === null) {
      this.isCollapsed = width < 1024;
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(this.isCollapsed));
  }

  onNavAction(action: string) {
    switch (action) {
      case 'quickTask':
        this.onQuickTaskClick.emit();
        break;
      case 'logout':
        this.auth.logout();
        this.router.navigate(['/login']);
        break;
    }
  }
}
