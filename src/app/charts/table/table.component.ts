import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IKeyValue } from '../../../models/IKeyValue';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent {
  @Input() minHeight = '384px';
  @Input() showAddButton = false;
  @Input() data: any[] = []; // Will be populated with actual data from API
  @Input() columns: IKeyValue[] = []; // Column definitions
  @Input() componentTitle = 'Data Table';

  @Output() rowClick = new EventEmitter<any>();
  @Output() addClick = new EventEmitter<any>();

  // TrackBy function for performance
  trackByRow(index: number, item: any): any {
    return item.id || index;
  }
}
