import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {

  navItems: NavItem[] = [
    {
      icon: 'overview',
      label: 'Overview',
      route: '/'
    },
    {
      icon: 'companies',
      label: 'Clients',
      route: '/admin/clients'
    },
    {
      icon: 'companies',
      label: 'All Companies',
      route: '/companies'
    },
    {
      icon: 'tasks',
      label: 'Tasks',
      route: '/tasks'
    },
    {
      icon: 'sectors',
      label: 'Industries',
      route: '/industries'
    },
    {
      icon: 'users',
      label: 'Users',
      route: '/users'
    }
  ];

}
