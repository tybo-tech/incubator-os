import { Injectable } from '@angular/core';
import { PdfService } from '../../../../services/pdf/pdf.service';
import {
  GrantFundingChecklist,
  GRANT_FUNDING_CHECKLIST_FIELDS,
} from '../business-process/checklist.models';
import {
  GrantExpenditureAuthorization,
  ExpenditureInvoice,
} from '../business-process/expenditure-authorization.models';
import {
  GrantScmVerification,
  ScmQuotation,
  ScmSupplierVerification,
  ScmPurchaseOrder,
  ScmPayment,
} from '../business-process/scm-verification.models';
import { Constants } from '../../../../services';
import { DocumentGeneratorService } from '../../../../services/pdf/document-generator.service';

export interface CompanyInfo {
  companyName: string;
  directorName: string;
  contactNumber: string;
  registrationNumber: string;
}

export interface ExportOptions {
  filename?: string;
  paperSize?: string;
  orientation?: 'portrait' | 'landscape';
}

@Injectable({
  providedIn: 'root',
})
export class GrantProcessExportService {
  images = Constants.Images;
  constructor(private pdfService: PdfService) {}

  /**
   * Export Business Process Checklist to PDF
   */
  exportBusinessProcessChecklist(
    data: GrantFundingChecklist,
    companyInfo: CompanyInfo,
    options: ExportOptions = {},
  ): void {
    const html = this._buildChecklistHtml(data, companyInfo);
    const filename =
      options.filename || `Grant_Funding_Checklist_${this._dateStamp()}.pdf`;
    const paperSize = options.paperSize || 'A4';
    const orientation = options.orientation || 'portrait';

    this.pdfService.downloadPdf(html, filename, paperSize, orientation);
  }

  /**
   * Export Expenditure Authorization Form to PDF
   */
  exportExpenditureAuthorization(
    data: GrantExpenditureAuthorization,
    companyInfo: CompanyInfo,
    options: ExportOptions = {},
  ): void {
    const html = this._buildExpenditureAuthorizationHtml(data, companyInfo);
    const filename =
      options.filename || `Expenditure_Authorization_${this._dateStamp()}.pdf`;
    const paperSize = options.paperSize || 'A4';
    const orientation = options.orientation || 'landscape';

    this.pdfService.downloadPdf(html, filename, paperSize, orientation);
  }

  /**
   * Export SCM Verification Process to PDF
   */
  exportScmVerification(
    data: GrantScmVerification,
    companyInfo: CompanyInfo,
    options: ExportOptions = {},
  ): void {
    const html = this._buildScmVerificationHtml(data, companyInfo);
    const filename =
      options.filename || `SCM_Verification_${this._dateStamp()}.pdf`;
    const paperSize = options.paperSize || 'A4';
    const orientation = options.orientation || 'landscape';

    this.pdfService.downloadPdf(html, filename, paperSize, orientation);
  }

  // ── Business Process Checklist HTML Builder ────────────────────────────────

  private _buildChecklistHtml(
    data: GrantFundingChecklist,
    companyInfo: CompanyInfo,
  ): string {
    const FF = `font-family:Arial,sans-serif`;
    const checklistCellStyle = `padding:8px;border:1px solid #000;font-size:10px;${FF}`;
    const checklistHeaderCellStyle = `background:#e0e0e0;border:1px solid #000;padding:5px;font-weight:bold;font-size:10px;${FF}`;

    // Build checklist rows
    const checklistRows = GRANT_FUNDING_CHECKLIST_FIELDS.map((field) => {
      const value = data[field.key as keyof GrantFundingChecklist];

      // Use image-based checkboxes
      const yesBox = this._getYesNoNaCheckbox(value || '', 'YES');
      const noBox = this._getYesNoNaCheckbox(value || '', 'NO');
      const naBox = this._getYesNoNaCheckbox(value || '', 'NA');

      return `
        <tr>
          <td style="${checklistCellStyle}">${this._esc(field.label)}</td>
          <td style="${checklistCellStyle}text-align:center;">${yesBox}</td>
          <td style="${checklistCellStyle}text-align:center;">${noBox}</td>
          <td style="${checklistCellStyle}text-align:center;">${naBox}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; line-height: 1.4; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: top; }
</style>
</head>
<body>
  <!-- Header -->
  ${this._generateHeader(companyInfo, 'Grant Funding Check List')}

  <!-- Checklist Table -->
  <table>
    ${this._generateYesNoNaHeader()}
    <tbody>
      ${checklistRows}
    </tbody>
  </table>

  <!-- Footer -->
  ${this._generateFooter()}
</body>
</html>`;
  }

  // ── Expenditure Authorization HTML Builder ─────────────────────────────────

  private _buildExpenditureAuthorizationHtml(
    data: GrantExpenditureAuthorization,
    companyInfo: CompanyInfo,
  ): string {
    const FF = `font-family:Arial,sans-serif`;
    const invoiceCellStyle = `padding:5px;border:1px solid #000;height:10mm;font-size:8px;${FF}`;
    const invoiceHeaderCellStyle = `background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;text-align:center;${FF}`;

    // Build invoice rows (7 rows total)
    const invoiceRows = Array.from({ length: 7 }, (_, i) => {
      const invoice = data.invoices[i] || ({} as ExpenditureInvoice);
      // Use image-based checkboxes
      const preferredSupplierBox = this._getCheckboxImage(
        invoice.preferred_supplier ? 'YES' : 'NO',
        'YES',
      );

      return `
        <tr>
          <td style="${invoiceCellStyle}">${this._esc(invoice.invoice_number || '')}</td>
          <td style="${invoiceCellStyle}">${this._esc(invoice.description || '')}</td>
          <td style="${invoiceCellStyle}">${this._esc(invoice.supplier_name || '')}</td>
          <td style="${invoiceCellStyle}text-align:right;">${invoice.amount_excl_vat || ''}</td>
          <td style="${invoiceCellStyle}text-align:right;">${invoice.vat_amount || ''}</td>
          <td style="${invoiceCellStyle}text-align:right;">${invoice.total_amount || ''}</td>
          <td style="${invoiceCellStyle}text-align:center;">
            ${preferredSupplierBox}
          </td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: top; }
</style>
</head>
<body>
  <!-- Header -->
  <table style="margin-bottom:8px">
    <tr>
      <td style="text-align:center;${FF}">
        <div style="font-size:12px;font-weight:bold;${FF}">South32 ESD Centre Grant Funding Process Sheet</div>
        <div style="font-size:11px;${FF}">Expenditure Authorization Form</div>
      </td>
      <td style="width:70mm;${FF}">
        <!-- Process Tracking Table -->
        <table style="float:right">
          <tr>
            <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:40mm;${FF}">Process Owner</td>
            <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:30mm;${FF}">Checked (✓ / ✗)</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">Step 1</td>
            <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">NB</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">Step 2</td>
            <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">CB</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">Step 3</td>
            <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">LN</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">Step 4</td>
            <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">Beneficiary Signature</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Logo -->
  <table style="margin-bottom:8px">
    <tr>
      <td style="text-align:right;${FF}">
        <img src="${this.images.South32Logo}" alt="South32 Logo" style="max-height:15mm;max-width:50mm;">
      </td>
    </tr>
  </table>

  <!-- Company Information -->
  <table style="margin-bottom:8px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:35mm;${FF}">Name of Company</td>
      <td style="border:1px solid #000;padding:4px;font-size:9px;width:90mm;${FF}">${this._esc(companyInfo.companyName)}</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:35mm;${FF}">Contact No</td>
      <td style="border:1px solid #000;padding:4px;font-size:9px;width:55mm;${FF}">${this._esc(companyInfo.contactNumber)}</td>
    </tr>
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;${FF}">Name of Director</td>
      <td style="border:1px solid #000;padding:4px;font-size:9px;${FF}">${this._esc(companyInfo.directorName)}</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;${FF}">Company Reg No</td>
      <td style="border:1px solid #000;padding:4px;font-size:9px;${FF}">${this._esc(companyInfo.registrationNumber)}</td>
    </tr>
  </table>

  <!-- Invoice Authorization Table -->
  <table style="margin-bottom:8px">
    <thead>
      <tr>
        <td style="${invoiceHeaderCellStyle}width:50mm;">Invoice Number</td>
        <td style="${invoiceHeaderCellStyle}width:70mm;">Description of Goods/Services</td>
        <td style="${invoiceHeaderCellStyle}width:43mm;">Supplier Name</td>
        <td style="${invoiceHeaderCellStyle}width:28mm;">Amount Excl VAT</td>
        <td style="${invoiceHeaderCellStyle}width:25mm;">VAT Amount</td>
        <td style="${invoiceHeaderCellStyle}width:25mm;">Total Amount Including VAT</td>
        <td style="${invoiceHeaderCellStyle}width:23mm;">Preferred Supplier Yes/No</td>
      </tr>
    </thead>
    <tbody>
      ${invoiceRows}
    </tbody>
  </table>

  <!-- Authorization Notice -->
  <table style="margin-bottom:8px">
    <tr>
      <td style="border:1px solid #000;padding:5px;height:10mm;font-size:9px;${FF}">
        Please sign the payment authorization form so that payments can be processed.
      </td>
    </tr>
  </table>

  <!-- Beneficiary Declaration -->
  <table style="margin-bottom:8px">
    <tr>
      <td style="border:1px solid #000;padding:5px;height:15mm;font-size:9px;${FF}">
        I __________________ acknowledge that the supplier information provided is correct, as the director of ${this._esc(companyInfo.companyName)} I hereby authorize payment.
      </td>
    </tr>
  </table>

  <!-- Beneficiary Authorization Table -->
  <table style="margin-bottom:8px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;width:95mm;${FF}">Beneficiary</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;width:70mm;${FF}">Signature</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;width:60mm;${FF}">Date</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}">${this._esc(data.beneficiary_authorization.name || '')}</td>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}"></td>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}">${this._esc(data.beneficiary_authorization.date || '')}</td>
    </tr>
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;${FF}">Authorized By: Business Advisor 1 – ${this._esc(data.business_advisor_authorization.name || 'Marius Wilken')}</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;${FF}">Signature</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;${FF}">Date</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}">${this._esc(data.business_advisor_authorization.name || '')}</td>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}"></td>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}">${this._esc(data.business_advisor_authorization.date || '')}</td>
    </tr>
  </table>

  <!-- Approval Section -->
  <table style="margin-bottom:8px">
    <tr>
      <td style="border:1px solid #000;padding:5px;height:20mm;width:33.33%;${FF}">
        <div style="font-weight:bold;margin-bottom:3px;${FF}">ESD Centre Coordinator</div>
        <div style="font-size:8px;margin-bottom:3px;${FF}">(optional)</div>
        <div style="font-size:8px;${FF}">Name: ${this._esc(data.coordinator_authorization.name || '')}</div>
        <div style="font-size:8px;${FF}">Signature: _______________________</div>
      </td>
      <td style="border:1px solid #000;padding:5px;height:20mm;width:33.33%;${FF}">
        <div style="font-weight:bold;margin-bottom:3px;${FF}">South32 SPA</div>
        <div style="font-size:8px;margin-bottom:3px;${FF}">Name: ${this._esc(data.south32_spa_authorization.name || '')}</div>
        <div style="font-size:8px;${FF}">Signature: _______________________</div>
      </td>
      <td style="border:1px solid #000;padding:5px;height:20mm;width:33.33%;${FF}">
        <div style="font-weight:bold;margin-bottom:3px;${FF}">ESD Centre Manager</div>
        <div style="font-size:8px;margin-bottom:3px;${FF}">Name: ${this._esc(data.manager_authorization.name || '')}</div>
        <div style="font-size:8px;${FF}">Signature: _______________________</div>
      </td>
    </tr>
  </table>

  <!-- Payment Release Section -->
  <table>
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;width:95mm;${FF}">Payment Released By</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;width:70mm;${FF}">Signature</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;width:60mm;${FF}">Payment Release Date</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}">${this._esc(data.payment_release.released_by || 'Krian Naidoo')}</td>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}"></td>
      <td style="border:1px solid #000;padding:4px;height:10mm;font-size:8px;${FF}">${this._esc(data.payment_release.release_date || '')}</td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ── SCM Verification HTML Builder ──────────────────────────────────────────

  private _buildScmVerificationHtml(
    data: GrantScmVerification,
    companyInfo: CompanyInfo,
  ): string {
    const FF = `font-family:Arial,sans-serif`;
    const scmCellStyle = `padding:4px;border:1px solid #000;height:7mm;font-size:7px;text-align:center;${FF}`;

    // Build quotation rows (4 rows)
    const quotationRows = Array.from({ length: 4 }, (_, i) => {
      const item = data.step_1.items[i] || ({} as ScmQuotation);
      return `
        <tr>
          <td style="${scmCellStyle}">${i + 1}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.supplier_name || '')}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.date_received || '')}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}"></td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}"></td>
        </tr>`;
    }).join('');

    // Build supplier verification rows (4 rows)
    const supplierRows = Array.from({ length: 4 }, (_, i) => {
      const item = data.step_2.items[i] || ({} as ScmSupplierVerification);
      // Use image-based checkboxes
      const approvedBox = this._getCheckboxImage(
        item.approved ? 'YES' : 'NO',
        'YES',
      );

      return `
        <tr>
          <td style="${scmCellStyle}">${i + 1}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.supplier_name || '')}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.cipc_registration || '')}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.vat_number || '')}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.verification_details || '')}</td>
          <td style="${scmCellStyle}">${approvedBox}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}"></td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}"></td>
        </tr>`;
    }).join('');

    // Build purchase order rows (4 rows)
    const purchaseOrderRows = Array.from({ length: 4 }, (_, i) => {
      const item = data.step_3.items[i] || ({} as ScmPurchaseOrder);
      // Use image-based checkboxes
      const poGeneratedBox = this._getCheckboxImage(
        item.purchase_order_generated ? 'YES' : 'NO',
        'YES',
      );
      const taxInvoiceBox = this._getCheckboxImage(
        item.tax_invoice_received ? 'YES' : 'NO',
        'YES',
      );
      const bbbeeBox = this._getCheckboxImage(
        item.bbbee_certificate_received ? 'YES' : 'NO',
        'YES',
      );
      const bankConfirmationBox = this._getCheckboxImage(
        item.bank_confirmation_received ? 'YES' : 'NO',
        'YES',
      );
      const taxClearanceBox = this._getCheckboxImage(
        item.tax_clearance_received ? 'YES' : 'NO',
        'YES',
      );
      const approvedBox = this._getCheckboxImage(
        item.approved ? 'YES' : 'NO',
        'YES',
      );

      return `
        <tr>
          <td style="${scmCellStyle}">${i + 1}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.supplier_name || '')}</td>
          <td style="${scmCellStyle}">${poGeneratedBox}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}"></td>
          <td style="${scmCellStyle}">${taxInvoiceBox}</td>
          <td style="${scmCellStyle}">${bbbeeBox}</td>
          <td style="${scmCellStyle}">${bankConfirmationBox}</td>
          <td style="${scmCellStyle}">${taxClearanceBox}</td>
          <td style="${scmCellStyle}">${approvedBox}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}"></td>
        </tr>`;
    }).join('');

    // Build payment rows (4 rows)
    const paymentRows = Array.from({ length: 4 }, (_, i) => {
      const item = data.step_4.items[i] || ({} as ScmPayment);
      // Use image-based checkboxes
      const vatInvoiceBox = this._getCheckboxImage(
        item.vat_invoice_received ? 'YES' : 'NO',
        'YES',
      );
      const bankConfirmationBox = this._getCheckboxImage(
        item.bank_confirmation_received ? 'YES' : 'NO',
        'YES',
      );
      const paymentAuthBox = this._getCheckboxImage(
        item.payment_authorisation_signed ? 'YES' : 'NO',
        'YES',
      );
      const paymentDoneBox = this._getCheckboxImage(
        item.payment_done ? 'YES' : 'NO',
        'YES',
      );
      const proofOfPaymentBox = this._getCheckboxImage(
        item.proof_of_payment_sent ? 'YES' : 'NO',
        'YES',
      );
      const deliveryNoteBox = this._getCheckboxImage(
        item.delivery_note_received ? 'YES' : 'NO',
        'YES',
      );

      return `
        <tr>
          <td style="${scmCellStyle}">${i + 1}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.company_name || companyInfo.companyName)}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.director || companyInfo.directorName)}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}">${this._esc(item.contact_number || companyInfo.contactNumber)}</td>
          <td style="${scmCellStyle}">${vatInvoiceBox}</td>
          <td style="${scmCellStyle}">${bankConfirmationBox}</td>
          <td style="${scmCellStyle}">${paymentAuthBox}</td>
          <td style="padding:4px;border:1px solid #000;height:7mm;font-size:7px;${FF}"></td>
          <td style="${scmCellStyle}">${paymentDoneBox}</td>
          <td style="${scmCellStyle}">${proofOfPaymentBox}</td>
          <td style="${scmCellStyle}">${deliveryNoteBox}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 8px; line-height: 1.2; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: top; }
</style>
</head>
<body>
  <!-- Header Section -->
  <table style="margin-bottom:5px">
    <tr>
      <td style="padding:4px;height:12mm;font-weight:bold;font-size:10px;text-transform:uppercase;${FF}">
        ESD INTERNAL GRANT SCM VERIFICATION PROCESS CHECKLIST
      </td>
      <td style="padding:4px;height:12mm;text-align:right;${FF}">
        <img src="${this.images.South32Logo}" alt="South32 Logo" style="max-height:10mm;max-width:40mm;">
      </td>
    </tr>
  </table>

  <!-- Beneficiary Information -->
  <table style="margin-bottom:5px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:40mm;${FF}">Name of Beneficiary Company</td>
      <td style="border:1px solid #000;padding:3px;font-size:8px;width:65mm;${FF}">${this._esc(companyInfo.companyName)}</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:25mm;${FF}">Director</td>
      <td style="border:1px solid #000;padding:3px;font-size:8px;width:55mm;${FF}">${this._esc(companyInfo.directorName)}</td>
    </tr>
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;${FF}">Contact No</td>
      <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}">${this._esc(companyInfo.contactNumber)}</td>
      <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}"></td>
      <td style="border:1px solid #000;padding:3px;font-size:8px;${FF}"></td>
    </tr>
  </table>

  <!-- SECTION 1: Process Step 1 -->
  <table style="margin-bottom:5px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;${FF}">
        Process – Step 1 – (Collection of Quotations)
      </td>
    </tr>
  </table>

  <table style="margin-bottom:5px">
    <thead>
      <tr>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:10mm;${FF}">No</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:80mm;${FF}">Quotation Received / Supplier</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:25mm;${FF}">Date Received</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:55mm;${FF}">Beneficiary Signature</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:70mm;${FF}">Comments / Next Steps</td>
      </tr>
    </thead>
    <tbody>
      ${quotationRows}
    </tbody>
  </table>

  <table style="margin-bottom:8px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:120mm;${FF}">Verified By</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:120mm;${FF}">Signature</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px;height:8mm;font-size:8px;${FF}">${this._esc(data.step_1.verified_by || '')}</td>
      <td style="border:1px solid #000;padding:4px;height:8mm;font-size:8px;${FF}"></td>
    </tr>
  </table>

  <!-- SECTION 2: Process Step 2 -->
  <table style="margin-bottom:5px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;${FF}">
        Process – Step 2 – (Online Verification of Suppliers)
      </td>
    </tr>
  </table>

  <table style="margin-bottom:5px">
    <thead>
      <tr>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:10mm;${FF}">No</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:45mm;${FF}">Name of Supplier</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:20mm;${FF}">CIPC Registration</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:25mm;${FF}">Confirmation VAT No</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:40mm;${FF}">Verification Contact Details / Email Address</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:20mm;${FF}">Approved</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:20mm;${FF}">Not Approved</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:60mm;${FF}">Comments / Next Steps</td>
      </tr>
    </thead>
    <tbody>
      ${supplierRows}
    </tbody>
  </table>

  <table style="margin-bottom:8px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:120mm;${FF}">Verified By</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:120mm;${FF}">Signature</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px;height:8mm;font-size:8px;${FF}">${this._esc(data.step_2.verified_by || '')}</td>
      <td style="border:1px solid #000;padding:4px;height:8mm;font-size:8px;${FF}"></td>
    </tr>
  </table>

  <!-- SECTION 3: Process Step 3 -->
  <table style="margin-bottom:5px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;${FF}">
        Process – Step 3 – (Processing of Verified Quotations (Generate PO))
      </td>
    </tr>
  </table>

  <table style="margin-bottom:5px">
    <thead>
      <tr>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:10mm;${FF}">No</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:40mm;${FF}">Supplier Company Name</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:20mm;${FF}">Generate Purchase Order</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:22mm;${FF}">Emailed to Supplier Date</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:18mm;${FF}">Tax Invoice Received</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:18mm;${FF}">BBBEE Certificate</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:25mm;${FF}">Bank Confirmation Letter</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:25mm;${FF}">Tax Clearance Certificate</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:18mm;${FF}">Approved (Yes/No)</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:44mm;${FF}">Comments / Next Steps</td>
      </tr>
    </thead>
    <tbody>
      ${purchaseOrderRows}
    </tbody>
  </table>

  <table style="margin-bottom:8px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:120mm;${FF}">Verified By</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:120mm;${FF}">Signature</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px;height:8mm;font-size:8px;${FF}">${this._esc(data.step_3.verified_by || '')}</td>
      <td style="border:1px solid #000;padding:4px;height:8mm;font-size:8px;${FF}"></td>
    </tr>
  </table>

  <!-- SECTION 4: Process Step 4 -->
  <table style="margin-bottom:5px">
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:9px;${FF}">
        Process – Step 4 – (Processing of Payment Authorization / Payment)
      </td>
    </tr>
  </table>

  <table style="margin-bottom:5px">
    <thead>
      <tr>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:10mm;${FF}">No</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:35mm;${FF}">Company Name</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:25mm;${FF}">Director</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:20mm;${FF}">Contact No</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:20mm;${FF}">VAT Invoice Received</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:22mm;${FF}">Bank Confirmation Letter</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:28mm;${FF}">Payment Authorization Form Signed</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:20mm;${FF}">Payment Request Date</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;text-align:center;width:18mm;${FF}">Payment Done</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:30mm;${FF}">Proof of Payment Sent to Supplier</td>
        <td style="background:#e0e0e0;border:1px solid #000;padding:3px;font-weight:bold;font-size:8px;width:35mm;${FF}">Delivery Note and Photos Received</td>
      </tr>
    </thead>
    <tbody>
      ${paymentRows}
    </tbody>
  </table>

  <table>
    <tr>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:120mm;${FF}">Verified By</td>
      <td style="background:#e0e0e0;border:1px solid #000;padding:4px;font-weight:bold;font-size:8px;width:120mm;${FF}">Signature</td>
    </tr>
    <tr>
      <td style="border:1px solid #000;padding:4px;height:8mm;font-size:8px;${FF}">${this._esc(data.step_4.verified_by || '')}</td>
      <td style="border:1px solid #000;padding:4px;height:8mm;font-size:8px;${FF}"></td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ── Checkbox Image Helpers ─────────────────────────────────────────────────

  private _getCheckboxImage(value: string, expectedValue: string): string {
    if (value === expectedValue) {
      return `<img src="${this.images.Yes}" alt="Yes" style="width:10px;height:10px;">`;
    }
    return `<img src="${this.images.No}" alt="No" style="width:10px;height:10px;">`;
  }

  private _getYesNoNaCheckbox(
    value: string,
    option: 'YES' | 'NO' | 'NA',
  ): string {
    if (value === option) {
      return `<img src="${this.images.Yes}" alt="${option}" style="width:10px;height:10px;">`;
    }
    return `<img src="${this.images.No}" alt="${option}" style="width:10px;height:10px;">`;
  }

  // ── Reusable HTML Components ───────────────────────────────────────────────

  private _generateHeader(companyInfo: CompanyInfo, title: string): string {
    const FF = `font-family:Arial,sans-serif`;
    const logoUrl = this.images.South32Logo;

    return `
      <table style="margin-bottom:10px">
        <tr>
          <td style="width:70%;height:25mm;padding:8px;${FF}">
            <!-- Logo placeholder -->
          </td>
          <td style="width:30%;height:25mm;padding:8px;text-align:right;${FF}">
            <img src="${logoUrl}" alt="South32 Logo" style="max-height:20mm;max-width:40mm;">
          </td>
        </tr>
      </table>

      <table style="margin-bottom:10px">
        <tr>
          <td style="background:#e0e0e0;border:1px solid #000;height:10mm;padding:5px;text-align:center;font-weight:bold;font-size:12px;${FF}">
            ${title} – ${this._esc(companyInfo.companyName)}
          </td>
        </tr>
      </table>`;
  }

  private _generateYesNoNaHeader(): string {
    const FF = `font-family:Arial,sans-serif`;
    return `
      <thead>
        <tr>
          <td style="background:#e0e0e0;border:1px solid #000;padding:5px;font-weight:bold;font-size:10px;width:130mm;${FF}" rowspan="2">
            Document List
          </td>
          <td style="background:#e0e0e0;border:1px solid #000;padding:5px;font-weight:bold;font-size:10px;text-align:center;${FF}" colspan="3">
            Provided?
          </td>
        </tr>
        <tr>
          <td style="background:#e0e0e0;border:1px solid #000;padding:5px;font-weight:bold;font-size:10px;text-align:center;width:15mm;${FF}">
            Yes
          </td>
          <td style="background:#e0e0e0;border:1px solid #000;padding:5px;font-weight:bold;font-size:10px;text-align:center;width:15mm;${FF}">
            No
          </td>
          <td style="background:#e0e0e0;border:1px solid #000;padding:5px;font-weight:bold;font-size:10px;text-align:center;width:15mm;${FF}">
            N/A
          </td>
        </tr>
      </thead>`;
  }

  private _generateFooter(): string {
    const FF = `font-family:Arial,sans-serif`;
    return `
      <div style="position:fixed;bottom:15mm;left:15mm;font-size:8px;color:#666;${FF}">
        Version 01.2025
      </div>`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _esc(s: string): string {
    return (s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private _dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
