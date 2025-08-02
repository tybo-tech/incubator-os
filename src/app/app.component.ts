import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NodeService } from '../services';
import { Company, BankStatement } from '../models/business.models';
import { getBankStatementImports } from './data';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'nodes';
  constructor(private nodeService: NodeService<any>) {
    // this.importData();
  }
  importData() {
    const data = getBankStatementImports();
    this.nodeService.addNodesBatch(data).subscribe({
      next: (response) => {
        console.log('Bank statement data imported successfully:', response);
      },
      error: (err) => {
        console.error('Error importing bank statement data:', err);
      },
    });
  }
}
