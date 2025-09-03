import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwotExportHelperService } from '../../../services/pdf/swot-export-helper.service';

@Component({
  selector: 'app-swot-export-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white rounded-lg shadow-sm border">
      <h3 class="text-lg font-semibold mb-4">SWOT Action Plan Export Example</h3>

      <div class="space-y-4">
        <div>
          <h4 class="font-medium">Using Raw SWOT Data Array:</h4>
          <button
            (click)="exportFromRawData()"
            class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export from Sample Data
          </button>
        </div>

        <div>
          <h4 class="font-medium">Preview Action Items:</h4>
          <button
            (click)="previewData()"
            class="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Preview Sample Data
          </button>
        </div>

        <div *ngIf="previewResult" class="mt-4 p-4 bg-gray-50 rounded">
          <h5 class="font-medium">Preview Results:</h5>
          <p>Company: {{ previewResult.companyName }}</p>
          <p>Total Action Items: {{ previewResult.actionItems.length }}</p>
          <div class="mt-2">
            <h6 class="font-medium">Sample Action Items:</h6>
            <ul class="list-disc list-inside text-sm">
              <li *ngFor="let item of previewResult.actionItems.slice(0, 3)">
                <span class="font-medium">{{ item.action_required }}</span>
                ({{ item.category }}, {{ item.priority }} priority)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SwotExportExampleComponent {
  previewResult: any = null;

  constructor(private swotExportHelper: SwotExportHelperService) {}

  exportFromRawData(): void {
    // This is sample data in the format you provided
    const sampleSwotData = [
      {
        "id": 1946,
        "type": "swot_analysis",
        "company_id": 11,
        "data": {
          "summary": "Sample SWOT analysis for export testing",
          "external": {
            "threats": [
              {
                "impact": "medium",
                "status": "identified",
                "category": "threat",
                "priority": "medium",
                "date_added": "2025-08-29T08:58:03.421Z",
                "assigned_to": "Marketing Team",
                "description": "Going to change the name of the business",
                "target_date": "2025-11-21",
                "action_required": "Plan brand transition strategy"
              }
            ],
            "opportunities": [
              {
                "impact": "medium",
                "status": "identified",
                "category": "opportunity",
                "priority": "high",
                "date_added": "2025-08-29T09:22:53.210Z",
                "assigned_to": "Sales Team",
                "description": "collaboration - bulk sewing",
                "target_date": "2025-10-15",
                "action_required": "approach and pitch to existing manufacturers"
              }
            ]
          },
          "internal": {
            "strengths": [
              {
                "impact": "high",
                "status": "identified",
                "category": "strength",
                "priority": "medium",
                "date_added": "2025-08-29T08:58:03.421Z",
                "assigned_to": "HR Manager",
                "description": "Do have the training in place",
                "target_date": "2025-09-30",
                "action_required": "Continue training programs"
              }
            ],
            "weaknesses": [
              {
                "impact": "high",
                "status": "identified",
                "category": "weakness",
                "priority": "critical",
                "date_added": "2025-08-29T08:58:03.421Z",
                "assigned_to": "CFO",
                "description": "State of the finance is a weakness",
                "target_date": "2025-09-05",
                "action_required": "Implement financial management system"
              }
            ]
          },
          "company_id": "11",
          "is_complete": false,
          "last_updated": "2025-09-02T04:17:14.020Z",
          "analysis_date": "2025-08-29T08:58:03.421Z"
        }
      }
    ];

    // Export using the helper service
    this.swotExportHelper.exportSwotActionPlanFromData(
      sampleSwotData,
      'Sample Fashion Company',
      '11'
    ).subscribe({
      next: (blob) => {
        this.swotExportHelper.downloadPdf(blob, 'Sample Fashion Company');
        console.log('PDF exported successfully!');
      },
      error: (error) => {
        console.error('Export failed:', error);
        alert('Export failed: ' + error.message);
      }
    });
  }

  previewData(): void {
    const sampleSwotData = {
      "id": 1946,
      "data": {
        "external": {
          "threats": [
            {
              "impact": "medium",
              "status": "identified",
              "category": "threat",
              "priority": "medium",
              "assigned_to": "Marketing Team",
              "description": "Going to change the name of the business",
              "target_date": "2025-11-21",
              "action_required": "Plan brand transition strategy"
            }
          ],
          "opportunities": [
            {
              "impact": "high",
              "status": "identified",
              "category": "opportunity",
              "priority": "high",
              "assigned_to": "Sales Team",
              "description": "collaboration - bulk sewing",
              "target_date": "2025-10-15",
              "action_required": "approach and pitch to existing manufacturers"
            }
          ]
        },
        "internal": {
          "strengths": [
            {
              "impact": "high",
              "status": "completed",
              "category": "strength",
              "priority": "medium",
              "assigned_to": "HR Manager",
              "description": "Do have the training in place",
              "target_date": "2025-09-30",
              "action_required": "Continue training programs"
            }
          ],
          "weaknesses": [
            {
              "impact": "high",
              "status": "in_progress",
              "category": "weakness",
              "priority": "critical",
              "assigned_to": "CFO",
              "description": "State of the finance is a weakness",
              "target_date": "2025-09-05",
              "action_required": "Implement financial management system"
            }
          ]
        }
      }
    };

    this.previewResult = this.swotExportHelper.previewActionPlanData(
      sampleSwotData,
      'Sample Fashion Company',
      '11'
    );

    console.log('Preview data:', this.previewResult);
  }
}
