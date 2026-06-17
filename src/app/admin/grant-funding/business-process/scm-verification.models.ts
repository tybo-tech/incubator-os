export interface ScmSupplierContactDetails {
  phone?: string;
  email?: string;
  address?: string;
  verified?: boolean;
}

export interface ScmOnlineVerification {
  cipc_registration?: string;
  cipc_verified?: boolean;
  vat_number?: string;
  vat_verified?: boolean;
  contact_details: ScmSupplierContactDetails;
  approved?: boolean;
  comments?: string;
}

export interface ScmPurchaseOrderProcessing {
  purchase_order_generated?: boolean;
  emailed_to_supplier_date?: string;
  tax_invoice_received?: boolean;
  bbbee_certificate_received?: boolean;
  bank_confirmation_received?: boolean;
  tax_clearance_received?: boolean;
  approved?: boolean;
  comments?: string;
}

export interface ScmPaymentProcessing {
  vat_invoice_received?: boolean;
  bank_confirmation_received?: boolean;
  payment_authorisation_signed?: boolean;
  payment_request_date?: string;
  payment_done?: boolean;
  proof_of_payment_sent?: boolean;
  delivery_note_received?: boolean;
  comments?: string;
}

export interface ScmQuotation {
  id: string;
  supplier_name: string;
  date_received?: string;
  beneficiary_signature?: string;
  comments?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  // Step 2: Online Verification of Suppliers
  online_verification?: ScmOnlineVerification;
  // Step 3: Processing of Verified Quotations (Generate PO)
  purchase_order_processing?: ScmPurchaseOrderProcessing;
  // Step 4: Processing of Payment Authorization/Payment
  payment_processing?: ScmPaymentProcessing;
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
  
  // Only one step now as all other information is contained within quotations
  quotations: ScmVerificationStep<ScmQuotation>;
}

export const DEFAULT_GRANT_SCM_VERIFICATION: GrantScmVerification = {
  beneficiary_company_name: '',
  director: '',
  contact_number: '',
  
  quotations: {
    items: [],
    verified_by: '',
    signature: ''
  }
};