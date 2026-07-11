export interface IBusinessAssessment {
  level: number;
  requirements: {
    registration: boolean;
    taxCompliance: boolean;
    businessPlan: boolean;
    youthOwned: boolean;
    bankAccount: boolean;
  };
  funding: {
    requestedAmount: number;
    approved: boolean;
    paid: boolean;
  };
  score: number;
}
