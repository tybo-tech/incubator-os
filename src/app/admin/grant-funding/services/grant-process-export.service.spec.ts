import { TestBed } from '@angular/core/testing';
import { GrantProcessExportService } from './grant-process-export.service';
import { PdfService } from '../../../../services/pdf/pdf.service';

describe('GrantProcessExportService', () => {
  let service: GrantProcessExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GrantProcessExportService,
        { provide: PdfService, useValue: { downloadPdf: jasmine.createSpy('downloadPdf') } }
      ]
    });
    service = TestBed.inject(GrantProcessExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have export methods', () => {
    expect(service.exportBusinessProcessChecklist).toBeTruthy();
    expect(service.exportExpenditureAuthorization).toBeTruthy();
    expect(service.exportScmVerification).toBeTruthy();
  });
});