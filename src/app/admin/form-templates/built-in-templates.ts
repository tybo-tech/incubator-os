import { IFormTemplateData } from './interfaces/form-template.interfaces';

export interface BuiltInTemplate {
  key: string;
  name: string;
  description: string;
  /** Tailwind color name for the card accent. */
  color: 'violet' | 'blue' | 'green' | 'orange' | 'teal';
  data: IFormTemplateData;
}

// ─── Enterprise Development Grant Fund Interview ──────────────────────────────

const ENTERPRISE_INTERVIEW: IFormTemplateData = {
  name: 'Interview Questions – Enterprise Development Grant Fund',
  description:
    'Standard interview questionnaire covering personal motivation, customer perspective, ' +
    'finance, risk-taking, governance (ESG) and needs analysis.',
  version: 1,
  sections: [
    // ── 1. Personal Motivation and Vision ─────────────────────────────────────
    {
      id: 'personal_motivation',
      title: 'Personal Motivation and Vision',
      order: 1,
      questions: [
        {
          id: 'q_about_yourself',
          label: 'Briefly tell us about yourself and your business.',
          type: 'textarea',
          required: true,
          children: [],
        },
        {
          id: 'q_products_services',
          label: 'What products or services does your business offer?',
          type: 'textarea',
          required: true,
          children: [],
        },
        {
          id: 'q_inspiration',
          label: 'What inspired you to start your business?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_who_manages',
          label: 'Who manages your business?',
          type: 'text',
          required: false,
          children: [],
        },
        {
          id: 'q_location',
          label:
            'Where is your business located? Are you currently renting any premises or do you have a lease agreement with the landlord?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_five_years',
          label: 'Where do you see your company in 5 years?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_reading',
          label: 'What are you currently reading?',
          type: 'text',
          required: false,
          children: [],
        },
        {
          id: 'q_social_media',
          label: 'What social media and TV programs do you enjoy watching?',
          type: 'textarea',
          required: false,
          children: [],
        },
      ],
    },

    // ── 2. Customer Perspective ───────────────────────────────────────────────
    {
      id: 'customer_perspective',
      title: 'Customer Perspective',
      order: 2,
      questions: [
        {
          id: 'q_customer_problem',
          label: 'What customer problem are you solving?',
          type: 'textarea',
          required: true,
          children: [],
        },
        {
          id: 'q_target_customers',
          label: 'Who are your target customers?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_reach_customers',
          label: 'How do you reach your customers?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_top_customers',
          label: 'Who are your top 3 paying customers?',
          type: 'text',
          required: false,
          children: [],
        },
      ],
    },

    // ── 3. Finance Perspective ────────────────────────────────────────────────
    {
      id: 'finance_perspective',
      title: 'Finance Perspective',
      order: 3,
      questions: [
        {
          id: 'q_revenue_model',
          label: 'How does your business make money?',
          type: 'textarea',
          required: true,
          children: [],
        },
        {
          id: 'q_monthly_sales',
          label: 'How much sales is your business making per month?',
          type: 'text',
          required: false,
          children: [],
        },
        {
          id: 'q_customer_debt',
          label: 'How much money do customers owe the business?',
          type: 'text',
          required: false,
          children: [],
        },
        {
          id: 'q_income_streams',
          label: 'What is your primary source of income and what other income streams do you have?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_investment',
          label: 'How much money have you invested in your business?',
          type: 'text',
          required: false,
          children: [],
        },
        {
          id: 'q_financial_support',
          label: 'Have you received any financial support — loans, grants, etc.?',
          type: 'boolean',
          required: false,
          children: [
            {
              id: 'q_financial_support_details',
              label: 'Please provide details of the financial support received.',
              type: 'textarea',
              required: false,
              visibleIf: { value: true },
              children: [],
            },
          ],
        },
      ],
    },

    // ── 4. Risk-Taking and Decision-Making ────────────────────────────────────
    {
      id: 'risk_decision_making',
      title: 'Risk-Taking and Decision-Making',
      order: 4,
      questions: [
        {
          id: 'q_current_situation',
          label: 'What is the current situation in your business?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_biggest_challenge',
          label: 'What is the greatest challenge your business has faced?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_overcame_challenge',
          label: 'How did you overcome this challenge?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_innovative_idea',
          label: 'What is the most innovative idea you have implemented in your business?',
          type: 'textarea',
          required: false,
          children: [],
        },
      ],
    },

    // ── 5. Social, Environmental & Governance Perspective ────────────────────
    {
      id: 'governance_esg',
      title: 'Social Perspectives, Environmental & Governance',
      order: 5,
      questions: [
        {
          id: 'q_has_employees',
          label: 'Job creation — do you have employees?',
          type: 'boolean',
          required: true,
          children: [
            {
              id: 'q_employee_count',
              label: 'How many employees do you have?',
              type: 'number',
              required: false,
              visibleIf: { value: true },
              children: [],
            },
            {
              id: 'q_employee_contracts',
              label: 'Do you have employee contracts and provide pay slips?',
              type: 'select',
              options: ['Yes', 'No'],
              required: false,
              visibleIf: { value: true },
              children: [],
            },
          ],
        },
        {
          id: 'q_health_safety',
          label: 'Do you ensure the health and safety of your employees?',
          type: 'select',
          options: ['Yes', 'No'],
          required: false,
          children: [],
        },
        {
          id: 'q_registered_wca',
          label: 'Are you registered with WCA / UIF / SARS PAYE?',
          type: 'select',
          options: ['Yes', 'No'],
          required: false,
          children: [],
        },
        {
          id: 'q_regulatory_requirements',
          label: 'Are there any regulatory requirements in your sector?',
          type: 'select',
          options: ['Yes', 'No'],
          required: false,
          children: [],
        },
        {
          id: 'q_waste',
          label: 'Does your company generate any waste?',
          type: 'select',
          options: ['Yes', 'No', 'N/A'],
          required: false,
          children: [],
        },
        {
          id: 'q_recycling',
          label: 'Do you consider recycling waste generated from your business operations?',
          type: 'select',
          options: ['Yes', 'No', 'N/A'],
          required: false,
          children: [],
        },
        {
          id: 'q_record_keeping',
          label: 'Do you keep records of all your business transactions?',
          type: 'select',
          options: ['Yes', 'No'],
          required: false,
          children: [],
        },
        {
          id: 'q_accounting_system',
          label: 'Are you currently using an accounting system?',
          type: 'select',
          options: ['Yes', 'No'],
          required: false,
          children: [],
        },
        {
          id: 'q_cipc_returns',
          label: 'Are your CIPC annual returns up to date?',
          type: 'select',
          options: ['Yes', 'No'],
          required: false,
          children: [],
        },
      ],
    },

    // ── 6. Needs Analysis ─────────────────────────────────────────────────────
    {
      id: 'needs_analysis',
      title: 'Needs Analysis',
      order: 6,
      questions: [
        {
          id: 'q_business_needs',
          label: 'What are the three things your business needs to grow?',
          type: 'textarea',
          required: false,
          children: [],
        },
        {
          id: 'q_extra_jobs',
          label: 'How many extra jobs will this create?',
          type: 'number',
          required: false,
          children: [],
        },
        {
          id: 'q_sales_increase',
          label: 'How much will your sales increase?',
          type: 'textarea',
          required: false,
          children: [],
        },
      ],
    },
  ],
};

// ─── Exported catalogue ───────────────────────────────────────────────────────

// ─── Due Diligence Checklist ──────────────────────────────────────────────────

const DUE_DILIGENCE: IFormTemplateData = {
  name: 'Due Diligence Checklist',
  description:
    'Compliance validation form for the due diligence stage. ' +
    '3 sections · Application Checklist, Compliance Status, Eligibility Criteria · ' +
    'Conditional date fields, blocking checks and default answers.',
  version: 1,
  sections: [
    // ── 1. Application Checklist ───────────────────────────────────────────────
    {
      id: 'application_checklist',
      title: 'Application Checklist',
      order: 1,
      questions: [
        {
          id: 'id_copy',
          label: 'Certified copy of ID for all directors',
          type: 'boolean',
          required: true,
          default: true,
          isBlocking: true,
        },
        {
          id: 'cipc_docs',
          label: 'CIPC registration documents',
          type: 'boolean',
          required: true,
          default: true,
          isBlocking: true,
        },
        {
          id: 'bank_statements_submitted',
          label: '12 months bank statements submitted',
          type: 'boolean',
          required: true,
          default: true,
          isBlocking: true,
          children: [
            {
              id: 'bank_statement_count',
              label: 'Number of months submitted',
              type: 'number',
              required: false,
              visibleIf: { value: true },
            },
          ],
        },
        {
          id: 'proof_of_address',
          label: 'Proof of address (not older than 3 months)',
          type: 'boolean',
          required: true,
          default: true,
          isBlocking: true,
        },
        {
          id: 'tax_clearance_doc',
          label: 'SARS tax clearance certificate submitted',
          type: 'boolean',
          required: true,
          default: true,
          isBlocking: true,
        },
        {
          id: 'bbbee_doc',
          label: 'B-BBEE certificate submitted',
          type: 'boolean',
          required: true,
          default: true,
        },
      ],
    },
    // ── 2. Compliance Status ───────────────────────────────────────────────────
    {
      id: 'compliance_status',
      title: 'Compliance Status',
      order: 2,
      questions: [
        {
          id: 'bbbee_status',
          label: 'B-BBEE Certificate',
          type: 'select',
          required: true,
          options: ['Valid', 'Expired', 'Missing'],
          default: 'Valid',
          isBlocking: true,
          children: [
            {
              id: 'bbbee_expiry',
              label: 'Expiry Date',
              type: 'date',
              required: false,
              visibleIf: { value: 'Valid' },
            },
          ],
        },
        {
          id: 'tax_clearance_status',
          label: 'SARS Tax Clearance Status (TCS)',
          type: 'select',
          required: true,
          options: ['Valid', 'Expired', 'Missing'],
          default: 'Valid',
          isBlocking: true,
          children: [
            {
              id: 'tax_expiry',
              label: 'Expiry Date',
              type: 'date',
              required: false,
              visibleIf: { value: 'Valid' },
            },
          ],
        },
        {
          id: 'cipc_status',
          label: 'CIPC Registration',
          type: 'select',
          required: true,
          options: ['Valid', 'Expired', 'Non-Compliant'],
          default: 'Valid',
          isBlocking: true,
          children: [
            {
              id: 'cipc_registration_date',
              label: 'Registration Date',
              type: 'date',
              required: false,
            },
            {
              id: 'cipc_next_renewal',
              label: 'Next Renewal / Expiry Date',
              type: 'date',
              required: false,
            },
          ],
        },
        {
          id: 'sars_registered',
          label: 'Registered with SARS',
          type: 'boolean',
          required: true,
          default: true,
          isBlocking: true,
        },
      ],
    },
    // ── 3. Eligibility Criteria ────────────────────────────────────────────────
    {
      id: 'eligibility',
      title: 'Eligibility Criteria',
      order: 3,
      questions: [
        {
          id: 'turnover_limit',
          label: 'Annual turnover not exceeding R500,000',
          type: 'boolean',
          required: true,
          default: true,
          isBlocking: true,
        },
        {
          id: 'proof_of_residence',
          label: 'Proof of residence provided',
          type: 'boolean',
          required: true,
          default: true,
        },
        {
          id: 'tax_pin',
          label: 'Tax clearance certificate and PIN provided',
          type: 'boolean',
          required: true,
          default: true,
          isBlocking: true,
        },
        {
          id: 'business_profile',
          label: 'Business profile submitted',
          type: 'boolean',
          required: true,
          default: true,
        },
        {
          id: 'youth_owned',
          label: 'Youth-owned business',
          type: 'boolean',
          required: false,
        },
        {
          id: 'black_woman_owned',
          label: 'Black woman-owned business',
          type: 'boolean',
          required: false,
        },
      ],
    },
  ],
};

// ─── Pitch Workshop Evaluation ────────────────────────────────────────────────

const PITCH_WORKSHOP: IFormTemplateData = {
  name: 'Pitch Workshop Evaluation',
  description:
    'Assess clarity, readiness and execution potential after the first pitch. ' +
    '4 sections · Presentation, Business Model, Founder Capability, Readiness · ' +
    'rating scales + boolean checks + recommendation decision.',
  version: 1,
  meta: {
    notes_enabled: true,
    decision: {
      field: 'recommendation',
      options: ['Proceed', 'Hold', 'Decline'],
    },
  },
  sections: [
    {
      id: 'presentation',
      title: 'Presentation Assessment',
      order: 1,
      questions: [
        { id: 'problem_clarity',    label: 'Clarity of problem being solved',  type: 'rating', required: false, scale: 5 },
        { id: 'solution_clarity',   label: 'Clarity of solution',              type: 'rating', required: false, scale: 5 },
        { id: 'value_proposition',  label: 'Strength of value proposition',    type: 'rating', required: false, scale: 5 },
      ],
    },
    {
      id: 'business_model',
      title: 'Business Model',
      order: 2,
      questions: [
        { id: 'revenue_model_clear', label: 'Revenue model is clear and realistic', type: 'boolean', required: true },
        { id: 'pricing_viable',      label: 'Pricing strategy is viable',           type: 'boolean', required: true },
      ],
    },
    {
      id: 'founder',
      title: 'Founder Capability',
      order: 3,
      questions: [
        { id: 'founder_confidence', label: 'Founder confidence and communication', type: 'rating', required: false, scale: 5 },
        { id: 'execution_ability',  label: 'Ability to execute',                   type: 'rating', required: false, scale: 5 },
      ],
    },
    {
      id: 'readiness',
      title: 'Business Readiness',
      order: 4,
      questions: [
        { id: 'traction_present', label: 'Business shows traction', type: 'boolean', required: true },
        { id: 'scalable',         label: 'Business is scalable',    type: 'boolean', required: true },
      ],
    },
  ],
};

// ─── Panel Pitch Evaluation ───────────────────────────────────────────────────

const PANEL_PITCH: IFormTemplateData = {
  name: 'Panel Pitch Evaluation',
  description:
    'Final evaluation before approval — higher scrutiny, structured scoring. ' +
    '4 sections · Business Strength, Financial Viability, Impact, Risk · ' +
    'rating scales, select risk levels + final decision.',
  version: 1,
  meta: {
    notes_enabled: true,
    decision: {
      field: 'final_decision',
      options: ['Approve', 'Decline', 'Defer'],
    },
  },
  sections: [
    {
      id: 'business_strength',
      title: 'Business Strength',
      order: 1,
      questions: [
        { id: 'market_demand',         label: 'Market demand is strong',         type: 'rating', required: false, scale: 5 },
        { id: 'competitive_advantage', label: 'Has a clear competitive advantage', type: 'rating', required: false, scale: 5 },
      ],
    },
    {
      id: 'financial_viability',
      title: 'Financial Viability',
      order: 2,
      questions: [
        { id: 'revenue_potential', label: 'Revenue growth potential',       type: 'rating',  required: false, scale: 5 },
        { id: 'cost_structure',    label: 'Cost structure is sustainable',  type: 'boolean', required: true },
      ],
    },
    {
      id: 'impact',
      title: 'Impact Assessment',
      order: 3,
      questions: [
        { id: 'job_creation',    label: 'Job creation potential', type: 'rating', required: false, scale: 5 },
        { id: 'community_impact', label: 'Community impact',       type: 'rating', required: false, scale: 5 },
      ],
    },
    {
      id: 'risk',
      title: 'Risk Evaluation',
      order: 4,
      questions: [
        {
          id: 'operational_risk',
          label: 'Operational risk level',
          type: 'select',
          required: true,
          options: ['Low', 'Medium', 'High'],
        },
        {
          id: 'financial_risk',
          label: 'Financial risk level',
          type: 'select',
          required: true,
          options: ['Low', 'Medium', 'High'],
        },
      ],
    },
  ],
};

// ─── Approval Summary ─────────────────────────────────────────────────────────

const APPROVAL_SUMMARY: IFormTemplateData = {
  name: 'Approval Summary',
  description:
    'Post-decision capture for approved applicants. ' +
    '3 sections · Funding Details, Conditions, Post-Investment Monitoring · ' +
    'currency input, conditional condition details, reporting schedule.',
  version: 1,
  meta: { notes_enabled: true },
  sections: [
    {
      id: 'funding',
      title: 'Funding Details',
      order: 1,
      questions: [
        { id: 'approved_amount', label: 'Approved funding amount', type: 'currency', required: true },
        {
          id: 'disbursement_type',
          label: 'Disbursement type',
          type: 'select',
          required: true,
          options: ['Once-off', 'Milestone-based'],
        },
      ],
    },
    {
      id: 'conditions',
      title: 'Conditions',
      order: 2,
      questions: [
        {
          id: 'conditions_attached',
          label: 'Are there conditions attached?',
          type: 'boolean',
          required: true,
          children: [
            {
              id: 'conditions_details',
              label: 'Condition details',
              type: 'textarea',
              required: false,
              visibleIf: { value: true },
            },
          ],
        },
      ],
    },
    {
      id: 'monitoring',
      title: 'Post-Investment Monitoring',
      order: 3,
      questions: [
        {
          id: 'reporting_frequency',
          label: 'Reporting frequency',
          type: 'select',
          required: true,
          options: ['Monthly', 'Quarterly'],
          default: 'Monthly',
        },
      ],
    },
  ],
};

// ─── Decline Reason ───────────────────────────────────────────────────────────

const DECLINE_REASON: IFormTemplateData = {
  name: 'Decline Reason',
  description:
    'Audit trail and insight capture for declined applications. ' +
    '2 sections · Decline Reason, Feedback to Applicant · ' +
    'structured reason select + reapplication flag.',
  version: 1,
  meta: { notes_enabled: true },
  sections: [
    {
      id: 'reason',
      title: 'Decline Reason',
      order: 1,
      questions: [
        {
          id: 'primary_reason',
          label: 'Primary reason for decline',
          type: 'select',
          required: true,
          options: [
            'Non-compliant',
            'Low viability',
            'High risk',
            'Incomplete documentation',
            'Other',
          ],
        },
        {
          id: 'detailed_reason',
          label: 'Detailed explanation',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      id: 'feedback',
      title: 'Feedback to Applicant',
      order: 2,
      questions: [
        { id: 'feedback_text', label: 'Feedback provided',             type: 'textarea', required: false },
        { id: 'can_reapply',   label: 'Can the applicant reapply?',    type: 'boolean',  required: true },
      ],
    },
  ],
};

// ─── Stage 3: Investment Pitch – Judge Evaluation Sheet ──────────────────────

const STAGE3_INVESTMENT_PITCH_JUDGE: IFormTemplateData = {
  name: 'Stage 3 — Investment Pitch Judge Evaluation',
  description:
    'Official judge evaluation sheet used at Stage 3 investment pitches. ' +
    '9 criteria scored 1–5 each (min 9 · avg 27 · max 45) · per-criterion notes · ' +
    'panel setup with judge names · Approve / Decline / Defer decision.',
  version: 1,
  built_in_key: 'stage3_investment_pitch_judge_v1',
  meta: {
    notes_enabled: true,
    decision: {
      field: 'final_decision',
      options: ['Approve', 'Decline', 'Defer'],
    },
  },
  sections: [
    {
      id: 'panel_setup',
      title: 'Panel Setup',
      order: 1,
      questions: [
        {
          id: 'judge_name',
          label: 'Judge Name',
          type: 'select',
          required: true,
          options: ['Marius W (Convener)', 'Celamandla B', 'Nellenie N'],
        },
        { id: 'pitch_date',  label: 'Pitch Date',                      type: 'date',    required: true  },
        { id: 'time_slot',   label: 'Time Slot (e.g. 10:15 – 10:30)',  type: 'text',    required: false },
        { id: 'check_in',    label: 'Presenter checked in?',           type: 'boolean', required: true  },
      ],
    },
    {
      id: 'investment_criteria',
      title: 'Investment Criteria (9 × 1–5)',
      order: 2,
      questions: [
        // ── Criterion 1 ──────────────────────────────────────────────────────
        {
          id: 'c1_business_background',
          label: '1. Business Background — How much sense does this business make?',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c1_notes', label: 'Comments / Notes', type: 'textarea', required: false },

        // ── Criterion 2 ──────────────────────────────────────────────────────
        {
          id: 'c2_location',
          label: '2. Location (S32 requirement) — Where are you currently operating from? (Lease or own)',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c2_notes', label: 'Comments / Notes', type: 'textarea', required: false },

        // ── Criterion 3 ──────────────────────────────────────────────────────
        {
          id: 'c3_problem',
          label: '3. Problem or Need — The problem is real; potential customers have significant pain or large unfulfilled needs.',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c3_notes', label: 'Comments / Notes', type: 'textarea', required: false },

        // ── Criterion 4 ──────────────────────────────────────────────────────
        {
          id: 'c4_solution',
          label: '4. Solution — How will the company address the identified problem or need?',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c4_notes', label: 'Comments / Notes', type: 'textarea', required: false },

        // ── Criterion 5 ──────────────────────────────────────────────────────
        {
          id: 'c5_current_situation',
          label: '5. Current Situation — What is the current situation in the business?',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c5_notes', label: 'Comments / Notes', type: 'textarea', required: false },

        // ── Criterion 6 ──────────────────────────────────────────────────────
        {
          id: 'c6_business_needs',
          label: '6. Business Needs — How will this investment solve the current situation?',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c6_notes', label: 'Comments / Notes', type: 'textarea', required: false },

        // ── Criterion 7 ──────────────────────────────────────────────────────
        {
          id: 'c7_investment_plan',
          label: '7. Investment Plan — Is the plan reasonable given the stage and size of the business?',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c7_notes', label: 'Comments / Notes', type: 'textarea', required: false },

        // ── Criterion 8 ──────────────────────────────────────────────────────
        {
          id: 'c8_roi',
          label: '8. Return on Investment — Growth Potential: What are the future plans?',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c8_notes', label: 'Comments / Notes', type: 'textarea', required: false },

        // ── Criterion 9 ──────────────────────────────────────────────────────
        {
          id: 'c9_presentation',
          label: '9. Overall Presentation & Q&A — Clear, convincing, engaging, passionate, handled Q&A effectively, knows facts and numbers, honest, likeable.',
          type: 'rating',
          scale: 5,
          required: true,
        },
        { id: 'c9_notes', label: 'Comments / Notes', type: 'textarea', required: false },
      ],
    },
  ],
};

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: 'stage3_investment_pitch_judge_v1',
    name: 'Stage 3 — Investment Pitch Judge Evaluation',
    description:
      'Official judge evaluation sheet for Stage 3 investment pitches. ' +
      '9 criteria scored 1–5 · panel setup · per-criterion notes · Approve / Decline / Defer.',
    color: 'orange',
    data: STAGE3_INVESTMENT_PITCH_JUDGE,
  },
  {
    key: 'enterprise_development_interview',
    name: 'Enterprise Development Interview',
    description:
      'Full interview questionnaire for enterprise development grant fund applicants. ' +
      '6 sections · 33 questions · conditional follow-ups included.',
    color: 'violet',
    data: ENTERPRISE_INTERVIEW,
  },
  {
    key: 'due_diligence_checklist',
    name: 'Due Diligence Checklist',
    description:
      'Compliance validation form for the due diligence stage. ' +
      '3 sections · Application Checklist, Compliance Status, Eligibility Criteria · ' +
      'boolean checks, conditional date fields, default answers.',
    color: 'teal',
    data: DUE_DILIGENCE,
  },
  {
    key: 'pitch_workshop_v1',
    name: 'Pitch Workshop Evaluation',
    description:
      'Assess clarity, readiness and execution potential after the first pitch. ' +
      '4 sections · rating scales, boolean checks, recommendation decision.',
    color: 'blue',
    data: PITCH_WORKSHOP,
  },
  {
    key: 'panel_pitch_v1',
    name: 'Panel Pitch Evaluation',
    description:
      'Final panel evaluation before approval — structured scoring with risk levels ' +
      'and an Approve / Decline / Defer decision.',
    color: 'orange',
    data: PANEL_PITCH,
  },
  {
    key: 'approval_summary_v1',
    name: 'Approval Summary',
    description:
      'Post-decision form for approved applicants. Captures funding amount, ' +
      'disbursement type, conditions and reporting frequency.',
    color: 'green',
    data: APPROVAL_SUMMARY,
  },
  {
    key: 'decline_reason_v1',
    name: 'Decline Reason',
    description:
      'Audit trail for declined applications. Structured decline reason, ' +
      'detailed explanation and applicant feedback capture.',
    color: 'orange',
    data: DECLINE_REASON,
  },
];

