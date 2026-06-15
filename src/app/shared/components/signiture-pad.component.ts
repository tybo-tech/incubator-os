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
  AngularSignaturePadModule,
  SignaturePadComponent,
} from '@almothafar/angular-signature-pad';

@Component({
  selector: 'app-signiture-pad',
  standalone: true,
  template: `
    <signature-pad
      #signature
      [options]="signaturePadOptions"
      (drawStart)="drawStart($any($event))"
      (drawEnd)="drawComplete($any($event))"
    ></signature-pad>
  `,
  imports: [AngularSignaturePadModule],
})
export class SigniturePadComponent implements OnInit, AfterViewInit {
  @Output() onValueChanged = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {}

  @ViewChild(SignaturePadComponent)
  public signaturePad?: SignaturePadComponent;

  signaturePadOptions: NgSignaturePadOptions = {
    minWidth: 5,
    canvasWidth: 380,
    canvasHeight: 100,
    backgroundColor: '#ffffff', // White background
    penColor: '#000000', // Black pen
  };

  ngAfterViewInit() {
    this.signaturePad?.clear();
  }

  drawComplete(event: MouseEvent | Touch) {
    if (!this.signaturePad) return;
    this.onValueChanged.emit(this.signaturePad.toDataURL());
  }

  drawStart(event: MouseEvent | Touch) {}
}
