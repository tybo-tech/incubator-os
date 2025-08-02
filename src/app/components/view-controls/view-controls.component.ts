import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INode } from '../../../models/schema';
import { LucideAngularModule, Search, Plus } from 'lucide-angular';

@Component({
  selector: 'app-view-controls',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './view-controls.component.html',
  styleUrls: ['./view-controls.component.scss']
})
export class ViewControlsComponent {
  @Input() collection: INode | null = null;
  @Input() views: INode[] = []; // Views passed from parent
  
  @Output() viewSelected = new EventEmitter<INode>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() addRecord = new EventEmitter<void>();

  // Lucide Icons
  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  
  selectedView: INode | null = null;
  selectedViewId: number | string = '';
  searchTerm = '';

  // No constructor needed - pure presentation component

  onViewChange(viewId: number | string) {
    this.selectedViewId = viewId;
    // Find the selected view object from input array
    if (viewId) {
      this.selectedView = this.views.find(view => view.id == viewId) || null;
    } else {
      this.selectedView = null;
    }
    
    if (this.selectedView) {
      console.log('View changed to:', this.selectedView.data?.name);
      this.viewSelected.emit(this.selectedView);
    }
  }

  onSearch() {
    console.log('Search term changed:', this.searchTerm);
    this.searchChanged.emit(this.searchTerm);
  }

  onAddRecord() {
    console.log('Add new record requested');
    this.addRecord.emit();
  }
}
