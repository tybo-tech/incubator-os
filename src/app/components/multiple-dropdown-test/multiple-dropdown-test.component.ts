import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../../services/node.service';

@Component({
  selector: 'app-multiple-dropdown-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">🔍 Multiple Dropdown Display Test</h2>
      
      <div class="space-y-6" *ngIf="testData">
        <!-- Raw Data Display -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">Raw Data</h3>
          <div class="space-y-2 text-sm font-mono">
            <div><strong>director_mdabcvaj_2fn8w6:</strong> {{ testData.director_mdabcvaj_2fn8w6 }}</div>
            <div><strong>a_mdcj1o56_ah324h:</strong> {{ testData.a_mdcj1o56_ah324h }}</div>
          </div>
        </div>

        <!-- Hydrated Data Display -->
        <div class="bg-blue-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-blue-800 mb-3">Hydrated Data</h3>
          <div class="space-y-3">
            <div class="bg-white rounded p-3">
              <div class="font-semibold text-gray-700">Director (__director_mdabcvaj_2fn8w6):</div>
              <div class="text-sm text-gray-600">{{ formatObject(testData.__director_mdabcvaj_2fn8w6) }}</div>
            </div>
            <div class="bg-white rounded p-3">
              <div class="font-semibold text-gray-700">Assigned To (__a_mdcj1o56_ah324h):</div>
              <div class="text-sm text-gray-600">{{ formatObject(testData.__a_mdcj1o56_ah324h) }}</div>
            </div>
          </div>
        </div>

        <!-- Display Value Tests -->
        <div class="bg-green-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-green-800 mb-3">Display Value Tests</h3>
          <div class="space-y-3">
            <div class="bg-white rounded p-3">
              <div class="font-semibold text-gray-700">Director Display (Auto-detect):</div>
              <div class="text-lg text-green-700">{{ getDirectorDisplay() }}</div>
            </div>
            <div class="bg-white rounded p-3">
              <div class="font-semibold text-gray-700">Assigned To Display (Auto-detect):</div>
              <div class="text-lg text-green-700">{{ getAssignedToDisplay() }}</div>
            </div>
            <div class="bg-white rounded p-3">
              <div class="font-semibold text-gray-700">Director Display (Explicit labelField):</div>
              <div class="text-lg text-blue-700">{{ getDirectorDisplayExplicit() }}</div>
            </div>
            <div class="bg-white rounded p-3">
              <div class="font-semibold text-gray-700">Assigned To Display (Explicit labelField):</div>
              <div class="text-lg text-blue-700">{{ getAssignedToDisplayExplicit() }}</div>
            </div>
          </div>
        </div>

        <!-- Test Results -->
        <div class="bg-yellow-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-yellow-800 mb-3">✅ Test Results</h3>
          <div class="space-y-2">
            <div class="flex items-center text-sm">
              <span class="w-4 h-4 mr-2" [class]="getDirectorDisplay() ? 'text-green-600' : 'text-red-600'">
                {{ getDirectorDisplay() ? '✅' : '❌' }}
              </span>
              <span>Director field displays: {{ getDirectorDisplay() || 'FAILED' }}</span>
            </div>
            <div class="flex items-center text-sm">
              <span class="w-4 h-4 mr-2" [class]="getAssignedToDisplay() ? 'text-green-600' : 'text-red-600'">
                {{ getAssignedToDisplay() ? '✅' : '❌' }}
              </span>
              <span>Assigned To field displays: {{ getAssignedToDisplay() || 'FAILED' }}</span>
            </div>
            <div class="flex items-center text-sm">
              <span class="w-4 h-4 mr-2" [class]="(getDirectorDisplay() && getAssignedToDisplay()) ? 'text-green-600' : 'text-red-600'">
                {{ (getDirectorDisplay() && getAssignedToDisplay()) ? '✅' : '❌' }}
              </span>
              <span><strong>Multiple dropdowns working: {{ (getDirectorDisplay() && getAssignedToDisplay()) ? 'SUCCESS' : 'FAILED' }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Load Different Record -->
        <div class="flex space-x-4">
          <button 
            (click)="loadTestRecord(8)"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Load Record ID 8
          </button>
          <button 
            (click)="loadTestRecord(10)" 
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Load Record ID 10
          </button>
          <button 
            (click)="loadTestRecord(12)"
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Load Record ID 12
          </button>
        </div>
      </div>

      <div *ngIf="!testData" class="text-center py-8">
        <div class="text-gray-500">Loading test data...</div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class MultipleDropdownTestComponent implements OnInit {
  testData: any = null;

  constructor(private nodeService: NodeService) {}

  ngOnInit() {
    this.loadTestRecord(8); // Load the first record by default
  }

  loadTestRecord(id: number) {
    this.nodeService.getNodeById(id).subscribe(
      (node) => {
        this.testData = node.data;
        console.log('Loaded test data:', this.testData);
      },
      (error) => {
        console.error('Failed to load test record:', error);
        this.testData = null;
      }
    );
  }

  getDirectorDisplay(): string {
    if (!this.testData) return '';
    return this.nodeService.getDisplayValue('director_mdabcvaj_2fn8w6', this.testData);
  }

  getAssignedToDisplay(): string {
    if (!this.testData) return '';
    return this.nodeService.getDisplayValue('a_mdcj1o56_ah324h', this.testData);
  }

  getDirectorDisplayExplicit(): string {
    if (!this.testData) return '';
    return this.nodeService.getDisplayValue('director_mdabcvaj_2fn8w6', this.testData, 'name_md9v8h1j_ibw4kb');
  }

  getAssignedToDisplayExplicit(): string {
    if (!this.testData) return '';
    return this.nodeService.getDisplayValue('a_mdcj1o56_ah324h', this.testData, 'name_md9v8h1j_ibw4kb');
  }

  formatObject(obj: any): string {
    if (!obj) return 'null';
    if (typeof obj === 'object') {
      return JSON.stringify(obj, null, 2);
    }
    return String(obj);
  }
}
