import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { NodeService } from '../../services/node.service';
import { AuthService } from '../auth/auth.service';
import {
  IActivityLogData,
  ActivityLog,
  ActivityAction,
  ACTIVITY_LOG_NODE_TYPE,
} from './activity-log.interfaces';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ActivityLogStateService {
  private nodeService = inject(NodeService);
  private injector = inject(Injector);

  logs = signal<ActivityLog[]>([]);
  filtered = signal<ActivityLog[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  actionFilter = signal('');
  userFilter = signal('');
  urlFilter = signal('');

  uniqueUsers = computed(() => {
    const names = new Set<string>();
    this.logs().forEach((l) => {
      if (l.data.user_name) names.add(l.data.user_name);
    });
    return [...names].sort();
  });

  uniqueUrls = computed(() => {
    const urls = new Set<string>();
    this.logs().forEach((l) => {
      if (l.data.url) urls.add(l.data.url);
    });
    return [...urls].sort();
  });

  stats = computed(() => {
    const all = this.logs();
    const actionCounts: Record<string, number> = {};
    const userCounts = new Set<string>();
    const pageCounts: Record<string, number> = {};
    let loginCount = 0;

    for (const l of all) {
      const action = l.data.action;
      actionCounts[action] = (actionCounts[action] || 0) + 1;
      if (l.data.user_name) userCounts.add(l.data.user_name);
      if (l.data.url) {
        pageCounts[l.data.url] = (pageCounts[l.data.url] || 0) + 1;
      }
      if (action === 'login') loginCount++;
    }

    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([url, count]) => ({ url, count }));

    return {
      total: all.length,
      uniqueUsers: userCounts.size,
      logins: loginCount,
      topPages,
      actionCounts,
    };
  });

  log(data: IActivityLogData): Observable<ActivityLog> {
    const auth = this.injector.get(AuthService);
    const user = auth.getUser();
    const enriched: IActivityLogData = {
      ...data,
      user_id: user?.id,
      user_name: user?.full_name || user?.username,
    };
    return this.nodeService.addNode({
      type: ACTIVITY_LOG_NODE_TYPE,
      data: enriched,
    }) as Observable<ActivityLog>;
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.error.set(null);

    (this.nodeService.getNodesByType(ACTIVITY_LOG_NODE_TYPE) as Observable<ActivityLog[]>).subscribe({
      next: (logs) => {
        const sorted = logs.sort((a, b) => {
          const tA = a.created_at || '';
          const tB = b.created_at || '';
          return tB.localeCompare(tA);
        });
        this.logs.set(sorted);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load activity log.');
        this.isLoading.set(false);
      },
    });
  }

  applyFilter(): void {
    let list = this.logs();

    const action = this.actionFilter();
    if (action) list = list.filter((l) => l.data.action === action);

    const user = this.userFilter();
    if (user) list = list.filter((l) => l.data.user_name === user);

    const url = this.urlFilter();
    if (url) list = list.filter((l) => l.data.url?.includes(url));

    this.filtered.set(list);
  }
}
