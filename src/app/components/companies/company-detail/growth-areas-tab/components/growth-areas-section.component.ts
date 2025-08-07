import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../../models/schema';
import { GrowthArea, OKRTask } from '../../../../../../models/business.models';
import { GrowthAreaHeaderComponent } from './growth-area-header.component';
import { GrowthAreaCardComponent } from './growth-area-card.component';

@Component({
  selector: 'app-growth-areas-section',
  standalone: true,
  imports: [CommonModule, GrowthAreaHeaderComponent, GrowthAreaCardComponent],
  template: `
    <!-- Header Component -->
    <app-growth-area-header
      [showEmptyState]="growthAreas.length === 0"
      (addGrowthArea)="addGrowthArea.emit()">
    </app-growth-area-header>

    <!-- Growth Areas List -->
    <app-growth-area-card
      *ngFor="let area of growthAreas"
      [growthArea]="area"
      [tasks]="getTasksForGrowthArea(area)"
      [progress]="getGrowthAreaProgress(area)"
      (editGrowthArea)="editGrowthArea.emit($event)"
      (deleteGrowthArea)="deleteGrowthArea.emit($event)"
      (addTask)="addTask.emit($event)"
      (editTask)="editTask.emit($event)"
      (deleteTask)="deleteTask.emit($event)"
      (updateTaskStatus)="updateTaskStatus.emit($event)">
    </app-growth-area-card>
  `
})
export class GrowthAreasSectionComponent {
  @Input() growthAreas: INode<GrowthArea>[] = [];
  @Input() tasks: INode<OKRTask>[] = [];

  @Output() addGrowthArea = new EventEmitter<void>();
  @Output() editGrowthArea = new EventEmitter<INode<GrowthArea>>();
  @Output() deleteGrowthArea = new EventEmitter<INode<GrowthArea>>();
  @Output() addTask = new EventEmitter<INode<GrowthArea>>();
  @Output() editTask = new EventEmitter<INode<OKRTask>>();
  @Output() deleteTask = new EventEmitter<INode<OKRTask>>();
  @Output() updateTaskStatus = new EventEmitter<{task: INode<OKRTask>, status: string}>();

  getTasksForGrowthArea(area: INode<GrowthArea>): INode<OKRTask>[] {
    return this.tasks.filter(task =>
      task.data.growth_area_id === String(area.id) &&
      task.data.task_type === 'growth_area'
    );
  }

  getGrowthAreaProgress(area: INode<GrowthArea>): number {
    const tasks = this.getTasksForGrowthArea(area);
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(task => task.data.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }
}
