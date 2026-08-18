export interface MentorshipSession {
  id?: number;
  companyId: number;
  mentorId: number;
  mentorName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  category: string;
  topic: string;
  activities: string;
  outcomes: string;
  nextActions: string;
  durationHours: number;
  hourlyRate: number;
  sessionValue: number;
  deliveryMethod: string;
  location: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MentorshipSessionSummary {
  totalSessions: number;
  totalHours: number;
  totalValue: number;
  lastSessionDate: string | null;
  recentSessions: MentorshipSession[];
}

export interface MentorshipSessionFormData {
  sessionDate: string;
  startTime: string;
  endTime: string;
  category: string;
  topic: string;
  activities: string;
  outcomes: string;
  nextActions: string;
  durationHours: number;
  hourlyRate: number;
  sessionValue: number;
  deliveryMethod: string;
  location: string;
  status: string;
}

export const SESSION_CATEGORIES = [
  'Operations',
  'Marketing',
  'Sales',
  'Financial Management',
  'Compliance',
  'Human Resources',
  'Strategy',
  'Product Development',
  'Other'
];

export const DELIVERY_METHODS = [
  'In-Person',
  'Virtual',
  'Phone',
  'Site Visit',
  'Workshop',
  'Other'
];

export const SESSION_STATUSES = [
  'Completed',
  'Cancelled',
  'Rescheduled'
];
