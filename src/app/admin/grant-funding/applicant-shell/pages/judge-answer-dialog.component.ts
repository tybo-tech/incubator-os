import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormTemplate } from '../../../form-templates/interfaces/form-template.interfaces';

export interface JudgeAnswerRow {
  name: string;
  submissionId: number;
  scores: Record<string, number>;
  answers: Record<string, any>;
  total: number;
  submittedAt: string;
}

@Component({
  selector: 'app-judge-answer-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
         (click)="onBackdropClick($event)">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <!-- Panel -->
      <div class="relative bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl
                  max-h-[90vh] flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 bg-violet-600 flex-shrink-0">
          <div class="flex items-center gap-3">
            <!-- Avatar -->
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center
                        text-white font-bold text-base flex-shrink-0">
              {{ (judge.name || '?').charAt(0) }}
            </div>
            <div>
              <p class="text-sm font-bold text-white">{{ judge.name }}</p>
              <p class="text-xs text-violet-200">
                Score: <strong class="text-white">{{ judge.total }}/{{ maxTotal }}</strong>
                &nbsp;·&nbsp;
                {{ scorePercent() }}%
                &nbsp;·&nbsp;
                Submitted {{ judge.submittedAt | date:'d MMM y, HH:mm' }}
              </p>
            </div>
          </div>
          <button (click)="closed.emit()"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-white/60
                         hover:bg-white/20 hover:text-white transition-colors flex-shrink-0">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <!-- Score bar -->
        <div class="h-1.5 bg-violet-200 flex-shrink-0">
          <div class="h-full bg-white transition-all"
               [style.width.%]="scorePercent()"></div>
        </div>

        <!-- Scrollable body -->
        <div class="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <ng-container *ngFor="let section of template.data.sections">
            <!-- Section header -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <div class="flex-1 h-px bg-violet-100"></div>
                <span class="text-[10px] font-bold uppercase tracking-widest text-violet-500 px-2">
                  {{ section.title }}
                </span>
                <div class="flex-1 h-px bg-violet-100"></div>
              </div>

              <!-- Questions -->
              <div class="space-y-3">
                <div *ngFor="let q of section.questions; let i = index"
                     class="rounded-xl border border-gray-100 overflow-hidden">
                  <!-- Question label -->
                  <div class="flex items-start gap-2 px-4 py-2.5 bg-gray-50">
                    <span class="text-[10px] font-bold text-gray-400 flex-shrink-0 mt-0.5">
                      Q{{ i + 1 }}
                    </span>
                    <p class="text-xs text-gray-700 leading-snug flex-1">{{ q.label }}</p>
                  </div>

                  <!-- Answer -->
                  <div class="px-4 py-2.5 bg-white">
                    <!-- Rating: show stars/bar -->
                    <ng-container *ngIf="q.type === 'rating'">
                      <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1">
                          <ng-container *ngFor="let star of starRange(q.scale ?? 5); let si = index">
                            <i [class]="si < (judge.answers[q.id] ?? 0)
                                  ? 'fas fa-star text-amber-400 text-sm'
                                  : 'fas fa-star text-gray-200 text-sm'"></i>
                          </ng-container>
                        </div>
                        <span class="text-sm font-bold text-violet-700">
                          {{ judge.answers[q.id] ?? '—' }} / {{ q.scale ?? 5 }}
                        </span>
                        <span *ngIf="judge.answers[q.id] == null" class="text-xs text-gray-400 italic">
                          Not answered
                        </span>
                      </div>
                    </ng-container>

                    <!-- Boolean -->
                    <ng-container *ngIf="q.type === 'boolean'">
                      <span *ngIf="judge.answers[q.id] != null"
                            [class]="judge.answers[q.id] === true || judge.answers[q.id] === 'true'
                              ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold'
                              : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold'">
                        <i [class]="judge.answers[q.id] === true || judge.answers[q.id] === 'true'
                              ? 'fas fa-check text-[10px]' : 'fas fa-xmark text-[10px]'"></i>
                        {{ (judge.answers[q.id] === true || judge.answers[q.id] === 'true') ? 'Yes' : 'No' }}
                      </span>
                      <span *ngIf="judge.answers[q.id] == null" class="text-xs text-gray-400 italic">Not answered</span>
                    </ng-container>

                    <!-- All other types: text, textarea, select, number, date, currency, pickers -->
                    <ng-container *ngIf="q.type !== 'rating' && q.type !== 'boolean'">
                      <p *ngIf="judge.answers[q.id] != null && judge.answers[q.id] !== ''"
                         class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {{ renderGenericAnswer(q.id) }}
                      </p>
                      <span *ngIf="judge.answers[q.id] == null || judge.answers[q.id] === ''"
                            class="text-xs text-gray-400 italic">Not answered</span>
                    </ng-container>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 py-3.5 border-t border-gray-100
                    bg-gray-50 flex-shrink-0">
          <p class="text-xs text-gray-400">
            Evaluation ID #{{ judge.submissionId }}
          </p>
          <button (click)="closed.emit()"
                  class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg
                         hover:bg-gray-100 transition-colors font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
})
export class JudgeAnswerDialogComponent {
  @Input() judge!: JudgeAnswerRow;
  @Input() template!: FormTemplate;
  @Input() maxTotal = 0;
  @Output() closed = new EventEmitter<void>();

  scorePercent(): number {
    if (!this.maxTotal) return 0;
    return Math.round((this.judge.total / this.maxTotal) * 100);
  }

  starRange(max: number): number[] {
    return Array.from({ length: max }, (_, i) => i);
  }

  renderGenericAnswer(qId: string): string {
    const v = this.judge.answers[qId];
    if (v == null) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.closed.emit();
    }
  }
}
