# Admin Grouping Feature

A complete Angular 16+ standalone component system for managing hierarchical Client → Program → Cohort relationships with company attachments.

## 🚀 Quick Start

Navigate to `/admin/grouping` in your app to access the full admin interface, or visit `/admin/grouping/demo` for an interactive demo.

## 📁 File Structure

```
src/app/admin/grouping/
├── types.ts                           # Shared TypeScript interfaces
├── grouping-state.service.ts          # Global state management
├── top-bar-context.component.ts       # Context breadcrumb & pickers
├── clients-page.component.ts          # Client management page
├── programs-page.component.ts         # Program management page  
├── cohorts-page.component.ts          # Cohort management page
├── cohort-detail-page.component.ts    # Cohort details & company management
├── companies-view.component.ts        # Company listing (filtered by context)
├── grouping-demo.component.ts         # Demo page showing companies view
├── grouping.routes.ts                 # Feature routing configuration
└── index.ts                           # Feature exports
```

## 🧭 Navigation Flow

1. **Clients Page** (`/admin/grouping/clients`)
   - Lists all clients (categories with type='client')
   - Create new clients
   - Click client → navigate to programs

2. **Programs Page** (`/admin/grouping/clients/:clientId/programs`)
   - Lists programs under selected client
   - Shows cohort count for each program
   - Create new programs
   - Click program → navigate to cohorts

3. **Cohorts Page** (`/admin/grouping/programs/:programId/cohorts`)
   - Lists cohorts under selected program
   - Shows company count for each cohort
   - Create new cohorts
   - Click cohort → navigate to detail

4. **Cohort Detail** (`/admin/grouping/cohorts/:cohortId`)
   - Shows companies attached to cohort
   - Attach/detach companies
   - Full CRUD for company-cohort relationships

## 🔧 API Mapping

Each page calls specific CategoryService methods:

### Clients Page
- `listCategories({ type: 'client', depth: 1 })` - Load all clients
- `ensureClient(name, description?, imageUrl?)` - Create client

### Programs Page  
- `getCategoryById(clientId)` - Load client info
- `listProgramsForClient(clientId)` - Load programs
- `listCohortsForProgram(programId)` - Load cohort counts
- `ensureProgram(clientId, name, description?, imageUrl?)` - Create program

### Cohorts Page
- `getCategoryById(programId)` - Load program info  
- `listCohortsForProgram(programId)` - Load cohorts
- `listCompaniesInCohort(cohortId)` - Load company counts
- `ensureCohort(programId, name, description?, imageUrl?)` - Create cohort

### Cohort Detail
- `getCategoryById(cohortId)` - Load cohort info
- `listCompaniesInCohort(cohortId)` - Load attached companies
- `attachCompany(cohortId, companyId)` - Attach company
- `detachCompany(cohortId, companyId)` - Detach company

### Companies View
- `listCompaniesInCohort(cohortId)` - If cohort selected
- `listCompaniesInProgram(programId)` - If program selected  
- `listCompaniesUnderClient(clientId)` - If client selected

## 🎯 State Management

The `GroupingStateService` maintains the current selection:

```typescript
interface GroupingContext {
  clientId: number | null;
  programId: number | null;  
  cohortId: number | null;
}
```

**Features:**
- Persisted in localStorage
- Synced with URL query params
- Auto-clears child selections when parent changes
- Reactive updates across all components

## 🎨 UI Components

All components use **Tailwind CSS** with a clean, professional design:

- **Cards**: `rounded-2xl shadow-sm` with hover effects
- **Buttons**: Primary/secondary variants with proper focus states
- **Tables**: Responsive with proper spacing and typography
- **Modals**: Simple overlay-based with backdrop click to close
- **Loading**: Skeleton loaders and spinners
- **Empty States**: Friendly messages with call-to-action buttons

## ✅ Testing Checklist

- [x] Create Client → Program → Cohort hierarchy
- [x] Stats update after creation (cohort counts, company counts)  
- [x] Context switching updates breadcrumb and pickers
- [x] Attach/detach company functionality
- [x] Deep links work (visiting `/admin/grouping/cohorts/:id` restores context)
- [x] localStorage persistence across browser sessions
- [x] Error handling with retry mechanisms
- [x] Loading states and empty states
- [x] Responsive design on mobile/tablet

## 🔗 Integration

The feature is integrated into the main app at `/admin/grouping` and includes:

- Full standalone component architecture
- No external dependencies beyond Angular + Tailwind
- CategoryService integration (no modifications required)
- Proper TypeScript types with `ICategory` interface
- Accessible markup with ARIA labels and semantic HTML

## 📋 TODO / Future Enhancements

- Add bulk company operations (attach multiple companies)
- Implement drag-and-drop for moving companies between cohorts
- Add export functionality (CSV/Excel)
- Enhanced search/filtering within each view
- Company import from external sources
- Advanced permission system for different user roles
