import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportService, ImportStats, ImportResult, ImportPreview, CountResult } from '../../../services/import.service';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import.component.html',
  providers: [ImportService]
})
export class ImportComponent implements OnInit {

  /* =========================================================================
     COMPONENT STATE
     ========================================================================= */

  loading = false;
  activeTab: 'gps' | 'swot' | 'overview' = 'overview';

  // Import statistics
  overallStats: ImportStats | null = null;
  gpsStats: ImportStats | null = null;
  swotStats: ImportStats | null = null;

  // Import results
  lastImportResult: ImportResult | null = null;

  // UI state
  showPreview = false;
  previewData: ImportPreview | null = null;

  // Messages
  messages: { type: 'success' | 'error' | 'info' | 'warning', text: string, timestamp: Date }[] = [];

  constructor(private importService: ImportService) {}

  ngOnInit(): void {
    this.loadOverallStats();
  }

  /* =========================================================================
     OVERVIEW TAB METHODS
     ========================================================================= */

  /**
   * Load overall import statistics
   */
  loadOverallStats(): void {
    this.loading = true;
    this.addMessage('info', 'Loading import statistics...');

    this.importService.getAllImportStats().subscribe({
      next: (stats) => {
        this.overallStats = stats;
        this.loading = false;
        this.addMessage('success', 'Statistics loaded successfully');
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Failed to load statistics: ${error.message}`);
      }
    });
  }

  /**
   * Refresh all statistics
   */
  refreshStats(): void {
    this.loadOverallStats();
    if (this.activeTab === 'gps') {
      this.loadGpsStats();
    } else if (this.activeTab === 'swot') {
      this.loadSwotStats();
    }
  }

  /* =========================================================================
     GPS TAB METHODS
     ========================================================================= */

  /**
   * Load GPS statistics
   */
  loadGpsStats(): void {
    this.loading = true;
    this.addMessage('info', 'Loading GPS statistics...');

    this.importService.getGpsStats().subscribe({
      next: (stats) => {
        this.gpsStats = stats;
        this.loading = false;
        this.addMessage('success', 'GPS statistics loaded');
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Failed to load GPS statistics: ${error.message}`);
      }
    });
  }

  /**
   * Preview GPS import
   */
  previewGpsImport(): void {
    this.loading = true;
    this.addMessage('info', 'Loading GPS import preview...');

    this.importService.previewGpsImport().subscribe({
      next: (preview) => {
        this.previewData = preview;
        this.showPreview = true;
        this.loading = false;
        this.addMessage('success', `Preview loaded: ${preview.total_nodes} nodes found`);
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Failed to load preview: ${error.message}`);
      }
    });
  }

  /**
   * Clear GPS action items
   */
  clearGpsData(): void {
    if (!confirm('Are you sure you want to clear all GPS action items? This action cannot be undone.')) {
      return;
    }

    this.loading = true;
    this.addMessage('info', 'Clearing GPS action items...');

    this.importService.clearGpsActionItems().subscribe({
      next: (result) => {
        this.loading = false;
        this.addMessage('success', `Cleared ${result.deleted_count || 0} GPS action items`);
        this.loadGpsStats();
        this.loadOverallStats();
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Failed to clear GPS data: ${error.message}`);
      }
    });
  }

  /**
   * Import GPS data
   */
  importGpsData(): void {
    // Validate first
    this.importService.validateImportOperation('gps').subscribe({
      next: (validation) => {
        if (!validation.canImport) {
          this.addMessage('warning', validation.message);
          return;
        }

        if (!confirm(`${validation.message}. Proceed with import?`)) {
          return;
        }

        this.performGpsImport();
      },
      error: (error) => {
        this.addMessage('error', `Validation failed: ${error.message}`);
      }
    });
  }

  /**
   * Perform the actual GPS import
   */
  private performGpsImport(): void {
    this.loading = true;
    this.addMessage('info', 'Starting GPS data import...');

    this.importService.importGpsData().subscribe({
      next: (result) => {
        this.lastImportResult = result;
        this.loading = false;

        const summary = this.importService.formatImportSummary(result.import_summary);
        this.addMessage('success', `GPS import completed: ${summary}`);

        // Refresh stats
        this.loadGpsStats();
        this.loadOverallStats();
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `GPS import failed: ${error.message}`);
      }
    });
  }

  /**
   * Verify GPS import
   */
  verifyGpsImport(): void {
    this.loading = true;
    this.addMessage('info', 'Verifying GPS import...');

    this.importService.verifyGpsActionItems().subscribe({
      next: (verification) => {
        this.loading = false;
        const totalItems = verification.total_gps_action_items || 0;
        this.addMessage('success', `Verification complete: ${totalItems} GPS action items found`);
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Verification failed: ${error.message}`);
      }
    });
  }

  /* =========================================================================
     SWOT TAB METHODS (Placeholders)
     ========================================================================= */

  /**
   * Load SWOT statistics
   */
  loadSwotStats(): void {
    this.loading = true;
    this.addMessage('info', 'Loading SWOT statistics...');

    this.importService.getSwotStats().subscribe({
      next: (stats) => {
        this.swotStats = stats;
        this.loading = false;
        this.addMessage('success', 'SWOT statistics loaded successfully');
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Failed to load SWOT statistics: ${error.message}`);
      }
    });
  }

  /**
   * Preview SWOT import data
   */
  previewSwotImport(): void {
    this.loading = true;
    this.addMessage('info', 'Generating SWOT import preview...');

    this.importService.previewSwotImport().subscribe({
      next: (preview) => {
        this.previewData = preview;
        this.showPreview = true;
        this.loading = false;
        this.addMessage('success', `Found ${preview.total_nodes} SWOT nodes to import`);
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Failed to preview SWOT import: ${error.message}`);
      }
    });
  }

  /**
   * Import SWOT data
   */
  importSwotData(): void {
    this.loading = true;
    this.addMessage('info', 'Starting SWOT import process...');

    this.importService.importSwotData().subscribe({
      next: (result) => {
        this.lastImportResult = result;
        this.loading = false;
        const summary = result.import_summary;
        this.addMessage('success',
          `Successfully imported ${summary.total_items_imported} SWOT items from ${summary.total_nodes} nodes`
        );

        // Refresh statistics
        this.loadSwotStats();
        this.loadOverallStats();
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `SWOT import failed: ${error.message}`);
      }
    });
  }

  /**
   * Clear SWOT action items
   */
  clearSwotData(): void {
    if (!confirm('Are you sure you want to clear all SWOT action items? This cannot be undone.')) {
      return;
    }

    this.loading = true;
    this.addMessage('info', 'Clearing SWOT action items...');

    this.importService.clearSwotData().subscribe({
      next: (result) => {
        this.loading = false;
        const deletedCount = result.data?.deleted_count || 0;
        this.addMessage('success', `Cleared ${deletedCount} SWOT action items`);

        // Refresh statistics
        this.loadSwotStats();
        this.loadOverallStats();
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Failed to clear SWOT data: ${error.message}`);
      }
    });
  }

  /**
   * Verify SWOT import
   */
  verifySwotImport(): void {
    this.loading = true;
    this.addMessage('info', 'Verifying SWOT import data...');

    this.importService.verifySwotImport().subscribe({
      next: (result) => {
        this.loading = false;
        const totals = result.data?.summary?.totals;
        if (totals) {
          this.addMessage('success',
            `Verification complete: ${totals.total_items} SWOT items across ${totals.companies_count} companies`
          );
        } else {
          this.addMessage('info', 'SWOT verification completed');
        }
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `SWOT verification failed: ${error.message}`);
      }
    });
  }

  /* =========================================================================
     UI HELPER METHODS
     ========================================================================= */

  /**
   * Switch active tab
   */
  switchTab(tab: 'gps' | 'swot' | 'overview'): void {
    this.activeTab = tab;

    if (tab === 'gps' && !this.gpsStats) {
      this.loadGpsStats();
    } else if (tab === 'swot' && !this.swotStats) {
      this.loadSwotStats();
    }
  }

  /**
   * Add message to the message list
   */
  addMessage(type: 'success' | 'error' | 'info' | 'warning', text: string): void {
    this.messages.unshift({
      type,
      text,
      timestamp: new Date()
    });

    // Keep only last 10 messages
    if (this.messages.length > 10) {
      this.messages = this.messages.slice(0, 10);
    }

    // Auto-remove info messages after 5 seconds
    if (type === 'info') {
      setTimeout(() => {
        const index = this.messages.findIndex(m => m.text === text && m.type === type);
        if (index > -1) {
          this.messages.splice(index, 1);
        }
      }, 5000);
    }
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * Close preview modal
   */
  closePreview(): void {
    this.showPreview = false;
    this.previewData = null;
  }

  /**
   * Get Tailwind CSS class for message type
   */
  getTailwindMessageClass(type: string): string {
    const classes = {
      success: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      error: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      info: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    };
    return classes[type as keyof typeof classes] || 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200';
  }

  /**
   * Get import status badge
   */
  getStatusBadge(stats: ImportStats | null): { text: string, class: string } {
    if (!stats) {
      return { text: 'No Data', class: 'badge-secondary' };
    }
    return this.importService.getImportStatusBadge(stats);
  }

  /**
   * Get Tailwind status class
   */
  getTailwindStatusClass(stats: ImportStats | null): string {
    if (!stats) {
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }

    const gpsNodes = stats.gps_nodes_count || 0;
    const gpsItems = stats.gps_action_items_count || 0;

    if (gpsNodes > 0 && gpsItems > 0) {
      return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
    } else if (gpsNodes > 0) {
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
    } else {
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  }

  /**
   * Format number for display
   */
  formatNumber(num: number | undefined | null): string {
    return (num || 0).toLocaleString();
  }

  /**
   * Calculate completion percentage
   */
  calculateCompletionRate(completed: number | string, total: number | string): number {
    const completedNum = typeof completed === 'string' ? parseInt(completed, 10) : completed;
    const totalNum = typeof total === 'string' ? parseInt(total, 10) : total;
    return this.importService.calculateCompletionRate(completedNum, totalNum);
  }

  /**
   * Get relative time string
   */
  getRelativeTime(timestamp: string | undefined): string {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
