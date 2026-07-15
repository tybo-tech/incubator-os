export interface IProcessTracker {
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
