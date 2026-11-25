# KP & Sons Wholesale — Custom Auth & Verification App

A full-stack Next.js application that provides wholesale retailer registration, license/tax document verification, staff review dashboard, session authentication, and automated customer synchronization with **Shopify Admin** (`ujwt36-mq.myshopify.com`).

Designed to run on your **VPS** with **MongoDB Atlas** for database storage and the local VPS filesystem for document uploads.

---

## Architecture & Features

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│   Shopify Storefront Theme     │         │      Next.js VPS Server        │
│  (kpsonswholesale.com)         │         │  (auth.kpsonswholesale.com)    │
│                                │         │                                │
│  - /pages/wholesale-register   │───────> │  - POST /api/register          │
│  - /pages/wholesale-account    │───────> │  - POST /api/login             │
│  - wholesale-site-gate.liquid  │───────> │  - GET  /api/session           │
└────────────────────────────────┘         │                                │
                                           │  - /admin (Staff Dashboard)    │
                                           └──────┬──────────────────┬──────┘
                                                  │                  │
                                           MongoDB Atlas      VPS Disk (/uploads)
                                           (Applications)    (PDFs & Licenses)
```

1. **Storefront Compatibility**:
   - `GET /api/csrf`: Generates token before form submission.
   - `POST /api/register`: Receives multi-part form data with business info and license files (Tobacco License, Sales Tax, FEIN Form). Saves files to VPS storage and metadata to MongoDB Atlas.
   - `POST /api/login`: Authenticates approved wholesale buyers and issues JWT session tokens.
   - `GET /api/session`: Used by `snippets/wholesale-site-gate.liquid` to unlock dealer pricing and wholesale pages.
   - `GET /api/account` & `POST /api/logout`: Profile management and session termination.

2. **Admin Review Portal (`/admin`)**:
   - Status counters (Pending Review, Approved, Rejected, Total).
   - Instant search and filtering by state, business name, or email.
   - In-browser document viewer for uploaded PDFs, JPGs, and PNGs.
   - **One-Click Approval**: Automatically creates the customer in Shopify Admin with `wholesale`, `b2b-approved`, and `tax-exempt` tags, and sends an automated welcome email.
   - **Rejection with Reason**: Sends custom clarification/rejection email to the applicant.
   - Sales rep assignment and internal notes.

3. **Secure File Uploads on VPS**:
   - Files are validated (PDF, JPG, PNG, WEBP, max 15MB each).
   - Saved to `storage/uploads` (outside `public/`) or the configured `UPLOAD_DIR` on disk with unique timestamp hashes.
   - Served securely via `/api/admin/applications/documents/[filename]` (accessible only to authenticated staff).

---

## Directory Structure

```
kp-app/
├── app/
│   ├── admin/
│   │   ├── applications/[id]/page.tsx  # Detailed review page with document previews
│   │   ├── login/page.tsx              # Staff login page
│   │   ├── layout.tsx                  # Admin layout & navigation
│   │   └── page.tsx                    # Applications list & statistics dashboard
│   ├── api/
│   │   ├── account/route.ts            # Retailer profile endpoint
│   │   ├── admin/                      # Staff admin endpoints (applications, approve, reject, docs)
│   │   ├── csrf/route.ts               # CSRF token generator
│   │   ├── login/route.ts              # Wholesale buyer login
│   │   ├── logout/route.ts             # Wholesale buyer logout
│   │   ├── register/route.ts           # Multipart registration & file upload
│   │   └── session/route.ts            # Site-gate session verification
│   ├── globals.css                     # KP Wholesale styling & Tailwind directives
│   ├── layout.tsx                      # Root layout
│   └── page.tsx                        # API status landing page
├── lib/
│   ├── auth.ts                         # Password hashing, JWT token handling
│   ├── cors.ts                         # Cross-Origin headers for storefront
│   ├── email.ts                        # Nodemailer transactional email delivery
│   ├── file-storage.ts                 # Disk upload storage helper
│   ├── mongodb.ts                      # MongoDB Atlas Mongoose connection cache
│   └── shopify.ts                      # Shopify Admin API client
├── models/
│   ├── AdminUser.ts                    # Staff user schema
│   └── WholesaleApplication.ts         # Wholesale applicant schema
├── public/
│   └── uploads/                        # Uploaded license files on VPS
├── scripts/
│   └── create-admin.js                 # CLI tool to seed staff admin accounts
├── types/
│   └── index.ts                        # TypeScript interfaces
├── .env.example                        # Configuration template
├── ecosystem.config.js                 # PM2 process configuration for VPS
├── nginx.conf.example                  # Nginx reverse proxy configuration
├── package.json                        # Dependencies & scripts
└── tsconfig.json                       # TypeScript configuration
```

---

## Step-by-Step Setup Guide

### 1. MongoDB Atlas Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a database user (e.g., `kp_admin`) with Read/Write privileges.
3. Under **Network Access**, whitelist your VPS IP (or `0.0.0.0/0` with strong password).
4. Click **Connect > Drivers > Node.js** to copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/kp_wholesale?retryWrites=true&w=majority
   ```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in:
- `MONGODB_URI`: Your MongoDB Atlas connection string.
- `JWT_SECRET`: Random 32+ character string.
- `SHOPIFY_STORE_DOMAIN`: `ujwt36-mq.myshopify.com`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`: Private App Admin Access Token (created in Shopify Admin > Settings > Apps > Develop Apps).
- `SMTP_*`: Your email credentials for notifications.

### 3. Install & Seed Initial Staff User
When you are ready to install dependencies:
```bash
npm install
```
Seed the first staff admin user:
```bash
node scripts/create-admin.js admin@kpsonswholesale.com YourPassword123 "KP Staff"
```

### 4. Running Locally
```bash
npm run dev
```
- Open `http://localhost:3000` to verify API status.
- Open `http://localhost:3000/admin` to access the staff review portal.

---

## Deploying to Your VPS (Ubuntu / Debian)

### 1. Upload Project to VPS
Copy the `kp-app` folder to your VPS (e.g. `/var/www/kp-app`):
```bash
scp -r kp-app user@your-vps-ip:/var/www/
```

### 2. Install Node.js & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 3. Build & Start with PM2
```bash
cd /var/www/kp-app
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Configure Nginx & SSL
Copy `nginx.conf.example` to Nginx:
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/auth.kpsonswholesale.com
sudo ln -s /etc/nginx/sites-available/auth.kpsonswholesale.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain a free SSL Certificate with Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d auth.kpsonswholesale.com
```

---

## Linking Your New App to the Shopify Theme

Once deployed to your domain (e.g., `https://auth.kpsonswholesale.com`), update the theme settings to point to your new service:

1. **Wholesale Registration Form** (`templates/page.register.json`):
   Set `"api_base_url": "https://auth.kpsonswholesale.com"`.
2. **Wholesale Account Page** (`templates/page.login.json`):
   Set `"api_base_url": "https://auth.kpsonswholesale.com"`.
3. **Wholesale Site Gate** (`snippets/wholesale-site-gate.liquid`):
   Set `WORKER_BASE` to `"https://auth.kpsonswholesale.com"`.

That's it! All retailer applications, document uploads, and session gates will now run entirely through your own private backend and MongoDB Atlas cluster.
