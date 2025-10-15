import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MOCK_RATIOS,
  RatioCategory,
  Ratios,
} from '../../../../../../models/ratios.models';
import { Constants } from '../../../../../../services';

@Component({
  selector: 'app-ratios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="p-6 bg-white rounded-2xl shadow-sm max-w-5xl mx-auto border border-gray-100"
    >
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-semibold text-gray-800">
            Coaching 4 Results
          </h2>
          <p class="text-sm text-gray-500">
            Ratios Dashboard – <span class="font-medium">FY2025</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-1"
          >
            <i class="i-ph-download-simple text-sm"></i> Download
          </button>
          <button
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition flex items-center gap-1"
          >
            <i class="i-ph-calendar text-sm"></i> 2025
          </button>
        </div>
      </div>

      <!-- Ratio Groups -->
      @for (group of groupKeys; track group) {
      <div class="mb-10">
        <!-- Group Title -->
        <h3
          class="text-xs font-semibold text-gray-500 border-b border-gray-200 pb-1 uppercase mb-3 tracking-wide"
        >
          {{ formatGroupName(group) }}
        </h3>

        <!-- Header Row -->
        <div
          class="grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase pb-1 border-b border-gray-100 mb-2"
        >
          <div class="col-span-4 pl-2">Category</div>
          <div class="col-span-2 text-right pr-2">{{currency}}</div>
          <div class="col-span-2 text-right">Ratio</div>
          <div class="col-span-2 text-center">Min Target</div>
          <div class="col-span-2 text-center">Ideal Target</div>
        </div>

        <!-- Ratio Rows -->
        @for (item of ratios[group]; track item.id) {
        <div
          class="grid grid-cols-12 items-center py-3 border-b border-gray-100 hover:bg-gray-50 transition px-2 rounded-md"
        >
          <!-- Ratio Name / Formula -->
          <div class="col-span-4">
            <div class="flex items-center gap-1">
              <span class="font-medium text-gray-800 text-sm">{{
                item.title
              }}</span>
              <i class="i-ph-info text-gray-400 text-xs"></i>
            </div>
            <div class="text-[11px] text-gray-500 leading-tight mt-1">
              <div class="ratio-divider">
                {{ item.variable1_name }} : {{ currency }}
                {{ item.variable1_value | number : '1.0-0' }}
              </div>
              <div>
                {{ item.variable2_name }} : {{ currency }}
                {{ item.variable2_value | number : '1.0-0' }}
              </div>
            </div>
          </div>

          <!-- USD Value -->
          <div class="col-span-2 text-right text-sm text-gray-700 pr-2">
            {{ item.variable1_value | number : '1.0-0' }}
          </div>

          <!-- Ratio Badge -->
          <div class="col-span-2 text-right">
            @if (item.ratio_value !== null && item.ratio_value !== undefined) {
            <span
              class="px-2 py-0.5 rounded text-sm font-semibold inline-block w-20 text-center"
              [ngClass]="{
                'bg-green-100 text-green-700':
                  (item?.ratio_value ?? 0) >= (item?.min_target ?? 0),
                'bg-yellow-100 text-yellow-700':
                  (item?.ratio_value ?? 0) < (item?.min_target ?? 0) &&
                  (item?.ratio_value ?? 0) >= (item?.min_target ?? 0) / 2,
                'bg-red-100 text-red-700':
                  (item?.ratio_value ?? 0) < (item?.min_target ?? 0) / 2
              }"
            >
              {{ item.ratio_value }}%
            </span>
            } @else {
            <span class="text-gray-400 text-sm italic">—</span>
            }
          </div>

          <!-- Min Target -->
          <div class="col-span-2 text-center">
            <input
              type="number"
              [(ngModel)]="item.min_target"
              class="w-16 text-center border border-gray-200 rounded-md p-1 text-sm focus:outline-none focus:border-blue-400"
              placeholder="%"
            />
          </div>

          <!-- Ideal Target -->
          <div class="col-span-2 text-center">
            <input
              type="number"
              [(ngModel)]="item.ideal_target"
              class="w-16 text-center border border-gray-200 rounded-md p-1 text-sm focus:outline-none focus:border-blue-400"
              placeholder="%"
            />
          </div>
        </div>
        }
      </div>
      }
    </div>
  `,
  styles: [
    `
      @reference "tailwindcss";
      :host {
        display: block;
      }
      .ratio-divider {
        @apply border-b border-gray-300/70 pb-[2px] mb-[2px] w-fit;
      }
    `,
  ],
})
export class RatiosComponent {
  ratios: Ratios = MOCK_RATIOS;
  currency = Constants.Currency;

  get groupKeys(): RatioCategory[] {
    return Object.keys(this.ratios) as RatioCategory[];
  }

  formatGroupName(group: string): string {
    return group.replace(/_/g, ' ').toUpperCase();
  }
}
