import { INode } from '../../models/schema';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'page_view'
  | 'create'
  | 'update'
  | 'delete'
  | 'bulk_update'
  | 'export'
  | 'import';

export interface IActivityLogData {
  action: ActivityAction;
  entity_type?: string;
  entity_id?: number | string;
  details?: string;
  url?: string;
  user_id?: number;
  user_name?: string;
}

export const ACTIVITY_LOG_NODE_TYPE = 'activity_log';

export type ActivityLog = INode<IActivityLogData>;
