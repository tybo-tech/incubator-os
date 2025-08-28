import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NodeService } from '../../../services';
import { Task } from '../../../models/business.models';
import { INode } from '../../../models/schema';

interface NavChildItem {
  label: string;
  route?: string;
  action?: string;
  icon?: string;
}

interface NavItem {
  icon: string;
  label: string;
  route: string;
  active: boolean;
  badge?: string;
  children?: NavChildItem[];
}

@Component({
  selector: 'app-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent implements OnInit {
  @Output() onQuickTaskClick = new EventEmitter<void>();

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

  onNavAction(action: string) {
    switch (action) {
      case 'quickTask':
        this.onQuickTaskClick.emit();
        break;
    }
  }

  navItems: NavItem[] = [
    {
      icon: 'overview',
      label: 'Overview',
      route: '/',
      active: false
    },
    {
      icon: 'companies',
      label: 'Clients',
      route: '/admin/grouping/clients',
      active: true,
      children: [
        { label: 'View All Clients', route: '/admin/grouping/clients', icon: 'bi-building' },
        { label: 'Programs', route: '/admin/grouping/programs', icon: 'bi-collection' }
      ]
    },
    // Tasks
    {
      icon: 'tasks',
      label: 'Tasks',
      route: '/tasks',
      active: false,
      badge: undefined,
      children: [
        {
          label: 'Quick Task',
          action: 'quickTask',
          icon: 'bi-plus-circle'
        }
      ]
    },
    {
      icon: 'analytics',
      label: 'Analytics',
      route: '/analytics',
      active: false,
      children: [
        { label: 'Reports', route: '/analytics/reports', icon: 'bi-graph-up' },
        { label: 'Insights', route: '/analytics/insights', icon: 'bi-lightbulb' }
      ]
    },
    {
      icon: 'admin',
      label: 'Admin',
      route: '/admin',
      active: false,
      children: [
        { label: 'Overview', route: '/admin/overview', icon: 'bi-speedometer2' },
        { label: 'Grouping', route: '/admin/grouping', icon: 'bi-collection' }
      ]
    }
  ];

  starredItems = [
    { label: 'Client Overview', route: '/admin/grouping/clients' },
    { label: 'Program Management', route: '/admin/grouping/programs' },
    { label: 'Analytics Dashboard', route: '/analytics' }
  ];

}
