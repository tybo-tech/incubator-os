import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$: Observable<ToastMessage[]> = this.toastsSubject.asObservable();

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  show(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration = 5000,
    dismissible = true,
    action?: { label: string; callback: () => void }
  ): string {
    const id = this.generateId();
    const toast: ToastMessage = {
      id,
      message,
      type,
      duration,
      dismissible,
      action
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Auto-dismiss after duration (unless duration is 0 for persistent toasts)
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(message: string, duration = 4000, dismissible = true): string {
    return this.show(message, 'success', duration, dismissible);
  }

  error(message: string, duration = 6000, dismissible = true): string {
    return this.show(message, 'error', duration, dismissible);
  }

  info(message: string, duration = 4000, dismissible = true): string {
    return this.show(message, 'info', duration, dismissible);
  }

  warning(message: string, duration = 5000, dismissible = true): string {
    return this.show(message, 'warning', duration, dismissible);
  }

  dismiss(id: string): void {
    const currentToasts = this.toastsSubject.value;
    const filteredToasts = currentToasts.filter(toast => toast.id !== id);
    this.toastsSubject.next(filteredToasts);
  }

  dismissAll(): void {
    this.toastsSubject.next([]);
  }

  // Convenience methods for common scenarios
  saveSuccess(itemName = 'Item'): string {
    return this.success(`${itemName} saved successfully!`);
  }

  deleteSuccess(itemName = 'Item'): string {
    return this.success(`${itemName} deleted successfully!`);
  }

  saveError(itemName = 'Item'): string {
    return this.error(`Failed to save ${itemName.toLowerCase()}. Please try again.`);
  }

  deleteError(itemName = 'Item'): string {
    return this.error(`Failed to delete ${itemName.toLowerCase()}. Please try again.`);
  }

  networkError(): string {
    return this.error('Network error. Please check your connection and try again.');
  }

  validationError(message = 'Please check your input and try again.'): string {
    return this.warning(message);
  }
}
