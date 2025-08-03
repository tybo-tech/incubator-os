import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NodeService } from '../../../services';
import { Task } from '../../../models/business.models';
import { INode } from '../../../models/schema';

@Component({
  selector: 'app-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent implements OnInit {
  pendingTasksCount = 0;

  constructor(private nodeService: NodeService<Task>) {}

  ngOnInit() {
    this.loadTasksCount();
  }

  async loadTasksCount() {
    try {
      const tasks = await this.nodeService.getNodesByType('task').toPromise();
      this.pendingTasksCount = tasks?.filter(task =>
        task.data.status === 'todo' || task.data.status === 'in_progress'
      ).length || 0;

      // Update the tasks nav item badge
      const tasksItem = this.navItems.find(item => item.route === '/tasks');
      if (tasksItem) {
        tasksItem.badge = this.pendingTasksCount > 0 ? this.pendingTasksCount.toString() : undefined;
      }
    } catch (error) {
      console.error('❌ Error loading tasks count:', error);
    }
  }

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
    // Tasks
    {
      icon: 'tasks',
      label: 'Tasks',
      route: '/tasks',
      active: false,
      badge: undefined
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
