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

interface DocumentOptions {
  pageMargin?: string;
  fontSize?: string;
  lineHeight?: string;
}

interface TableColumn {
  label: string;
  width?: string;
  classes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GrantProcessExportService {
  images = Constants.Images;

  private readonly theme = {
    fontFamily: 'Arial, sans-serif',
    borderColor: '#000',
    headerBackground: '#e0e0e0',
    textColor: '#000',
  };

  /** Default height for rendered signature images inside PDF tables */
  private readonly SIGNATURE_IMAGE_HEIGHT = '15mm';

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

  // ── Document Shell & Styles ────────────────────────────────────────────────

  private _buildDocument(
    content: string,
    options: DocumentOptions = {},
  ): string {
    const {
      pageMargin = '15mm',
      fontSize = '10px',
      lineHeight = '1.4',
    } = options;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
${this._globalStyles({ pageMargin, fontSize, lineHeight })}
</head>
<body>
  <div class="content-wrapper">
    ${content}
  </div>
  ${this._generateFooter()}
</body>
</html>`;
  }

  private _globalStyles(options: Required<DocumentOptions>): string {
    const { pageMargin, fontSize, lineHeight } = options;

    return `<style>
  @page { margin: ${pageMargin}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${this.theme.fontFamily}; font-size: ${fontSize}; line-height: ${lineHeight}; color: ${this.theme.textColor}; }
  .content-wrapper { padding: 5mm; }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: top; }
  .cell { border: 1px solid ${this.theme.borderColor}; padding: 4px; }
  .header { border: 1px solid ${this.theme.borderColor}; padding: 4px; background: ${this.theme.headerBackground}; font-weight: bold; }
  .center { text-align: center; }
  .right { text-align: right; }
  .uppercase { text-transform: uppercase; }
  .bold { font-weight: bold; }
  .p-3 { padding: 3px; }
  .p-4 { padding: 4px; }
  .p-5 { padding: 5px; }
  .p-8 { padding: 8px; }
  .h-7 { height: 7mm; }
  .h-8 { height: 8mm; }
  .h-10 { height: 10mm; }
  .h-12 { height: 12mm; }
  .h-15 { height: 15mm; }
  .h-20 { height: 20mm; }
  .h-25 { height: 25mm; }
  .text-7 { font-size: 7px; }
  .text-8 { font-size: 8px; }
  .text-9 { font-size: 9px; }
  .text-10 { font-size: 10px; }
  .text-11 { font-size: 11px; }
  .text-12 { font-size: 12px; }
  .mb-3 { margin-bottom: 3px; }
  .mb-5 { margin-bottom: 5px; }
  .mb-8 { margin-bottom: 8px; }
  .mb-10 { margin-bottom: 10px; }
</style>`;
  }

  // ── Business Process Checklist HTML Builder ────────────────────────────────

  private _buildChecklistHtml(
    data: GrantFundingChecklist,
    companyInfo: CompanyInfo,
  ): string {
    const checklistRows = GRANT_FUNDING_CHECKLIST_FIELDS.map((field) => {
      const value = data[field.key as keyof GrantFundingChecklist];

      return `
        <tr>
          <td class="cell text-10 p-8">${this._esc(field.label)}</td>
          <td class="cell text-10 p-8 center">${this._getYesNoNaCheckbox(value || '', 'YES')}</td>
          <td class="cell text-10 p-8 center">${this._getYesNoNaCheckbox(value || '', 'NO')}</td>
          <td class="cell text-10 p-8 center">${this._getYesNoNaCheckbox(value || '', 'NA')}</td>
        </tr>`;
    }).join('');

    return this._buildDocument(
      `
      ${this._generateHeader(companyInfo, 'Grant Funding Check List')}

      <table>
        ${this._generateYesNoNaHeader()}
        <tbody>
          ${checklistRows}
        </tbody>
      </table>`,
      { pageMargin: '15mm', fontSize: '10px', lineHeight: '1.4' },
    );
  }

  // ── Expenditure Authorization HTML Builder ─────────────────────────────────

  private _buildExpenditureAuthorizationHtml(
    data: GrantExpenditureAuthorization,
    companyInfo: CompanyInfo,
  ): string {
    const invoiceRows = this._renderRows(
      data.invoices,
      (invoice) => {
        const preferredSupplierBox = this._getCheckboxImage(
          invoice.preferred_supplier ? 'YES' : 'NO',
          'YES',
        );

        return `
          <tr>
            <td class="cell text-8 h-10 p-5" style="width:50mm;">${this._esc(invoice.invoice_number || '')}</td>
            <td class="cell text-8 h-10 p-5" style="width:70mm;">${this._esc(invoice.description || '')}</td>
            <td class="cell text-8 h-10 p-5" style="width:43mm;">${this._esc(invoice.supplier_name || '')}</td>
            <td class="cell text-8 h-10 p-5 right" style="width:28mm;">${invoice.amount_excl_vat || ''}</td>
            <td class="cell text-8 h-10 p-5 right" style="width:25mm;">${invoice.vat_amount || ''}</td>
            <td class="cell text-8 h-10 p-5 right" style="width:25mm;">${invoice.total_amount || ''}</td>
            <td class="cell text-8 h-10 p-5 center" style="width:23mm;">${preferredSupplierBox}</td>
          </tr>`;
      },
    );

    return this._buildDocument(
      `
      <table class="mb-8">
        <tr>
          <td class="center" style="${this._fontStyle()}">
            <div class="bold text-12 mb-3" style="${this._fontStyle()}">South32 ESD Centre Grant Funding Process Sheet</div>
            <div class="text-11" style="${this._fontStyle()}">Expenditure Authorization Form</div>
          </td>
          <td style="width:70mm;${this._fontStyle()}">
            ${this._processTrackingTable()}
          </td>
        </tr>
      </table>

      <!-- Logo -->
      <table class="mb-8">
        <tr>
          <td class="right p-4" style="${this._fontStyle()}">
            <img src="${this.images.South32Logo}" alt="South32 Logo" style="max-height:15mm;max-width:50mm;">
          </td>
        </tr>
      </table>

      <!-- Company Information -->
      <table class="mb-8">
        ${this._fieldRow([
          { label: 'Name of Company', value: companyInfo.companyName, labelWidth: '35mm', valueWidth: '90mm' },
          { label: 'Contact No', value: companyInfo.contactNumber, labelWidth: '35mm', valueWidth: '55mm' },
        ])}
        ${this._fieldRow([
          { label: 'Name of Director', value: companyInfo.directorName, labelWidth: '35mm', valueWidth: '90mm' },
          { label: 'Company Reg No', value: companyInfo.registrationNumber, labelWidth: '35mm', valueWidth: '55mm' },
        ])}
      </table>

      <!-- Invoice Authorization Table -->
      <table class="mb-8">
        ${this._tableHeader([
          { label: 'Invoice Number', width: '50mm', classes: 'text-8 p-4 center' },
          { label: 'Description of Goods/Services', width: '70mm', classes: 'text-8 p-4' },
          { label: 'Supplier Name', width: '43mm', classes: 'text-8 p-4' },
          { label: 'Amount Excl VAT', width: '28mm', classes: 'text-8 p-4 center' },
          { label: 'VAT Amount', width: '25mm', classes: 'text-8 p-4 center' },
          { label: 'Total Amount Including VAT', width: '25mm', classes: 'text-8 p-4 center' },
          { label: 'Preferred Supplier Yes/No', width: '23mm', classes: 'text-8 p-4 center' },
        ])}
        <tbody>
          ${invoiceRows}
        </tbody>
      </table>

      <!-- Authorization Notice -->
      <table class="mb-8">
        <tr>
          <td class="cell text-9 h-10 p-5" style="${this._fontStyle()}">
            Please sign the payment authorization form so that payments can be processed.
          </td>
        </tr>
      </table>

      <!-- Beneficiary Declaration -->
      <table class="mb-8">
        <tr>
          <td class="cell text-9 h-15 p-5" style="${this._fontStyle()}">
            I __________________ acknowledge that the supplier information provided is correct, as the director of ${this._esc(companyInfo.companyName)} I hereby authorize payment.
          </td>
        </tr>
      </table>

      <!-- Beneficiary Authorization Table -->
      ${this._signatureSection([
        { header: 'Beneficiary', value: data.beneficiary_authorization.name || '', width: '95mm' },
        { header: 'Signature', value: this._renderSignatureImage(data.beneficiary_authorization.signature), width: '70mm' },
        { header: 'Date', value: data.beneficiary_authorization.date || '', width: '60mm' },
      ])}

      ${this._signatureSection([
        { header: `Authorized By: Business Advisor 1 – ${data.business_advisor_authorization.name || 'Marius Wilken'}`, value: data.business_advisor_authorization.name || '', width: '95mm' },
        { header: 'Signature', value: this._renderSignatureImage(data.business_advisor_authorization.signature), width: '70mm' },
        { header: 'Date', value: data.business_advisor_authorization.date || '', width: '60mm' },
      ])}

      <!-- Approval Section -->
      ${this._approvalSection([
        { title: 'ESD Centre Coordinator', name: data.coordinator_authorization.name || '', signature: data.coordinator_authorization.signature, optional: true },
        { title: 'South32 SPA', name: data.south32_spa_authorization.name || '', signature: data.south32_spa_authorization.signature },
        { title: 'ESD Centre Manager', name: data.manager_authorization.name || '', signature: data.manager_authorization.signature },
      ])}

      <!-- Payment Release Section -->
      ${this._signatureSection([
        { header: 'Payment Released By', value: data.payment_release.released_by || 'Krian Naidoo', width: '95mm' },
        { header: 'Signature', value: this._renderSignatureImage(data.payment_release.signature), width: '70mm' },
        { header: 'Payment Release Date', value: data.payment_release.release_date || '', width: '60mm' },
      ], '')}`,
      { pageMargin: '10mm', fontSize: '9px', lineHeight: '1.3' },
    );
  }

  // ── SCM Verification HTML Builder ──────────────────────────────────────────

  private _buildScmVerificationHtml(
    data: GrantScmVerification,
    companyInfo: CompanyInfo,
  ): string {
    const quotationRows = this._renderRows(
      data.step_1.items,
      (item, i) => `
        <tr>
          <td class="cell text-7 h-7 p-4 center" style="width:10mm;">${i + 1}</td>
          <td class="cell text-7 h-7 p-4" style="width:80mm;">${this._esc(item.supplier_name || '')}</td>
          <td class="cell text-7 h-7 p-4" style="width:25mm;">${this._esc(item.date_received || '')}</td>
          <td class="cell text-7 h-7 p-4" style="width:55mm;">${this._renderSignatureImage(item.beneficiary_signature)}</td>
          <td class="cell text-7 h-7 p-4" style="width:70mm;">${this._esc(item.comments || '')}</td>
        </tr>`,
    );

    const supplierRows = this._renderRows(
      data.step_2.items,
      (item, i) => {
        const approvedBox = this._getCheckboxImage(
          item.approved ? 'YES' : 'NO',
          'YES',
        );

        return `
          <tr>
            <td class="cell text-7 h-7 p-4 center" style="width:10mm;">${i + 1}</td>
            <td class="cell text-7 h-7 p-4" style="width:45mm;">${this._esc(item.supplier_name || '')}</td>
            <td class="cell text-7 h-7 p-4" style="width:20mm;">${this._esc(item.cipc_registration || '')}</td>
            <td class="cell text-7 h-7 p-4" style="width:25mm;">${this._esc(item.vat_number || '')}</td>
            <td class="cell text-7 h-7 p-4" style="width:40mm;">${this._esc(item.verification_details || '')}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:20mm;">${approvedBox}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:20mm;"></td>
            <td class="cell text-7 h-7 p-4" style="width:60mm;"></td>
          </tr>`;
      },
    );

    const purchaseOrderRows = this._renderRows(
      data.step_3.items,
      (item, i) => {
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
            <td class="cell text-7 h-7 p-4 center" style="width:10mm;">${i + 1}</td>
            <td class="cell text-7 h-7 p-4" style="width:40mm;">${this._esc(item.supplier_name || '')}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:20mm;">${poGeneratedBox}</td>
            <td class="cell text-7 h-7 p-4" style="width:22mm;"></td>
            <td class="cell text-7 h-7 p-4 center" style="width:18mm;">${taxInvoiceBox}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:18mm;">${bbbeeBox}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:25mm;">${bankConfirmationBox}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:25mm;">${taxClearanceBox}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:18mm;">${approvedBox}</td>
            <td class="cell text-7 h-7 p-4" style="width:44mm;"></td>
          </tr>`;
      },
    );

    const paymentRows = this._renderRows(
      data.step_4.items,
      (item, i) => {
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
            <td class="cell text-7 h-7 p-4 center" style="width:10mm;">${i + 1}</td>
            <td class="cell text-7 h-7 p-4" style="width:35mm;">${this._esc(item.company_name || companyInfo.companyName)}</td>
            <td class="cell text-7 h-7 p-4" style="width:25mm;">${this._esc(item.director || companyInfo.directorName)}</td>
            <td class="cell text-7 h-7 p-4" style="width:20mm;">${this._esc(item.contact_number || companyInfo.contactNumber)}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:20mm;">${vatInvoiceBox}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:22mm;">${bankConfirmationBox}</td>
            <td class="cell text-7 h-7 p-4" style="width:28mm;">${paymentAuthBox}</td>
            <td class="cell text-7 h-7 p-4" style="width:20mm;"></td>
            <td class="cell text-7 h-7 p-4 center" style="width:18mm;">${paymentDoneBox}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:30mm;">${proofOfPaymentBox}</td>
            <td class="cell text-7 h-7 p-4 center" style="width:35mm;">${deliveryNoteBox}</td>
          </tr>`;
      },
    );

    return this._buildDocument(
      `
      <!-- Header Section -->
      <table class="mb-5">
        <tr>
          <td class="bold text-10 uppercase p-4 h-12" style="${this._fontStyle()}">
            ESD INTERNAL GRANT SCM VERIFICATION PROCESS CHECKLIST
          </td>
          <td class="right p-4 h-12" style="${this._fontStyle()}">
            <img src="${this.images.South32Logo}" alt="South32 Logo" style="max-height:10mm;max-width:40mm;">
          </td>
        </tr>
      </table>

      <!-- Beneficiary Information -->
      <table class="mb-5">
        ${this._fieldRow([
          { label: 'Name of Beneficiary Company', value: companyInfo.companyName, labelWidth: '40mm', valueWidth: '65mm' },
          { label: 'Director', value: companyInfo.directorName, labelWidth: '25mm', valueWidth: '55mm' },
        ])}
        ${this._fieldRow([
          { label: 'Contact No', value: companyInfo.contactNumber, labelWidth: '40mm', valueWidth: '65mm' },
          { label: '', value: '', labelWidth: '25mm', valueWidth: '55mm' },
        ])}
      </table>

      <!-- SECTION 1 -->
      ${this._sectionTitle('Process – Step 1 – (Collection of Quotations)')}

      <table class="mb-5">
        ${this._tableHeader([
          { label: 'No', width: '10mm', classes: 'text-8 p-3 center' },
          { label: 'Quotation Received / Supplier', width: '80mm', classes: 'text-8 p-3' },
          { label: 'Date Received', width: '25mm', classes: 'text-8 p-3' },
          { label: 'Beneficiary Signature', width: '55mm', classes: 'text-8 p-3' },
          { label: 'Comments / Next Steps', width: '70mm', classes: 'text-8 p-3' },
        ])}
        <tbody>
          ${quotationRows}
        </tbody>
      </table>

      ${this._signatureSection([
        { header: 'Verified By', value: data.step_1.verified_by || '', width: '120mm' },
        { header: 'Signature', value: this._renderSignatureImage(data.step_1.signature), width: '120mm' },
      ])}

      <!-- SECTION 2 -->
      ${this._sectionTitle('Process – Step 2 – (Online Verification of Suppliers)')}

      <table class="mb-5">
        ${this._tableHeader([
          { label: 'No', width: '10mm', classes: 'text-8 p-3 center' },
          { label: 'Name of Supplier', width: '45mm', classes: 'text-8 p-3' },
          { label: 'CIPC Registration', width: '20mm', classes: 'text-8 p-3' },
          { label: 'Confirmation VAT No', width: '25mm', classes: 'text-8 p-3' },
          { label: 'Verification Contact Details / Email Address', width: '40mm', classes: 'text-8 p-3' },
          { label: 'Approved', width: '20mm', classes: 'text-8 p-3 center' },
          { label: 'Not Approved', width: '20mm', classes: 'text-8 p-3 center' },
          { label: 'Comments / Next Steps', width: '60mm', classes: 'text-8 p-3' },
        ])}
        <tbody>
          ${supplierRows}
        </tbody>
      </table>

      ${this._signatureSection([
        { header: 'Verified By', value: data.step_2.verified_by || '', width: '120mm' },
        { header: 'Signature', value: this._renderSignatureImage(data.step_2.signature), width: '120mm' },
      ])}

      <!-- SECTION 3 -->
      ${this._sectionTitle('Process – Step 3 – (Processing of Verified Quotations (Generate PO))')}

      <table class="mb-5">
        ${this._tableHeader([
          { label: 'No', width: '10mm', classes: 'text-8 p-3 center' },
          { label: 'Supplier Company Name', width: '40mm', classes: 'text-8 p-3' },
          { label: 'Generate Purchase Order', width: '20mm', classes: 'text-8 p-3 center' },
          { label: 'Emailed to Supplier Date', width: '22mm', classes: 'text-8 p-3' },
          { label: 'Tax Invoice Received', width: '18mm', classes: 'text-8 p-3 center' },
          { label: 'BBBEE Certificate', width: '18mm', classes: 'text-8 p-3 center' },
          { label: 'Bank Confirmation Letter', width: '25mm', classes: 'text-8 p-3 center' },
          { label: 'Tax Clearance Certificate', width: '25mm', classes: 'text-8 p-3 center' },
          { label: 'Approved (Yes/No)', width: '18mm', classes: 'text-8 p-3 center' },
          { label: 'Comments / Next Steps', width: '44mm', classes: 'text-8 p-3' },
        ])}
        <tbody>
          ${purchaseOrderRows}
        </tbody>
      </table>

      ${this._signatureSection([
        { header: 'Verified By', value: data.step_3.verified_by || '', width: '120mm' },
        { header: 'Signature', value: this._renderSignatureImage(data.step_3.signature), width: '120mm' },
      ])}

      <!-- SECTION 4 -->
      ${this._sectionTitle('Process – Step 4 – (Processing of Payment Authorization / Payment)')}

      <table class="mb-5">
        ${this._tableHeader([
          { label: 'No', width: '10mm', classes: 'text-8 p-3 center' },
          { label: 'Company Name', width: '35mm', classes: 'text-8 p-3' },
          { label: 'Director', width: '25mm', classes: 'text-8 p-3' },
          { label: 'Contact No', width: '20mm', classes: 'text-8 p-3' },
          { label: 'VAT Invoice Received', width: '20mm', classes: 'text-8 p-3 center' },
          { label: 'Bank Confirmation Letter', width: '22mm', classes: 'text-8 p-3 center' },
          { label: 'Payment Authorization Form Signed', width: '28mm', classes: 'text-8 p-3' },
          { label: 'Payment Request Date', width: '20mm', classes: 'text-8 p-3' },
          { label: 'Payment Done', width: '18mm', classes: 'text-8 p-3 center' },
          { label: 'Proof of Payment Sent to Supplier', width: '30mm', classes: 'text-8 p-3' },
          { label: 'Delivery Note and Photos Received', width: '35mm', classes: 'text-8 p-3' },
        ])}
        <tbody>
          ${paymentRows}
        </tbody>
      </table>

      ${this._signatureSection([
        { header: 'Verified By', value: data.step_4.verified_by || '', width: '120mm' },
        { header: 'Signature', value: this._renderSignatureImage(data.step_4.signature), width: '120mm' },
      ], '')}`,
      { pageMargin: '8mm', fontSize: '8px', lineHeight: '1.2' },
    );
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

  /**
   * Render a signature image if a URL is provided, otherwise leave an empty line.
   * The returned HTML is already escaped appropriately; callers should pass the raw URL.
   */
  private _renderSignatureImage(signatureUrl: string | undefined): string {
    if (!signatureUrl || signatureUrl.trim() === '') {
      return '';
    }
    return `<img src="${this._esc(signatureUrl)}" alt="Signature" style="max-height:${this.SIGNATURE_IMAGE_HEIGHT};width:auto;display:block;margin:0 auto;">`;
  }

  // ── Reusable HTML Components ───────────────────────────────────────────────

  private _generateHeader(companyInfo: CompanyInfo, title: string): string {
    return `
      <table class="mb-10">
        <tr>
          <td class="p-8" style="width:70%;height:25mm;"></td>
          <td class="p-8 right" style="width:30%;height:25mm;">
            <img src="${this.images.South32Logo}" alt="South32 Logo" style="max-height:20mm;max-width:40mm;">
          </td>
        </tr>
      </table>

      <table class="mb-10">
        <tr>
          <td class="header text-12 p-5 center" style="height:10mm;">
            ${title} – ${this._esc(companyInfo.companyName)}
          </td>
        </tr>
      </table>`;
  }

  private _generateYesNoNaHeader(): string {
    return `
      <thead>
        <tr>
          <td class="header text-10 p-5" style="width:130mm;" rowspan="2">Document List</td>
          <td class="header text-10 p-5 center" colspan="3">Provided?</td>
        </tr>
        <tr>
          <td class="header text-10 p-5 center" style="width:15mm;">Yes</td>
          <td class="header text-10 p-5 center" style="width:15mm;">No</td>
          <td class="header text-10 p-5 center" style="width:15mm;">N/A</td>
        </tr>
      </thead>`;
  }

  private _generateFooter(): string {
    return `
      <div style="position:fixed;bottom:15mm;left:15mm;font-size:8px;color:#666;font-family:${this.theme.fontFamily};">
        Version 01.2025
      </div>`;
  }

  private _sectionTitle(title: string): string {
    return `
      <table class="mb-5">
        <tr>
          <td class="header text-9 p-4">${this._esc(title)}</td>
        </tr>
      </table>`;
  }

  private _tableHeader(columns: TableColumn[]): string {
    const cells = columns
      .map((column) => {
        const widthAttr = column.width ? ` style="width:${column.width};"` : '';
        const classes = column.classes ? ` ${column.classes}` : '';
        return `<td class="header${classes}"${widthAttr}>${this._esc(column.label)}</td>`;
      })
      .join('');

    return `<thead><tr>${cells}</tr></thead>`;
  }

  private _fieldRow(
    fields: { label: string; value: string; labelWidth: string; valueWidth: string }[],
  ): string {
    const cells = fields
      .map(
        (field) => `
          <td class="header text-8 p-4" style="width:${field.labelWidth};">${this._esc(field.label)}</td>
          <td class="cell text-8 p-4" style="width:${field.valueWidth};">${this._esc(field.value)}</td>`,
      )
      .join('');

    return `<tr>${cells}</tr>`;
  }

  private _signatureSection(
    columns: { header: string; value: string; width: string }[],
    marginClass = 'mb-8',
  ): string {
    const headers = columns
      .map(
        (column) =>
          `<td class="header text-9 p-4" style="width:${column.width};">${this._esc(column.header)}</td>`,
      )
      .join('');
    const values = columns
      .map((column) => `<td class="cell text-8 h-8">${column.value}</td>`)
      .join('');

    return `
      <table class="${marginClass}">
        <tr>${headers}</tr>
        <tr>${values}</tr>
      </table>`;
  }

  private _approvalSection(
    authors: { title: string; name: string; signature?: string; optional?: boolean }[],
  ): string {
    const cells = authors
      .map(
        (author) => {
          const signatureHtml = this._renderSignatureImage(author.signature);
          return `
          <td class="cell p-5 h-20" style="width:33.33%;">
            <div class="bold text-9 mb-3">${this._esc(author.title)}</div>
            ${author.optional ? '<div class="text-8 mb-3">(optional)</div>' : ''}
            <div class="text-8 mb-3">Name: ${this._esc(author.name || '')}</div>
            <div class="text-8">
              ${signatureHtml ? signatureHtml : 'Signature: _______________________'}
            </div>
          </td>`;
        },
      )
      .join('');

    return `
      <table class="mb-8">
        <tr>${cells}</tr>
      </table>`;
  }

  private _processTrackingTable(): string {
    return `
      <table style="float:right">
        <tr>
          <td class="header text-8 p-3" style="width:40mm;">Process Owner</td>
          <td class="header text-8 p-3" style="width:30mm;">Checked (✓ / ✗)</td>
        </tr>
        <tr>
          <td class="cell text-8 p-3">Step 1</td>
          <td class="cell text-8 p-3">NB</td>
        </tr>
        <tr>
          <td class="cell text-8 p-3">Step 2</td>
          <td class="cell text-8 p-3">CB</td>
        </tr>
        <tr>
          <td class="cell text-8 p-3">Step 3</td>
          <td class="cell text-8 p-3">LN</td>
        </tr>
        <tr>
          <td class="cell text-8 p-3">Step 4</td>
          <td class="cell text-8 p-3">Beneficiary Signature</td>
        </tr>
      </table>`;
  }

  /**
   * Render a dynamic list of rows from the provided items array.
   * No blank padding rows are emitted.
   */
  private _renderRows<T>(
    rows: T[],
    renderer: (row: T, index: number) => string,
  ): string {
    return rows.map((row, index) => renderer(row, index)).join('');
  }

  private _fontStyle(): string {
    return `font-family:${this.theme.fontFamily};`;
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
