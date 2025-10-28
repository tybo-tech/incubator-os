import { Injectable } from '@angular/core';
import { ActionItemFormConfig } from '../app/components/shared/action-item-form/action-item-form.component';

export type SwotCategoryType = 'strength' | 'weakness' | 'opportunity' | 'threat';

export interface SwotCategoryConfig {
  name: string;
  pluralName: string;
  icon: string;
  colorClass: string;
  description: string;
  internalExternal: 'internal' | 'external';
  positiveNegative: 'positive' | 'negative';
  formConfig: ActionItemFormConfig;
}

/**
 * Singleton service that provides SWOT category configurations
 * Centralizes form configs, styling, and category metadata
 */
@Injectable({
  providedIn: 'root'
})
export class SwotConfigService {

  private categoryConfigs: Record<SwotCategoryType, SwotCategoryConfig> = {
    strength: {
      name: 'Strength',
      pluralName: 'Strengths',
      icon: 'fas fa-muscle',
      colorClass: 'green',
      description: 'Internal positive factors that give competitive advantage',
      internalExternal: 'internal',
      positiveNegative: 'positive',
      formConfig: {
        primaryLabel: 'Strength Description',
        primaryPlaceholder: 'Describe this strength in detail...',
        categoryColor: 'green',
        category: 'strength',
        showImpact: true
      }
    },
    weakness: {
      name: 'Weakness',
      pluralName: 'Weaknesses',
      icon: 'fas fa-exclamation-triangle',
      colorClass: 'red',
      description: 'Internal limitations that need improvement',
      internalExternal: 'internal',
      positiveNegative: 'negative',
      formConfig: {
        primaryLabel: 'Weakness Description',
        primaryPlaceholder: 'Describe this weakness that needs improvement...',
        categoryColor: 'red',
        category: 'weakness',
        showImpact: true
      }
    },
    opportunity: {
      name: 'Opportunity',
      pluralName: 'Opportunities',
      icon: 'fas fa-lightbulb',
      colorClass: 'blue',
      description: 'External positive factors you can leverage',
      internalExternal: 'external',
      positiveNegative: 'positive',
      formConfig: {
        primaryLabel: 'Opportunity Description',
        primaryPlaceholder: 'Describe this external opportunity...',
        categoryColor: 'blue',
        category: 'opportunity',
        showImpact: true
      }
    },
    threat: {
      name: 'Threat',
      pluralName: 'Threats',
      icon: 'fas fa-exclamation-circle',
      colorClass: 'yellow',
      description: 'External risks that could impact success',
      internalExternal: 'external',
      positiveNegative: 'negative',
      formConfig: {
        primaryLabel: 'Threat Description',
        primaryPlaceholder: 'Describe this external threat or risk...',
        categoryColor: 'yellow',
        category: 'threat',
        showImpact: true
      }
    }
  };

  constructor() {}

  /**
   * Get configuration for a specific SWOT category
   */
  getCategoryConfig(category: SwotCategoryType): SwotCategoryConfig {
    return this.categoryConfigs[category];
  }

  /**
   * Get form configuration for a specific category
   */
  getFormConfig(category: SwotCategoryType): ActionItemFormConfig {
    return this.categoryConfigs[category].formConfig;
  }

  /**
   * Get all category configurations
   */
  getAllConfigs(): Record<SwotCategoryType, SwotCategoryConfig> {
    return { ...this.categoryConfigs };
  }

  /**
   * Get categories by internal/external classification
   */
  getCategoriesByType(type: 'internal' | 'external'): SwotCategoryType[] {
    return Object.entries(this.categoryConfigs)
      .filter(([_, config]) => config.internalExternal === type)
      .map(([category]) => category as SwotCategoryType);
  }

  /**
   * Get categories by positive/negative classification
   */
  getCategoriesByTone(tone: 'positive' | 'negative'): SwotCategoryType[] {
    return Object.entries(this.categoryConfigs)
      .filter(([_, config]) => config.positiveNegative === tone)
      .map(([category]) => category as SwotCategoryType);
  }

  /**
   * Get internal categories (strengths, weaknesses)
   */
  getInternalCategories(): SwotCategoryType[] {
    return this.getCategoriesByType('internal');
  }

  /**
   * Get external categories (opportunities, threats)
   */
  getExternalCategories(): SwotCategoryType[] {
    return this.getCategoriesByType('external');
  }

  /**
   * Get positive categories (strengths, opportunities)
   */
  getPositiveCategories(): SwotCategoryType[] {
    return this.getCategoriesByTone('positive');
  }

  /**
   * Get negative categories (weaknesses, threats)
   */
  getNegativeCategories(): SwotCategoryType[] {
    return this.getCategoriesByTone('negative');
  }

  /**
   * Get Tailwind CSS classes for a category
   */
  getCategoryClasses(category: SwotCategoryType, type: 'bg' | 'border' | 'text' | 'hover' | 'focus' = 'bg'): string {
    const color = this.categoryConfigs[category].colorClass;
    
    const classMap = {
      bg: `bg-${color}-50`,
      border: `border-${color}-200`,
      text: `text-${color}-600`,
      hover: `hover:bg-${color}-100`,
      focus: `focus:ring-${color}-500 focus:border-${color}-500`
    };

    return classMap[type] || classMap.bg;
  }

  /**
   * Get button classes for a category
   */
  getButtonClasses(category: SwotCategoryType, variant: 'primary' | 'secondary' = 'primary'): string {
    const color = this.categoryConfigs[category].colorClass;
    
    if (variant === 'primary') {
      return `bg-${color}-600 text-white hover:bg-${color}-700 focus:ring-${color}-500`;
    } else {
      return `bg-${color}-100 text-${color}-700 hover:bg-${color}-200 focus:ring-${color}-500`;
    }
  }

  /**
   * Get empty state configuration for a category
   */
  getEmptyStateConfig(category: SwotCategoryType) {
    const config = this.categoryConfigs[category];
    return {
      icon: config.icon,
      title: `No ${config.pluralName.toLowerCase()} identified yet`,
      description: `Identify ${config.description.toLowerCase()}.`,
      buttonText: `Add Your First ${config.name}`,
      colorClass: config.colorClass
    };
  }

  /**
   * Validate category type
   */
  isValidCategory(category: string): category is SwotCategoryType {
    return category in this.categoryConfigs;
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: SwotCategoryType, plural: boolean = false): string {
    const config = this.categoryConfigs[category];
    return plural ? config.pluralName : config.name;
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category: SwotCategoryType): string {
    return this.categoryConfigs[category].icon;
  }

  /**
   * Get category description
   */
  getCategoryDescription(category: SwotCategoryType): string {
    return this.categoryConfigs[category].description;
  }
}