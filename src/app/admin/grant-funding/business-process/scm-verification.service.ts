import { Injectable, Inject } from '@angular/core';
import { NodeService } from '../../../../services/node.service';
import { SupplierService } from './supplier.service';
import { 
  GrantScmVerification, 
  DEFAULT_GRANT_SCM_VERIFICATION,
  ScmQuotation,
  ScmOnlineVerification,
  ScmPurchaseOrderProcessing,
  ScmPaymentProcessing,
  ScmSupplierContactDetails
} from './scm-verification.models';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ScmVerificationService {
  constructor(
    @Inject(NodeService) private nodeService: NodeService,
    @Inject(SupplierService) private supplierService: SupplierService
  ) {}

  // Load SCM verification data for a company
  loadScmVerification(companyId: number): Observable<GrantScmVerification> {
    return this.nodeService.getNodes('grant_scm_verification', companyId).pipe(
      map((nodes: any[]) => {
        if (nodes.length > 0) {
          // Load existing SCM verification data
          const existingData = nodes[0].data as GrantScmVerification;
          return {
            ...DEFAULT_GRANT_SCM_VERIFICATION,
            ...existingData,
            quotations: { ...DEFAULT_GRANT_SCM_VERIFICATION.quotations, ...existingData.quotations }
          };
        }
        return { ...DEFAULT_GRANT_SCM_VERIFICATION };
      }),
      catchError(() => of({ ...DEFAULT_GRANT_SCM_VERIFICATION }))
    );
  }

  // Save SCM verification data for a company
  saveScmVerification(companyId: number, scmData: GrantScmVerification): Observable<any> {
    const nodeData: any = {
      type: 'grant_scm_verification',
      parent_id: companyId,
      data: scmData
    };

    // Check if we have an existing node
    return this.nodeService.getNodes('grant_scm_verification', companyId).pipe(
      map((nodes: any[]) => {
        if (nodes.length > 0) {
          // Update existing node
          nodeData.id = nodes[0].id;
          return this.nodeService.updateNode(nodeData);
        } else {
          // Create new node
          return this.nodeService.addNode(nodeData);
        }
      }),
      catchError(() => this.nodeService.addNode(nodeData))
    ).pipe(
      map((response: any) => response)
    );
  }

  // Add a new quotation
  addQuotation(scmData: GrantScmVerification): GrantScmVerification {
    const newQuotation: ScmQuotation = {
      id: `q_${Date.now()}`,
      supplier_name: '',
      date_received: '',
      beneficiary_signature: '',
      comments: '',
      status: 'pending'
    };

    return {
      ...scmData,
      quotations: {
        ...scmData.quotations,
        items: [...scmData.quotations.items, newQuotation]
      }
    };
  }

  // Remove a quotation
  removeQuotation(scmData: GrantScmVerification, index: number): GrantScmVerification {
    return {
      ...scmData,
      quotations: {
        ...scmData.quotations,
        items: scmData.quotations.items.filter((_, i) => i !== index)
      }
    };
  }

  // Initialize online verification for a quotation
  initializeOnlineVerification(scmData: GrantScmVerification, index: number): GrantScmVerification {
    const items = [...scmData.quotations.items];
    items[index] = {
      ...items[index],
      online_verification: {
        cipc_registration: '',
        cipc_verified: false,
        vat_number: '',
        vat_verified: false,
        contact_details: {
          phone: '',
          email: '',
          address: '',
          verified: false
        },
        approved: false,
        comments: ''
      }
    };
    
    return {
      ...scmData,
      quotations: {
        ...scmData.quotations,
        items
      }
    };
  }

  // Initialize purchase order processing for a quotation
  initializePurchaseOrderProcessing(scmData: GrantScmVerification, index: number): GrantScmVerification {
    const items = [...scmData.quotations.items];
    items[index] = {
      ...items[index],
      purchase_order_processing: {
        purchase_order_generated: false,
        emailed_to_supplier_date: '',
        tax_invoice_received: false,
        bbbee_certificate_received: false,
        bank_confirmation_received: false,
        tax_clearance_received: false,
        approved: false,
        comments: ''
      }
    };
    
    return {
      ...scmData,
      quotations: {
        ...scmData.quotations,
        items
      }
    };
  }

  // Initialize payment processing for a quotation
  initializePaymentProcessing(scmData: GrantScmVerification, index: number): GrantScmVerification {
    const items = [...scmData.quotations.items];
    items[index] = {
      ...items[index],
      payment_processing: {
        vat_invoice_received: false,
        bank_confirmation_received: false,
        payment_authorisation_signed: false,
        payment_request_date: '',
        payment_done: false,
        proof_of_payment_sent: false,
        delivery_note_received: false,
        comments: ''
      }
    };
    
    return {
      ...scmData,
      quotations: {
        ...scmData.quotations,
        items
      }
    };
  }

  // Determine the current workflow step for a quotation
  getQuotationStep(quotation: ScmQuotation): number {
    if (!quotation.online_verification) {
      return 1; // Collection of Quotations
    }
    if (!quotation.purchase_order_processing) {
      return 2; // Online Verification of Suppliers
    }
    if (!quotation.payment_processing) {
      return 3; // Processing Verified Quotations (Generate PO)
    }
    return 4; // Processing Payment Authorization/Payment
  }

  // Get step name for display
  getStepName(step: number): string {
    switch (step) {
      case 1: return 'Collection of Quotations';
      case 2: return 'Online Verification of Suppliers';
      case 3: return 'Processing Verified Quotations (Generate PO)';
      case 4: return 'Processing Payment Authorization/Payment';
      default: return 'Unknown';
    }
  }

  // Get step status for display
  getStepStatus(step: number): string {
    switch (step) {
      case 1: return 'Collected';
      case 2: return 'In Progress';
      case 3: return 'Pending';
      case 4: return 'Pending';
      default: return 'Pending';
    }
  }

  // Sync suppliers from SCM verification data to supplier collection
  syncSuppliers(companyId: number, scmData: GrantScmVerification): Observable<any> {
    const suppliersToSync: any[] = [];

    // Extract supplier information from quotations
    scmData.quotations.items.forEach(quotation => {
      if (quotation.supplier_name) {
        const supplier: any = {
          id: `s_${quotation.supplier_name.replace(/\s+/g, '_')}`, // Simple ID generation
          name: quotation.supplier_name,
          cipc_registration: quotation.online_verification?.cipc_registration || '',
          cipc_verified: quotation.online_verification?.cipc_verified || false,
          vat_number: quotation.online_verification?.vat_number || '',
          vat_verified: quotation.online_verification?.vat_verified || false,
          approved: quotation.online_verification?.approved || false,
          contact_details: {
            phone: quotation.online_verification?.contact_details.phone || '',
            email: quotation.online_verification?.contact_details.email || '',
            address: quotation.online_verification?.contact_details.address || '',
            verified: quotation.online_verification?.contact_details.verified || false
          },
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        };
        suppliersToSync.push(supplier);
      }
    });

    if (suppliersToSync.length === 0) {
      return of(null);
    }

    // Add or update each supplier
    const syncObservables = suppliersToSync.map(supplier => 
      this.supplierService.addOrUpdateSupplier(companyId, supplier)
    );

    // Combine all sync operations
    return syncObservables.length > 0 ? syncObservables[0] : of(null);
  }
}