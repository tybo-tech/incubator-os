import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NodeService } from '../services';
import { Company } from '../models/business.models';
import { getCompanyImports } from './data';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'nodes';
  constructor(private nodeService: NodeService<Company>) {
    // this.importData();
  }
  importData() {
    const data = getCompanyImports();
    this.nodeService.addNodesBatch(data).subscribe({
      next: (response) => {
        console.log('Data imported successfully:', response);
      },
      error: (err) => {
        console.error('Error importing data:', err);
      },
    });
  }
}
