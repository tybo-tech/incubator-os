export interface IFundingPayment {
  paymentNumber: number;
  amount: number;
}

export interface ISeedFunding {
  approvedAmount: number;
  disbursedAmount: number;
  remainingBalance: number;
  payments: IFundingPayment[];
}
