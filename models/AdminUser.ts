import mongoose, { Schema, Document, Model } from 'mongoose';
import { IAdminUser } from '@/types';

export interface AdminUserDocument extends Omit<IAdminUser, '_id'>, Document {}

const AdminUserSchema = new Schema<AdminUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'REP'],
      default: 'ADMIN',
    },
  },
  {
    timestamps: true,
  }
);

export const AdminUser: Model<AdminUserDocument> =
  mongoose.models.AdminUser || mongoose.model<AdminUserDocument>('AdminUser', AdminUserSchema);
