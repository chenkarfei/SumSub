# KYC Verification Portal

A mobile-first KYC (Know Your Customer) web portal built with Next.js 14+ and Sumsub WebSDK integration. Allows users to submit personal information, upload identity documents, complete liveness checks, and track their verification status.

## Features

- **User Info Collection**: Name, DOB, nationality, email, phone, country of residence
- **Financial Info**: Source of funds and source of wealth (dropdown selections)
- **Sumsub WebSDK Integration**:
  - ID verification (passport, ID card, driver's license)
  - Selfie / liveness check
  - Proof of address upload
  - Bank statement upload
- **Verification Status Tracking**: Real-time status via webhook (GREEN/RED/RETRY)
- **Mobile-First Design**:
  - Optimized for 320px - 428px screen widths
  - 44x44px minimum tap targets
  - 16px minimum font size (prevents iOS zoom)
  - Touch-friendly selects and auto-formatting inputs
  - Loading states for mobile network conditions

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS (mobile-first breakpoints)
- **Database**: SQLite (via better-sqlite3)
- **Language**: TypeScript
- **KYC Provider**: Sumsub WebSDK

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- A Sumsub account with API credentials (https://cockpit.sumsub.com)
- A Sumsub webhook secret for production use
- A Sumsub level configured (default: `basic-kyc-level`)

## Setup Instructions

### 1. Clone and Install

```bash
cd sumsub-kyc-portal
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Sumsub credentials:

```env
# Sumsub API Configuration
SUMSUB_APP_TOKEN=your_app_token_here
SUMSUB_SECRET_KEY=your_secret_key_here
SUMSUB_BASE_URL=https://api.sumsub.com
SUMSUB_WEBHOOK_SECRET=your_webhook_secret_here

# Database
DATABASE_PATH=./data/kyc.db

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to get Sumsub credentials:**
1. Log into [Sumsub Cockpit](https://cockpit.sumsub.com)
2. Go to **Settings** → **API** → **App Tokens**
3. Create a new token or use an existing one
4. Copy the **App Token** and **Secret Key**
5. For webhooks, go to **Settings** → **Webhooks** → **Create Webhook**
   - Set URL to: `https://your-domain.com/api/webhook` (use a tunnel like ngrok for local dev)
   - Copy the webhook secret

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your mobile browser or use Chrome DevTools mobile emulation.

### 4. Build for Production

```bash
npm run build
npm start
```

### 5. Exposing Webhooks for Local Development

Sumsub needs to reach your webhook endpoint. Use ngrok to expose your local server:

```bash
npx ngrok http 3000
```

Then set your Sumsub webhook URL to: `https://your-ngrok-url.ngrok.io/api/webhook`

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── user/route.ts      # GET/PUT user verification status
│   │   │   ├── verify/route.ts    # POST create applicant + access token
│   │   │   └── webhook/route.ts   # POST Sumsub webhook receiver
│   │   ├── globals.css            # Tailwind + mobile-first base styles
│   │   ├── layout.tsx             # Root layout with viewport meta
│   │   └── page.tsx               # Main app (form → verification → status)
│   ├── components/
│   │   ├── UserInfoForm.tsx       # Personal + financial info form
│   │   ├── KycVerification.tsx    # Sumsub WebSDK container
│   │   └── VerificationStatus.tsx # Status display with retry/refresh
│   └── lib/
│       ├── types.ts               # TypeScript interfaces and constants
│       ├── db.ts                  # SQLite database operations
│       └── sumsub.ts              # Sumsub API client (auth, applicants, tokens)
├── .env.local.example
├── .gitignore
├── next.config.js
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## API Endpoints

### `POST /api/verify`
Creates a verification record, creates a Sumsub applicant, generates a WebSDK access token.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "nationality": "MY",
  "email": "john@example.com",
  "phone": "+60123456789",
  "countryOfResidence": "MY",
  "sourceOfFunds": "salary",
  "sourceOfWealth": "employment"
}
```

**Response:**
```json
{
  "record": { "id": "...", "status": "processing", ... },
  "accessToken": "sbx-..."
}
```

### `GET /api/user?userId=john@example.com`
Returns the verification status for a given user.

### `POST /api/webhook`
Receives Sumsub webhooks (applicantReviewed, applicantPending, applicantOnHold). Validates the signature using `SUMSUB_WEBHOOK_SECRET`.

## Verification Flow

1. **User Info Form** → User fills in personal details and financial information
2. **Submit** → Backend creates a Sumsub applicant and generates an access token
3. **WebSDK** → Sumsub's interface loads in the page for document upload
4. **Verification** → User uploads ID, takes selfie, provides proof of address
5. **Webhook** → Sumsub sends review result (GREEN/RED) to our webhook endpoint
6. **Status** → User sees their verification result with option to retry if needed

## Customizing the Verification Level

The default level is `basic-kyc-level`. To change this:

1. Create your level in Sumsub Cockpit (**Applicants** → **Levels and flows**)
2. Update the level name in `src/lib/sumsub.ts`:
   - In `createApplicant()`: change `levelName=basic-kyc-level`
   - In `generateAccessToken()`: change the default `levelName` parameter

## Mobile Design Notes

- **Safe Areas**: CSS handles iPhone notch safe areas via `env(safe-area-inset-*)`
- **Tap Targets**: All interactive elements have `min-h-tap` (44px) class
- **Input Sizes**: All form inputs use `text-input` (16px) to prevent iOS auto-zoom
- **Viewport**: Proper meta tags set in `layout.tsx` with `maximumScale: 1`
- **Form Inputs**: Auto-formatting for phone numbers and dates to reduce typing

## Security Considerations for Production

1. **Authentication**: Stage 1 uses email as the user identifier. In production, implement proper authentication (NextAuth, Clerk, Auth0, etc.)
2. **Rate Limiting**: Add rate limiting to `/api/verify` to prevent abuse
3. **HTTPS**: Always use HTTPS in production
4. **Environment Variables**: Never commit `.env.local` to version control
5. **Webhook Secret**: Always validate webhook signatures in production
6. **Database**: Consider migrating to PostgreSQL/MySQL for production workloads
7. **CORS**: Restrict CORS to your domain only

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Sumsub API errors | Verify `SUMSUB_APP_TOKEN` and `SUMSUB_SECRET_KEY` in `.env.local` |
| WebSDK not loading | Check that the Sumsub CDN script loads (network tab). Ensure access token is valid. |
| Webhook not received | Verify webhook URL is publicly accessible. Check ngrok tunnel is running. |
| Database errors | Delete the `data/` directory and restart to recreate the database. |
| Type errors | Run `npm install` to ensure all dependencies are installed. |

## License

Private - Stage 1 Internal Use

## Next Steps (Stage 2+)

- Proper authentication system
- Admin panel for KYC review
- Email notifications for status changes
- Document storage and audit trail
- AML screening integration (if needed)