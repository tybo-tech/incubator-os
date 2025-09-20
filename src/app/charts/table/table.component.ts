import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IKeyValue } from 'src/models/IKeyValue';

@Component({
  selector: 'app-table',
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
}
