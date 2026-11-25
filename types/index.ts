export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';

export interface DocumentMeta {
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date | string;
}

export interface ApplicationDocuments {
  tobaccoLicense: DocumentMeta | null;
  salesTaxLicense: DocumentMeta | null;
  feinForm: DocumentMeta | null;
  hempLicense: DocumentMeta | null;
}

/** An application as returned by the API (see serializeApplication in lib/db.ts). */
export interface IWholesaleApplication {
  id: string;
  email: string;
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
  documents: ApplicationDocuments;

  // Status & Review
  status: ApplicationStatus;
  shopifyCustomerId?: string;
  assignedSalesRep?: string;
  adminNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date | string;

  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}
