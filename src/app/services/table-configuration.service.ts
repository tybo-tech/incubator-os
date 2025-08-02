import { Injectable } from '@angular/core';
import { INode, ICollection, IField, IGroup, IFieldType, ITableValue } from '../../models/schema';

export interface TableColumn {
  key: string;
  label: string;
  type:IFieldType;
  width?: string;
  sortable?: boolean;
  searchable?: boolean;
  groupId?: string;
  required?: boolean;
  options?: string[];

  // Collection-based options
  source?: 'static' | 'collection';
  sourceCollectionId?: number;
  labelField?: string;
  valueField?: string;
}

export interface TableConfiguration {
  columns: TableColumn[];
  groupedColumns: { [groupId: string]: TableColumn[] };
  groups: IGroup[];
  displayMode: 'all' | 'grouped' | 'minimal';
  searchableFields: string[];
  sortableFields: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TableConfigurationService {

  /**
   * Generate table configuration from collection schema
   */
  generateTableConfig(collection: INode<ICollection>): TableConfiguration {
    if (!collection?.data || collection.type !== 'collection') {
      return this.getDefaultTableConfig();
    }

    const collectionData = collection.data;
    const columns: TableColumn[] = [];
    const groupedColumns: { [groupId: string]: TableColumn[] } = {};

    // Always include system columns first
    const systemColumns = this.getSystemColumns();
    columns.push(...systemColumns);

    // Initialize groups in grouped columns
    if (collectionData.groups) {
      collectionData.groups.forEach(group => {
        groupedColumns[group.id] = [];
      });
    }

    // Process collection fields
    if (collectionData.fields) {
      collectionData.fields.forEach(field => {
        const column = this.fieldToColumn(field);
        columns.push(column);

        // Group the column if it has a groupId
        if (field.groupId && groupedColumns[field.groupId]) {
          groupedColumns[field.groupId].push(column);
        } else {
          // Add to ungrouped if no valid group
          if (!groupedColumns['ungrouped']) {
            groupedColumns['ungrouped'] = [];
          }
          groupedColumns['ungrouped'].push(column);
        }
      });
    }

    // Sort groups by order
    const sortedGroups = collectionData.groups ?
      [...collectionData.groups].sort((a, b) => (a.order || 0) - (b.order || 0)) :
      [];

    return {
      columns,
      groupedColumns,
      groups: sortedGroups,
      displayMode: 'all',
      searchableFields: columns.filter(col => col.searchable).map(col => col.key),
      sortableFields: columns.filter(col => col.sortable).map(col => col.key)
    };
  }

  /**
   * Convert IField to TableColumn
   */
  private fieldToColumn(field: IField): TableColumn {
    return {
      key: field.key,
      label: field.label,
      type: field.type,
      width: this.getColumnWidth(field.type),
      sortable: this.isFieldSortable(field.type),
      searchable: this.isFieldSearchable(field.type),
      groupId: field.groupId,
      required: field.required,
      options: field.options,
      source: field.source,
      sourceCollectionId: field.sourceCollectionId,
      labelField: field.labelField,
      valueField: field.valueField
    };
  }

  /**
   * Get system columns (ID, Type, Created)
   */
  private getSystemColumns(): TableColumn[] {
    return [
      {
        key: 'id',
        label: 'ID',
        type: 'id',
        width: '80px',
        sortable: true,
        searchable: false
      },
      {
        key: 'type',
        label: 'Type',
        type: 'type',
        width: '120px',
        sortable: true,
        searchable: true
      }
    ];
  }

  /**
   * Get default table configuration when no collection schema is available
   */
  private getDefaultTableConfig(): TableConfiguration {
    const defaultColumns: TableColumn[] = [
      ...this.getSystemColumns(),
      {
        key: 'created_at',
        label: 'Created',
        type: 'created' as IFieldType,
        width: '150px',
        sortable: true,
        searchable: false
      }
    ];

    return {
      columns: defaultColumns,
      groupedColumns: { 'system': defaultColumns },
      groups: [{ id: 'system', name: 'System Fields', order: 0 }],
      displayMode: 'minimal',
      searchableFields: defaultColumns.filter(col => col.searchable).map(col => col.key),
      sortableFields: defaultColumns.filter(col => col.sortable).map(col => col.key)
    };
  }

  /**
   * Determine column width based on field type
   */
  private getColumnWidth(type: string): string {
    switch (type) {
      case 'text': return '200px';
      case 'textarea': return '300px';
      case 'number': return '120px';
      case 'select': return '150px';
      case 'checkbox': return '100px';
      case 'date': return '140px';
      case 'table': return '150px';
      case 'json': return '250px';
      default: return '180px';
    }
  }

  /**
   * Determine if field type is sortable
   */
  private isFieldSortable(type: string): boolean {
    return ['text', 'number', 'date', 'select'].includes(type);
  }

  /**
   * Determine if field type is searchable
   */
  private isFieldSearchable(type: string): boolean {
    return ['text', 'textarea', 'select'].includes(type);
  }

  /**
   * Get display value for a field based on its type and configuration
   */
  getDisplayValue(data: any, column: TableColumn): string {
    if (!data || data[column.key] === undefined || data[column.key] === null) {
      return '-';
    }

    // Check if this is a relationship field with hydrated data
    const hydratedKey = `__${column.key}`;
    const hydratedValue = data[hydratedKey];

    // If hydrated data exists, use it for display
    if (hydratedValue) {
      return this.getHydratedDisplayValue(hydratedValue, column);
    }

    const value = data[column.key];

    switch (column.type) {
      case 'checkbox':
        return value ? 'Yes' : 'No';

      case 'select':
        // If this is a collection-based select, the raw value is an ID
        if (column.source === 'collection') {
          return `ID: ${value}`;  // Fallback if hydrated data is not available
        }
        // If options are available, try to find the label
        if (column.options && Array.isArray(column.options)) {
          return column.options.includes(value) ? value : `${value} (custom)`;
        }
        return value;

      case 'date':
        return new Date(value).toLocaleDateString();

      case 'table':
        // Handle table field display - show row count and preview
        if (Array.isArray(value)) {
          const rowCount = value.length;
          if (rowCount === 0) return 'No rows';
          if (rowCount === 1) return '1 row';
          return `${rowCount} rows`;
        }
        return 'Invalid table data';

      case 'json':
        if (typeof value === 'object') {
          return JSON.stringify(value).substring(0, 50) + '...';
        }
        return String(value);

      case 'textarea':
        return String(value).substring(0, 100) + (String(value).length > 100 ? '...' : '');

      case 'number':
        return Number(value).toLocaleString();

      default:
        return String(value);
    }
  }

  /**
   * Get display value for hydrated relationship data
   */
  private getHydratedDisplayValue(hydratedValue: any, column: TableColumn): string {
    if (!hydratedValue) return '-';

    // Handle multiple relationships (arrays)
    if (Array.isArray(hydratedValue)) {
      if (hydratedValue.length === 0) return '-';

      const displayValues = hydratedValue.map(item => this.extractLabelFromItem(item, column.labelField));

      return displayValues.join(', ');
    }

    // Handle single relationship (object)
    if (typeof hydratedValue === 'object') {
      return this.extractLabelFromItem(hydratedValue, column.labelField);
    }

    // Fallback for non-object hydrated values
    return String(hydratedValue);
  }

  /**
   * Extract label from hydrated item with smart fallback
   */
  private extractLabelFromItem(item: any, preferredLabelField?: string): string {
    if (!item) return 'Unknown';

    // Try the preferred label field first
    if (preferredLabelField && item[preferredLabelField]) {
      return String(item[preferredLabelField]);
    }

    // Try common name patterns
    const nameCandidates = [
      'name',
      'title',
      'label',
      // Auto-detect name_* fields
      ...Object.keys(item).filter(key => key.startsWith('name_'))
    ];

    for (const candidate of nameCandidates) {
      if (item[candidate] && String(item[candidate]).trim()) {
        return String(item[candidate]);
      }
    }

    // Fallback to ID
    return item.id ? String(item.id) : 'Unknown';
  }

  /**
   * Apply view configuration to filter and modify table columns
   */
  applyViewConfig(baseConfig: TableConfiguration, viewNode: INode): TableConfiguration {
    if (!viewNode?.data || viewNode.type !== 'view') {
      return baseConfig;
    }

    const viewData = viewNode.data;

    // Filter columns to only show those specified in the view
    if (viewData.fields && Array.isArray(viewData.fields)) {
      const allowedFields = new Set(['id', 'type', 'created_at', ...viewData.fields]);
      const filteredColumns = baseConfig.columns.filter(col => allowedFields.has(col.key));

      return {
        ...baseConfig,
        columns: filteredColumns,
        displayMode: 'grouped'
      };
    }

    return baseConfig;
  }

  /**
   * Generate CSS classes for column types
   */
  getColumnClasses(column: TableColumn): string {
    const baseClasses = 'px-6 py-4 whitespace-nowrap text-sm';

    switch (column.type) {
      case 'number':
        return `${baseClasses} text-right text-gray-900 font-mono`;
      case 'date':
        return `${baseClasses} text-gray-500`;
      case 'checkbox':
        return `${baseClasses} text-center`;
      case 'table':
        return `${baseClasses} text-center text-gray-600`;
      case 'id':
        return `${baseClasses} text-gray-900 font-mono`;
      case 'type':
        return `${baseClasses}`;
      default:
        return `${baseClasses} text-gray-900`;
    }
  }

  /**
   * Generate CSS classes for table headers
   */
  getHeaderClasses(column: TableColumn): string {
    const baseClasses = 'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider';

    switch (column.type) {
      case 'number':
        return `${baseClasses} text-right`;
      case 'checkbox':
        return `${baseClasses} text-center`;
      case 'table':
        return `${baseClasses} text-center`;
      default:
        return `${baseClasses} text-left`;
    }
  }
}
