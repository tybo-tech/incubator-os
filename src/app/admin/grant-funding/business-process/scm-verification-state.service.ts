import { Injectable, signal } from '@angular/core';
import { 
  GrantScmVerification, 
  DEFAULT_GRANT_SCM_VERIFICATION,
  ScmQuotation
} from './scm-verification.models';

@Injectable({
  providedIn: 'root'
})
export class ScmVerificationStateService {
  // Loading and saving states
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  saveStatus = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  // Main SCM verification data
  scmVerification = signal<GrantScmVerification>({ ...DEFAULT_GRANT_SCM_VERIFICATION });
  scmVerificationNode = signal<any>(null);

  // Modal state
  showModal = signal<boolean>(false);
  currentQuotationIndex = signal<number | null>(null);
  currentStep = signal<number>(1);

  // Reset all state
  resetState(): void {
    this.isLoading.set(true);
    this.isSaving.set(false);
    this.saveStatus.set(null);
    this.scmVerification.set({ ...DEFAULT_GRANT_SCM_VERIFICATION });
    this.scmVerificationNode.set(null);
    this.showModal.set(false);
    this.currentQuotationIndex.set(null);
    this.currentStep.set(1);
  }

  // Update SCM verification data
  updateScmVerification(data: GrantScmVerification): void {
    this.scmVerification.set(data);
  }

  // Update SCM verification node
  updateScmVerificationNode(node: any): void {
    this.scmVerificationNode.set(node);
  }

  // Update loading state
  setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }

  // Update saving state
  setSaving(saving: boolean): void {
    this.isSaving.set(saving);
  }

  // Update save status
  setSaveStatus(status: { message: string; type: 'success' | 'error' } | null): void {
    this.saveStatus.set(status);
  }

  // Modal operations
  openModal(index: number, step: number = 1): void {
    this.currentQuotationIndex.set(index);
    this.currentStep.set(step);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.currentQuotationIndex.set(null);
    this.currentStep.set(1);
  }

  // Step navigation
  setCurrentStep(step: number): void {
    this.currentStep.set(step);
  }

  nextStep(): void {
    this.currentStep.update(step => step + 1);
  }

  previousStep(): void {
    this.currentStep.update(step => step - 1);
  }

  // Get current quotation
  getCurrentQuotation(): ScmQuotation | null {
    const index = this.currentQuotationIndex();
    if (index === null) return null;
    return this.scmVerification().quotations.items[index] || null;
  }

  // Get quotation by index
  getQuotation(index: number): ScmQuotation | null {
    if (index < 0 || index >= this.scmVerification().quotations.items.length) return null;
    return this.scmVerification().quotations.items[index] || null;
  }
}