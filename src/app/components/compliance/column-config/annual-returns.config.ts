import { ComplianceColumnConfig } from '../compliance-base.component';

 function generateAnnualReturnConfig(): ComplianceColumnConfig[] {
  return [
    {
      key: 'period',
      label: 'Year Ending',
      type: 'text',
      required: true,
      placeholder: 'e.g., FY2024',
    },
    { key: 'date_1', label: 'Anniversary Date', type: 'date', required: true },
    { key: 'date_2', label: 'Due Date', type: 'date', required: true },
    { key: 'date_3', label: 'Filing Date', type: 'date' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'Pending', label: 'Pending', color: 'text-yellow-600' },
        { value: 'In Progress', label: 'In Progress', color: 'text-blue-600' },
        { value: 'Filed', label: 'Filed', color: 'text-green-600' },
        { value: 'Overdue', label: 'Overdue', color: 'text-red-600' },
        {
          value: 'Not Required',
          label: 'Not Required',
          color: 'text-gray-600',
        },
      ],
    },
    {
      key: 'amount_1',
      label: 'Fee Paid',
      type: 'currency',
      step: 0.01,
      placeholder: '0.00',
    },
    {
      key: 'notes',
      label: 'Notes',
      type: 'textarea',
      rows: 3,
      placeholder: 'Additional notes about this annual return...',
    },
  ];
}


export function annualReturnConfig(){
  return {
    config: generateAnnualReturnConfig(),
    description: 'Track CIPC annual return filing status and due dates. Companies must file within 30 business days of their anniversary month.',

  }
}
