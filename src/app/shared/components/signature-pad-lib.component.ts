import {
  Component,
  AfterViewInit,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  Input,
  forwardRef,
} from '@angular/core';
import {
  NgSignaturePadOptions,
  SignaturePadComponent,
} from '@almothafar/angular-signature-pad';
import { CommonModule } from '@angular/common';
import { UploadService } from '../../../services/UploadService';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-signature-pad-lib',
  standalone: true,
  template: `
    <div class="signature-container">
      <!-- Display signature as image if it exists -->
      <div *ngIf="signatureImageUrl" class="signature-display" (click)="openSignatureModal()">
        <img [src]="signatureImageUrl" alt="Signature" class="signature-image" />
        <button type="button" class="edit-signature-btn" title="Edit signature">
          ✏️
        </button>
      </div>

      <!-- Display placeholder if no signature exists -->
      <div *ngIf="!signatureImageUrl" class="signature-placeholder" (click)="openSignatureModal()">
        <div class="placeholder-content">
          <span class="placeholder-text">Click to sign</span>
        </div>
      </div>
    </div>

    <!-- Signature Modal -->
    <div *ngIf="showModal" class="signature-modal" (click)="closeModal()">
      <div class="signature-modal-content" (click)="$event.stopPropagation()">
        <div class="signature-modal-header">
          <h3>Sign Here</h3>
          <button type="button" class="close-btn" (click)="closeModal()">×</button>
        </div>
        <div class="signature-pad-wrapper">
          <signature-pad
            #signature
            [options]="signaturePadOptions"
            (drawStart)="drawStart($any($event))"
            (drawEnd)="drawComplete($any($event))"
          ></signature-pad>
        </div>
        <div class="signature-modal-actions">
          <button type="button" class="clear-btn" (click)="clearSignature()">Clear</button>
          <button type="button" class="save-btn" (click)="saveSignature()">Save</button>
        </div>
      </div>
    </div>
  `,
  imports: [CommonModule, SignaturePadComponent],
  styles: [`
    .signature-container {
      display: inline-block;
      cursor: pointer;
    }

    .signature-display {
      position: relative;
      display: inline-block;
    }

    .signature-image {
      max-width: 200px;
      max-height: 100px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .edit-signature-btn {
      position: absolute;
      bottom: 5px;
      right: 5px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid #ccc;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 12px;
      cursor: pointer;
      display: none;
    }

    .signature-display:hover .edit-signature-btn {
      display: block;
    }

    .signature-placeholder {
      width: 200px;
      height: 37px;
      border: 2px dashed #ccc;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #fafafa;
    }

    .placeholder-content {
      text-align: center;
      color: #999;
    }

    .placeholder-text {
      font-size: 12px;
    }

    .signature-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .signature-modal-content {
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
    }

    .signature-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .signature-modal-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .signature-pad-wrapper {
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 15px;
    }

    .signature-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .clear-btn, .save-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .clear-btn {
      background-color: #f0f0f0;
      color: #333;
    }

    .save-btn {
      background-color: #007bff;
      color: white;
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SignaturePadLibComponent),
      multi: true
    }
  ]
})
export class SignaturePadLibComponent implements OnInit, AfterViewInit, ControlValueAccessor {
  @Input() width: number = 200;
  @Input() height: number = 100;
  @Output() onValueChanged = new EventEmitter<string>();

  @ViewChild('signature') public signaturePad!: SignaturePadComponent;

  signaturePadOptions: NgSignaturePadOptions = {
    minWidth: 2,
    maxWidth: 4,
    canvasWidth: 500,
    canvasHeight: 200,
    backgroundColor: '#ffffff',
    penColor: '#000000',
  };

  signatureImageUrl: string | null = null;
  showModal = false;
  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor(private uploadService: UploadService) {}

  ngOnInit(): void {
    // Update canvas size based on inputs
    this.signaturePadOptions = {
      ...this.signaturePadOptions,
      canvasWidth: this.width * 2.5, // Make canvas larger for better quality
      canvasHeight: this.height * 2
    };
  }

  ngAfterViewInit() {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }

  writeValue(value: string): void {
    if (value) {
      this.signatureImageUrl = value;
    } else {
      this.signatureImageUrl = null;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  drawComplete(event: MouseEvent | Touch) {
    // Signature is drawn, but we don't emit until save is clicked
  }

  drawStart(event: MouseEvent | Touch) {
    // Notify that drawing has started
  }

  openSignatureModal() {
    this.showModal = true;
    // Clear the signature pad when opening modal
    setTimeout(() => {
      if (this.signaturePad) {
        this.signaturePad.clear();
      }
    }, 100);
  }

  closeModal() {
    this.showModal = false;
  }

  clearSignature() {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }

  saveSignature() {
    if (this.signaturePad && !this.signaturePad.isEmpty()) {
      const dataUrl = this.signaturePad.toDataURL();
      // Upload the signature as an image
      this.uploadSignature(dataUrl);
    } else {
      // If cleared, set to null
      this.signatureImageUrl = null;
      this.onChange('');
      this.onValueChanged.emit('');
      this.closeModal();
    }
  }

  private uploadSignature(dataUrl: string) {
    // Convert data URL to Blob
    const blob = this.dataURItoBlob(dataUrl);
    const file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    // Upload the signature
    this.uploadService.uploadFile(formData).subscribe({
      next: (response) => {
        if (response?.success) {
          const imageUrl = `${this.uploadService.uploadBaseUrl}/${response.url}`;
          this.signatureImageUrl = imageUrl;
          this.onChange(imageUrl);
          this.onValueChanged.emit(imageUrl);
          this.closeModal();
        } else {
          console.error('Signature upload failed:', response);
        }
      },
      error: (error) => {
        console.error('Signature upload error:', error);
      }
    });
  }

  private dataURItoBlob(dataURI: string): Blob {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }
}
