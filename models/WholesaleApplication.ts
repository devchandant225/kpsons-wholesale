import mongoose, { Schema, Document, Model } from 'mongoose';
import { IWholesaleApplication } from '@/types';

export interface WholesaleApplicationDocument extends Omit<IWholesaleApplication, '_id'>, Document {}

const DocumentMetaSchema = new Schema(
  {
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WholesaleApplicationSchema = new Schema<WholesaleApplicationDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    dba: {
      type: String,
      trim: true,
      default: '',
    },
    businessPhone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      line1: { type: String, required: true },
      line2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'US' },
    },
    billing: {
      sameAsBusiness: { type: Boolean, default: true },
      name: { type: String, default: '' },
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'US' },
    },
    documents: {
      tobaccoLicense: { type: DocumentMetaSchema, default: null },
      salesTaxLicense: { type: DocumentMetaSchema, default: null },
      feinForm: { type: DocumentMetaSchema, default: null },
      hempLicense: { type: DocumentMetaSchema, default: null },
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO'],
      default: 'PENDING',
      index: true,
    },
    shopifyCustomerId: {
      type: String,
      default: null,
    },
    assignedSalesRep: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compiling model in Next.js hot reload
export const WholesaleApplication: Model<WholesaleApplicationDocument> =
  mongoose.models.WholesaleApplication ||
  mongoose.model<WholesaleApplicationDocument>('WholesaleApplication', WholesaleApplicationSchema);
