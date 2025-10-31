import { OnInit, Directive, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ComplianceRecordService } from '../../../services/compliance-record.service';
import { ComplianceRecord } from '../../../models/ComplianceRecord';

/**
 * Column configuration for compliance tables
 */
export interface ComplianceColumnConfig {
  key: keyof ComplianceRecord | string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'currency' | 'percentage' | 'select' | 'textarea';
  width?: string;
  options?: { value: string; label: string; color?: string }[];
  required?: boolean;
  placeholder?: string;
}

/**
 * Summary card configuration
 */
export interface ComplianceSummaryCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  description?: string;
}

/**
 * Base component for all compliance tabs
 * Handles common CRUD operations, route parameter extraction, and table functionality
 */
@Directive()
export abstract class ComplianceBaseComponent implements OnInit {
  // Services
  protected complianceService = inject(ComplianceRecordService);
  protected route = inject(ActivatedRoute);

  // Route parameters - extracted from URL
  companyId!: number;
  clientId!: number;
  programId!: number;
  cohortId!: number;

  // Data management
  records$ = new BehaviorSubject<ComplianceRecord[]>([]);
  loading = false;
  editingId: number | null = null;

  // Abstract properties that child components must implement
  abstract complianceType: 'annual_returns' | 'tax_returns' | 'bbbee_certificate' | 'cipc_registration' | 'vat_registration' | 'paye_registration' | 'uif_registration' | 'workmen_compensation' | 'other';
  abstract pageTitle: string;
  abstract pageDescription: string;
  abstract columnConfig: ComplianceColumnConfig[];

  // Optional properties that child components can override
  protected showSummaryCards = true;
  protected enableInlineEditing = true;
  protected enableBulkOperations = false;

  ngOnInit(): void {
    this.extractRouteParameters();
    if (this.companyId) {
      this.loadComplianceRecords();
    }
  }

  /* =========================================================================
     ROUTE PARAMETER EXTRACTION (Following revenue component pattern)
     ========================================================================= */

  private extractRouteParameters(): void {
    // Get companyId from route params (following revenue component pattern)
    const companyId = this.route.parent?.parent?.snapshot.params['id'];
    alert(companyId);
    // Get query parameters
    const queryParams = this.route.parent?.parent?.parent?.snapshot.queryParams;

    if (companyId) {
      this.companyId = parseInt(companyId, 10);

      // Extract required query parameters
      this.clientId = queryParams?.['clientId']
        ? parseInt(queryParams['clientId'], 10)
        : 0;
      this.programId = queryParams?.['programId']
        ? parseInt(queryParams['programId'], 10)
        : 0;
      this.cohortId = queryParams?.['cohortId']
        ? parseInt(queryParams['cohortId'], 10)
        : 0;

      console.log(`${this.complianceType} Component - IDs:`, {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId,
      });
    }
  }

  /* =========================================================================
     DATA LOADING
     ========================================================================= */

  async loadComplianceRecords(): Promise<void> {
    this.loading = true;
    try {
      // Load compliance records of the specific type for this company
      const records = await this.complianceService.getAllComplianceRecords({
        companyId: this.companyId,
        clientId: this.clientId,
        type: this.complianceType
      }).toPromise();

      this.records$.next(records || []);
      console.log(`${this.complianceType} records loaded from database:`, records);

      // Auto-update status based on due dates if applicable
      this.updateRecordStatuses();
    } catch (error) {
      console.error(`Error loading ${this.complianceType} records:`, error);
      this.records$.next([]);
    } finally {
      this.loading = false;
    }
  }

  /* =========================================================================
     CRUD OPERATIONS
     ========================================================================= */

  /**
   * Create a new compliance record
   */
  async addNewRecord(): Promise<void> {
    try {
      const newRecord: Partial<ComplianceRecord> = {
        companyId: this.companyId,
        clientId: this.clientId,
        programId: this.programId,
        cohortId: this.cohortId,
        financialYearId: 1, // Default to current year - can be made dynamic
        type: this.complianceType,
        status: 'Pending',
        ...this.getDefaultRecordValues()
      };

      const createdRecord = await this.complianceService.addComplianceRecord(newRecord).toPromise();

      if (createdRecord) {
        const currentRecords = this.records$.getValue();
        this.records$.next([createdRecord, ...currentRecords]);

        // Start editing the new record
        this.startEditing(createdRecord.id, this.getFirstEditableField());
      }
    } catch (error) {
      console.error(`Error adding ${this.complianceType} record:`, error);
    }
  }

  /**
   * Update an existing compliance record
   */
  async updateRecord(id: number, data: Partial<ComplianceRecord>): Promise<void> {
    try {
      const updatedRecord = await this.complianceService.updateComplianceRecord(id, data).toPromise();

      if (updatedRecord) {
        const currentRecords = this.records$.getValue();
        const updatedRecords = currentRecords.map(record =>
          record.id === id ? updatedRecord : record
        );
        this.records$.next(updatedRecords);
      }
    } catch (error) {
      console.error(`Error updating ${this.complianceType} record:`, error);
    }
  }

  /**
   * Delete a compliance record
   */
  async deleteRecord(id: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await this.complianceService.deleteComplianceRecord(id).toPromise();

      const currentRecords = this.records$.getValue();
      const filteredRecords = currentRecords.filter(record => record.id !== id);
      this.records$.next(filteredRecords);
    } catch (error) {
      console.error(`Error deleting ${this.complianceType} record:`, error);
    }
  }

  /* =========================================================================
     INLINE EDITING
     ========================================================================= */

  /**
   * Start editing a record field
   */
  startEditing(id: number, field: string): void {
    this.editingId = id;
    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('input:focus, select:focus, textarea:focus') as HTMLInputElement;
      if (input) {
        input.select();
      }
    }, 50);
  }

  /**
   * Stop editing and save changes
   */
  stopEditing(): void {
    this.editingId = null;
    // Optional: Auto-save changes here if needed
  }

  /**
   * Check if a field is currently being edited
   */
  isEditing(recordId: number): boolean {
    return this.editingId === recordId;
  }

  /* =========================================================================
     SUMMARY CARDS & STATISTICS
     ========================================================================= */

  /**
   * Get summary cards for the current compliance type
   */
  getSummaryCards(): ComplianceSummaryCard[] {
    const records = this.records$.getValue();
    const total = records.length;
    const completed = records.filter(r => this.isRecordCompleted(r)).length;
    const pending = records.filter(r => r.status === 'Pending').length;
    const overdue = records.filter(r => this.isRecordOverdue(r)).length;

    return [
      {
        title: 'Total Records',
        value: total,
        icon: 'fas fa-calendar-check',
        color: 'text-blue-500',
        description: `Total ${this.pageTitle.toLowerCase()}`
      },
      {
        title: 'Completed',
        value: completed,
        icon: 'fas fa-check-circle',
        color: 'text-green-500',
        description: 'Successfully completed'
      },
      {
        title: 'Pending',
        value: pending,
        icon: 'fas fa-clock',
        color: 'text-amber-500',
        description: 'Awaiting action'
      },
      {
        title: 'Overdue',
        value: overdue,
        icon: 'fas fa-exclamation-triangle',
        color: 'text-red-500',
        description: 'Requires immediate attention'
      }
    ];
  }

  /* =========================================================================
     UTILITY METHODS
     ========================================================================= */

  /**
   * Track by function for ngFor
   */
  trackById(index: number, item: ComplianceRecord): number {
    return item.id;
  }

  /**
   * Format currency values
   */
  formatCurrency(value: number | null | undefined): string {
    if (!value) return '-';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Format date values
   */
  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format percentage values
   */
  formatPercentage(value: number | null | undefined): string {
    if (!value) return '-';
    return `${value.toFixed(1)}%`;
  }

  /**
   * Get field value for display
   */
  getFieldValue(record: ComplianceRecord, column: ComplianceColumnConfig): string {
    const value = record[column.key as keyof ComplianceRecord];

    switch (column.type) {
      case 'currency':
        return this.formatCurrency(value as number);
      case 'date':
        return this.formatDate(value as string);
      case 'percentage':
        return this.formatPercentage(value as number);
      default:
        return value?.toString() || '-';
    }
  }

  /**
   * Get status color class
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'filed':
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
      case 'non_compliant':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /* =========================================================================
     ABSTRACT & VIRTUAL METHODS (Child components can override)
     ========================================================================= */

  /**
   * Get default values for new records (override in child components)
   */
  protected getDefaultRecordValues(): Partial<ComplianceRecord> {
    return {};
  }

  /**
   * Get the first editable field for new records (override in child components)
   */
  protected getFirstEditableField(): string {
    return this.columnConfig.find(col => col.type !== 'text')?.key as string || 'title';
  }

  /**
   * Check if a record is completed (override in child components)
   */
  protected isRecordCompleted(record: ComplianceRecord): boolean {
    return ['completed', 'filed', 'compliant'].includes(record.status.toLowerCase());
  }

  /**
   * Check if a record is overdue (override in child components)
   */
  protected isRecordOverdue(record: ComplianceRecord): boolean {
    if (this.isRecordCompleted(record)) return false;

    // Default logic - check if date1 (due date) is in the past
    if (record.date1) {
      const dueDate = new Date(record.date1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }

    return false;
  }

  /**
   * Update record statuses based on dates (override in child components)
   */
  protected updateRecordStatuses(): void {
    const records = this.records$.getValue();
    let hasChanges = false;

    records.forEach(record => {
      if (!this.isRecordCompleted(record)) {
        const newStatus = this.isRecordOverdue(record) ? 'Overdue' : 'Pending';
        if (record.status !== newStatus) {
          record.status = newStatus;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      this.records$.next([...records]);
    }
  }
}
