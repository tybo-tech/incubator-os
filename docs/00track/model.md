Perfect. This gives a much clearer picture of the architecture. I actually wouldn't create a separate `CompanyAssessment` model anymore. I'd model it as the payload (`data`) of an `INode`.

Since your system is already generic, the interface should only describe the business data. The node itself provides the metadata (`company_id`, `type`, `parent_id`, etc.).

I'd do something like this:

```ts
export interface IBusinessAssessment {
  level: number;

  requirements: {
    registration: boolean;
    taxCompliance: boolean;
    businessPlan: boolean;
    youthOwned: boolean;
    bankAccount: boolean;
  };

  funding: {
    requestedAmount: number;
    approved: boolean;
    paid: boolean;
  };

  score: number;
}
```

Then the actual node becomes

```ts
const node: INode<IBusinessAssessment> = {
    type: NODE_TYPES.BusinessAssessment,
    company_id: company.id,

    data: {
        level: 3,

        requirements: {
            registration: true,
            taxCompliance: true,
            businessPlan: true,
            youthOwned: false,
            bankAccount: true
        },

        funding: {
            requestedAmount: 100000,
            approved: false,
            paid: false
        },

        score: 63
    }
};
```

---

## Why I like nesting

Looking at the spreadsheet, the columns naturally belong together.

```
Company
│
├── Level
├── Requirements
│   ├── Registration
│   ├── Tax
│   ├── Business Plan
│   ├── Youth
│   └── Bank
│
├── Funding
│   ├── Requested
│   ├── Approved
│   └── Paid
│
└── Score
```

That means your Angular forms also become cleaner.

```ts
assessment.data.requirements.registration

assessment.data.requirements.taxCompliance

assessment.data.funding.requestedAmount

assessment.data.score
```

instead of

```ts
assessment.data.registration
assessment.data.taxCompliance
assessment.data.businessPlan
assessment.data.bankAccount
assessment.data.requestedAmount
assessment.data.approved
...
```

---

## Even better...

Since you're building a generic node system, I'd make the interface reusable for future assessments.

```ts
export interface IAssessment {

    assessmentType: string;

    level: number;

    checks: Record<string, boolean>;

    metrics: Record<string, number>;

    values: Record<string, string>;

}
```

For this spreadsheet that becomes

```ts
data: {

    assessmentType: "seda-funding",

    level: 3,

    checks: {
        registration: true,
        taxCompliance: true,
        businessPlan: true,
        youthOwned: false,
        bankAccount: true,
        approved: false,
        paid: false
    },

    metrics: {
        requestedAmount: 100000,
        score: 63
    },

    values: {}
}
```

Now imagine next year someone gives you a completely different spreadsheet with 30 different Yes/No columns. You **don't create another interface**—you simply define a different assessment template while keeping the same storage model.

Given the direction of your Node architecture, this is the approach I'd recommend. It keeps the database schema stable while allowing completely different assessment types to coexist under the same `BusinessAssessment` node type, with only the `assessmentType` (or template) distinguishing them. This aligns well with the dynamic, metadata-driven design you've been building.


use : C:\dev\projects\angular\incubator-os\src\services\node.service.ts

add tab: C:\dev\projects\angular\incubator-os\src\app\components\company-shell\company-shell.component.ts
 