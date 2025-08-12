// models/swot.models.ts

/**
 * 🎯 SWOT Analysis Models
 * Comprehensive SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis framework
 */

export interface SwotAnalysis {
  /** SWOT Analysis ID */
  id?: string;

  /** Company ID this SWOT belongs to */
  company_id: string;

  /** Analysis date */
  analysis_date: Date;

  /** SWOT analysis version/name */
  name?: string;

  /** Internal factors */
  internal: InternalFactors;

  /** External factors */
  external: ExternalFactors;

  /** Overall analysis summary */
  summary?: string;

  /** Strategic recommendations */
  strategic_recommendations?: string[];

  /** Analysis completion status */
  is_complete: boolean;

  /** Last updated */
  last_updated?: Date;

  /** Created by */
  created_by?: string;
}

export interface InternalFactors {
  /** Company strengths */
  strengths: SwotItem[];

  /** Company weaknesses */
  weaknesses: SwotItem[];
}

export interface ExternalFactors {
  /** Market opportunities */
  opportunities: SwotItem[];

  /** External threats */
  threats: SwotItem[];
}

export interface SwotItem {
  /** Item ID */
  id?: string;

  /** Description of the strength/weakness/opportunity/threat */
  description: string;

  /** Action required to address this item */
  action_required?: string;

  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Impact level */
  impact: 'low' | 'medium' | 'high';

  /** Current status */
  status: 'identified' | 'planning' | 'in_progress' | 'completed' | 'on_hold';

  /** Target completion date */
  target_date?: string;

  /** Assigned to */
  assigned_to?: string;

  /** Additional notes */
  notes?: string;

  /** Date added */
  date_added: Date;

  /** Category/tag */
  category?: string;
}

/**
 * SWOT Matrix for strategic planning
 */
export interface SwotMatrix {
  /** SO Strategies (Strengths + Opportunities) */
  so_strategies: StrategicAction[];

  /** WO Strategies (Weaknesses + Opportunities) */
  wo_strategies: StrategicAction[];

  /** ST Strategies (Strengths + Threats) */
  st_strategies: StrategicAction[];

  /** WT Strategies (Weaknesses + Threats) */
  wt_strategies: StrategicAction[];
}

export interface StrategicAction {
  /** Action ID */
  id?: string;

  /** Action description */
  description: string;

  /** Related SWOT items */
  related_strengths?: string[];
  related_weaknesses?: string[];
  related_opportunities?: string[];
  related_threats?: string[];

  /** Priority */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Timeline */
  timeline: 'immediate' | 'short_term' | 'medium_term' | 'long_term';

  /** Resources required */
  resources_required?: string;

  /** Expected outcome */
  expected_outcome?: string;

  /** Status */
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * SWOT Analysis Templates and Helpers
 */
export interface SwotTemplate {
  /** Template ID */
  id: string;

  /** Template name */
  name: string;

  /** Industry or type */
  industry?: string;

  /** Pre-defined questions/prompts */
  prompts: SwotPrompts;
}

export interface SwotPrompts {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

/**
 * Helper functions initialization
 */
export function initSwotAnalysis(companyId: string): SwotAnalysis {
  return {
    company_id: companyId,
    analysis_date: new Date(),
    internal: {
      strengths: [],
      weaknesses: []
    },
    external: {
      opportunities: [],
      threats: []
    },
    is_complete: false,
    last_updated: new Date()
  };
}

export function initSwotItem(description: string, category?: string): SwotItem {
  return {
    description,
    priority: 'medium',
    impact: 'medium',
    status: 'identified',
    date_added: new Date(),
    category
  };
}

/**
 * SWOT Analysis scoring and insights
 */
export interface SwotScoring {
  /** Strengths score */
  strengths_score: number;

  /** Weaknesses score */
  weaknesses_score: number;

  /** Opportunities score */
  opportunities_score: number;

  /** Threats score */
  threats_score: number;

  /** Overall strategic position */
  strategic_position: 'aggressive' | 'conservative' | 'competitive' | 'defensive';

  /** Recommended strategy focus */
  strategy_focus: string[];
}

export interface SwotInsights {
  /** Key insights */
  insights: string[];

  /** Critical areas */
  critical_areas: string[];

  /** Quick wins */
  quick_wins: string[];

  /** Long term focuses */
  long_term_focus: string[];

  /** Risk factors */
  risk_factors: string[];
}
