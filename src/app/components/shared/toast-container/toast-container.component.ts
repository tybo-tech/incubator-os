import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <div
        *ngFor="let toast of toasts; trackBy: trackByToastId"
        [class]="getToastClasses(toast)"
        class="toast-item transform transition-all duration-300 ease-in-out"
        [@slideIn]
      >
        <!-- Toast Content -->
        <div class="flex items-start space-x-3">
          <!-- Icon -->
          <div [class]="getIconClasses(toast.type)" class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center">
            <i [class]="getIconName(toast.type)" class="text-sm"></i>
          </div>

          <!-- Message -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900">{{ toast.message }}</p>

            <!-- Action Button -->
            <div *ngIf="toast.action" class="mt-2">
              <button
                (click)="executeAction(toast)"
                class="text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                {{ toast.action.label }}
              </button>
            </div>
          </div>

          <!-- Dismiss Button -->
          <div *ngIf="toast.dismissible" class="flex-shrink-0">
            <button
              (click)="dismiss(toast.id)"
              class="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
            >
              <span class="sr-only">Dismiss</span>
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        <!-- Progress Bar (for timed toasts) -->
        <div
          *ngIf="toast.duration && toast.duration > 0"
          class="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden"
        >
          <div
            class="h-full bg-current opacity-30 rounded-full animate-progress"
            [style.animation-duration]="toast.duration + 'ms'"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-item {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes progress {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    .animate-progress {
      animation: progress linear;
    }

    /* Toast exit animation */
    .toast-item.ng-leave {
      animation: slideOut 0.2s ease-in;
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(
      (toasts: ToastMessage[]) => this.toasts = toasts
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  trackByToastId(index: number, toast: ToastMessage): string {
    return toast.id;
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  executeAction(toast: ToastMessage): void {
    if (toast.action) {
      toast.action.callback();
      this.dismiss(toast.id);
    }
  }

  getToastClasses(toast: ToastMessage): string {
    const baseClasses = 'relative bg-white rounded-lg shadow-lg border-l-4 p-4 max-w-sm';

    switch (toast.type) {
      case 'success':
        return `${baseClasses} border-green-500`;
      case 'error':
        return `${baseClasses} border-red-500`;
      case 'warning':
        return `${baseClasses} border-yellow-500`;
      case 'info':
      default:
        return `${baseClasses} border-blue-500`;
    }
  }

  getIconClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'error':
        return 'bg-red-100 text-red-600';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-600';
    }
  }

  getIconName(type: string): string {
    switch (type) {
      case 'success':
        return 'fas fa-check';
      case 'error':
        return 'fas fa-exclamation-triangle';
      case 'warning':
        return 'fas fa-exclamation-circle';
      case 'info':
      default:
        return 'fas fa-info-circle';
    }
  }
}
