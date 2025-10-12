import { Injectable, Type } from '@angular/core';
import { FinancialBaseComponent } from '../app/components/company-shell/financial-shell/components/financial-base.component';

/**
 * 🏗️ Financial Domain Registry
 *
 * Central registry for dynamic loading and management of financial domain components.
 * This is the core of our enterprise financial architecture that enables:
 *
 * - Dynamic component loading in dashboards
 * - Runtime discovery of available financial modules
 * - Extensible architecture for new financial domains
 * - Multi-tenant financial module management
 *
 * Usage:
 * ```typescript
 * // Register a domain
 * registry.register('balance_sheet', BalanceSheetComponent);
 *
 * // Load dynamically in dashboard
 * const componentType = registry.get('balance_sheet');
 * viewContainerRef.createComponent(componentType);
 *
 * // List all available domains
 * const domains = registry.list();
 * ```
 *
 * This pattern matches enterprise systems like SAP Fiori and Odoo's modular core.
 */
@Injectable({
  providedIn: 'root'
})
export class FinancialDomainRegistry {
  private domains = new Map<string, FinancialDomainDefinition>();

  /**
   * 📋 Register a financial domain component
   */
  register(name: string, definition: FinancialDomainDefinition): void {
    this.domains.set(name, definition);
    console.log(`🏦 Registered financial domain: ${name}`);
  }

  /**
   * 🔍 Get a financial domain component by name
   */
  get(name: string): FinancialDomainDefinition | undefined {
    return this.domains.get(name);
  }

  /**
   * 📊 List all registered domain names
   */
  list(): string[] {
    return Array.from(this.domains.keys());
  }

  /**
   * 🎯 Get all domain definitions with metadata
   */
  getAllDomains(): FinancialDomainDefinition[] {
    return Array.from(this.domains.values());
  }

  /**
   * 🔄 Check if a domain is registered
   */
  has(name: string): boolean {
    return this.domains.has(name);
  }

  /**
   * 🗑️ Unregister a domain (useful for development/testing)
   */
  unregister(name: string): boolean {
    return this.domains.delete(name);
  }

  /**
   * 🎨 Get domains by category
   */
  getDomainsByCategory(category: FinancialDomainCategory): FinancialDomainDefinition[] {
    return this.getAllDomains().filter(domain => domain.category === category);
  }

  /**
   * 🏗️ Initialize default financial domains
   * Called during app startup to register core financial modules
   */
  initializeCoreDomains(): void {
    // This will be called by the app module to register all core domains
    console.log('🏦 Initializing core financial domains...');
  }
}

/**
 * 🎯 Financial Domain Definition
 * Metadata and component type for each financial domain
 */
export interface FinancialDomainDefinition {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  category: FinancialDomainCategory;
  component: Type<FinancialBaseComponent>;
  requiredPermissions?: string[];
  isEnabled?: boolean;
  sortOrder?: number;
}

/**
 * 📊 Financial Domain Categories
 * Logical groupings for financial modules
 */
export type FinancialDomainCategory =
  | 'financial_statements'  // Balance Sheet, P&L, Cash Flow
  | 'cost_analysis'        // Cost Structure, Expense Analysis
  | 'revenue_analysis'     // Revenue Breakdown, Sales Analysis
  | 'performance_metrics'  // KPIs, Ratios, Trends
  | 'reporting'           // Custom Reports, Exports
  | 'planning';           // Budgets, Forecasts

/**
 * 🏭 Financial Domain Factory
 * Helper class for creating domain definitions
 */
export class FinancialDomainFactory {
  static createDomain(
    name: string,
    component: Type<FinancialBaseComponent>,
    options: Partial<FinancialDomainDefinition> = {}
  ): FinancialDomainDefinition {
    return {
      name,
      displayName: options.displayName || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: options.description || `${options.displayName || name} financial analysis module`,
      icon: options.icon || 'fas fa-chart-line',
      category: options.category || 'financial_statements',
      component,
      requiredPermissions: options.requiredPermissions || [],
      isEnabled: options.isEnabled ?? true,
      sortOrder: options.sortOrder || 0
    };
  }
}
