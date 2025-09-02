import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-md mx-auto">
      <h2 class="text-xl font-bold mb-4">Toast Service Demo</h2>

      <div class="space-y-3">
        <button
          (click)="showSuccess()"
          class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          Show Success Toast
        </button>

        <button
          (click)="showError()"
          class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          Show Error Toast
        </button>

        <button
          (click)="showWarning()"
          class="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
          Show Warning Toast
        </button>

        <button
          (click)="showInfo()"
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Show Info Toast
        </button>

        <button
          (click)="showPersistent()"
          class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          Show Persistent Toast
        </button>

        <button
          (click)="showWithAction()"
          class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Show Toast with Action
        </button>

        <button
          (click)="dismissAll()"
          class="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
          Dismiss All Toasts
        </button>
      </div>
    </div>
  `
})
export class ToastDemoComponent {
  constructor(private toast: ToastService) {}

  showSuccess() {
    this.toast.success('Operation completed successfully!');
  }

  showError() {
    this.toast.error('An error occurred while processing your request.');
  }

  showWarning() {
    this.toast.warning('Please review your input before continuing.');
  }

  showInfo() {
    this.toast.info('Here is some helpful information for you.');
  }

  showPersistent() {
    this.toast.show('This toast will stay until dismissed', 'info', 0); // 0 duration = persistent
  }

  showWithAction() {
    this.toast.show(
      'Would you like to undo this action?',
      'info',
      8000,
      true,
      {
        label: 'Undo',
        callback: () => {
          this.toast.success('Action undone successfully!');
        }
      }
    );
  }

  dismissAll() {
    this.toast.dismissAll();
  }
}
