// models/grant-funding.models.ts

/**
 * 💰 Grant Funding Models
 * Tracks grant funding requests, approvals, and disbursements.
 * Stored as INode<GrantFundingRequestData> with type = 'grant_funding_request'
 */

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'advisor_approved'
  | 'coordinator_approved'
  | 'manager_approved'
  | 'payment_released';

export type ApprovalRole =
  | 'director'
  | 'business_advisor'
  | 'esd_coordinator'
  | 'esd_manager';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type PaymentStatus = 'pending' | 'released';

export interface GrantFundingRequestData {
  request_title: string;
  grant_program: string;
  status: RequestStatus;
  request_date: string;
  currency: string;
  totals: FundingTotals;
  line_items: FundingLineItem[];
  approvals: Approval[];
  payment: PaymentInfo;
  documents: FundingDocument[];
  company_id: string;
  is_complete: boolean;
  last_updated: string;
  created_date: string;
}

export interface FundingTotals {
  total_excl_vat: number;
  total_vat: number;
  total_incl_vat: number;
  grant_budget: number;
}

export interface FundingLineItem {
  id: number;
  invoice_number: string;
  description: string;
  supplier: Supplier;
  amount_excl_vat: number;
  vat_amount: number;
  total_amount: number;
  documents: FundingDocument[];
}

export interface Supplier {
  name: string;
  preferred_supplier: boolean;
}

export interface Approval {
  role: ApprovalRole;
  name: string;
  status: ApprovalStatus;
  signature: string | null;
  approval_date: string | null;
}

export interface PaymentInfo {
  status: PaymentStatus;
  released_by: string | null;
  payment_reference: string | null;
  payment_release_date: string | null;
}

export interface FundingDocument {
  type: string;
  file_name: string;
  uploaded_at: string;
}

/** Factory — returns a blank request ready for use */
export function initGrantFundingRequest(companyId: string): GrantFundingRequestData {
  const now = new Date().toISOString();
  return {
    request_title: '',
    grant_program: '',
    status: 'draft',
    request_date: now,
    currency: 'ZAR',
    totals: {
      total_excl_vat: 0,
      total_vat: 0,
      total_incl_vat: 0,
      grant_budget: 0,
    },
    line_items: [],
    approvals: [],
    payment: {
      status: 'pending',
      released_by: null,
      payment_reference: null,
      payment_release_date: null,
    },
    documents: [],
    company_id: companyId,
    is_complete: false,
    last_updated: now,
    created_date: now,
  };
}

export function initLineItem(): FundingLineItem {
  return {
    id: Date.now(),
    invoice_number: '',
    description: '',
    supplier: { name: '', preferred_supplier: false },
    amount_excl_vat: 0,
    vat_amount: 0,
    total_amount: 0,
    documents: [],
  };
}

export function initApproval(role: ApprovalRole, name = ''): Approval {
  return { role, name, status: 'pending', signature: null, approval_date: null };
}

export const DEFAULT_APPROVALS: { role: ApprovalRole; label: string }[] = [
  { role: 'director',         label: 'Director' },
  { role: 'business_advisor', label: 'Business Advisor' },
  { role: 'esd_coordinator',  label: 'ESD Coordinator' },
  { role: 'esd_manager',      label: 'ESD Manager' },
];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft:                'Draft',
  submitted:            'Submitted',
  advisor_approved:     'Advisor Approved',
  coordinator_approved: 'Coordinator Approved',
  manager_approved:     'Manager Approved',
  payment_released:     'Payment Released',
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  draft:                'bg-gray-100 text-gray-700',
  submitted:            'bg-blue-100 text-blue-700',
  advisor_approved:     'bg-yellow-100 text-yellow-800',
  coordinator_approved: 'bg-orange-100 text-orange-800',
  manager_approved:     'bg-purple-100 text-purple-800',
  payment_released:     'bg-green-100 text-green-800',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending:  'bg-gray-100 text-gray-600',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
