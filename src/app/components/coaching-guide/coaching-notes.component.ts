import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CoachingSession {
  id: number;
  sessionDate: string;
  topic: string;
  actionItems: string;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  priority: 'Low' | 'Medium' | 'High';
  notes?: string;
}

@Component({
  selector: 'app-coaching-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <!-- Header Section -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 flex items-center">
            <i class="fas fa-clipboard-list text-purple-600 mr-3"></i>
            Coaching Notes & Action Items
          </h2>
          <p class="text-gray-600 mt-1">
            Track coaching sessions, action items, and progress towards business goals
          </p>
        </div>
        <div class="text-right">
          <div class="text-sm text-gray-500">Pending Actions</div>
          <div class="text-2xl font-bold text-purple-600">
            {{ getPendingActionsCount() }}
          </div>
        </div>
      </div>

      <!-- Add New Button -->
      <div class="mb-6">
        <button
          class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
          (click)="onAddNew()"
        >
          <i class="fas fa-plus mr-2"></i>
          Add New Session
        </button>
      </div>

      <!-- Coaching Sessions Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-calendar mr-2"></i>Session Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-lightbulb mr-2"></i>Topic
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-tasks mr-2"></i>Action Items
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-clock mr-2"></i>Due Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-flag mr-2"></i>Priority
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-chart-pie mr-2"></i>Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-sticky-note mr-2"></i>Notes
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <i class="fas fa-cog mr-2"></i>Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              *ngFor="let session of sessions; trackBy: trackByFn" 
              class="hover:bg-gray-50 transition-colors"
              [class.border-l-4]="session.id === editingId"
              [class.border-purple-500]="session.id === editingId">
              
              <!-- Session Date -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="date"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [(ngModel)]="session.sessionDate"
                  (ngModelChange)="updateStatus(session)"
                  (focus)="setEditing(session.id)"
                />
              </td>

              <!-- Topic -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [(ngModel)]="session.topic"
                  (focus)="setEditing(session.id)"
                  placeholder="Session topic"
                />
              </td>

              <!-- Action Items -->
              <td class="px-6 py-4">
                <textarea
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  [(ngModel)]="session.actionItems"
                  (focus)="setEditing(session.id)"
                  placeholder="List action items..."
                  rows="3"
                ></textarea>
              </td>

              <!-- Due Date -->
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="date"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [(ngModel)]="session.dueDate"
                  (ngModelChange)="updateStatus(session)"
                  (focus)="setEditing(session.id)"
                />
              </td>

              <!-- Priority -->
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [(ngModel)]="session.priority"
                  (focus)="setEditing(session.id)"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <select
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [(ngModel)]="session.status"
                  (focus)="setEditing(session.id)"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </td>

              <!-- Notes -->
              <td class="px-6 py-4">
                <textarea
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  [(ngModel)]="session.notes"
                  (focus)="setEditing(session.id)"
                  placeholder="Additional notes..."
                  rows="2"
                ></textarea>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center space-x-2">
                  <button
                    class="inline-flex items-center px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm"
                    (click)="onDelete(session)"
                    title="Delete session"
                  >
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="sessions.length === 0" class="text-center py-12">
        <i class="fas fa-clipboard-list text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No coaching sessions yet</h3>
        <p class="text-gray-500 mb-4">Start documenting your coaching sessions and action items</p>
        <button
          class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
          (click)="onAddNew()"
        >
          <i class="fas fa-plus mr-2"></i>
          Add Your First Session
        </button>
      </div>

      <!-- Summary Stats -->
      <div *ngIf="sessions.length > 0" class="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Coaching Progress</h3>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{{ sessions.length }}</div>
            <div class="text-sm text-gray-500">Total Sessions</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ getPendingActionsCount() }}</div>
            <div class="text-sm text-gray-500">Pending</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ getInProgressCount() }}</div>
            <div class="text-sm text-gray-500">In Progress</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ getCompletedCount() }}</div>
            <div class="text-sm text-gray-500">Completed</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{{ getOverdueCount() }}</div>
            <div class="text-sm text-gray-500">Overdue</div>
          </div>
        </div>
      </div>

      <!-- Overdue Actions Alert -->
      <div *ngIf="getOverdueActions().length > 0" class="mt-8 bg-red-50 rounded-lg p-6 border border-red-200">
        <h3 class="text-lg font-semibold text-red-800 mb-4 flex items-center">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          Overdue Action Items
        </h3>
        <div class="space-y-3">
          <div *ngFor="let session of getOverdueActions()" class="flex items-center justify-between bg-white p-3 rounded-md">
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ session.topic }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ session.actionItems }}</div>
            </div>
            <div class="text-sm text-red-600 font-medium ml-4">Due: {{ session.dueDate }}</div>
          </div>
        </div>
      </div>

      <!-- Upcoming Actions -->
      <div *ngIf="getUpcomingActions().length > 0" class="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 class="text-lg font-semibold text-blue-800 mb-4 flex items-center">
          <i class="fas fa-calendar-check mr-2"></i>
          Upcoming Actions (Next 7 Days)
        </h3>
        <div class="space-y-3">
          <div *ngFor="let session of getUpcomingActions()" class="flex items-center justify-between bg-white p-3 rounded-md">
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ session.topic }}</div>
              <div class="text-sm text-gray-600 mt-1">{{ session.actionItems }}</div>
              <div class="flex items-center mt-1">
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full" [class]="getPriorityClass(session.priority)">
                  {{ session.priority }} Priority
                </span>
              </div>
            </div>
            <div class="text-sm text-blue-600 font-medium ml-4">Due: {{ session.dueDate }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Custom scrollbar for table */
    .overflow-x-auto::-webkit-scrollbar {
      height: 8px;
    }
    
    .overflow-x-auto::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    
    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    
    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `]
})
export class CoachingNotesComponent implements OnInit {
  sessions: CoachingSession[] = [];
  editingId: number | null = null;
  private nextId = 1;

  ngOnInit(): void {
    this.loadMockData();
  }

  loadMockData(): void {
    const today = new Date();
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const overdueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    this.sessions = [
      {
        id: this.nextId++,
        sessionDate: pastDate.toISOString().split('T')[0],
        topic: 'Product Positioning Strategy',
        actionItems: '1. Research competitor pricing\n2. Define unique value proposition\n3. Create customer persona profiles',
        dueDate: futureDate.toISOString().split('T')[0],
        status: 'In Progress',
        priority: 'High',
        notes: 'Focus on differentiating from main competitors. Need clearer messaging.'
      },
      {
        id: this.nextId++,
        sessionDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        topic: 'Marketing Channel Optimization',
        actionItems: '1. Set up Google Analytics tracking\n2. Create social media content calendar\n3. Launch email marketing campaign',
        dueDate: overdueDate.toISOString().split('T')[0],
        status: 'Overdue',
        priority: 'Medium',
        notes: 'Social media presence needs immediate attention. Email list is growing.'
      },
      {
        id: this.nextId++,
        sessionDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        topic: 'Sales Process Improvement',
        actionItems: '1. Create sales funnel document\n2. Implement CRM system\n3. Train team on consultative selling',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Completed',
        priority: 'High',
        notes: 'CRM implementation successful. Team showing improved close rates.'
      },
      {
        id: this.nextId++,
        sessionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        topic: 'Financial Planning & Budgeting',
        actionItems: '1. Create monthly budget template\n2. Set up expense tracking system\n3. Define key financial metrics',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Pending',
        priority: 'Medium',
        notes: 'Need to establish better financial controls and regular reporting.'
      },
      {
        id: this.nextId++,
        sessionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        topic: 'Team Development & Leadership',
        actionItems: '1. Schedule one-on-one meetings with team\n2. Create professional development plan\n3. Implement feedback system',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'In Progress',
        priority: 'High',
        notes: 'Team morale improving. Need to formalize growth opportunities.'
      }
    ];
    
    // Auto-update status based on due dates
    this.sessions.forEach(session => this.updateStatus(session));
  }

  updateStatus(session: CoachingSession): void {
    if (session.status !== 'Completed') {
      const today = new Date().toISOString().split('T')[0];
      if (session.dueDate && session.dueDate < today) {
        session.status = 'Overdue';
      }
    }
  }

  setEditing(id: number): void {
    this.editingId = id;
  }

  onAddNew(): void {
    const today = new Date();
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // Due in 2 weeks
    
    const newSession: CoachingSession = {
      id: this.nextId++,
      sessionDate: today.toISOString().split('T')[0],
      topic: '',
      actionItems: '',
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'Pending',
      priority: 'Medium',
      notes: ''
    };
    
    this.sessions.unshift(newSession);
    this.setEditing(newSession.id);
  }

  onDelete(session: CoachingSession): void {
    const confirmed = confirm(`Are you sure you want to delete the session "${session.topic || 'this session'}"?`);
    if (confirmed) {
      this.sessions = this.sessions.filter(s => s.id !== session.id);
      if (this.editingId === session.id) {
        this.editingId = null;
      }
    }
  }

  getPendingActionsCount(): number {
    return this.sessions.filter(session => session.status === 'Pending').length;
  }

  getInProgressCount(): number {
    return this.sessions.filter(session => session.status === 'In Progress').length;
  }

  getCompletedCount(): number {
    return this.sessions.filter(session => session.status === 'Completed').length;
  }

  getOverdueCount(): number {
    return this.sessions.filter(session => session.status === 'Overdue').length;
  }

  getOverdueActions(): CoachingSession[] {
    return this.sessions
      .filter(session => session.status === 'Overdue')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  getUpcomingActions(): CoachingSession[] {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return this.sessions
      .filter(session => 
        (session.status === 'Pending' || session.status === 'In Progress') &&
        session.dueDate >= today && 
        session.dueDate <= nextWeek
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  trackByFn(index: number, session: CoachingSession): number {
    return session.id;
  }
}
