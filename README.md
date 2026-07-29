# Stellar Global Supplies - Order Management System

A modern, mobile-responsive web application for managing customer orders with real-time status tracking, email notifications, and WhatsApp integration.

## Features

### Core Functionality
- **Order Management**: Create, track, and manage customer orders through their lifecycle
- **Status Tracking**: Four-stage order flow (Order Received → Processing → Ready to Dispatch → Delivered)
- **Payment Status**: Track payments (Pending/Partial/Paid) with email reminders
- **Delay Orders**: Reschedule delivery dates during processing phase
- **Invoice Upload**: Attach invoices when marking orders as delivered
- **WhatsApp Integration**: Send order updates directly to customers via WhatsApp
- **Email Notifications**: Automated Gmail API-based email notifications at each status change

### Customer Features
- **Public Order Tracking**: Customers can track their orders using a unique URL without authentication
- **Mobile-Optimized Tracking Page**: Clean, responsive tracking page for mobile devices
- **Real-time Status Updates**: Order status updates are reflected immediately on tracking page
- **Invoice Download**: Customers can download invoices directly from the tracking page (valid for 7 days)

### Invoice Management
- **S3 Invoice Storage**: Invoices are stored in a dedicated public S3 bucket
- **Direct Download Links**: Invoices are accessible via public URLs
- **Email Attachment**: Invoices are attached to delivery emails
- **7-Day Availability**: Invoices are available for download for 7 days from upload date
- **After Expiration**: Customers are prompted to contact support for invoice re-download

### User Interface
- **Mobile Responsive**: Optimized for phones, tablets, and desktops with hamburger menu
- **Dark/Light Mode**: Toggle between themes with persistent preference
- **PWA Support**: Add to home screen for app-like experience
- **Real-time Updates**: Live order status updates via Supabase Realtime

### Technical Features
- **Authentication**: Supabase Auth with Google OAuth
- **Serverless Backend**: AWS Lambda + API Gateway
- **Cloud Infrastructure**: S3 + CloudFront for static hosting
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **CI/CD**: GitHub Actions for automated deployment

## Tech Stack

### Frontend
- React 18 with React Router
- Supabase JS Client
- React DatePicker
- React Hot Toast (notifications)
- Date-fns (date formatting)
- Custom CSS with CSS Variables for theming

### Backend
- AWS Lambda (Node.js 20)
- AWS API Gateway (HTTP API)
- Supabase (PostgreSQL + Auth)
- Gmail API (OAuth2 for emails)

### Infrastructure
- Terraform (Infrastructure as Code)
- AWS S3 (static hosting)
- AWS CloudFront (CDN)
- AWS Route53 (DNS)
- AWS CloudWatch (logging)

## Project Structure

```
stellarglobalsupplies-orders/
├── frontend/
│   ├── public/
│   │   ├── index.html          # PWA meta tags, manifest link
│   │   ├── manifest.json       # PWA manifest
│   │   └── sw.js               # Service worker for offline support
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx     # Navigation sidebar with theme toggle
│   │   │   ├── StatusBadge.jsx # Order/payment status badges
│   │   │   └── OrderTimeline.jsx # Visual progress indicator
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx   # Google OAuth login
│   │   │   ├── DashboardPage.jsx # Statistics overview
│   │   │   ├── OrdersPage.jsx  # Order listing with search/filter
│   │   │   ├── NewOrderPage.jsx # Create new order form
│   │   │   ├── OrderDetailPage.jsx # Order details with actions
│   │   │   └── TrackOrderPage.jsx # Public order tracking page
│   │   ├── hooks/
│   │   │   ├── useAuth.js      # Authentication context
│   │   │   └── useTheme.js     # Dark/light mode context
│   │   ├── utils/
│   │   │   ├── api.js          # API client functions
│   │   │   ├── supabase.js     # Supabase client
│   │   │   └── whatsapp.js     # WhatsApp message builder
│   │   ├── styles/
│   │   │   └── globals.css     # Global styles with theme variables
│   │   ├── App.jsx             # Main app with routing
│   │   └── index.js            # Entry point
│   └── package.json
│
├── lambda/
│   ├── create-order/
│   │   ├── index.js            # POST /orders - Create order + send email
│   │   └── emailTemplates.js   # HTML email templates
│   ├── update-order-status/
│   │   └── index.js            # PATCH /orders/{id}/status - Update status
│   ├── send-notification/
│   │   └── index.js            # POST /orders/{id}/notify - Resend email
│   └── get-order-by-token/
│       └── index.js            # GET /track/{token} - Public order lookup
│
├── supabase/
│   └── migrations/
│       ├── 001_create_orders.sql # Database schema
│       ├── 002_add_tracking_token.sql # Add tracking token column
│       └── 003_add_invoice_url.sql # Add invoice URL column
│       └── 004_add_invoice_timestamp.sql # Add invoice timestamp
│
├── terraform/
│   └── main.tf                 # AWS infrastructure definition
│
└── .github/
    └── workflows/
        └── deploy.yml          # CI/CD pipeline
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Terraform 1.5+
- AWS CLI configured
- Supabase account
- Google Cloud account (for Gmail API)
- GitHub repository with secrets configured

### Environment Variables

#### Frontend (.env)
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_BASE_URL=https://your-api-gateway-url.amazonaws.com
REACT_APP_WHATSAPP_NUMBER=919637655556
```

#### Backend (AWS SSM Parameter Store)
```bash
# Gmail OAuth credentials (stored in SSM)
/stellar-oms/gmail/client-id
/stellar-oms/gmail/client-secret
/stellar-oms/gmail/refresh-token
```

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/Prasadpb77/stellarglobalsupplies-orders.git
cd stellarglobalsupplies-orders
```

2. **Install frontend dependencies**
```bash
cd frontend
npm install
```

3. **Install Lambda dependencies**
```bash
cd lambda
npm install
```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL migrations in `supabase/migrations/`
   - Create the `top_skus` and `material_split` views
   - Enable Google OAuth in Supabase Auth settings
   - Copy your Supabase URL and anon key

5. **Set up Gmail API**
   - Create OAuth2 credentials in Google Cloud Console
   - Enable Gmail API
   - Get refresh token using OAuth2 playground
   - Store credentials in AWS SSM Parameter Store

6. **Deploy infrastructure**
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

7. **Start frontend development server**
```bash
cd frontend
npm start
```

## Deployment

### Automated Deployment (GitHub Actions)

The project uses GitHub Actions for CI/CD. Push to `main` branch triggers:

1. **Frontend Deployment**
   - Build React app
   - Upload to S3 bucket
   - Invalidate CloudFront cache

2. **Backend Deployment**
   - Package Lambda functions
   - Deploy via Terraform
   - Update Lambda environment variables

### Manual Deployment

#### Frontend
```bash
cd frontend
npm run build
aws s3 sync build/ s3://stellar-oms-frontend-production
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

#### Backend
```bash
cd terraform
terraform apply
```

## Configuration

### Supabase Views

Create these views in Supabase SQL Editor:

```sql
-- Product types view
CREATE VIEW top_skus AS
SELECT DISTINCT sku FROM orders ORDER BY sku;

-- Materials view
CREATE VIEW material_split AS
SELECT DISTINCT material_type FROM orders ORDER BY material_type;
```

### API Gateway Routes

The application uses these endpoints:

- `POST /orders` - Create new order
- `PATCH /orders/{id}/status` - Update order status
- `PATCH /orders/{id}/delay` - Delay order delivery
- `POST /orders/{id}/deliver` - Mark order as delivered (with invoice upload)
- `POST /orders/{id}/notify` - Send email notification
- `GET /track/{token}` - Public order tracking

## Order Status Flow

```
Order Received → Processing → Ready to Dispatch → Delivered
```

### Status Actions

- **Order Received**: Can advance to "Processing" with payment status update
- **Processing**: Can advance to "Ready to Dispatch" or delay delivery date
- **Ready to Dispatch**: Can mark as "Delivered" with invoice upload and payment status
- **Delivered**: Terminal state - invoice can be downloaded

## Payment Status

- **Pending**: No payment received
- **Partial**: Partial payment received
- **Paid**: Full payment received

Payment reminders are automatically included in:
- Email notifications (if not Paid)
- WhatsApp messages (if not Paid)

## Invoice Expiration

- **7-Day Window**: Invoices are available for download for 7 days from the upload date
- **After Expiration**: The tracking page shows a message to contact support
- **Email**: Invoices are attached to delivery emails regardless of expiration

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Mobile Support

- iOS Safari (Add to Home Screen supported)
- Chrome Mobile (Add to Home Screen supported)
- Responsive design for all screen sizes

## Security

- Row Level Security (RLS) on Supabase
- JWT-based authentication
- CORS configured on API Gateway
- Service role key for Lambda (bypasses RLS)
- OAuth2 for Gmail API
- Sensitive data stored in AWS SSM Parameter Store

## License

Proprietary - Stellar Global Supplies

## Support

For issues or questions, contact: +91 96376 55556