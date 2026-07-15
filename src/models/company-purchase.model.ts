export interface IPurchasedItem {
  description: string;
}

export interface ICompanyPurchase {
  companyName?: string;
  purchaseType: string;
  supplier: string;
  amount: number;
  order: {
    purchaseOrder: boolean;
    invoiceReceived: boolean;
    invoiceType: string;
    itemsReceived: boolean;
  };
  items: IPurchasedItem[];
}
