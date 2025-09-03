// models/session.models.ts - Session tracking models

export interface SessionFeedback {
  id?: number;
  company_id: number;
  session_date: string;
  session_rating: number; // 1-5 rating
  key_takeaways: string;
  next_session_focus: string;
  other_comments?: string;
  client_signature?: string;
  consultant_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SessionSummary {
  total_sessions: number;
  last_session_date: string | null;
  average_rating: number;
  recent_sessions: SessionFeedback[];
}

export interface SessionFormData {
  session_date: string;
  session_rating: number;
  key_takeaways: string;
  next_session_focus: string;
  other_comments: string;
  client_signature: string;
  consultant_name: string;
  is_submitting: boolean;
}
