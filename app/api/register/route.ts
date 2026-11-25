import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma, isUniqueViolation, readDocuments, EMPTY_DOCUMENTS } from '@/lib/db';
import { hashPassword, verifyCsrfToken } from '@/lib/auth';
import { saveUploadedFile, deleteStoredFiles } from '@/lib/file-storage';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { sendAdminNewApplicationNotification } from '@/lib/email';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { ApplicationDocuments, DocumentMeta } from '@/types';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

const field = (formData: FormData, name: string, max = 200) => {
  const v = formData.get(name);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
};

const fileField = (formData: FormData, name: string): File | null => {
  const v = formData.get(name);
  return v && typeof v === 'object' && 'arrayBuffer' in v && (v as File).size > 0 ? (v as File) : null;
};

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (!rateLimit(`register:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return jsonResponse(
      { ok: false, errors: ['Too many applications from this connection. Please try again later or call us.'] },
      429,
      origin
    );
  }

  let saved: DocumentMeta[] = [];

  try {
    const formData = await request.formData();

    // 1. CSRF token (the theme form always fetches one from /api/csrf first)
    const csrfToken = field(formData, 'csrf_token', 2000);
    if (!csrfToken || !verifyCsrfToken(csrfToken)) {
      return jsonResponse({ ok: false, errors: ['Session expired. Please refresh the page.'] }, 403, origin);
    }

    // 2. Extract fields
    const email = field(formData, 'email').toLowerCase();
    const password = (formData.get('password') as string) || '';
    const confirmPassword = (formData.get('confirm_password') as string) || '';

    const businessName = field(formData, 'business_name');
    const dba = field(formData, 'dba');
    const addressLine1 = field(formData, 'address_line1');
    const addressLine2 = field(formData, 'address_line2');
    const city = field(formData, 'address_city');
    const state = field(formData, 'address_state');
    const postalCode = field(formData, 'address_postal_code', 20);
    const country = field(formData, 'address_country') || 'US';
    const businessPhone = field(formData, 'business_phone', 40);

    const billingSameRaw = formData.get('billing_same_as_business');
    const billingSame = billingSameRaw === '1' || billingSameRaw === 'true' || billingSameRaw === 'on';
    const billingName = field(formData, 'billing_name');
    const billingLine1 = field(formData, 'billing_address_line1');
    const billingLine2 = field(formData, 'billing_address_line2');
    const billingCity = field(formData, 'billing_city');
    const billingState = field(formData, 'billing_state');
    const billingPostal = field(formData, 'billing_postal_code', 20);
    const billingCountry = field(formData, 'billing_country') || 'US';

    const tobaccoFile = fileField(formData, 'tobacco_license');
    const salesTaxFile = fileField(formData, 'sales_tax_license');
    const feinFile = fileField(formData, 'fein_form');
    const hempFile = fileField(formData, 'hemp_license');

    const errors: string[] = [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('A valid business email address is required.');
    }
    if (password.length < 8 || password.length > 128) {
      errors.push('Password must be between 8 and 128 characters long.');
    }
    if (password !== confirmPassword) {
      errors.push('Password and confirmation do not match.');
    }
    if (!businessName) {
      errors.push('Business legal name is required.');
    }
    if (!addressLine1 || !city || !state || !postalCode) {
      errors.push('Complete business street address, city, state, and ZIP are required.');
    }
    if (!billingSame && (!billingLine1 || !billingCity || !billingState || !billingPostal)) {
      errors.push('Complete billing street address, city, state, and ZIP are required.');
    }
    if (!tobaccoFile) errors.push('Please upload your tobacco license.');
    if (!salesTaxFile) errors.push('Please upload your sales tax / resale certificate.');
    if (!feinFile) errors.push('Please upload your FEIN / EIN assignment letter.');

    if (errors.length > 0) {
      return jsonResponse({ ok: false, errors }, 400, origin);
    }

    // 3. Existing application with this email? Rejected applicants may re-apply.
    const existing = await prisma.wholesaleApplication.findUnique({
      where: { email },
      select: { id: true, status: true, documents: true },
    });
    if (existing && existing.status !== 'REJECTED') {
      const msg =
        existing.status === 'APPROVED'
          ? 'An approved wholesale account already exists for this email. Please log in.'
          : 'An application with this email is already on file and under review.';
      return jsonResponse({ ok: false, errors: [msg] }, 409, origin);
    }

    // 4. Validate & store documents
    // List every slot so a re-application doesn't keep an old document.
    const documents: ApplicationDocuments = { ...EMPTY_DOCUMENTS };
    try {
      const uploads: [keyof ApplicationDocuments, File | null, string][] = [
        ['tobaccoLicense', tobaccoFile, 'tobacco'],
        ['salesTaxLicense', salesTaxFile, 'salestax'],
        ['feinForm', feinFile, 'fein'],
        ['hempLicense', hempFile, 'hemp'],
      ];
      for (const [key, file, prefix] of uploads) {
        if (!file) continue;
        const meta = await saveUploadedFile(file, prefix);
        documents[key] = meta;
        saved.push(meta);
      }
    } catch (uploadError: any) {
      await deleteStoredFiles(saved);
      return jsonResponse({ ok: false, errors: [uploadError.message || 'File upload failed'] }, 400, origin);
    }

    // 5. Save application
    const passwordHash = await hashPassword(password);
    const data = {
      email,
      passwordHash,
      businessName,
      dba,
      businessPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      billingSameAsBusiness: billingSame,
      billingName: billingSame ? businessName : billingName,
      billingLine1: billingSame ? addressLine1 : billingLine1,
      billingLine2: billingSame ? addressLine2 : billingLine2,
      billingCity: billingSame ? city : billingCity,
      billingState: billingSame ? state : billingState,
      billingPostalCode: billingSame ? postalCode : billingPostal,
      billingCountry: billingSame ? country : billingCountry,
      documents: documents as unknown as Prisma.InputJsonObject,
      status: 'PENDING' as const,
      rejectionReason: '',
      reviewedBy: null,
      reviewedAt: null,
    };

    if (existing) {
      // Re-application after rejection: replace the old record and documents.
      const oldDocs = Object.values(readDocuments(existing.documents));
      await prisma.wholesaleApplication.update({ where: { id: existing.id }, data });
      await deleteStoredFiles(oldDocs);
    } else {
      await prisma.wholesaleApplication.create({ data });
    }
    saved = [];

    sendAdminNewApplicationNotification({ businessName, email, state, phone: businessPhone }).catch((err) =>
      console.error('Failed to send admin notification email:', err)
    );

    return jsonResponse(
      {
        ok: true,
        message:
          'Application submitted successfully. We will review your license documents and notify you within 1 business day.',
      },
      201,
      origin
    );
  } catch (error: any) {
    await deleteStoredFiles(saved);
    if (isUniqueViolation(error)) {
      // Two submissions with the same email raced each other.
      return jsonResponse(
        { ok: false, errors: ['An application with this email is already on file and under review.'] },
        409,
        origin
      );
    }
    console.error('Registration processing error:', error);
    return jsonResponse(
      {
        ok: false,
        errors: ['An unexpected error occurred processing your application. Please try again or contact us.'],
      },
      500,
      origin
    );
  }
}
