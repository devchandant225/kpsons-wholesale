// Transactional email via Resend (https://resend.com), using its HTTP API.
// EMAIL_FROM must use a domain verified in Resend (Resend > Domains).
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'KP & Sons Wholesale <info@kpsonswholesale.com>';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || '';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@kpsonswholesale.com';

/** Escape user-supplied text before putting it in email HTML. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Strip CR/LF so user text can't break the email subject header. */
function oneLine(value: unknown): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').slice(0, 150);
}

/**
 * Sends one email through Resend. Returns false (and logs) when RESEND_API_KEY
 * isn't set, so the app keeps working without email. Throws if Resend rejects it.
 */
async function sendEmail(message: { to: string | string[]; subject: string; html: string }, label: string) {
  if (!RESEND_API_KEY) {
    console.log(`📧 (Email skipped - RESEND_API_KEY not configured) ${label}`);
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.html,
      ...(EMAIL_REPLY_TO ? { reply_to: EMAIL_REPLY_TO } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 500)}`);
  }
  return true;
}

/**
 * Send internal notification email to KP Wholesale staff about new application
 */
export async function sendAdminNewApplicationNotification(application: {
  businessName: string;
  email: string;
  state: string;
  phone: string;
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6; color: #16130f;">
      <h2 style="color: #123f28;">New Wholesale Application Received</h2>
      <p>A new retail business has submitted their documents for wholesale account review:</p>
      <ul>
        <li><strong>Business Name:</strong> ${esc(application.businessName)}</li>
        <li><strong>Email:</strong> ${esc(application.email)}</li>
        <li><strong>State:</strong> ${esc(application.state)}</li>
        <li><strong>Phone:</strong> ${esc(application.phone || 'Not provided')}</li>
      </ul>
      <p style="margin-top: 24px;">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/admin" 
           style="background-color: #123f28; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Open Admin Review Dashboard &rarr;
        </a>
      </p>
    </div>
  `;

  await sendEmail(
    {
      // Comma-separated list allowed, e.g. "info@...,sales@..."
      to: ADMIN_NOTIFICATION_EMAIL.split(',').map((e) => e.trim()).filter(Boolean),
      subject: `[New Wholesale Application] ${oneLine(application.businessName)} (${oneLine(application.state)})`,
      html,
    },
    `New application from ${application.businessName}`
  );
}

/**
 * Send approval email to customer with link to log in
 */
export async function sendApplicationApprovedEmail(email: string, businessName: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6; color: #16130f;">
      <h2 style="color: #123f28;">Your KP & Sons Wholesale Account is Approved!</h2>
      <p>Hello ${esc(businessName)},</p>
      <p>Congratulations! Your wholesale credentials and licenses have been verified and your account is now active.</p>
      <p>You can now log in to view dealer pricing on all 6,000+ products and place purchase orders:</p>
      <p style="margin: 28px 0;">
        <a href="https://kpsonswholesale.com/pages/wholesale-account" 
           style="background-color: #123f28; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Log In to KP & Sons Wholesale &rarr;
        </a>
      </p>
      <p>If you have questions or need assistance with your first order, contact our sales desk at <strong>+1 (267) 902-1290</strong> or reply to this email.</p>
      <p>Best regards,<br/><strong>KP & Sons Wholesale Team</strong><br/>1513 N Broad St, Lansdale, PA 19446</p>
    </div>
  `;

  await sendEmail(
    {
      to: email,
      subject: 'Your Wholesale Account is Approved — KP & Sons Wholesale',
      html,
    },
    `Account approved for ${email}`
  );
}

/**
 * Send rejection / clarification email
 */
export async function sendApplicationRejectedEmail(email: string, businessName: string, reason: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6; color: #16130f;">
      <h2 style="color: #123f28;">Update regarding your Wholesale Application</h2>
      <p>Hello ${esc(businessName)},</p>
      <p>Thank you for your interest in partnering with KP & Sons Wholesale. During the verification of your application, our compliance team encountered an issue:</p>
      <div style="background-color: #f8fafc; border-left: 4px solid #dc2626; padding: 14px; margin: 20px 0;">
        ${esc(reason || 'Additional documentation or valid retail licensing is required.')}
      </div>
      <p>Please reply to this email with updated or clarifying documents so we can proceed with activating your wholesale account.</p>
      <p>Sincerely,<br/><strong>KP & Sons Wholesale Verification Team</strong></p>
    </div>
  `;

  await sendEmail(
    {
      to: email,
      subject: 'Update on your KP & Sons Wholesale Application',
      html,
    },
    `Application rejected for ${email}`
  );
}
