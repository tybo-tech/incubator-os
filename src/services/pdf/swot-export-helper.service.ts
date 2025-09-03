import { Injectable } from '@angular/core';
import { SwotActionPlanExportService, SwotActionPlanData } from './swot-action-plan-export.service';
import { Observable } from 'rxjs';

/**
 * Helper service for common SWOT export operations
 */
@Injectable({
  providedIn: 'root'
})
export class SwotExportHelperService {

  constructor(private exportService: SwotActionPlanExportService) {}

  /**
   * Quick export method that takes raw SWOT data from your JSON structure
   * and generates a PDF directly
   */
  exportSwotActionPlanFromData(
    swotDataArray: any[],
    companyName: string,
    companyId: string
  ): Observable<Blob> {
    // Use the latest SWOT analysis (highest ID or most recent date)
    const latestSwot = this.getLatestSwotAnalysis(swotDataArray);

    if (!latestSwot) {
      throw new Error('No SWOT analysis data found');
    }

    // Convert to action plan format
    const actionPlanData = this.exportService.convertSwotToActionPlan(
      latestSwot,
      companyName,
      companyId
    );

    if (actionPlanData.actionItems.length === 0) {
      throw new Error('No action items found in SWOT analysis');
    }

    // Generate PDF
    return this.exportService.generateActionPlanPDF(actionPlanData);
  }

  /**
   * Export method for when you already have processed SWOT data
   */
  exportSwotActionPlan(
    swotAnalysis: any,
    companyName: string,
    companyId: string
  ): Observable<Blob> {
    const actionPlanData = this.exportService.convertSwotToActionPlan(
      swotAnalysis,
      companyName,
      companyId
    );

    return this.exportService.generateActionPlanPDF(actionPlanData);
  }

  /**
   * Download the PDF blob with a proper filename
   */
  downloadPdf(blob: Blob, companyName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${companyName}_SWOT_Action_Plan_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get the latest SWOT analysis from an array of SWOT data
   */
  private getLatestSwotAnalysis(swotDataArray: any[]): any {
    if (!swotDataArray || swotDataArray.length === 0) {
      return null;
    }

    // Sort by ID (descending) to get the latest
    return swotDataArray.sort((a, b) => {
      const idA = parseInt(a.id);
      const idB = parseInt(b.id);
      return idB - idA;
    })[0];
  }

  /**
   * Get action items count from SWOT data
   */
  getActionItemsCount(swotData: any): number {
    const actionPlanData = this.exportService.convertSwotToActionPlan(
      swotData,
      'temp',
      'temp'
    );
    return actionPlanData.actionItems.length;
  }

  /**
   * Preview the action plan data without generating PDF
   */
  previewActionPlanData(
    swotData: any,
    companyName: string,
    companyId: string
  ): SwotActionPlanData {
    return this.exportService.convertSwotToActionPlan(
      swotData,
      companyName,
      companyId
    );
  }
}
