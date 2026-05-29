export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ProjectMember {
  id: number;
  name: string;
  role: string;
  avatar?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  category: string;
  startDate: string;
  dueDate: string;
  progress: number;       // 0–100
  budget: number;
  spent: number;
  manager: string;
  members: ProjectMember[];
  tags: string[];
  tasksTotal: number;
  tasksDone: number;
  createdAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  category: string;
  startDate: string;
  dueDate: string;
  budget: number;
  manager: string;
  tags: string[];
}
