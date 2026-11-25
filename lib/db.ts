import { Prisma, PrismaClient, WholesaleApplication } from '@prisma/client';
import { DocumentMeta, IWholesaleApplication, ApplicationDocuments } from '@/types';

/**
 * One Prisma client per process (reused across hot reloads in development).
 * Connection string comes from DATABASE_URL.
 */
declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.prismaClient || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prismaClient = prisma;
}

/** True when a Prisma error is a unique-constraint violation (e.g. duplicate email). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** True when a Prisma update/delete targeted a row that doesn't exist. */
export function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export const EMPTY_DOCUMENTS: ApplicationDocuments = {
  tobaccoLicense: null,
  salesTaxLicense: null,
  feinForm: null,
  hempLicense: null,
};

/** Reads the documents JSON column into a typed object. */
export function readDocuments(value: Prisma.JsonValue): ApplicationDocuments {
  const docs = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const pick = (key: keyof ApplicationDocuments) => (docs[key] as DocumentMeta | null | undefined) || null;
  return {
    tobaccoLicense: pick('tobaccoLicense'),
    salesTaxLicense: pick('salesTaxLicense'),
    feinForm: pick('feinForm'),
    hempLicense: pick('hempLicense'),
  };
}

/**
 * Turns a database row into the shape the API and admin pages use
 * (nested address / billing objects, never the password hash).
 */
export function serializeApplication(row: WholesaleApplication): IWholesaleApplication {
  return {
    id: row.id,
    email: row.email,
    businessName: row.businessName,
    dba: row.dba,
    businessPhone: row.businessPhone,
    address: {
      line1: row.addressLine1,
      line2: row.addressLine2,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      country: row.country,
    },
    billing: {
      sameAsBusiness: row.billingSameAsBusiness,
      name: row.billingName,
      line1: row.billingLine1,
      line2: row.billingLine2,
      city: row.billingCity,
      state: row.billingState,
      postalCode: row.billingPostalCode,
      country: row.billingCountry,
    },
    documents: readDocuments(row.documents),
    status: row.status,
    shopifyCustomerId: row.shopifyCustomerId || undefined,
    assignedSalesRep: row.assignedSalesRep,
    adminNotes: row.adminNotes,
    rejectionReason: row.rejectionReason,
    reviewedBy: row.reviewedBy || undefined,
    reviewedAt: row.reviewedAt || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
