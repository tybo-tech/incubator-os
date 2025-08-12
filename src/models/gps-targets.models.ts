// models/gps-targets.models.ts

/**
 * 🎯 GPS Targets Models
 * Goal Setting and Performance System for business targets
 */

export interface GpsTargets {
  /** Targets ID */
  id?: string;

  /** Company ID this targets belong to */
  company_id: string;

  /** Target setting date */
  target_date: Date;

  /** Targets version/name */
  name?: string;

  /** Strategy/General targets */
  strategy_general: GpsTargetCategory;

  /** Finance targets */
  finance: GpsTargetCategory;

  /** Sales & Marketing targets */
  sales_marketing: GpsTargetCategory;

  /** Personal Development targets */
  personal_development: GpsTargetCategory;

  /** Overall targets summary */
  summary?: string;

  /** Completion status */
  is_complete: boolean;

  /** Last updated */
  last_updated?: Date;

  /** Created by */
  created_by?: string;
}

export interface GpsTargetCategory {
  /** Category name */
  name: string;

  /** List of targets in this category */
  targets: GpsTarget[];

  /** Category completion percentage */
  completion_percentage?: number;

  /** Category notes */
  notes?: string;
}

export interface GpsTarget {
  /** Target ID */
  id?: string;

  /** Target description */
  description: string;

  /** Evidence required/provided */
  evidence?: string;

  /** Target due date */
  due_date?: string;

  /** Current status */
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Assigned to */
  assigned_to?: string;

  /** Progress percentage */
  progress_percentage: number;

  /** Additional notes */
  notes?: string;

  /** Date added */
  date_added: Date;

  /** Date completed */
  date_completed?: Date;

  /** Completion evidence */
  completion_evidence?: string;
}

/**
 * GPS Targets initialization helpers
 */
export function initGpsTargets(company_id: string): GpsTargets {
  return {
    company_id,
    target_date: new Date(),
    strategy_general: initGpsTargetCategory('Strategy/General Targets'),
    finance: initGpsTargetCategory('Finance Targets'),
    sales_marketing: initGpsTargetCategory('Sales & Marketing Targets'),
    personal_development: initGpsTargetCategory('Personal Development Targets'),
    is_complete: false,
    last_updated: new Date()
  };
}

export function initGpsTargetCategory(name: string): GpsTargetCategory {
  return {
    name,
    targets: [],
    completion_percentage: 0
  };
}

export function initGpsTarget(description: string = ''): GpsTarget {
  return {
    description,
    status: 'not_started',
    priority: 'medium',
    progress_percentage: 0,
    date_added: new Date()
  };
}

/**
 * GPS Targets analytics and insights
 */
export interface GpsTargetsAnalytics {
  /** Total targets count */
  total_targets: number;

  /** Completed targets count */
  completed_targets: number;

  /** In progress targets count */
  in_progress_targets: number;

  /** Overdue targets count */
  overdue_targets: number;

  /** Overall completion percentage */
  overall_completion: number;

  /** Category breakdown */
  category_breakdown: {
    [key: string]: {
      total: number;
      completed: number;
      completion_rate: number;
    };
  };

  /** Upcoming deadlines (next 30 days) */
  upcoming_deadlines: GpsTarget[];

  /** Recently completed targets */
  recently_completed: GpsTarget[];
}
