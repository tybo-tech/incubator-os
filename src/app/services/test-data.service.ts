import { Injectable } from '@angular/core';
import { INode, ICollection, IGroup, IField } from '../../models/schema';

@Injectable({
  providedIn: 'root'
})
export class TestDataService {

  /**
   * Generate a sample company collection with proper schema
   */
  getCompanyCollection(): INode {
    const groups: IGroup[] = [
      {
        id: 'basic_info',
        name: 'Basic Information',
        description: 'Core company details',
        order: 1
      },
      {
        id: 'contact_details',
        name: 'Contact Details',
        description: 'Address and communication information',
        order: 2
      },
      {
        id: 'business_info',
        name: 'Business Information',
        description: 'Registration and business details',
        order: 3
      }
    ];

    const fields: IField[] = [
      // Basic Information Group
      {
        key: 'name',
        label: 'Company Name',
        type: 'text',
        required: true,
        groupId: 'basic_info',
        placeholder: 'Enter company name'
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        groupId: 'basic_info',
        placeholder: 'Brief description of the company'
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        groupId: 'basic_info',
        options: ['Active', 'Inactive', 'Pending', 'Suspended']
      },
      {
        key: 'is_public',
        label: 'Public Company',
        type: 'checkbox',
        required: false,
        groupId: 'basic_info'
      },

      // Contact Details Group
      {
        key: 'address',
        label: 'Address',
        type: 'textarea',
        required: true,
        groupId: 'contact_details',
        placeholder: 'Full business address'
      },
      {
        key: 'phone',
        label: 'Phone Number',
        type: 'text',
        required: false,
        groupId: 'contact_details',
        placeholder: '+1 (555) 123-4567'
      },
      {
        key: 'email',
        label: 'Email',
        type: 'text',
        required: false,
        groupId: 'contact_details',
        placeholder: 'contact@company.com'
      },
      {
        key: 'website',
        label: 'Website',
        type: 'text',
        required: false,
        groupId: 'contact_details',
        placeholder: 'https://www.company.com'
      },

      // Business Information Group
      {
        key: 'registration_number',
        label: 'Registration Number',
        type: 'text',
        required: true,
        groupId: 'business_info',
        placeholder: 'Company registration number'
      },
      {
        key: 'incorporation_date',
        label: 'Incorporation Date',
        type: 'date',
        required: false,
        groupId: 'business_info'
      },
      {
        key: 'employee_count',
        label: 'Employee Count',
        type: 'number',
        required: false,
        groupId: 'business_info'
      },
      {
        key: 'annual_revenue',
        label: 'Annual Revenue',
        type: 'number',
        required: false,
        groupId: 'business_info'
      },
      {
        key: 'industry',
        label: 'Industry',
        type: 'select',
        required: false,
        groupId: 'business_info',
        options: ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Other']
      }
    ];

    const collectionData: ICollection = {
      type: 'collection',
      name: 'Companies',
      targetType: 'company',
      groups,
      fields
    };

    return {
      id: 1,
      type: 'collection',
      data: collectionData,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Generate sample company data that matches the schema
   */
  getCompanyData(): INode[] {
    return [
      {
        id: 101,
        type: 'company',
        data: {
          name: 'TechCorp Solutions',
          description: 'Leading provider of enterprise software solutions specializing in cloud infrastructure and data analytics.',
          status: 'Active',
          is_public: true,
          address: '123 Silicon Valley Blvd, San Francisco, CA 94105',
          phone: '+1 (555) 123-4567',
          email: 'contact@techcorp.com',
          website: 'https://www.techcorp.com',
          registration_number: 'TC-2019-001234',
          incorporation_date: '2019-03-15',
          employee_count: 450,
          annual_revenue: 85000000,
          industry: 'Technology'
        },
        created_at: '2023-01-15T10:30:00Z'
      },
      {
        id: 102,
        type: 'company',
        data: {
          name: 'Global Finance Partners',
          description: 'Investment banking and financial advisory services for mid-market companies.',
          status: 'Active',
          is_public: false,
          address: '456 Wall Street, New York, NY 10005',
          phone: '+1 (212) 555-9876',
          email: 'info@globalfinance.com',
          website: 'https://www.globalfinance.com',
          registration_number: 'GF-2020-005678',
          incorporation_date: '2020-07-22',
          employee_count: 125,
          annual_revenue: 32000000,
          industry: 'Finance'
        },
        created_at: '2023-02-20T14:45:00Z'
      },
      {
        id: 103,
        type: 'company',
        data: {
          name: 'HealthTech Innovations',
          description: 'Medical device manufacturer focused on surgical robotics and AI-powered diagnostics.',
          status: 'Active',
          is_public: true,
          address: '789 Medical Center Dr, Boston, MA 02115',
          phone: '+1 (617) 555-2468',
          email: 'contact@healthtech.com',
          website: 'https://www.healthtech.com',
          registration_number: 'HT-2018-009012',
          incorporation_date: '2018-11-08',
          employee_count: 275,
          annual_revenue: 58000000,
          industry: 'Healthcare'
        },
        created_at: '2023-03-10T09:15:00Z'
      },
      {
        id: 104,
        type: 'company',
        data: {
          name: 'Local Manufacturing Co',
          description: 'Small-scale precision manufacturing for automotive and aerospace components.',
          status: 'Pending',
          is_public: false,
          address: '321 Industrial Park Rd, Detroit, MI 48201',
          phone: '+1 (313) 555-1357',
          email: 'orders@localmanufacturing.com',
          website: null,
          registration_number: 'LM-2023-003456',
          incorporation_date: '2023-01-30',
          employee_count: 45,
          annual_revenue: 8500000,
          industry: 'Manufacturing'
        },
        created_at: '2023-04-05T16:20:00Z'
      },
      {
        id: 105,
        type: 'company',
        data: {
          name: 'QuickMart Retail Chain',
          description: 'Regional convenience store chain with 150+ locations across the Midwest.',
          status: 'Inactive',
          is_public: false,
          address: '654 Commerce Ave, Chicago, IL 60601',
          phone: '+1 (312) 555-7890',
          email: 'corporate@quickmart.com',
          website: 'https://www.quickmart.com',
          registration_number: 'QM-2015-007890',
          incorporation_date: '2015-06-12',
          employee_count: 850,
          annual_revenue: 125000000,
          industry: 'Retail'
        },
        created_at: '2023-01-08T11:30:00Z'
      }
    ];
  }

  /**
   * Generate sample view data for the company collection
   */
  getCompanyViews(): INode[] {
    return [
      {
        id: 201,
        type: 'view',
        data: {
          type: 'view',
          name: 'Public Companies Only',
          collectionType: 'company',
          fields: ['name', 'status', 'is_public', 'employee_count', 'annual_revenue', 'industry'],
          filters: [
            { key: 'is_public', operator: '=', value: true }
          ],
          sort: { key: 'annual_revenue', order: 'desc' }
        },
        created_at: '2023-01-20T10:00:00Z'
      },
      {
        id: 202,
        type: 'view',
        data: {
          type: 'view',
          name: 'Active Companies',
          collectionType: 'company',
          fields: ['name', 'status', 'industry', 'employee_count', 'phone', 'email'],
          filters: [
            { key: 'status', operator: '=', value: 'Active' }
          ],
          sort: { key: 'name', order: 'asc' }
        },
        created_at: '2023-01-25T15:30:00Z'
      },
      {
        id: 203,
        type: 'view',
        data: {
          type: 'view',
          name: 'Large Enterprises',
          collectionType: 'company',
          fields: ['name', 'employee_count', 'annual_revenue', 'industry', 'is_public'],
          filters: [
            { key: 'employee_count', operator: '>', value: 200 }
          ],
          sort: { key: 'employee_count', order: 'desc' }
        },
        created_at: '2023-02-01T12:15:00Z'
      }
    ];
  }

  /**
   * Generate a director collection with proper schema
   */
  getDirectorCollection(): INode {
    const groups: IGroup[] = [
      {
        id: 'personal_info',
        name: 'Personal Information',
        description: 'Director personal details',
        order: 1
      },
      {
        id: 'professional_info',
        name: 'Professional Information',
        description: 'Role and qualifications',
        order: 2
      }
    ];

    const fields: IField[] = [
      {
        key: 'first_name',
        label: 'First Name',
        type: 'text',
        required: true,
        groupId: 'personal_info'
      },
      {
        key: 'last_name',
        label: 'Last Name',
        type: 'text',
        required: true,
        groupId: 'personal_info'
      },
      {
        key: 'date_of_birth',
        label: 'Date of Birth',
        type: 'date',
        required: false,
        groupId: 'personal_info'
      },
      {
        key: 'position',
        label: 'Position',
        type: 'select',
        required: true,
        groupId: 'professional_info',
        options: ['CEO', 'CFO', 'COO', 'CTO', 'Director', 'Chairman']
      },
      {
        key: 'start_date',
        label: 'Start Date',
        type: 'date',
        required: true,
        groupId: 'professional_info'
      },
      {
        key: 'is_active',
        label: 'Active',
        type: 'checkbox',
        required: false,
        groupId: 'professional_info'
      }
    ];

    const collectionData: ICollection = {
      type: 'collection',
      name: 'Directors',
      targetType: 'director',
      groups,
      fields
    };

    return {
      id: 2,
      type: 'collection',
      data: collectionData,
      created_at: new Date().toISOString()
    };
  }
}
