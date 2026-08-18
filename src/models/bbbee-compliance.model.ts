export interface IBBBEECompliance {
  assessmentPeriod: string;
  verificationDate: string;
  certificateIssueDate?: string;
  certificateExpiryDate?: string;
  status: string;
  score?: number;
  level?: string;
  notes?: string;
}
