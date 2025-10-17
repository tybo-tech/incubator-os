import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-revenue-capture-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="text-center text-gray-500 text-sm py-6 border-t border-gray-200">
      <p class="flex items-center justify-center gap-2">
        <i class="fas fa-lightbulb text-yellow-500"></i>
        <span>
          Click on year headers to expand/collapse. Use tab to navigate between inputs.
        </span>
      </p>
    </footer>
  `
})
export class RevenueCaptureFooterComponent {}
