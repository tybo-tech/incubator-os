import { Injectable, signal } from '@angular/core';
import { Project, CreateProjectPayload } from './project.interfaces';

const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Incubator Onboarding Portal',
    description: 'Build a self-service onboarding portal for new incubatees, covering KYC capture, document uploads and compliance checklists.',
    status: 'active',
    priority: 'high',
    category: 'Technology',
    startDate: '2026-01-15',
    dueDate: '2026-07-31',
    progress: 62,
    budget: 280000,
    spent: 173600,
    manager: 'Marius W',
    members: [
      { id: 1, name: 'Marius W', role: 'Project Manager' },
      { id: 2, name: 'Celamandla B', role: 'Developer' },
      { id: 3, name: 'Thabo M', role: 'UX Designer' },
    ],
    tags: ['portal', 'onboarding', 'compliance'],
    tasksTotal: 34,
    tasksDone: 21,
    createdAt: '2025-12-10',
  },
  {
    id: 2,
    name: 'Grant Disbursement Automation',
    description: 'Automate grant payment workflows, approval chains and bank integration so disbursements are processed in under 24 hours.',
    status: 'active',
    priority: 'critical',
    category: 'Finance',
    startDate: '2026-02-01',
    dueDate: '2026-06-30',
    progress: 45,
    budget: 540000,
    spent: 243000,
    manager: 'Nomvula D',
    members: [
      { id: 4, name: 'Nomvula D', role: 'Project Manager' },
      { id: 5, name: 'Siyanda K', role: 'Backend Developer' },
      { id: 6, name: 'Rene P', role: 'Finance Analyst' },
    ],
    tags: ['grants', 'automation', 'finance'],
    tasksTotal: 28,
    tasksDone: 13,
    createdAt: '2026-01-20',
  },
  {
    id: 3,
    name: 'Cohort 5 Mentorship Programme',
    description: 'Coordinate 6-month mentorship activities for Cohort 5, including mentor matching, session scheduling and milestone tracking.',
    status: 'planning',
    priority: 'medium',
    category: 'Programme',
    startDate: '2026-06-01',
    dueDate: '2026-11-30',
    progress: 8,
    budget: 95000,
    spent: 7600,
    manager: 'Lindiwe N',
    members: [
      { id: 7, name: 'Lindiwe N', role: 'Programme Lead' },
      { id: 8, name: 'Johan V', role: 'Mentor Coordinator' },
    ],
    tags: ['mentorship', 'cohort-5', 'programme'],
    tasksTotal: 18,
    tasksDone: 2,
    createdAt: '2026-04-05',
  },
  {
    id: 4,
    name: 'Annual Impact Report 2025',
    description: 'Compile, design and publish the 2025 annual impact report covering all incubatee metrics, financials and success stories.',
    status: 'completed',
    priority: 'medium',
    category: 'Reporting',
    startDate: '2026-01-01',
    dueDate: '2026-03-31',
    progress: 100,
    budget: 45000,
    spent: 42300,
    manager: 'Priya R',
    members: [
      { id: 9, name: 'Priya R', role: 'Report Lead' },
      { id: 10, name: 'Anele M', role: 'Data Analyst' },
    ],
    tags: ['reporting', 'impact', '2025'],
    tasksTotal: 22,
    tasksDone: 22,
    createdAt: '2025-11-15',
  },
  {
    id: 5,
    name: 'SME Financial Literacy Workshop Series',
    description: 'Develop and deliver a 10-part financial literacy workshop series for incubatee SMEs covering budgeting, costing and cash-flow.',
    status: 'on-hold',
    priority: 'low',
    category: 'Training',
    startDate: '2026-03-01',
    dueDate: '2026-08-31',
    progress: 20,
    budget: 68000,
    spent: 13600,
    manager: 'David O',
    members: [
      { id: 11, name: 'David O', role: 'Training Coordinator' },
      { id: 12, name: 'Faith Z', role: 'Content Developer' },
    ],
    tags: ['training', 'financial-literacy', 'sme'],
    tasksTotal: 30,
    tasksDone: 6,
    createdAt: '2026-02-10',
  },
  {
    id: 6,
    name: 'Infrastructure Upgrade — Cloud Migration',
    description: 'Migrate all on-prem services to a cloud-native architecture to improve reliability, scalability and security posture.',
    status: 'active',
    priority: 'high',
    category: 'Technology',
    startDate: '2026-03-15',
    dueDate: '2026-09-15',
    progress: 30,
    budget: 720000,
    spent: 216000,
    manager: 'Celamandla B',
    members: [
      { id: 2, name: 'Celamandla B', role: 'Tech Lead' },
      { id: 13, name: 'Ayanda S', role: 'DevOps Engineer' },
      { id: 14, name: 'Marco F', role: 'Security Engineer' },
    ],
    tags: ['cloud', 'infrastructure', 'devops'],
    tasksTotal: 40,
    tasksDone: 12,
    createdAt: '2026-03-01',
  },
];

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private _projects = signal<Project[]>(MOCK_PROJECTS);

  projects = this._projects.asReadonly();

  getById(id: number): Project | undefined {
    return this._projects().find(p => p.id === id);
  }

  add(payload: CreateProjectPayload): Project {
    const current = this._projects();
    const newId = Math.max(0, ...current.map(p => p.id)) + 1;
    const project: Project = {
      ...payload,
      id: newId,
      progress: 0,
      spent: 0,
      members: [],
      tasksTotal: 0,
      tasksDone: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this._projects.set([...current, project]);
    return project;
  }

  update(id: number, changes: Partial<Project>): void {
    this._projects.update(list =>
      list.map(p => (p.id === id ? { ...p, ...changes } : p))
    );
  }

  remove(id: number): void {
    this._projects.update(list => list.filter(p => p.id !== id));
  }
}
