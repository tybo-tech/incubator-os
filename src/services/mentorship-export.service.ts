import { Injectable } from '@angular/core';
import { PdfService } from './pdf/pdf.service';
import { MentorshipSession } from '../models/mentorship.models';

@Injectable({
  providedIn: 'root'
})
export class MentorshipExportService {
  constructor(private pdfService: PdfService) {}

  exportLogbook(sessions: MentorshipSession[], companyName: string): void {
    const html = this.generateLogbookHtml(sessions, companyName);
    this.pdfService.downloadPdf(html, `${companyName}_Mentorship_Logbook.pdf`);
  }

  private generateLogbookHtml(sessions: MentorshipSession[], companyName: string): string {
    const rows = sessions.map(s => `
      <tr>
        <td>${s.sessionDate || ''}</td>
        <td>${s.mentorName || ''}</td>
        <td>${s.category || ''}</td>
        <td>${s.topic || ''}</td>
        <td>${s.durationHours || 0}</td>
        <td>R${(s.hourlyRate || 0).toLocaleString()}</td>
        <td>R${(s.sessionValue || 0).toLocaleString()}</td>
        <td>${s.status || ''}</td>
      </tr>
    `).join('');

    const totalHours = sessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const totalValue = sessions.reduce((sum, s) => sum + (s.sessionValue || 0), 0);

    const content = `
      <div class="header">
        <h1>Mentorship Session Logbook</h1>
        <p>${companyName}</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="summary">
        <p><strong>Total Sessions:</strong> ${sessions.length}</p>
        <p><strong>Total Hours:</strong> ${totalHours}</p>
        <p><strong>Total Value:</strong> R${totalValue.toLocaleString()}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Mentor</th>
            <th>Category</th>
            <th>Topic</th>
            <th>Hours</th>
            <th>Rate</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="8" style="text-align:center;">No sessions recorded</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <p>This logbook was generated automatically from mentorship session records.</p>
      </div>
    `;

    return this.pdfService.createHtmlTemplate(content, `Mentorship Logbook - ${companyName}`);
  }
}
