This one follows exactly the same philosophy. I actually wouldn't model the six payment columns as separate fields. Those columns only exist because Excel has a fixed number of columns.

In your system, they're really **transactions**.

## Interface

```ts
export interface ISeedFunding {

    approvedAmount: number;

    disbursedAmount: number;

    remainingBalance: number;

    payments: IFundingPayment[];

}
```

```ts
export interface IFundingPayment {

    paymentNumber: number;

    amount: number;

    paymentDate?: string;

    reference?: string;

}
```

Then your node becomes

```ts
const node: INode<ISeedFunding> = {

    type: NODE_TYPES.SeedFunding,

    company_id: company.id,

    data: {

        approvedAmount: 100000,

        disbursedAmount: 99268,

        remainingBalance: 732,

        payments: [

            {
                paymentNumber: 1,
                amount: 80270
            },

            {
                paymentNumber: 2,
                amount: 18998
            }

        ]

    }

};
```

---

## Another example

For Daniels Health Home

```ts
data: {

    approvedAmount: 100000,

    disbursedAmount: 99443.71,

    remainingBalance: 556.29,

    payments: [

        { paymentNumber: 1, amount: 34500 },

        { paymentNumber: 2, amount: 23798.79 },

        { paymentNumber: 3, amount: 15576 },

        { paymentNumber: 4, amount: 10925 },

        { paymentNumber: 5, amount: 14643.92 }

    ]

}
```

No empty payment fields.

---

# Why I prefer this

Excel stores

```
Payment 1
Payment 2
Payment 3
Payment 4
Payment 5
Payment 6
```

But that's just because Excel has columns.

Your application stores

```
Payments

├── Payment
├── Payment
├── Payment
└── Payment
```

which is much more natural.

---

## Future-proof

Later you can extend each payment without changing the model.

```ts
export interface IFundingPayment {

    paymentNumber: number;

    amount: number;

    paymentDate?: string;

    paymentMethod?: string;

    reference?: string;

    approvedBy?: string;

    proofOfPayment?: number;

    status?: "Pending" | "Paid" | "Cancelled";

}
```

---

# I think we've found the pattern

Across these spreadsheets, your domain is becoming very consistent:

```text
Company
│
├── Assessment
│
├── Purchase
│
├── Seed Funding
│      └── Payments[]
│
├── Training
│
├── Monitoring Visit
│
├── Compliance Check
│
└── Documents
```

Each of these is simply an `INode<T>` with a different `type`, all linked through `company_id`. The **company** remains the aggregate root, while nodes capture the business history and activities over time.

One refinement I'd consider is introducing a reusable `Money` value object if you expect to handle multiple currencies or need to preserve formatting:

```ts
export interface IMoney {
    amount: number;
    currency: "ZAR";
}
```

Then fields like `approvedAmount`, `disbursedAmount`, and each payment amount could use `IMoney` instead of plain numbers. If your system will always operate in South African Rand, however, using `number` is perfectly reasonable and keeps the model simpler.
