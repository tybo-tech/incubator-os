import { Injectable, inject, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { NodeService } from '../../services/node.service';
import { AuthService } from '../auth/auth.service';
import {
  IActivityLogData,
  ActivityLog,
  ACTIVITY_LOG_NODE_TYPE,
} from './activity-log.interfaces';

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private nodeService = inject(NodeService);
  private injector = inject(Injector);

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

  getLogs(limit = 100): Observable<ActivityLog[]> {
    return this.nodeService.getNodesByType(ACTIVITY_LOG_NODE_TYPE) as Observable<ActivityLog[]>;
  }
}
