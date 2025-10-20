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
        this.addMessage('info', 'SWOT import not yet implemented');
      },
      error: (error) => {
        this.loading = false;
        this.addMessage('error', `Failed to load SWOT statistics: ${error.message}`);
      }
    });
  }

  /**
   * Import SWOT data (placeholder)
   */
  importSwotData(): void {
    this.addMessage('warning', 'SWOT import feature coming soon!');
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
   * Get CSS class for message type
   */
  getMessageClass(type: string): string {
    const classes = {
      success: 'alert-success',
      error: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info'
    };
    return classes[type as keyof typeof classes] || 'alert-secondary';
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
