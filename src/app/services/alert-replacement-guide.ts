// Quick utility to replace alert calls with toast service calls
// This file helps identify patterns for manual replacement

export const ALERT_REPLACEMENTS = [
  {
    file: 'executive-report.component.ts',
    line: 139,
    from: "alert('There was an error generating the PDF.');",
    to: "this.toast.error('There was an error generating the PDF.');"
  },
  {
    file: 'swot-tab.component.ts',
    line: 945,
    from: "alert(message);",
    to: "this.toast.error(message);"
  },
  {
    file: 'gps-targets-tab.component.ts',
    line: 824,
    from: "alert(message);",
    to: "this.toast.error(message);"
  },
  {
    file: 'pdf-export-page.component.ts',
    line: 364,
    from: "alert('There was an error generating the PDF. Please try again.');",
    to: "this.toast.error('There was an error generating the PDF. Please try again.');"
  },
  {
    file: 'financial-checkin-pdf-export-modal.component.ts',
    line: 521,
    from: "alert('Error generating PDF. Please try again.');",
    to: "this.toast.error('Error generating PDF. Please try again.');"
  },
  {
    file: 'financial-checkin-overview.component.ts',
    line: 236,
    from: "alert('Failed to delete the check-in. Please try again.');",
    to: "this.toast.error('Failed to delete the check-in. Please try again.');"
  }
];

// Components need ToastService imported and injected:
export const COMPONENTS_NEEDING_TOAST_SERVICE = [
  'executive-report.component.ts',
  'swot-tab.component.ts',
  'gps-targets-tab.component.ts',
  'pdf-export-page.component.ts',
  'financial-checkin-pdf-export-modal.component.ts',
  'financial-checkin-overview.component.ts'
];
