// src/services/tab-configuration.service.ts
import { Injectable, Type } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Import form models
import { IForm } from '../models/form-system.models';
import { CompanyFormTab, ICategoryItemWithSession } from '../models/form-system.models';

export interface TabConfig {
  id: string;
  type: 'static' | 'dynamic' | 'hybrid';
  title: string;
  component?: Type<any>;
  form?: IForm;
  order: number;
  enabled: boolean;
  visible: boolean;
  icon?: string;
  color?: string;

  // Migration flags
  isLegacy?: boolean;
  canMigrate?: boolean;
  migrationTarget?: string;
  description?: string;
}

export interface TabGroup {
  name: string;
  tabs: TabConfig[];
  order: number;
  icon?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class TabConfigurationService {

  private staticTabsConfig: TabConfig[] = [
    {
      id: 'overview',
      type: 'static',
      title: 'Overview',
      order: 1,
      enabled: true,
      visible: true,
      icon: 'home',
      color: 'blue',
      description: 'Company overview and basic information'
    },
    {
      id: 'documents',
      type: 'static',
      title: 'Documents',
      order: 800,
      enabled: true,
      visible: true,
      icon: 'folder',
      color: 'gray',
      description: 'Company documents and file management'
    },
    {
      id: 'tasks',
      type: 'static',
      title: 'Tasks',
      order: 900,
      enabled: true,
      visible: true,
      icon: 'check-square',
      color: 'purple',
      description: 'Task management and tracking'
    },
    {
      id: 'growth',
      type: 'static',
      title: 'Growth Areas',
      order: 700,
      enabled: true,
      visible: true,
      icon: 'trending-up',
      color: 'green',
      description: 'Growth opportunities and development areas'
    }
  ];

  // Legacy tabs that will be migrated to dynamic forms
  private migratableTabsConfig: TabConfig[] = [
    {
      id: 'assessment',
      type: 'hybrid',
      title: 'Assessment',
      order: 100,
      enabled: true,
      visible: true,
      icon: 'clipboard-list',
      color: 'orange',
      isLegacy: true,
      canMigrate: true,
      migrationTarget: 'business_assessment_form',
      description: 'Business assessment and evaluation'
    },
    {
      id: 'financial',
      type: 'hybrid',
      title: 'Financial',
      order: 200,
      enabled: true,
      visible: true,
      icon: 'chart-bar',
      color: 'green',
      isLegacy: true,
      canMigrate: true,
      migrationTarget: 'financial_checkin_form',
      description: 'Financial check-ins and reporting'
    },
    {
      id: 'swot',
      type: 'static',
      title: 'SWOT Analysis',
      order: 300,
      enabled: true,
      visible: true,
      icon: 'target',
      color: 'purple',
      isLegacy: true,
      canMigrate: true,
      migrationTarget: 'swot_analysis_form',
      description: 'Strengths, weaknesses, opportunities, and threats analysis'
    },
    {
      id: 'strategy',
      type: 'static',
      title: 'Strategy',
      order: 250,
      enabled: true,
      visible: true,
      icon: 'lightbulb',
      color: 'yellow',
      isLegacy: true,
      canMigrate: true,
      migrationTarget: 'strategy_form',
      description: 'Strategic planning and business strategy'
    },
    {
      id: 'compliance',
      type: 'static',
      title: 'Compliance',
      order: 600,
      enabled: true,
      visible: true,
      icon: 'shield-alt',
      color: 'red',
      isLegacy: true,
      canMigrate: true,
      migrationTarget: 'compliance_form',
      description: 'Regulatory compliance and requirements'
    }
  ];

  /**
   * Generate hybrid tab configuration combining static, legacy, and dynamic tabs
   */
  generateHybridTabConfig(
    companyId: number,
    dynamicTabs: CompanyFormTab[],
    enrollmentContext?: ICategoryItemWithSession | null
  ): Observable<TabConfig[]> {

    // Convert dynamic tabs to tab configs
    const dynamicTabConfigs = dynamicTabs.map((tab, index) => ({
      id: `form-${tab.form.id}`,
      type: 'dynamic' as const,
      title: tab.form.title,
      form: tab.form,
      order: 500 + index, // Dynamic tabs start at order 500
      enabled: tab.is_active || tab.can_edit,
      visible: true,
      icon: 'file-text', // Default icon for dynamic forms
      color: 'blue', // Default color for dynamic forms
      description: tab.form.description || `Dynamic form: ${tab.form.title}`
    }));

    // Combine static, migratable, and dynamic tabs
    const allTabs = [
      ...this.staticTabsConfig,
      ...this.getMigratableTabsForContext(enrollmentContext),
      ...dynamicTabConfigs
    ].sort((a, b) => a.order - b.order);

    return of(allTabs);
  }

  /**
   * Determine which legacy tabs to show based on enrollment context
   */
  private getMigratableTabsForContext(context?: ICategoryItemWithSession | null): TabConfig[] {
    // For now, return all migratable tabs
    // Later, this can be enhanced to filter based on program configuration
    if (!context) {
      return this.migratableTabsConfig;
    }

    // Future enhancement: filter tabs based on program requirements
    // const programSpecificTabs = this.migratableTabsConfig.filter(tab => {
    //   return this.isTabEnabledForProgram(tab, context.program_id);
    // });

    return this.migratableTabsConfig;
  }

  /**
   * Group tabs into logical sections for navigation
   */
  getTabGroups(tabs: TabConfig[]): TabGroup[] {
    const groups: TabGroup[] = [
      {
        name: 'Company Overview',
        tabs: tabs.filter(t => t.order < 100),
        order: 1,
        icon: 'building',
        description: 'Basic company information and overview'
      },
      {
        name: 'Assessment & Planning',
        tabs: tabs.filter(t => t.order >= 100 && t.order < 400),
        order: 2,
        icon: 'clipboard-list',
        description: 'Business assessments and strategic planning'
      },
      {
        name: 'Operations',
        tabs: tabs.filter(t => t.order >= 400 && t.order < 600),
        order: 3,
        icon: 'cogs',
        description: 'Operational activities and processes'
      },
      {
        name: 'Growth & Development',
        tabs: tabs.filter(t => t.order >= 600 && t.order < 800),
        order: 4,
        icon: 'chart-line',
        description: 'Growth initiatives and development programs'
      },
      {
        name: 'Administration',
        tabs: tabs.filter(t => t.order >= 800),
        order: 5,
        icon: 'folder-open',
        description: 'Administrative tasks and document management'
      }
    ];

    // Only return groups that have tabs
    return groups.filter(g => g.tabs.length > 0);
  }

  /**
   * Get quick access tabs (most frequently used)
   */
  getQuickAccessTabs(tabs: TabConfig[]): TabConfig[] {
    return tabs
      .filter(t => t.order < 300 && t.visible && t.enabled)
      .slice(0, 5);
  }

  /**
   * Get tabs by type
   */
  getTabsByType(tabs: TabConfig[], type: 'static' | 'dynamic' | 'hybrid'): TabConfig[] {
    return tabs.filter(t => t.type === type);
  }

  /**
   * Find tab by ID
   */
  findTabById(tabs: TabConfig[], tabId: string): TabConfig | undefined {
    return tabs.find(t => t.id === tabId);
  }

  /**
   * Check if tab is enabled for current context
   */
  isTabEnabled(tab: TabConfig, context?: any): boolean {
    if (!tab.enabled) return false;

    // Add context-specific logic here
    // For example, check user permissions, enrollment status, etc.

    return true;
  }

  /**
   * Get static tabs configuration
   */
  getStaticTabsConfig(): TabConfig[] {
    return [...this.staticTabsConfig];
  }

  /**
   * Get migratable tabs configuration
   */
  getMigratableTabsConfig(): TabConfig[] {
    return [...this.migratableTabsConfig];
  }

  /**
   * Get default active tab for context
   */
  getDefaultActiveTab(tabs: TabConfig[]): string {
    // Always default to overview if available
    const overviewTab = tabs.find(t => t.id === 'overview');
    if (overviewTab && overviewTab.enabled && overviewTab.visible) {
      return 'overview';
    }

    // Otherwise, get first enabled and visible tab
    const firstAvailableTab = tabs.find(t => t.enabled && t.visible);
    return firstAvailableTab?.id || 'overview';
  }

  /**
   * Update tab configuration (for dynamic configuration)
   */
  updateTabConfig(tabId: string, updates: Partial<TabConfig>, tabs: TabConfig[]): TabConfig[] {
    return tabs.map(tab =>
      tab.id === tabId ? { ...tab, ...updates } : tab
    );
  }

  /**
   * Get tab statistics for analytics
   */
  getTabStatistics(tabs: TabConfig[]): {
    total: number;
    byType: Record<string, number>;
    enabled: number;
    visible: number;
  } {
    const byType = tabs.reduce((acc, tab) => {
      acc[tab.type] = (acc[tab.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: tabs.length,
      byType,
      enabled: tabs.filter(t => t.enabled).length,
      visible: tabs.filter(t => t.visible).length
    };
  }
}
