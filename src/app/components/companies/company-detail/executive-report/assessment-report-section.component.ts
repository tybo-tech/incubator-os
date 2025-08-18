// assessment-report-section.component.ts
import { Component, Input, OnChanges, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { INode } from '../../../../../models/schema';
import { Company } from '../../../../../models/business.models';
import { AssessmentFacade } from './assessment-facade.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-assessment-report-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-6" *ngIf="loaded">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-[#374151] mb-2">
        Introduction to the Business
      </h2>
      <div class="border border-[#e5e7eb] rounded-lg bg-[#f9fafb] p-3 text-sm text-[#111827] whitespace-pre-line">
        {{ introText || '—' }}
      </div>

      <div class="mt-6">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-[#374151] mb-2">Self Assessment (1–10)</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <tr>
                <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-44">Sales Ability</th>
                <td class="p-2 text-[#111827]">{{ displayNumber(salesAbility) }}</td>
              </tr>
            </table>
          </div>
          <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <tr>
                <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-44">Marketing Ability</th>
                <td class="p-2 text-[#111827]">{{ displayNumber(marketingAbility) }}</td>
              </tr>
            </table>
          </div>
          <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <tr>
                <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-44">Other</th>
                <td class="p-2 text-[#6b7280]">—</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-[#374151] mb-2">Current Standing with SARS</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <tr>
                <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-44">State of VAT</th>
                <td class="p-2 text-[#111827]">{{ vatState || '—' }}</td>
              </tr>
            </table>
          </div>
          <div class="border border-[#e5e7eb] rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <tr>
                <th class="bg-[#f9fafb] text-left font-semibold text-[#374151] p-2 w-44">State of PAYE</th>
                <td class="p-2 text-[#111827]">{{ payeState || '—' }}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="loading" class="mt-6 text-sm text-[#6b7280]">Loading assessment…</div>
    <div *ngIf="error" class="mt-3 text-sm text-[#b91c1c]">{{ error }}</div>
  `,
})
export class AssessmentReportSectionComponent implements OnChanges {
  @Input({ required: true }) company: INode<Company> | null = null;

  // derived view model
  introText: string | null = null;
  salesAbility: number | null = null;
  marketingAbility: number | null = null;
  vatState: string | null = null;
  payeState: string | null = null;

  loading = false;
  loaded = false;
  error: string | null = null;

  private facade = inject(AssessmentFacade);
  private destroyRef = inject(DestroyRef);

  ngOnChanges(): void {
    const id = this.company?.id;
    if (!id) return;

    this.loading = true;
    this.loaded = false;
    this.error = null;

    // fetch questionnaire, then responses (both cached by facade)
    this.facade.getQuestionnaire()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: q => {
          this.facade.getResponses(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: map => {
                // build a simple index from question text -> value (case-insensitive)
                const items: Array<{ text: string; value: any }> = [];
                q.sections?.forEach(sec =>
                  sec.questions?.forEach(qq => {
                    const val = map[qq.id];
                    if (val !== undefined) {
                      items.push({ text: (qq.question || '').toLowerCase(), value: val });
                    }
                  })
                );

                this.introText = this.pick(items, ['briefly describe', 'how and why', 'current state', 'introduction to the business']) as string | null;
                this.salesAbility = this.toNumber(this.pick(items, ['sales ability']));
                this.marketingAbility = this.toNumber(this.pick(items, ['marketing ability']));
                this.vatState = (this.pick(items, ['state of vat', 'vat state']) as string) || null;
                this.payeState = (this.pick(items, ['state of paye', 'paye state']) as string) || null;

                this.loaded = true;
                this.loading = false;
              },
              error: (e) => {
                console.error(e);
                this.error = 'Failed to load assessment responses.';
                this.loading = false;
              }
            });
        },
        error: (e) => {
          console.error(e);
          this.error = 'Failed to load questionnaire.';
          this.loading = false;
        }
      });
  }

  private pick(index: Array<{ text: string; value: any }>, patterns: string[]): any {
    const tests = patterns.map(p => p.toLowerCase());
    const hit = index.find(i => tests.some(t => i.text.includes(t)));
    return hit ? hit.value : null;
    }

  private toNumber(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  displayNumber(n: number | null): string { return n == null ? '—' : String(n); }
}
