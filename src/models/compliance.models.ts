// Compliance Questionnaire Models
export interface ComplianceQuestionnaire {
  id?: string;
  company_id: string;
  last_updated: Date;
  compliance_items: ComplianceItem[];
  overall_compliance_score: number;
  notes?: string;
}

export interface ComplianceItem {
  id: string;
  sustainability_brick_name: string;
  description: string;
  status: ComplianceStatus;
  notes?: string;
  due_date?: string;
  evidence_file?: string;
  responsible_person?: string;
  priority: CompliancePriority;
  category: ComplianceCategory;
}

export type ComplianceStatus = 'yes' | 'no' | 'na' | 'pending';
export type CompliancePriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceCategory =
  | 'financial'
  | 'legal'
  | 'employment'
  | 'tax'
  | 'insurance'
  | 'intellectual_property'
  | 'health_safety'
  | 'regulatory';

// Default compliance items based on the spreadsheet
export const DEFAULT_COMPLIANCE_ITEMS: Omit<ComplianceItem, 'id'>[] = [
  {
    sustainability_brick_name: 'Bookkeeper',
    description: 'Has an appointed monthly bookkeeper that processes business finances. Either has a Raizcorp Bookkeeper, External Bookkeeper, Internal Bookkeeper or can evidence that he does his own books',
    status: 'pending',
    priority: 'high',
    category: 'financial'
  },
  {
    sustainability_brick_name: 'Accounting System',
    description: 'Has in-house accounting software or bookkeeper and uses software such Sage, Xero or similar (Not Microsoft Excel)',
    status: 'pending',
    priority: 'high',
    category: 'financial'
  },
  {
    sustainability_brick_name: 'Anti-Virus Software',
    description: 'Has legal, current and paid-for antivirus software loaded on all company computers and servers',
    status: 'pending',
    priority: 'medium',
    category: 'regulatory'
  },
  {
    sustainability_brick_name: 'Industry Specific Regulatory Compliance',
    description: 'Meets specific compliance requirements based on business / industry research. Can evidence that he has industry specific certifications or accreditations',
    status: 'pending',
    priority: 'critical',
    category: 'regulatory'
  },
  {
    sustainability_brick_name: '12 Months Management Accounts',
    description: 'Can produce professional, up to date and high quality management accounts for the last 12 months',
    status: 'pending',
    priority: 'high',
    category: 'financial'
  },
  {
    sustainability_brick_name: 'Getting Compliant',
    description: 'Has an understanding of the legal compliance landscape especially with respect to employment of staff:- e.g., BCEA,SDL,OHS, EE, Tax',
    status: 'pending',
    priority: 'high',
    category: 'legal'
  },
  {
    sustainability_brick_name: 'Policy File',
    description: 'Has a central digital or paper - based policy file in which policies are filed and can be easily accessed',
    status: 'pending',
    priority: 'medium',
    category: 'legal'
  },
  {
    sustainability_brick_name: 'Payroll System',
    description: 'Has an effective payroll system that does all statutory calculations or has an outsourced payroll service provider',
    status: 'pending',
    priority: 'high',
    category: 'employment'
  },
  {
    sustainability_brick_name: 'PAYE Registered and Paid',
    description: 'All staff are registered for PAYE. All outstanding PAYE is paid',
    status: 'pending',
    priority: 'critical',
    category: 'tax'
  },
  {
    sustainability_brick_name: 'Basic Conditions of Employment Compliance',
    description: 'The company meets Basic Conditions of Employment Legislative Compliance requirements',
    status: 'pending',
    priority: 'critical',
    category: 'employment'
  },
  {
    sustainability_brick_name: 'Unemployment Insurance Registered and Paid',
    description: 'The company is registered with The Unemployment Insurance Fund and all outstanding Unemployment Insurance for employees is paid',
    status: 'pending',
    priority: 'critical',
    category: 'employment'
  },
  {
    sustainability_brick_name: 'SDL Registered and Paid',
    description: 'The company is registered to pay Skills Development Levies for its employees and all outstanding Skills Development Levies are paid',
    status: 'pending',
    priority: 'high',
    category: 'employment'
  },
  {
    sustainability_brick_name: 'Leave Policy',
    description: 'The legal leave policy has been put in place by the company',
    status: 'pending',
    priority: 'medium',
    category: 'employment'
  },
  {
    sustainability_brick_name: 'Company Tax Registered and Paid',
    description: 'The company is registered to pay company tax and all outstanding company tax is paid',
    status: 'pending',
    priority: 'critical',
    category: 'tax'
  },
  {
    sustainability_brick_name: 'Registered Patents, Trademarks and Copyrights',
    description: 'The company has valuable Intellectual Property, that is patented / registered or copyright protected',
    status: 'pending',
    priority: 'low',
    category: 'intellectual_property'
  },
  {
    sustainability_brick_name: 'Logo Registration',
    description: 'The company has a logo and name and logo are registered with CIPC',
    status: 'pending',
    priority: 'low',
    category: 'intellectual_property'
  },
  {
    sustainability_brick_name: 'Management Pack',
    description: 'The company has a standardised management pack used to report on the overall status of the business on a monthly / quarterly basis',
    status: 'pending',
    priority: 'medium',
    category: 'financial'
  },
  {
    sustainability_brick_name: 'Short Term Insurance',
    description: 'The company has a short-term insurance policy to cover assets',
    status: 'pending',
    priority: 'medium',
    category: 'insurance'
  },
  {
    sustainability_brick_name: 'Employment Equity',
    description: 'The company meets Employment Equity compliance requirements (employs 50 or more employees or exceeds annual turnover threshold for your sector)',
    status: 'pending',
    priority: 'high',
    category: 'employment'
  },
  {
    sustainability_brick_name: 'Occupational Health & Safety',
    description: 'The company meets Occupational Health and Safety requirements',
    status: 'pending',
    priority: 'critical',
    category: 'health_safety'
  },
  {
    sustainability_brick_name: 'COIDA',
    description: 'Has a current compensation certificate for occupational injuries and diseases at the company',
    status: 'pending',
    priority: 'critical',
    category: 'health_safety'
  },
  {
    sustainability_brick_name: 'VAT Registered',
    description: 'Renewal of company VAT registration',
    status: 'pending',
    priority: 'high',
    category: 'tax'
  },
  {
    sustainability_brick_name: 'VAT Paid',
    description: 'Payment of company VAT',
    status: 'pending',
    priority: 'critical',
    category: 'tax'
  }
];

// Helper functions
export function initComplianceQuestionnaire(companyId: string): ComplianceQuestionnaire {
  return {
    company_id: companyId,
    last_updated: new Date(),
    compliance_items: DEFAULT_COMPLIANCE_ITEMS.map((item, index) => ({
      ...item,
      id: `compliance_${index + 1}`
    })),
    overall_compliance_score: 0,
    notes: ''
  };
}

export function calculateComplianceScore(items: ComplianceItem[]): number {
  const applicableItems = items.filter(item => item.status !== 'na');
  if (applicableItems.length === 0) return 0;

  const compliantItems = applicableItems.filter(item => item.status === 'yes');
  return Math.round((compliantItems.length / applicableItems.length) * 100);
}

export function getComplianceStatusColor(status: ComplianceStatus): string {
  switch (status) {
    case 'yes': return 'text-green-600 bg-green-100';
    case 'no': return 'text-red-600 bg-red-100';
    case 'na': return 'text-gray-600 bg-gray-100';
    case 'pending': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export function getPriorityColor(priority: CompliancePriority): string {
  switch (priority) {
    case 'critical': return 'text-red-800 bg-red-100 border-red-200';
    case 'high': return 'text-orange-800 bg-orange-100 border-orange-200';
    case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
    case 'low': return 'text-green-800 bg-green-100 border-green-200';
    default: return 'text-gray-800 bg-gray-100 border-gray-200';
  }
}

export function getCategoryIcon(category: ComplianceCategory): string {
  switch (category) {
    case 'financial': return '💰';
    case 'legal': return '⚖️';
    case 'employment': return '👥';
    case 'tax': return '🏛️';
    case 'insurance': return '🛡️';
    case 'intellectual_property': return '💡';
    case 'health_safety': return '🛡️';
    case 'regulatory': return '📋';
    default: return '📄';
  }
}
