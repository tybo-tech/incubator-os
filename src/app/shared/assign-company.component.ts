import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { NodeService } from '../../services/node.service';

@Component({
  selector: 'app-assign-company',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <input
        type="text"
        [(ngModel)]="searchTerm"
        (input)="search()"
        placeholder="Search company..."
        class="w-48 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      <div *ngIf="results().length > 0" class="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
        <button
          *ngFor="let c of results()"
          (click)="select(c.id, c.name)"
          class="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0"
        >{{ c.name }}</button>
      </div>
    </div>
  `
})
export class AssignCompanyComponent {
  nodeId = input.required<number>();
  assigned = output<{ nodeId: number; companyId: number; companyName: string }>();

  searchTerm = '';
  results = signal<{ id: number; name: string }[]>([]);
  private allCompanies: { id: number; name: string }[] = [];

  constructor(
    private companyService: CompanyService,
    private nodeService: NodeService<any>,
  ) {
    this.companyService.listAllCompanies().subscribe(c => this.allCompanies = c);
  }

  search(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) { this.results.set([]); return; }
    this.results.set(
      this.allCompanies
        .filter(c => c.name.toLowerCase().includes(term))
        .slice(0, 10)
    );
  }

  select(companyId: number, companyName: string): void {
    this.nodeService.getNodeById(this.nodeId()).subscribe({
      next: (node) => {
        this.nodeService.updateNode({ ...node, company_id: companyId } as any).subscribe({
          next: () => {
            this.searchTerm = '';
            this.results.set([]);
            this.assigned.emit({ nodeId: this.nodeId(), companyId, companyName });
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }
}
