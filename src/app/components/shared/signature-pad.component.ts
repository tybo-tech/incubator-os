// signature-pad.component.ts - Reusable signature pad component

import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  ViewChild,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SignaturePadComponent),
      multi: true
    }
  ],
  template: `
    <div class="signature-pad-container">
      <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4">
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-medium text-gray-700">
            {{ label || 'Digital Signature' }}
            <span *ngIf="required" class="text-red-500">*</span>
          </label>
          <div class="flex space-x-2">
            <button
              type="button"
              (click)="clear()"
              class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              (click)="undo()"
              [disabled]="!canUndo"
              class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Undo
            </button>
          </div>
        </div>

        <div class="relative">
          <canvas
            #signatureCanvas
            class="border border-gray-200 rounded cursor-crosshair"
            [width]="width"
            [height]="height"
          ></canvas>

          <!-- Placeholder text when empty -->
          <div
            *ngIf="isEmpty"
            class="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm"
          >
            {{ placeholder || 'Sign here' }}
          </div>
        </div>

        <!-- Signature info -->
        <div class="mt-2 text-xs text-gray-500">
          <p *ngIf="!isEmpty">✓ Signature captured</p>
          <p *ngIf="isEmpty">Please sign using your mouse, touchpad, or finger (on touch devices)</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .signature-pad-container {
      width: 100%;
    }

    canvas {
      background-color: #fafafa;
    }

    canvas:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
  `]
})
export class SignaturePadComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @ViewChild('signatureCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() width = 400;
  @Input() height = 150;
  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() penColor = '#000000';
  @Input() backgroundColor = '#fafafa';

  @Output() signatureChange = new EventEmitter<string>();
  @Output() signatureStart = new EventEmitter<void>();
  @Output() signatureEnd = new EventEmitter<void>();

  private signaturePad!: SignaturePad;
  private signatureData: string = '';
  isEmpty = true;
  canUndo = false;

  // ControlValueAccessor implementation
  private onChange = (value: string) => {};
  private onTouched = () => {};

  ngOnInit() {
    this.initializeSignaturePad();
  }

  ngOnDestroy() {
    if (this.signaturePad) {
      this.signaturePad.off();
    }
  }

  private initializeSignaturePad() {
    const canvas = this.canvasRef.nativeElement;

    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: this.backgroundColor,
      penColor: this.penColor,
      velocityFilterWeight: 0.7,
      minWidth: 1,
      maxWidth: 2.5,
      throttle: 16, // 60fps
      minDistance: 5,
    });

    // Event listeners
    this.signaturePad.addEventListener('beginStroke', () => {
      this.signatureStart.emit();
    });

    this.signaturePad.addEventListener('endStroke', () => {
      this.updateSignature();
      this.signatureEnd.emit();
    });

    // Handle window resize
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;

    if (container) {
      const containerWidth = container.clientWidth - 32; // Account for padding
      const ratio = Math.min(1, containerWidth / this.width);

      canvas.style.width = (this.width * ratio) + 'px';
      canvas.style.height = (this.height * ratio) + 'px';
    }
  }

  private updateSignature() {
    if (this.signaturePad.isEmpty()) {
      this.isEmpty = true;
      this.canUndo = false;
      this.signatureData = '';
    } else {
      this.isEmpty = false;
      this.canUndo = true;
      this.signatureData = this.signaturePad.toDataURL('image/png');
    }

    this.onChange(this.signatureData);
    this.signatureChange.emit(this.signatureData);
  }

  clear() {
    this.signaturePad.clear();
    this.updateSignature();
  }

  undo() {
    const data = this.signaturePad.toData();
    if (data && data.length > 0) {
      data.pop(); // Remove the last stroke
      this.signaturePad.fromData(data);
      this.updateSignature();
    }
  }

  getSignatureData(): string {
    return this.signatureData;
  }

  setSignatureData(data: string) {
    if (data) {
      this.signaturePad.fromDataURL(data);
      this.signatureData = data;
      this.isEmpty = false;
      this.canUndo = true;
    } else {
      this.clear();
    }
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    this.setSignatureData(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.signaturePad) {
      if (isDisabled) {
        this.signaturePad.off();
      } else {
        this.signaturePad.on();
      }
    }
  }
}
