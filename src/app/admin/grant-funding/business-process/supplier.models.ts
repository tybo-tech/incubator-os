export interface Supplier {
  id: string;
  name: string;
  cipc_registration?: string;
  vat_number?: string;
  contact_details: {
    phone?: string;
    email?: string;
    address?: string;
    verified?: boolean;
  };
  cipc_verified?: boolean;
  vat_verified?: boolean;
  approved?: boolean;
  created_date: string;
  updated_date: string;
}

export interface SupplierCollection {
  suppliers: Supplier[];
}

export const DEFAULT_SUPPLIER: Supplier = {
  id: '',
  name: '',
  contact_details: {
    phone: '',
    email: '',
    address: '',
    verified: false
  },
  created_date: new Date().toISOString(),
  updated_date: new Date().toISOString()
};

export const DEFAULT_SUPPLIER_COLLECTION: SupplierCollection = {
  suppliers: []
};