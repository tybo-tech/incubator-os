import {
  IGrantApplicationData,
  IGrantComplianceData,
  IGrantBankStatementData,
  IWorkflow,
} from './grant-application.interfaces';

export interface ApplicantOverview {
  application: {
    id?: number;
    type: string;
    data: IGrantApplicationData;
    company_id?: number | null;
    parent_id?: number | null;
    created_by?: number | null;
    updated_by?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  workflow: {
    id?: number;
    type: string;
    data: IWorkflow;
  }[];
  bank_statements: {
    id?: number;
    type: string;
    data: IGrantBankStatementData;
    parent_id?: number;
  }[];
  compliance: {
    id?: number;
    type: string;
    data: IGrantComplianceData;
    parent_id?: number;
  }[];
  scm_verification: any[];
  dd_answers: Record<string, any> | null;
}
