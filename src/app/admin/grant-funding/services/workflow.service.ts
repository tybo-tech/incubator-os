import { Injectable, inject } from '@angular/core';
import { Observable, tap, catchError, map, of } from 'rxjs';
import {
  IWorkflow,
  IWorkflowAction,
  IWorkflowStage,
  GRANT_WORKFLOW_2026,
  GRANT_NODE_TYPES,
} from '../interfaces/grant-application.interfaces';
import { NodeService } from '../../../../services/node.service';
import { INode } from '../../../../models/schema';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly nodeService = inject(NodeService);

  /**
   * In-memory cache seeded with the built-in default.
   * Entries are overwritten when loadWorkflow() succeeds, enabling runtime updates
   * (e.g. from assets/workflows/<id>.json or a future API endpoint).
   */
  private readonly registry = new Map<string, IWorkflow>([
    ['grant-2026', GRANT_WORKFLOW_2026],
  ]);

  /** Track the database node ID for each workflow so we can update vs insert. */
  private readonly workflowNodeIds = new Map<string, number>();

  /**
   * Load a workflow from the database and update the cache.
   * Falls back silently to the built-in constant when the DB has no record yet.
   * This replaces the old assets/workflows JSON approach.
   */
  loadWorkflow(id: string): Observable<void> {
    return this.loadWorkflowFromDB(id);
  }

  /** Synchronous lookup from cache; returns built-in GRANT_WORKFLOW_2026 if not found. */
  getWorkflow(id: string): IWorkflow {
    return this.registry.get(id) ?? GRANT_WORKFLOW_2026;
  }

  /** Find a stage in a workflow by its key. Returns null for unknown keys. */
  getStage(workflow: IWorkflow, key: string): IWorkflowStage | null {
    return workflow.stages.find(s => s.key === key) ?? null;
  }

  /**
   * Look up the IWorkflowAction definition for an action key on a stage.
   * Returns null if the action is not declared on this stage.
   */
  getActionFromStage(stage: IWorkflowStage, actionKey: string): IWorkflowAction | null {
    return stage.actions?.find(a => a.key === actionKey) ?? null;
  }

  /**
   * Resolve the concrete target stage key for an action.
   * Handles sentinels:
   *   'previous' — falls back to previousStatus or 'applied'
   *   'next'     — advances to the next stage in the workflow sequence after currentKey
   */
  resolveActionTarget(
    action: IWorkflowAction,
    previousStatus?: string,
    workflow?: IWorkflow,
    currentKey?: string,
  ): string {
    if (action.target === 'previous') return previousStatus ?? 'applied';
    if (action.target === 'next') {
      if (workflow && currentKey) {
        const stages = workflow.stages;
        const idx = stages.findIndex(s => s.key === currentKey);
        if (idx >= 0 && idx < stages.length - 1) {
          return stages[idx + 1].key;
        }
      }
      return previousStatus ?? 'applied';
    }
    return action.target;
  }

  // ── Variant helpers (used in templates) ──────────────────────────────────────

  isDangerAction(action: IWorkflowAction): boolean {
    return action.variant === 'danger';
  }

  isSecondaryAction(action: IWorkflowAction): boolean {
    return action.variant === 'secondary';
  }

  isPrimaryAction(action: IWorkflowAction): boolean {
    return !action.variant || action.variant === 'primary';
  }

  /**
   * Progress-bar stages: everything except 'declined', which is a side-track
   * rather than a forward milestone.
   */
  getProgressStages(workflow: IWorkflow): IWorkflowStage[] {
    return workflow.stages.filter(s => s.key !== 'declined');
  }

  // ── Centralized status badge helpers ─────────────────────────────────────────

  /** Map a stage color name to Tailwind badge CSS classes. */
  colorToBadgeClass(color: string): string {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ';
    const map: Record<string, string> = {
      blue:   base + 'bg-blue-100 text-blue-700',
      indigo: base + 'bg-indigo-100 text-indigo-700',
      purple: base + 'bg-purple-100 text-purple-700',
      pink:   base + 'bg-pink-100 text-pink-700',
      green:  base + 'bg-green-100 text-green-700',
      teal:   base + 'bg-teal-100 text-teal-700',
      orange: base + 'bg-orange-100 text-orange-700',
      yellow: base + 'bg-yellow-100 text-yellow-700',
      red:    base + 'bg-red-100 text-red-700',
      gray:   base + 'bg-gray-100 text-gray-600',
    };
    return map[color] ?? map['gray'];
  }

  /** Return Tailwind badge CSS for a status key, derived from the matching stage's color. */
  getStatusBadgeClass(workflow: IWorkflow, statusKey?: string): string {
    if (!statusKey) return this.colorToBadgeClass('gray');
    const stage = this.getStage(workflow, statusKey);
    return this.colorToBadgeClass(stage?.color ?? 'gray');
  }

  /** Return the human-readable label for a status key, falling back to the raw key. */
  getStatusLabel(workflow: IWorkflow, statusKey?: string): string {
    if (!statusKey) return '—';
    return this.getStage(workflow, statusKey)?.label ?? statusKey;
  }

  // ── Database persistence ──────────────────────────────────────────────────────

  /**
   * Load all saved workflows from the database and merge them into the registry.
   * Silently falls back to the current registry state on error.
   */
  loadWorkflowFromDB(id: string): Observable<void> {
    return this.nodeService.getNodesByType(GRANT_NODE_TYPES.WORKFLOW).pipe(
      tap((nodes: INode<IWorkflow>[]) => {
        for (const node of nodes) {
          if (node.id && node.data?.id) {
            this.registry.set(node.data.id, node.data);
            this.workflowNodeIds.set(node.data.id, node.id);
          }
        }
      }),
      map(() => undefined as void),
      catchError(() => of(undefined as void)),
    );
  }

  /**
   * Persist a workflow to the database. Updates the registry immediately so
   * other components pick up the change without a page reload.
   * Uses updateNode when a DB record already exists, addNode otherwise.
   */
  saveWorkflowToDB(workflow: IWorkflow): Observable<INode<IWorkflow>> {
    this.registry.set(workflow.id, workflow);
    const existingId = this.workflowNodeIds.get(workflow.id);
    const node: INode<IWorkflow> = {
      type: GRANT_NODE_TYPES.WORKFLOW,
      data: workflow,
      ...(existingId ? { id: existingId } : {}),
    };
    const op$ = existingId
      ? this.nodeService.updateNode(node as INode<any>)
      : this.nodeService.addNode(node as INode<any>);
    return (op$ as Observable<INode<IWorkflow>>).pipe(
      tap(saved => {
        if (saved?.id) this.workflowNodeIds.set(workflow.id, saved.id);
      }),
    );
  }
}
