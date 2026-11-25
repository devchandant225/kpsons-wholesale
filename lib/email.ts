import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || '"KP & Sons Wholesale" <info@kpsonswholesale.com>';
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

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
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
  const transporter = getTransporter();
  if (!transporter) {
    console.log('📧 (Email skipped - SMTP not configured) New application from:', application.businessName);
    return;
  }

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

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: `[New Wholesale Application] ${oneLine(application.businessName)} (${oneLine(application.state)})`,
    html,
  });
}

/**
 * Send approval email to customer with link to log in
 */
export async function sendApplicationApprovedEmail(email: string, businessName: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('📧 (Email skipped - SMTP not configured) Account approved for:', email);
    return;
  }

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

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Your Wholesale Account is Approved — KP & Sons Wholesale',
    html,
  });
}

/**
 * Send rejection / clarification email
 */
export async function sendApplicationRejectedEmail(email: string, businessName: string, reason: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('📧 (Email skipped - SMTP not configured) Application rejected for:', email);
    return;
  }

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

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Update on your KP & Sons Wholesale Application',
    html,
  });
}
