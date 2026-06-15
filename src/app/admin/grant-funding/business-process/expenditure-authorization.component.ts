import { Component, Input, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  GrantExpenditureAuthorization, 
  DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION,
  ExpenditureInvoice,
  AuthorizationSignature,
  PaymentRelease
} from './expenditure-authorization.models';
import { NodeService } from '../../../../services/node.service';
import { SignaturePadLibComponent } from '../../../shared/components/signature-pad-lib.component';

@Component({
  selector: 'app-expenditure-authorization',
  standalone: true,
  imports: [CommonModule, FormsModule, SignaturePadLibComponent],
  template: `<div>Test</div>`
})
export class ExpenditureAuthorizationComponent implements OnInit {
  @Input() companyId!: number;
  @Input() applicantId!: number;

  isLoading = signal(true);
  isSaving = signal(false);
  saveStatus = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  
  expenditureAuthorization = signal<GrantExpenditureAuthorization>({ ...DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION });
  expenditureAuthorizationNode = signal<any>(null);

  constructor(
    @Inject(NodeService) private nodeService: NodeService
  ) {}

  ngOnInit(): void {
    this.loadExpenditureAuthorization();
  }

  loadExpenditureAuthorization(): void {
    this.isLoading.set(true);
    // Try to load existing expenditure authorization for this company
    this.nodeService.getNodes('grant_expenditure_authorization', this.companyId).subscribe({
      next: (nodes: any[]) => {
        if (nodes.length > 0) {
          // Load existing expenditure authorization data
          const existingData = nodes[0].data as GrantExpenditureAuthorization;
          this.expenditureAuthorization.set({ 
            ...DEFAULT_GRANT_EXPENDITURE_AUTHORIZATION, 
            ...existingData
          });
          this.expenditureAuthorizationNode.set(nodes[0]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  saveExpenditureAuthorization(): void {
    this.isSaving.set(true);
    this.saveStatus.set(null);
    
    const expenditureData = this.expenditureAuthorization();
    
    // Save or update the expenditure authorization node
    const nodeData: any = {
      type: 'grant_expenditure_authorization',
      parent_id: this.companyId,
      data: expenditureData
    };
    
    // If we have an existing node, update it, otherwise create a new one
    let saveObservable;
    if (this.expenditureAuthorizationNode()) {
      nodeData.id = this.expenditureAuthorizationNode().id;
      saveObservable = this.nodeService.updateNode(nodeData);
    } else {
      saveObservable = this.nodeService.addNode(nodeData);
    }
    
    saveObservable.subscribe({
      next: (response: any) => {
        this.isSaving.set(false);
        this.expenditureAuthorizationNode.set(response);
        this.saveStatus.set({ message: 'Expenditure Authorization saved successfully!', type: 'success' });
        // Clear status message after 3 seconds
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.saveStatus.set({ message: 'Failed to save Expenditure Authorization. Please try again.', type: 'error' });
        console.error('Error saving Expenditure Authorization:', error);
      }
    });
  }

  addInvoice(): void {
    const newInvoice: ExpenditureInvoice = {
      id: `inv_${Date.now()}`,
      invoice_number: '',
      description: '',
      supplier_name: '',
      amount_excl_vat: 0,
      vat_amount: 0,
      total_amount: 0,
      preferred_supplier: false
    };
    
    this.expenditureAuthorization.update(data => ({
      ...data,
      invoices: [...data.invoices, newInvoice]
    }));
  }

  removeInvoice(index: number): void {
    this.expenditureAuthorization.update(data => ({
      ...data,
      invoices: data.invoices.filter((_, i) => i !== index)
    }));
  }

  calculateTotalAmount(invoice: ExpenditureInvoice): void {
    invoice.total_amount = (invoice.amount_excl_vat || 0) + (invoice.vat_amount || 0);
  }
}