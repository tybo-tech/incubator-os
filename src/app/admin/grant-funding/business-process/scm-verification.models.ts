export interface ScmQuotation {
  id: string;
  supplier_name: string;
  date_received?: string;
  beneficiary_signature?: string;
  comments?: string;
}

export interface ScmSupplierVerification {
  id: string;
  supplier_name: string;
  cipc_registration?: string;
  vat_number?: string;
  verification_details?: string;
  approved?: boolean;
  comments?: string;
}

export interface ScmPurchaseOrder {
  id: string;
  supplier_name: string;
  purchase_order_generated: boolean;
  emailed_to_supplier_date?: string;
  tax_invoice_received: boolean;
  bbbee_certificate_received: boolean;
  bank_confirmation_received: boolean;
  tax_clearance_received: boolean;
  approved: boolean;
  comments?: string;
}

export interface ScmPayment {
  id: string;
  company_name: string;
  director: string;
  contact_number: string;
  vat_invoice_received: boolean;
  bank_confirmation_received: boolean;
  payment_authorisation_signed: boolean;
  payment_request_date?: string;
  payment_done: boolean;
  proof_of_payment_sent: boolean;
  delivery_note_received: boolean;
}

export interface ScmVerificationStep<T> {
  items: T[];
  verified_by?: string;
  signature?: string;
}

export interface GrantScmVerification {
  beneficiary_company_name: string;
  director: string;
  contact_number: string;
  
  step_1: ScmVerificationStep<ScmQuotation>;
  step_2: ScmVerificationStep<ScmSupplierVerification>;
  step_3: ScmVerificationStep<ScmPurchaseOrder>;
  step_4: ScmVerificationStep<ScmPayment>;
}

export const DEFAULT_GRANT_SCM_VERIFICATION: GrantScmVerification = {
  beneficiary_company_name: '',
  director: '',
  contact_number: '',
  
  step_1: {
    items: [],
    verified_by: '',
    signature: ''
  },
  step_2: {
    items: [],
    verified_by: '',
    signature: ''
  },
  step_3: {
    items: [],
    verified_by: '',
    signature: ''
  },
  step_4: {
    items: [],
    verified_by: '',
    signature: ''
  }
};