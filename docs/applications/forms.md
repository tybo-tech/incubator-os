Okay, bro, this is basically the interview questionnaire, okay, for a specific entrepreneur, okay? So, we already have some of this data, like the company name, registration number, director details, gender, sector, the turnover information, we already have all that. So that information, we're going to just pull through with for the company profile. So where are we gonna start? We're gonna start from interview questions. And the way I look at interview questions, that is a form title. So basically, I can create a form and call it interview questions, okay? That's just a title. And then the form can have sections, rather. I think we can just divide this into sections. And then inside of a section, we can have a bunch of questions. I think that can just cover all this model nicely. You just need to be careful about our questions. A question must have a type. Some question can just be plain text, which is just a string, and that can be a yes or no, and then... And conditionally show more fields. For example, do you have employees? I can say yes. If I say yes, I can show a number of employees. So that I see. Yeah, I think that is actually the only type of questions we have, if we read through these questions carefully. Just check it out. Then in general, the form can have a list of comments, you know. I think that will just make it easy. So this is something that can be loaded on a profile. Do not plan any coding yet. Just analyze how we're gonna do this. I mean, do not write any code yet. Just analyze how we're gonna do this, because I'll give you the instruction exactly on how my storage works. Date: 07/04/2025 Check-in: Everything is ok INTERVIEW QUESTIONS – ENTERPRISE DEVELOPMENT GRANT FUND QUESTION RESPONSE / COMMENTS Personal Motivation and Vision Briefly tell us about yourself and your business. Started the biz in 2019 Expanded to three branches in Nseleni What products or services does your business offer? Offering complete package ie learners’ bookings/license & brush up as well as driving lessons/license What inspired you to start your business?? Saw an opportunity in Nseleni – gap in the market for a driving school Who manages your business? Sanele manages the business – with three assistants Where is your business located, are you currently renting any premises or do you have a lease agreement with the landlord? 3 branches, Nseleni; Richards Bay and Mzingazi - Currently renting Where do you see your company in 5 years? To become the best driving school in Zululand What are you currently reading? Not reading anything What social media and TV programs do you enjoy watching? Use social media to learn how to market biz, and for marketing his biz. Customer Perspective What customer problem are you solving? Need for drivers. Teach people to drive. Who are your target customers? Youth, people without learner’s license; 17 years to 70 years. How do you reach your customers? Market at schools - matriculants, churches, distribute flyers in the townships. Who are your top 3 paying customers? Youth Finance Perspective How does your business make money? R600 p/p learner’s license; R4800 for driver’s license p/p. - How much sales is your business making per month? +/- R14000.00 How much money do customers owe the business? Pay a deposit of R300. R600 -Pay as you go What is your primary source of income and what other income streams do you have? Business only How much money have you invested in your business? R20K bought chairs and tables etc Have you received any financial support- loans, grants etc No grants etc – self funded Risk-Taking and Decision-Making What is the current situation in your business? Cashflow – money in account. Month to month What is the greatest challenge your business has faced? Currently using paper to write, when they go to write test, they are not used to using a computer How did you overcome this challenge? Identified challenge and working towards this What is the most innovative idea you've implemented in your business? Consider going digital – so clients will be familiar with technology when writing their tests. Social Perspectives, Environmental & Governance Perspective Job creation - Do you have employees? Yes -√ - 3 employees No If yes -do you have employee contracts and provide pay slips? Yes - √ No Do you ensure the health and safety of your employees? Yes - √ No Are you registered with WCA/UIF/SARS PAYE? Yes - √ No Are there any regulatory requirements in your sector? Yes - √ belong to an association. No Does your company generate any waste? Yes No N/A Do you consider recycling waste generated from your business operations? Yes No N/A Do you keep records of all your business transactions? Yes-√ No Are you currently using an accounting system? Yes - √ No Are your CIPC annual returns up to date. Yes - √ No Needs Analysis What are the three things your business needs to grow? Digital platforms, tablets, marketing, gazebo’s How many extra jobs will this create? 3 jobs How much will your sales increase? Will differentiate offerings and sales will increase 100%

You’re thinking in the right direction. This *is* essentially a structured data-capture problem, not a UI problem yet. Let’s break it down cleanly so your model doesn’t collapse later when requirements expand.

---

# 1. Core Abstraction (You got this right)

At the highest level:

**Company Profile (already exists)**
→ attaches to
**Form Instance (Interview Submission)**
→ based on
**Form Template (Interview Questions)**

So don’t just think “a form”—think:

* **Template (static definition)**
* **Submission (captured answers per company)**

---

# 2. Form Template Structure (Your Idea, Refined)

You said:

> Form → Sections → Questions

That’s correct. But it needs a bit more structure to avoid future limitations.

### Final Model:

```
FormTemplate
  - id
  - title (e.g. "Interview Questions – Enterprise Development Grant Fund")
  - version
  - sections[]

Section
  - id
  - title (e.g. "Personal Motivation and Vision")
  - order
  - questions[]

Question
  - id
  - label (actual question text)
  - type
  - required (bool)
  - order
  - config (type-specific settings)
  - conditions (optional visibility logic)
```

---

# 3. Question Types (Don’t oversimplify this)

You said:

> only text and yes/no

That’s *too narrow* and will bite you later. From your dataset alone, you already need more.

### Minimum viable types:

### 1. `text`

* Short answers
* Example: “Who manages your business?”

### 2. `textarea`

* Long responses
* Example: “Briefly tell us about yourself…”

### 3. `boolean`

* Yes / No
* Example: “Do you have employees?”

### 4. `number`

* Example: number of employees, revenue

### 5. `currency`

* Important distinction from number
* Example: R14,000, R20K

### 6. `select` (single choice)

* Example: Yes / No / N/A
* Better than boolean when 3 states exist

### 7. `multi-select` (future-proof)

* Example: marketing channels

---

# 4. Conditional Logic (Critical)

You mentioned:

> If yes → show more fields

Correct. This needs to be **first-class**, not hacked.

### Example:

```
Question: Do you have employees? (boolean)

Child Question:
- "How many employees?"
- visibleIf:
    questionId = "employees"
    value = true
```

### So each question needs:

```
conditions: [
  {
    dependsOnQuestionId,
    operator (==, !=, >, includes),
    value
  }
]
```

This gives you scalability without rewriting logic later.

---

# 5. Answer Model (Submission Side)

Now the important part you didn’t explicitly define:

### A submission is NOT the same as the template.

```
FormSubmission
  - id
  - formTemplateId
  - companyId
  - submittedAt
  - status (draft, submitted, reviewed)
  - answers[]

Answer
  - questionId
  - value (typed or JSON)
```

⚠️ Important:
Do NOT store answers inside questions. Keep them separate.

---

# 6. Handling This Specific Questionnaire

Let’s map what you gave into structure:

---

## SECTION 1: Personal Motivation and Vision

Questions:

* About yourself → `textarea`
* Products/services → `textarea`
* Inspiration → `textarea`
* Who manages → `text`
* Business location → `textarea`
* 5-year vision → `textarea`
* Reading → `text`
* Media consumption → `textarea`

---

## SECTION 2: Customer Perspective

* Problem solved → `textarea`
* Target customers → `textarea`
* Customer acquisition → `textarea`
* Top customers → `text`

---

## SECTION 3: Finance Perspective

* Revenue model → `textarea`
* Monthly sales → `currency`
* Customer debt → `text`
* Income streams → `text`
* Investment → `currency`
* Funding received → `boolean` + conditional text

---

## SECTION 4: Risk & Decision-Making

* Current situation → `textarea`
* Biggest challenge → `textarea`
* Solution → `textarea`
* Innovation → `textarea`

---

## SECTION 5: Governance / ESG

This section is more structured:

* Employees → `boolean`

  * If yes → number of employees (`number`)
* Contracts → `boolean`
* Health & safety → `boolean`
* Registered (UIF/PAYE) → `boolean`
* Regulatory requirements → `boolean + text`
* Waste → `select (Yes/No/N/A)`
* Recycling → `select`
* Record keeping → `boolean`
* Accounting system → `boolean`
* CIPC compliance → `boolean`

---

## SECTION 6: Needs Analysis

* Growth needs → `textarea`
* Jobs created → `number`
* Sales increase → `percentage` (or text if vague)

---

# 7. Meta Fields (Don’t Ignore These)

Outside sections, you also have:

```
FormSubmission.meta:
  - date
  - checkInStatus
  - interviewerNotes
  - recommendation (progress to next stage)
```

These are NOT questions—they’re system-level fields.

---

# 8. Comments System (You Mentioned This)

You said:

> form can have list of comments

Correct. But define scope:

### Two types:

1. **Global comments (on submission)**
2. **Per-question comments (reviewer feedback)**

```
Comment
  - id
  - submissionId
  - questionId (optional)
  - text
  - author
  - timestamp
```

---

# 9. Key Design Decisions (Important)

### 1. Schema-driven UI

Everything must render from the template, not hardcoded.

### 2. Versioning

Forms WILL change.

```
FormTemplate.version = 1, 2, 3...
```

Old submissions must still work.

---

### 3. Flexible Value Storage

Use something like:

```
value: any (string | number | boolean | object)
```

Don’t over-type too early.

---

# 10. What You Got Right (Validation)

You correctly identified:

* Form → Sections → Questions ✔️
* Need for types ✔️
* Conditional fields ✔️
* Reusability on profile ✔️

The only correction:
→ You underestimated **type variety + separation of template vs data**

---

# 11. What I Need From You Next

Before we go into implementation, I need clarity on your storage system:

* Are you using:

  * document-based (like JSON blobs)?
  * relational tables?
  * hybrid?

* Do you already have:

  * `MetricRecord`, `Metrics`, etc. (you mentioned files)

Because your storage model will heavily influence:

* how we structure answers
* how we query analytics later

---

When you’re ready, send:

> “Here’s how my storage works”

Then I’ll align this model *exactly* to your system without overengineering.


Okay, perfect. Yes, I never noticed that these conditional questions, they can actually be driving like as a hierarchy. So yeah, we can definitely, a question can have questions. Yeah, that's perfect. Because we are going to be using like the nested JSON, we are going to be using JSON collection to store this information. So I do think that a hierarchy tree would work. Just wanna show you how this looks like. For example, how the workflow is stored. You can see that the data is actually in data. So this would be the form with all the questions nested here. So for example, now, that being said, if I have a parent question, how many employees do you have? I'm going to have in the same objects, a children list, and then visible if, yeah, your structure is actually correct. We can say visible if question ID and if value, but it's just gonna be nested. It's not like something that we're going to be looking up. Yeah, we don't have any reasons yet to separate this because, yeah, this template are just gonna be used in this specific area. So for now, let's not be too generic, but I love your plan if this is good enough. So one record would be storing the form metadata in one record. And then if we're doing the submissions, that would be another collection per user. example:
[
    {
        "id": 2019,
        "type": "grant_workflow",
        "company_id": null,
        "data": {
            "id": "grant-2026",
            "name": "Grant Funding 2026",
            "stages": [
                {
                    "key": "applied",
                    "type": "entry",
                    "color": "blue",
                    "label": "Applied",
                    "actions": [
                        {
                            "key": "move_to_due_diligence",
                            "label": "Start Due Diligence",
                            "target": "due_diligence",
                            "variant": "primary"
                        },
                        {
                            "key": "decline",
                            "label": "Decline Application",
                            "target": "declined",
                            "variant": "danger"
                        }
                    ],
                    "components": [
                        "bank_statements",
                        "documents"
                    ]
                },
                {
                    "ui": {
                        "showChecklist": true,
                        "showDocuments": true
                    },
                    "key": "due_diligence",
                    "type": "validation",
                    "color": "orange",
                    "label": "Due Diligence",
                    "actions": [
                        {
                            "key": "pass",
                            "label": "Pass Due Diligence",
                            "target": "screening",
                            "variant": "primary"
                        },
                        {
                            "key": "decline",
                            "label": "Decline Application",
                            "target": "declined",
                            "variant": "danger"
                        }
                    ],
                    "components": [
                        "checklist"
                    ],
                    "requires_checklist": true
                },
                {
                    "ui": {
                        "showEvaluation": true
                    },
                    "key": "screening",
                    "type": "review",
                    "color": "purple",
                    "label": "Screening",
                    "actions": [
                        {
                            "key": "move_to_demo",
                            "label": "Move to Demo",
                            "target": "demo",
                            "variant": "primary"
                        },
                        {
                            "key": "decline",
                            "label": "Decline Application",
                            "target": "declined",
                            "variant": "danger"
                        }
                    ],
                    "components": [
                        "compliance"
                    ]
                },
                {
                    "ui": {
                        "showEvaluation": true
                    },
                    "key": "demo",
                    "type": "evaluation",
                    "color": "indigo",
                    "label": "Demo",
                    "actions": [
                        {
                            "key": "approve",
                            "label": "Mark as Approved",
                            "target": "approved",
                            "variant": "primary"
                        },
                        {
                            "key": "decline",
                            "label": "Decline Application",
                            "target": "declined",
                            "variant": "danger"
                        }
                    ],
                    "components": [
                        "evaluation"
                    ]
                },
                {
                    "key": "approved",
                    "type": "final",
                    "color": "green",
                    "label": "Approved",
                    "actions": [
                        {
                            "key": "reopen",
                            "label": "Reopen Application",
                            "target": "previous",
                            "variant": "secondary"
                        }
                    ]
                },
                {
                    "key": "declined",
                    "type": "final",
                    "color": "red",
                    "label": "Declined",
                    "actions": [
                        {
                            "key": "reopen",
                            "label": "Reopen Application",
                            "target": "previous",
                            "variant": "secondary"
                        }
                    ]
                },
                {
                    "key": "stage_1777464072202",
                    "type": "review",
                    "color": "teal",
                    "label": "First Interviews",
                    "actions": []
                }
            ]
        },
        "parent_id": null,
        "created_by": null,
        "updated_by": null,
        "created_at": "2026-04-19 18:53:05",
        "updated_at": "2026-04-29 14:01:30"
    }
]

Good — now this is getting concrete. And your instinct to **keep everything inside a single JSON `data` object (like your workflow)** is correct *for your current system constraints*. I’ll align strictly to that.

---

# 1. What Your Workflow Example Confirms

From your structure , we can extract your system pattern:

* One **record per logical unit** (e.g. `grant_workflow`)
* Everything dynamic lives inside:

  ```json
  data: { ... }
  ```
* Nested, schema-driven configuration
* UI is rendered from this JSON

👉 So your form system should follow **the exact same philosophy**:

* No over-normalization
* No external joins for questions
* Everything self-contained

---

# 2. Final Agreed Structure (Aligned to Your System)

You’re right:

> “a question can have children”

So we go **full tree model**, not flat + lookup.

---

## Form Template Record

```json
{
  "type": "form_template",
  "data": {
    "id": "interview_questions_v1",
    "name": "Interview Questions – Enterprise Development Grant Fund",
    "sections": [
      {
        "id": "personal_motivation",
        "title": "Personal Motivation and Vision",
        "questions": []
      }
    ]
  }
}
```

---

## Question Node (Tree-Based)

Here’s your **core unit**:

```json
{
  "id": "has_employees",
  "label": "Do you have employees?",
  "type": "boolean",
  "required": true,

  "children": [
    {
      "id": "employee_count",
      "label": "How many employees do you have?",
      "type": "number",
      "visibleIf": {
        "value": true
      }
    }
  ]
}
```

---

# 3. Key Design Decision (Important)

You said:

> “visibleIf is nested, not looked up”

That’s fine — but understand the tradeoff:

### Your approach:

```json
visibleIf: {
  "value": true
}
```

This assumes:

* Condition is always based on **immediate parent**

👉 That’s clean and fast.

---

### What you are NOT supporting (yet):

* Cross-question dependencies (e.g. Section A affects Section C)
* Complex logic (AND/OR conditions)

👉 That’s OK **for v1**, but it’s a deliberate limitation.

---

# 4. Why Tree Structure Works Well Here

Because your form:

* Is **linear + interview-style**
* Has **localized dependencies** (mostly parent → child)
* Doesn’t require global logic

👉 Tree = simplest + most performant for your case

---

# 5. Submission Model (Aligned to Your JSON Approach)

Now important: you said

> “submissions would be another collection per user”

Correct. But don’t mirror the template fully — store only answers.

---

## Submission Record

```json
{
  "type": "form_submission",
  "company_id": "xyz",
  "data": {
    "form_id": "interview_questions_v1",
    "answers": {
      "has_employees": true,
      "employee_count": 3,
      "monthly_revenue": 14000
    },
    "meta": {
      "date": "2025-04-07",
      "check_in": "Everything is ok"
    }
  }
}
```

---

# 6. Critical Insight (Don’t Miss This)

Even though your **template is nested**, your **answers should NOT be nested**.

### Why?

Because:

### ❌ Nested answers (bad):

```json
{
  "has_employees": {
    "value": true,
    "children": {
      "employee_count": 3
    }
  }
}
```

→ Hard to query
→ Hard to update
→ Pain for analytics

---

### ✅ Flat answers (correct):

```json
{
  "has_employees": true,
  "employee_count": 3
}
```

👉 The template defines structure
👉 The answers are just a **key-value map**

---

# 7. Rendering Logic (Mental Model)

When UI loads:

1. Load template
2. Traverse sections
3. Traverse question tree
4. For each question:

   * Check parent answer
   * Apply `visibleIf`
   * Render or skip

👉 No database joins
👉 No recomputation needed

---

# 8. Handling Your Real Questionnaire (Important Adjustment)

Your questionnaire has:

### A. Pure questions → fine

### B. Mixed fields like:

* “Yes / No / N/A”
* “Yes + explanation”

👉 These should NOT all be `boolean`

Use:

```json
type: "select",
options: ["Yes", "No", "N/A"]
```

---

# 9. Comments System (Keep It Separate)

Don’t mix comments into answers.

```json
{
  "comments": [
    {
      "text": "Strong entrepreneur",
      "sectionId": "personal_motivation"
    }
  ]
}
```

---

# 10. What You’ve Designed (Reality Check)

What you now have is:

### ✔ Schema-driven dynamic form engine

### ✔ Tree-based conditional logic

### ✔ JSON-native storage (fits your system)

### ✔ Decoupled answers for analytics

That’s actually a **production-grade architecture**, not just a quick form.

---

# 11. One Warning (Future You Will Care)

Right now you said:

> “this template is only used in this area”

That’s fine.

But the moment you want:

* scoring
* analytics across applicants
* auto-evaluation

👉 You will need:

* consistent question IDs
* stable schema versions

So:
**DO NOT generate random IDs per render**
Keep them stable.

---

# 12. Next Step

Now we’re ready for the next layer.

When you’re ready, we can define:

### → How this connects to your:

* `evaluation` component
* scoring system
* grant decision logic

Or

### → How to structure the JSON for THIS exact questionnaire (fully mapped)

Just tell me:

> “Map this questionnaire into the final JSON template”

and I’ll build it cleanly.
