export enum ChecklistResponse {
  YES = 'YES',
  NO = 'NO',
  NA = 'NA',
}

export interface GrantFundingChecklistItem {
  id: string;
  label: string;
  answer: ChecklistResponse | null;
}

export interface GrantFundingChecklist {
  scmVerificationProcessChecklist: ChecklistResponse | null;
  expenditureAuthorizationForm: ChecklistResponse | null;
  businessSupportAcknowledgementLetter: ChecklistResponse | null;
  esdEdAgreement: ChecklistResponse | null;
  termsAndConditionsForDisbursement: ChecklistResponse | null;
  acknowledgementOfDelivery: ChecklistResponse | null;
  purchaseOrder: ChecklistResponse | null;
  quotations: ChecklistResponse | null;
  taxInvoices: ChecklistResponse | null;
  proofOfPaymentToSupplier: ChecklistResponse | null;
  bankConfirmation: ChecklistResponse | null;
  bbbee: ChecklistResponse | null;
  taxPin: ChecklistResponse | null;
  beneficiaryIdCopies: ChecklistResponse | null;
  companyRegistrationDocument: ChecklistResponse | null;
}

export const DEFAULT_GRANT_FUNDING_CHECKLIST: GrantFundingChecklist = {
  scmVerificationProcessChecklist: null,
  expenditureAuthorizationForm: null,
  businessSupportAcknowledgementLetter: null,
  esdEdAgreement: null,
  termsAndConditionsForDisbursement: null,
  acknowledgementOfDelivery: null,
  purchaseOrder: null,
  quotations: null,
  taxInvoices: null,
  proofOfPaymentToSupplier: null,
  bankConfirmation: null,
  bbbee: null,
  taxPin: null,
  beneficiaryIdCopies: null,
  companyRegistrationDocument: null,
};

export const GRANT_FUNDING_CHECKLIST_FIELDS = [
  {
    key: 'scmVerificationProcessChecklist',
    label: 'SCM Verification Process Checklist',
  },
  {
    key: 'expenditureAuthorizationForm',
    label: 'Expenditure Authorization Form',
  },
  {
    key: 'businessSupportAcknowledgementLetter',
    label: 'Business Support Acknowledgement Letter',
  },
  {
    key: 'esdEdAgreement',
    label: 'ESD ED Agreement',
  },
  {
    key: 'termsAndConditionsForDisbursement',
    label: 'Terms and Conditions for Disbursement of ESD Grant Funding',
  },
  {
    key: 'acknowledgementOfDelivery',
    label: 'Acknowledgement of Delivery',
  },
  {
    key: 'purchaseOrder',
    label: 'Purchase Order',
  },
  {
    key: 'quotations',
    label: 'Quotation/s',
  },
  {
    key: 'taxInvoices',
    label: 'Tax Invoice/s',
  },
  {
    key: 'proofOfPaymentToSupplier',
    label: 'Proof of Payment to Supplier',
  },
  {
    key: 'bankConfirmation',
    label: 'Bank Confirmation',
  },
  {
    key: 'bbbee',
    label: 'BBBEE',
  },
  {
    key: 'taxPin',
    label: 'Tax Pin',
  },
  {
    key: 'beneficiaryIdCopies',
    label: 'Beneficiary ID Copy (All Company Directors)',
  },
  {
    key: 'companyRegistrationDocument',
    label: 'Company Registration Document',
  },
] as const;