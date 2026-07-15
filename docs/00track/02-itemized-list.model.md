Exactly. This dataset actually fits your Node architecture even better than the previous one.

The important observation is that **one company can have many purchases**. For example:

```
Company
 ├── Purchase 1
 ├── Purchase 2
 ├── Purchase 3
 └── Purchase 4
```

So instead of trying to store an array inside the company, I'd make **each purchase its own node** associated with the company.

## Interface

```ts
export interface ICompanyPurchase {

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
```

Then

```ts
export interface IPurchasedItem {

    description: string;

}
```

Or, if later you decide to capture quantities and prices:

```ts
export interface IPurchasedItem {

    description: string;

    quantity?: number;

    unit?: string;

    unitPrice?: number;

}
```

---

## Example node

```ts
const node: INode<ICompanyPurchase> = {

    type: NODE_TYPES.CompanyPurchase,

    company_id: company.id,

    data: {

        purchaseType: "Equipment",

        supplier: "Incredible Connection",

        amount: 18998,

        order: {

            purchaseOrder: true,

            invoiceReceived: false,

            invoiceType: "Quotation",

            itemsReceived: false

        },

        items: [

            {
                description: "Dell 14 inch Essential"
            },

            {
                description: "HP Wireless Mouse"
            }

        ]

    }

};
```

---

# Why this is better

Notice your spreadsheet stores this

```
Company
Purchase Type
Items Purchased
Supplier
Amount
Purchase Order
Invoice
```

Those aren't really company properties.

They're **purchase records**.

So every row becomes

```
Company
    ├── Purchase
    ├── Purchase
    ├── Purchase
    ├── Purchase
```

rather than

```
Company
    purchases: [...]
```

because then you can

* filter purchases
* paginate purchases
* edit a single purchase
* attach files later
* approve a purchase
* audit changes

without rewriting the whole company object.

---

# Even more generic

I actually see a pattern emerging from your entire Node system.

You now have:

```
Company
    ├── Assessment
    ├── Purchase
    ├── Training
    ├── Visit
    ├── Grant
    ├── Inspection
    └── Document
```

Every one of these is simply another `INode<T>` attached to the same `company_id`.

That means your application is evolving into an event/history model rather than a CRUD model, which is much more scalable. The company becomes the aggregate root, and everything else—assessments, purchases, grants, inspections, documents, and future record types—exists as related nodes. I think that's a very strong fit for the architecture you've been building.
