# Coaching & Guide Feature Specification

## 🎯 Overview
The **Coaching & Guide** feature provides a structured space for financial advisors or mentors to coach incubated businesses through actionable topics like product understanding, marketing, and sales performance. It is designed as a dynamic, lightweight module within the incubation system, emphasizing table-based views (ClickUp/Notion style) and mock data during the initial build.

This document outlines the full specification for the **Coaching & Guide Module**, including its architecture, components, data models, and intended workflows.

---

## 🧱 Module Architecture
All components are **standalone Angular components** placed directly inside the `coaching-guide/` folder (flat structure).

### Folder Structure
```
coaching-guide/
│
├── coaching-guide-shell.component.ts
├── products-services.component.ts
├── marketing.component.ts
├── sales.component.ts
└── coaching-notes.component.ts
```

Each component represents a tab view rendered via Angular Router inside the shell.

---

## 🪟 Shell Component — `coaching-guide-shell.component.ts`
**Purpose:** Acts as the parent wrapper for all coaching tabs, providing context, navigation, and a consistent layout.

### Features
- Displays header and tab navigation.
- Maintains query parameters for `clientId`, `programId`, and `cohortId`.
- Handles active tab highlighting.
- Uses `ContextService` to persist navigation context.

### Tabs
| Label | Route | Icon | Description |
|--------|--------|------|-------------|
| Products & Services | `products-services` | `fas fa-boxes` | Define, evaluate, and refine company products/services. |
| Marketing Strategies | `marketing` | `fas fa-bullhorn` | Track marketing actions, campaigns, and outcomes. |
| Sales & Customers | `sales` | `fas fa-handshake` | Capture and review sales performance and lead conversions. |
| Coaching Notes | `coaching-notes` | `fas fa-clipboard-list` | Log mentorship discussions, tasks, and follow-up actions. |

---

## 🧩 Component Specifications

### 1. `ProductsServicesComponent`
**Purpose:** Capture and visualize company products or services with pricing and average sales performance.

#### Data Model
```ts
interface ProductServiceItem {
  id: number;
  name: string;
  type: 'Product' | 'Service';
  unitPrice: number;
  avgMonthlySales: number;
  revenue: number; // auto-calculated
  notes?: string;
}
```

#### Features
- Mock data stored in local array.
- Inline editable table view.
- Auto-calculated revenue (`unitPrice * avgMonthlySales`).
- Add/Delete row support.
- Tailwind-styled responsive UI.

#### Future Enhancements
- Group by category or service line.
- Attach product images or references.
- Monthly performance snapshots.

---

### 2. `MarketingComponent`
**Purpose:** Capture marketing activity and campaign data for performance tracking.

#### Data Model
```ts
interface MarketingActivity {
  id: number;
  campaignName: string;
  channel: string; // e.g., Social Media, Flyers, Radio
  startDate: string;
  endDate: string;
  budget: number;
  leadsGenerated: number;
  conversions: number;
  status: 'Planned' | 'Active' | 'Completed';
  notes?: string;
}
```

#### Features
- Mock data array for campaigns.
- Editable table view with filters (by channel/status).
- Inline status and date updates.
- Visual indicators for campaign progress.

#### Future Enhancements
- Add conversion rate auto-calculation.
- Integrate campaign ROI metrics.
- Monthly action plan summary.

---

### 3. `SalesComponent`
**Purpose:** Track customer interactions and sales conversion details.

#### Data Model
```ts
interface SalesRecord {
  id: number;
  customerName: string;
  productOrService: string;
  contactDate: string;
  outcome: 'Converted' | 'Pending' | 'Not Converted';
  amount: number;
  followUpDate?: string;
  notes?: string;
}
```

#### Features
- Record new sales opportunities.
- Inline editing for outcomes and notes.
- Auto-highlight overdue follow-ups.
- Quick filters by conversion status.

#### Future Enhancements
- Add salesperson attribution.
- Connect with financial data for real revenue reflection.

---

### 4. `CoachingNotesComponent`
**Purpose:** Provide a shared workspace for mentor and mentee to document discussions, action items, and progress.

#### Data Model
```ts
interface CoachingNote {
  id: number;
  sessionDate: string;
  topic: string;
  actionItem: string;
  responsible: string;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  comments?: string;
}
```

#### Features
- Notion-style editable table.
- Inline status updates and due date pickers.
- Mock data persisted in array.
- Color-coded status chips.

#### Future Enhancements
- Mentorship progress charts.
- Integration with task notifications.
- Export to PDF or report.

---

## 🧠 Implementation Flow
1. **Scaffold Components:** Run PowerShell script to generate all components.
2. **Mock Data:** Implement in-memory arrays for each component.
3. **UI Build:** Create Tailwind-based editable tables for each view.
4. **Routing Setup:** Configure nested routes under `coaching-guide-shell`.
5. **Interaction Layer:** Add sorting, filtering, and inline editing.
6. **Testing:** Validate CRUD behavior and UI flow using mock arrays.

---

## 🚀 Roadmap
| Phase | Description | Status |
|--------|-------------|---------|
| 1 | Create shell + mock components | ✅ Done |
| 2 | Implement Products & Services mock UI | 🔄 Next |
| 3 | Implement Marketing mock UI | ⏳ |
| 4 | Implement Sales mock UI | ⏳ |
| 5 | Implement Coaching Notes mock UI | ⏳ |
| 6 | Connect to real backend endpoints | ⏳ Future |

---

## 💡 Vision
This module forms part of the **Incubator OS mentorship toolkit**, giving advisors an interactive, data-driven environment to coach startups effectively. Each tab mimics a Notion-like collaborative interface, progressively evolving into a real-time data capture and reporting engine.

---

**Author:** Ndumiso Mthembu  
**Collaborator:** ChatGPT (GPT-5)  
**Date:** {{ current_date }}

