export interface IFundingPayment {
  paymentNumber: number;
  amount: number;
}

export interface ISeedFunding {
  companyName?: string;
  approvedAmount: number;
  disbursedAmount: number;
  remainingBalance: number;
  payments: IFundingPayment[];
}
