import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICollection, INode } from '../../../models/schema';
import { TableConfigurationService, TableConfiguration, TableColumn } from '../../services/table-configuration.service';
import { LucideAngularModule, Check, X, Edit, Trash2, FileText, Calendar, Type, Hash, CheckSquare, Mail, Phone, Link, Image, MapPin, Clock, Palette, User, Tag } from 'lucide-angular';

@Component({
  selector: 'app-collection-table',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './collection-table.component.html',
  styleUrls: ['./collection-table.component.scss']
})
export class CollectionTableComponent implements OnChanges {
  @Input() collection: INode<ICollection> | null = null;
  @Input() collectionData: INode[] = [];
  @Input() selectedView: INode | null = null; // For view-based filtering

  // Output events for parent component to handle
  @Output() selectRow = new EventEmitter<INode>();
  @Output() editRow = new EventEmitter<INode>();
  @Output() deleteRow = new EventEmitter<INode>();

  // Local data for template
  displayData: INode[] = [];
  selectedNode: INode | null = null;
  tableConfig: TableConfiguration | null = null;

  // Lucide Icons
  readonly CheckIcon = Check;
  readonly XIcon = X;
  readonly EditIcon = Edit;
  readonly TrashIcon = Trash2;
  readonly FileTextIcon = FileText;

  // Type-specific icons
  readonly CalendarIcon = Calendar;
  readonly TypeIcon = Type;
  readonly HashIcon = Hash;
  readonly CheckSquareIcon = CheckSquare;
  readonly MailIcon = Mail;
  readonly PhoneIcon = Phone;
  readonly LinkIcon = Link;
  readonly ImageIcon = Image;
  readonly MapPinIcon = MapPin;
  readonly ClockIcon = Clock;
  readonly PaletteIcon = Palette;
  readonly UserIcon = User;
  readonly TagIcon = Tag;

  constructor(private tableConfigService: TableConfigurationService) {}

  // Get icon for column type
  getIconForType(type: string): any {
    switch (type) {
      case 'date':
      case 'datetime':
        return this.CalendarIcon;
      case 'time':
        return this.ClockIcon;
      case 'text':
      case 'textarea':
        return this.TypeIcon;
      case 'number':
      case 'id':
        return this.HashIcon;
      case 'checkbox':
        return this.CheckSquareIcon;
      case 'email':
        return this.MailIcon;
      case 'phone':
        return this.PhoneIcon;
      case 'url':
        return this.LinkIcon;
      case 'image':
        return this.ImageIcon;
      case 'address':
        return this.MapPinIcon;
      case 'color':
        return this.PaletteIcon;
      case 'user':
        return this.UserIcon;
      case 'select':
      case 'tags':
        return this.TagIcon;
      case 'json':
        return this.FileTextIcon;
      case 'type':
        return this.TagIcon;
      case 'created':
        return this.CalendarIcon;
      default:
        return this.TypeIcon;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // React to changes in collection or collection data
    if (changes['collection'] || changes['collectionData'] || changes['selectedView']) {
      this.updateTableConfiguration();
      this.updateDisplayData();
    }
  }

  private updateTableConfiguration() {
    if (this.collection) {
      // Generate base configuration from collection schema
      this.tableConfig = this.tableConfigService.generateTableConfig(this.collection);

      // Apply view configuration if a view is selected
      if (this.selectedView) {
        this.tableConfig = this.tableConfigService.applyViewConfig(this.tableConfig, this.selectedView);
      }

      console.log('Table configuration updated:', this.tableConfig);
    } else {
      this.tableConfig = null;
    }
  }

  private updateDisplayData() {
    console.log('Collection data changed:', this.collectionData.length, 'records');
    this.displayData = this.collectionData || [];
  }

  onSelectRow(node: INode) {
    console.log('Row selected:', node.id);
    this.selectedNode = node;
    this.selectRow.emit(node);
  }

  onEditRow(node: INode) {
    console.log('Edit row:', node.id);
    this.editRow.emit(node);
  }

  onDeleteRow(node: INode) {
    console.log('Delete row:', node.id);
    this.deleteRow.emit(node);
  }

  // Dynamic table methods using TableConfigurationService
  getDisplayValue(data: any, column: TableColumn): string {
    return this.tableConfigService.getDisplayValue(data, column);
  }

  getColumnClasses(column: TableColumn): string {
    return this.tableConfigService.getColumnClasses(column);
  }

  getHeaderClasses(column: TableColumn): string {
    return this.tableConfigService.getHeaderClasses(column);
  }

  trackByNodeId(index: number, node: INode): any {
    return node.id;
  }

  trackByColumnKey(index: number, column: TableColumn): any {
    return column.key;
  }

  // Legacy methods for fallback when no table config is available
  getDataKeys(nodes: INode[]): string[] {
    if (!nodes || nodes.length === 0) return [];

    // Get all unique keys from all node data objects
    const allKeys = new Set<string>();
    nodes.forEach(node => {
      if (node.data && typeof node.data === 'object') {
        Object.keys(node.data).forEach(key => allKeys.add(key));
      }
    });

    return Array.from(allKeys).slice(0, 5); // Limit to first 5 keys for table display
  }

  getLegacyDisplayValue(data: any, key: string): string {
    if (!data || typeof data !== 'object') return '';

    const value = data[key];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getTypeColor(type: string): string {
    const colors: {[key: string]: string} = {
      'collection': 'bg-blue-100 text-blue-800',
      'view': 'bg-green-100 text-green-800',
      'company': 'bg-purple-100 text-purple-800',
      'director': 'bg-yellow-100 text-yellow-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors['default'];
  }
}
