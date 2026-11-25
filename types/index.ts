export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';

export interface DocumentMeta {
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
}

export interface IWholesaleApplication {
  _id?: string;
  email: string;
  passwordHash: string;
  businessName: string;
  dba?: string;
  businessPhone: string;
  
  // Business Address
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  // Billing Address
  billing: {
    sameAsBusiness: boolean;
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Documents
  documents: {
    tobaccoLicense?: DocumentMeta;
    salesTaxLicense?: DocumentMeta;
    feinForm?: DocumentMeta;
    hempLicense?: DocumentMeta;
  };

  // Status & Review
  status: ApplicationStatus;
  shopifyCustomerId?: string;
  assignedSalesRep?: string;
  adminNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminUser {
  _id?: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'ADMIN' | 'REP';
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}
