import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyFinancialItemService } from '../../../../../../services/company-financial-item.service';
import { CompanyFinancialItem, FinancialItemType } from '../../../../../../models/financial.models';

@Component({
  selector: 'app-financial-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-item.component.html',
})
export class FinancialItemComponent implements OnInit {
  @Input() companyId!: number;
  @Input() year!: number;
  @Input() itemType!: FinancialItemType;
  @Input() title = '';
  @Input() subtitle = '';

  items = signal<CompanyFinancialItem[]>([]);
  isLoading = signal(false);
  totalAmount = signal(0);

  constructor(private service: CompanyFinancialItemService) {}

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.isLoading.set(true);
    this.service.listFinancialItemsByYearAndType(this.companyId, this.year, this.itemType).subscribe({
      next: (data) => {
        this.items.set(data);
        this.calculateTotal();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading financial items', err);
        this.isLoading.set(false);
      },
    });
  }

  addItem() {
    const newItem: Partial<CompanyFinancialItem> = {
      company_id: this.companyId,
      year_: this.year,
      item_type: this.itemType,
      name: 'New Item',
      amount: 0,
      note: '',
    };

    this.service.addCompanyFinancialItem(newItem).subscribe({
      next: (res) => {
        this.items.update((list) => [...list, res]);
        this.calculateTotal();
      },
    });
  }

  updateItem(item: CompanyFinancialItem) {
    if(!item.id) return;
    this.service.updateCompanyFinancialItem(item.id, {
      amount: item.amount,
      note: item.note,
      name: item.name,
    }).subscribe({
      next: (res) => {
        this.items.update((list) =>
          list.map((i) => (i.id === item.id ? res : i))
        );
        this.calculateTotal();
      },
    });
  }

  deleteItem(item: CompanyFinancialItem) {
    if (!confirm(`Delete "${item.name}"?`) || !item.id) return;
    this.service.deleteCompanyFinancialItem(item.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
        this.calculateTotal();
      },
    });
  }

  calculateTotal() {
    const total = this.items().reduce((sum, i) => sum + (i.amount ?? 0), 0);
    this.totalAmount.set(total);
  }
}
