import {
  Component,
  AfterViewInit,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  NgSignaturePadOptions,
  SignaturePadComponent,
} from '@almothafar/angular-signature-pad';

@Component({
  selector: 'app-signature-pad-lib',
  standalone: true,
  template: `
    <signature-pad
      #signature
      [options]="signaturePadOptions"
      (drawStart)="drawStart($any($event))"
      (drawEnd)="drawComplete($any($event))"
    ></signature-pad>
  `,
  imports: [SignaturePadComponent],
})
export class SignaturePadLibComponent implements OnInit, AfterViewInit {
  @Output() onValueChanged = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {}

  @ViewChild('signature')
  public signaturePad!: SignaturePadComponent;

  signaturePadOptions: NgSignaturePadOptions = {
    minWidth: 5,
    canvasWidth: 380,
    canvasHeight: 100,
    backgroundColor: '#ffffff', // White background
    penColor: '#000000', // Black pen
  };

  ngAfterViewInit() {
    this.signaturePad.clear();
  }

  drawComplete(event: MouseEvent | Touch) {
    this.onValueChanged.emit(this.signaturePad.toDataURL());
  }

  drawStart(event: MouseEvent | Touch) {}
}
