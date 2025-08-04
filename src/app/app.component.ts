import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NodeService } from '../services';
import { FinancialCheckIn } from '../models/busines.financial.checkin.models';
import { convertBankStatementsToFinancialCheckins } from './import';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'nodes';
  constructor(private nodeService: NodeService<FinancialCheckIn>) {
    // this.importFinancialCheckinModels();
  }

  importFinancialCheckinModels() {
    console.log('🚀 Starting bank statement to financial check-in conversion...');

    const convertedData = convertBankStatementsToFinancialCheckins();

    console.log('📊 Conversion Results:');
    console.log('- Total financial check-ins created:', convertedData.length);

    if (convertedData.length === 0) {
      console.warn('⚠️ No financial check-ins were created. Check if bank statements have valid company IDs.');
      return;
    }

    // Save the converted data
    this.nodeService.addNodesBatch(convertedData).subscribe({
      next: (response) => {
        console.log('✅ Financial Check-in models imported successfully:', response);
        console.log('📈 Saved', convertedData.length, 'financial check-ins to database');
      },
      error: (error) => {
        console.error('❌ Error importing Financial Check-in models:', error);
      }
    });
  }

}
