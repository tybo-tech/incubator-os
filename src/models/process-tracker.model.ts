export interface IProcessTracker {
  companyName?: string;
  numberOfTransactions: number;
  steps: {
    quotesReceived: boolean;
    suppliersVerified: boolean;
    purchaseOrderGenerated: boolean;
    invoicesReceived: boolean;
    expenseAuthorizationSigned: boolean;
    acknowledgementOfDeliverySigned: boolean;
    supportingDocumentsLoaded: boolean;
  };
  amountDisbursed: number;
  completionPercentage: number;
}
