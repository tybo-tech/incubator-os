export interface ExpenditureInvoice {
  id: string;
  invoice_number: string;
  description: string;
  supplier_name: string;
  amount_excl_vat: number;
  vat_amount: number;
  total_amount: number;
  preferred_supplier: boolean;
}

export interface AuthorizationSignature {
  name: string;
  signature: string;
  date?: string;
}

export interface PaymentRelease {
  released_by: string;
  signature: string;
  release_date?: string;
}

export interface GrantExpenditureAuthorization {
  company_name: string;
  director_name: string;
  contact_number: string;
  registration_number: string;

  invoices: ExpenditureInvoice[];

  beneficiary_authorization: AuthorizationSignature;
  business_advisor_authorization: AuthorizationSignature;

  coordinator_authorization: AuthorizationSignature;
  south32_spa_authorization: AuthorizationSignature;
  manager_authorization: AuthorizationSignature;

  payment_release: PaymentRelease;
}

export const DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION: GrantExpenditureAuthorization = {
  company_name: '',
  director_name: '',
  contact_number: '',
  registration_number: '',

  invoices: [],

  beneficiary_authorization: {
    name: '',
    signature: '',
    date: ''
  },

  business_advisor_authorization: {
    name: 'Marius Wilken',
    signature: '',
    date: ''
  },

  coordinator_authorization: {
    name: '',
    signature: '',
    date: ''
  },

  south32_spa_authorization: {
    name: '',
    signature: '',
    date: ''
  },

  manager_authorization: {
    name: '',
    signature: '',
    date: ''
  },

  payment_release: {
    released_by: '',
    signature: '',
    release_date: ''
  }
};