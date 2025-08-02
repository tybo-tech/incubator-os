import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {

  navItems = [
    {
      icon: 'overview',
      label: 'Overview',
      route: '/overview',
      active: false
    },
    {
      icon: 'companies',
      label: 'Companies',
      route: '/companies',
      active: true,
      badge: '40'
    },
    {
      icon: 'data',
      label: 'Data',
      route: '/data',
      active: false
    },
    {
      icon: 'analytics',
      label: 'Analytics',
      route: '/analytics',
      active: false,
      children: [
        { label: 'Reports', route: '/analytics/reports' },
        { label: 'Insights', route: '/analytics/insights' }
      ]
    },
    {
      icon: 'team',
      label: 'Team',
      route: '/team',
      active: false
    }
  ];

  starredItems = [
    { label: 'Company imports', route: '/companies/imports' },
    { label: 'Create new company', route: '/companies/create' },
    { label: 'Compliance dashboard', route: '/compliance' }
  ];

}
