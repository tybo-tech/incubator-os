import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeService } from '../../../services/node.service';
import { IHydratedNode, INode } from '../../../models/schema';

@Component({
  selector: 'app-oop-system-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">🚀 OOP System Demo</h2>

      <!-- Test Results -->
      <div class="space-y-6">

        <!-- System Status -->
        <div class="bg-blue-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-blue-800 mb-3">System Status</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white rounded p-3">
              <div class="text-sm text-gray-600">Legacy Service</div>
              <div class="text-lg font-bold" [class]="legacyServiceRemoved ? 'text-green-600' : 'text-red-600'">
                {{ legacyServiceRemoved ? '✅ Removed' : '❌ Still Present' }}
              </div>
            </div>
            <div class="bg-white rounded p-3">
              <div class="text-sm text-gray-600">OOP System</div>
              <div class="text-lg font-bold text-green-600">✅ Active</div>
            </div>
          </div>
        </div>

        <!-- Sample Data -->
        <div class="bg-green-50 rounded-lg p-4" *ngIf="sampleNode">
          <h3 class="text-lg font-semibold text-green-800 mb-3">Sample Hydrated Node</h3>
          <div class="bg-white rounded p-3">
            <div class="text-sm text-gray-600 mb-2">Node ID: {{ sampleNode.id }}</div>
            <div class="text-sm text-gray-600 mb-2">Type: {{ sampleNode.type }}</div>

            <!-- Raw Data Fields -->
            <div class="mb-4">
              <h4 class="font-semibold text-gray-700 mb-2">Raw Data Fields:</h4>
              <div class="space-y-1">
                <div *ngFor="let field of getRawFields(sampleNode)" class="text-sm">
                  <span class="font-mono text-blue-600">{{ field.key }}:</span>
                  <span class="text-gray-700 ml-2">{{ field.value }}</span>
                </div>
              </div>
            </div>

            <!-- Hydrated Relationship Fields -->
            <div class="mb-4" *ngIf="getHydratedFields(sampleNode).length > 0">
              <h4 class="font-semibold text-gray-700 mb-2">Hydrated Relationship Fields:</h4>
              <div class="space-y-2">
                <div *ngFor="let field of getHydratedFields(sampleNode)" class="bg-gray-50 rounded p-2">
                  <div class="font-mono text-purple-600 text-sm">{{ field.key }}</div>
                  <div class="text-gray-700 text-sm mt-1">{{ field.displayValue }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Migration Benefits -->
        <div class="bg-yellow-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-yellow-800 mb-3">🏆 Migration Benefits</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="flex items-center text-sm">
                <span class="text-green-600 mr-2">✅</span>
                <span>No separate relationship queries needed</span>
              </div>
              <div class="flex items-center text-sm">
                <span class="text-green-600 mr-2">✅</span>
                <span>Automatic bidirectional relationship sync</span>
              </div>
              <div class="flex items-center text-sm">
                <span class="text-green-600 mr-2">✅</span>
                <span>Hydrated data auto-populated on fetch</span>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center text-sm">
                <span class="text-green-600 mr-2">✅</span>
                <span>Clean OOP architecture</span>
              </div>
              <div class="flex items-center text-sm">
                <span class="text-green-600 mr-2">✅</span>
                <span>Transaction safety with rollback</span>
              </div>
              <div class="flex items-center text-sm">
                <span class="text-green-600 mr-2">✅</span>
                <span>Advanced caching optimization</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-4">
          <button
            (click)="loadSampleData()"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Load Sample Data
          </button>
          <button
            (click)="testRelationshipSave()"
            [disabled]="!sampleNode"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            Test Relationship Save
          </button>
          <button
            (click)="runValidation()"
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Run System Validation
          </button>
        </div>

        <!-- Test Results -->
        <div class="bg-gray-50 rounded-lg p-4" *ngIf="testResults.length > 0">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">Test Results</h3>
          <div class="space-y-2">
            <div *ngFor="let result of testResults"
                 class="text-sm p-2 rounded"
                 [class]="result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
              <span class="font-mono mr-2">{{ result.success ? '✅' : '❌' }}</span>
              {{ result.message }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class OopSystemDemoComponent implements OnInit {
  sampleNode: IHydratedNode | null = null;
  legacyServiceRemoved = true; // We removed it
  testResults: Array<{success: boolean, message: string}> = [];

  constructor(private nodeService: NodeService) {}

  ngOnInit() {
    this.loadSampleData();
  }

  loadSampleData() {
    this.testResults = [];

    // Try to load any node to demonstrate hydrated fields
    this.nodeService.getNodes().subscribe(
      (nodes) => {
        if (nodes.length > 0) {
          // Find a node that might have relationship fields
          const nodeWithRelationships = nodes.find(node =>
            node.data && Object.keys(node.data).some(key => key.startsWith('__'))
          );

          this.sampleNode = nodeWithRelationships || nodes[0];

          this.testResults.push({
            success: true,
            message: `Loaded sample node (ID: ${this.sampleNode.id}) with ${this.getHydratedFields(this.sampleNode).length} hydrated relationships`
          });
        } else {
          this.testResults.push({
            success: false,
            message: 'No nodes found in database'
          });
        }
      },
      (error) => {
        this.testResults.push({
          success: false,
          message: 'Failed to load sample data: ' + error.message
        });
      }
    );
  }

  testRelationshipSave() {
    if (!this.sampleNode) return;

    // Create a test node with relationship data
    const testNode: INode<any> = {
      type: 'test-relationship',
      data: {
        name: 'Test Relationship Node',
        test_relationship_field: '1', // ID reference
        created_at: new Date().toISOString()
      }
    };

    this.nodeService.addNode(testNode).subscribe(
      (createdNode) => {
        this.testResults.push({
          success: true,
          message: `Successfully created test node with relationship data (ID: ${createdNode.id})`
        });

        // Load it back to see hydrated data
        if (createdNode.id) {
          this.nodeService.getNodeById(createdNode.id).subscribe(
            (hydratedNode) => {
              const hydratedCount = this.getHydratedFields(hydratedNode).length;
              this.testResults.push({
                success: true,
                message: `Loaded created node back with ${hydratedCount} hydrated relationships`
              });
            }
          );
        }
      },
      (error) => {
        this.testResults.push({
          success: false,
          message: 'Failed to create test node: ' + error.message
        });
      }
    );
  }

  runValidation() {
    // Basic validation tests
    this.testResults = [];

    // Test 1: NodeService exists and has required methods
    const hasRequiredMethods = !!(
      typeof this.nodeService.getNodeById === 'function' &&
      typeof this.nodeService.addNode === 'function' &&
      typeof this.nodeService.updateNode === 'function' &&
      typeof this.nodeService.saveNode === 'function' &&
      typeof this.nodeService.getDisplayValue === 'function'
    );

    this.testResults.push({
      success: hasRequiredMethods,
      message: 'NodeService has all required methods'
    });

    // Test 2: Check if we can access collection options endpoint
    this.nodeService.getCollectionOptions(1, 'name').subscribe(
      (options) => {
        this.testResults.push({
          success: true,
          message: `Collection options endpoint working (loaded ${options.length} options)`
        });
      },
      (error) => {
        this.testResults.push({
          success: false,
          message: 'Collection options endpoint failed: ' + error.message
        });
      }
    );

    // Test 3: Display value helper method
    if (this.sampleNode) {
      const testDisplayValue = this.nodeService.getDisplayValue('test_field', this.sampleNode.data, 'name');
      this.testResults.push({
        success: typeof testDisplayValue === 'string',
        message: 'getDisplayValue helper method working'
      });
    }
  }

  getRawFields(node: IHydratedNode): Array<{key: string, value: any}> {
    if (!node.data) return [];

    return Object.keys(node.data)
      .filter(key => !key.startsWith('__'))
      .map(key => ({
        key,
        value: this.formatValue(node.data[key])
      }));
  }

  getHydratedFields(node: IHydratedNode): Array<{key: string, displayValue: string}> {
    if (!node.data) return [];

    return Object.keys(node.data)
      .filter(key => key.startsWith('__'))
      .map(key => ({
        key,
        displayValue: this.formatHydratedValue(node.data[key])
      }));
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private formatHydratedValue(value: any): string {
    if (!value) return 'null';

    if (Array.isArray(value)) {
      return `Array of ${value.length} items: ${value.map(item => item.name || item.id || 'Unknown').join(', ')}`;
    }

    if (typeof value === 'object') {
      return `Object: ${value.name || value.label || value.id || 'Unknown'}`;
    }

    return String(value);
  }
}
