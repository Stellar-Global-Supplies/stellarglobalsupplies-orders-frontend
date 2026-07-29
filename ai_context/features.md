# Features

## Core Features

### Order Management
**What it does:** Create, track, and manage customer orders through a four-stage lifecycle (Order Received → Processing → Ready to Dispatch → Delivered).
**Powered by:** Supabase PostgreSQL with Row Level Security, React frontend with real-time subscriptions.
**Why it's notable:** Multi-product orders with order_items table enables complex B2B orders while maintaining backward compatibility with the main orders table.

### Public Order Tracking
**What it does:** Customers can track their orders using a unique URL without authentication.
**Powered by:** UUID-based tracking tokens, API Gateway GET /track/{token} endpoint, Lambda function with public access.
**Why it's notable:** No auth required for customers, but secure token-based access prevents unauthorized lookups.

### Email Notifications
**What it does:** Automated email notifications at each order status change with HTML templates.
**Powered by:** Gmail API with OAuth2, custom MIME message builder, Supabase Realtime triggers.
**Why it's notable:** Uses Gmail API instead of SES to avoid deliverability issues, with proper MIME encoding for international characters.

### WhatsApp Integration
**What it does:** Send order updates directly to customers via WhatsApp with short tracking links.
**Powered by:** wa.me URL scheme, pre-built message templates in whatsapp.js utility.
**Why it's notable:** Shortened tracking URLs instead of long S3 pre-signed URLs improve WhatsApp message readability and reliability.

### Invoice Management
**What it does:** Upload and store invoices in S3 with 7-day public download links.
**Powered by:** AWS S3 with CORS configuration, CloudFront CDN, invoice_timestamp for expiration tracking.
**Why it's notable:** Invoices are stored in a dedicated public bucket with automatic expiration handling, while still being attached to delivery emails.

### Mobile-Responsive PWA
**What it does:** Full Progressive Web App support with offline capabilities and add-to-home-screen.
**Powered by:** Service worker (sw.js), Web App Manifest, responsive CSS with media queries.
**Why it's notable:** Works on iOS and Android without app store deployment, with hamburger menu navigation.

### Dark/Light Mode
**What it does:** Toggle between themes with persistent preference across sessions.
**Powered by:** CSS Variables, localStorage for persistence, React context (useTheme.js).
**Why it's notable:** Custom CSS variable implementation avoids heavy theme libraries while providing smooth transitions.

---

## Recently Shipped
- **[October 2024]**: v2.0 UI redesign with split-panel login, animated timeline, and premium sidebar
- **[October 2024]**: Multi-product order support with order_items table
- **[September 2024]**: Invoice expiration handling (7-day window)
- **[August 2024]**: WhatsApp message URL shortening

## In Progress / Coming Soon
- NONE

## Developer Experience Features
- GitHub Actions CI/CD with automated Terraform deployments
- Terraform-based infrastructure as code
- Supabase migrations for database schema versioning
- React Hot Toast for user feedback
- ESLint/Prettier ready (standard CRA setup)

## Notable Performance Numbers
- Lambda cold start: ~200ms (Node.js 20, 256MB memory)
- API response time: p99 < 500ms
- Frontend bundle size: ~200KB gzipped
- Invoice download: Direct S3 access with CloudFront caching

---