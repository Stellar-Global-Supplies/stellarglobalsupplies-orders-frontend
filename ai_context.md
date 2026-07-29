# AI Context: stellarglobalsupplies-orders
> **Repo**: Stellar-Global-Supplies/stellarglobalsupplies-orders
> **Generated**: 2026-07-13
> **Source**: ai_context/ folder — do not edit manually

---

## 🏗️ What It Does
Stellar Global Supplies - Order Management System centralizes and automates order management for B2B wholesale businesses, providing real-time status tracking, email notifications, and WhatsApp integration. This solution reduces manual overhead, improves customer communication, and ensures secure invoice management, benefiting operations teams and sales staff at B2B wholesale companies.

## ⚙️ Tech Stack
- **Language**: JavaScript (ES2022) · Node.js 20
- **Frontend**: React 18.2.0 · React Router 6.21.0 · react-datepicker 4.25.0 · react-hot-toast 2.4.1 · lucide-react 0.303.0 · date-fns 3.0.0 · Custom CSS with CSS Variables
- **Backend/API**: AWS Lambda (Node.js 20) · API Gateway HTTP API · REST API
- **Database & Storage**: PostgreSQL 16 (Supabase) · S3-compatible (AWS S3)
- **AI/ML**: NONE
- **Infra & Cloud**: AWS S3 · AWS CloudFront · AWS Route53 · Terraform 1.5+
- **CI/CD & Observability**: GitHub Actions · Docker (for Lambda packaging) · AWS CloudWatch Logs
- **Auth**: Supabase Auth with Google OAuth · JWT · AWS SSM Parameter Store
- **Key Integrations**: Gmail API (OAuth2) · WhatsApp (via wa.me links)

## 🚀 Highlight Features
- **Order Management**: Create, track, and manage customer orders through a four-stage lifecycle, powered by Supabase PostgreSQL with Row Level Security and React frontend with real-time subscriptions.
- **Public Order Tracking**: Customers can track their orders using a unique URL without authentication, powered by UUID-based tracking tokens and a Lambda function.
- **Email Notifications**: Automated email notifications at each order status change, powered by Gmail API with OAuth2 and custom MIME message builder.
- **WhatsApp Integration**: Send order updates directly to customers via WhatsApp with shortened tracking links, powered by wa.me URL scheme and pre-built message templates.
- **Invoice Management**: Upload and store invoices in S3 with 7-day public download links, powered by AWS S3 with CORS configuration and CloudFront CDN.
- **Mobile-Responsive PWA**: Full Progressive Web App support with offline capabilities, powered by Service worker (sw.js), Web App Manifest, and responsive CSS.
- **Dark/Light Mode**: Toggle between themes with persistent preference, powered by CSS Variables, localStorage, and React context.

## 🧠 Architecture & Key Decisions
- **Serverless Architecture**: Chose a serverless pattern to leverage AWS managed services for scalability and cost efficiency.
- **Supabase Over Raw PostgreSQL**: Selected Supabase to get built-in auth, realtime, and RLS without custom development.
- **Gmail API for Email**: Used Gmail API instead of AWS SES to avoid deliverability issues and leverage existing business email reputation.
- **Public S3 Bucket for Invoices**: Stored invoices in a public S3 bucket to enable direct download links without Lambda proxy, with automatic expiration handling.
- **UUID-based Tracking Tokens**: Implemented UUID v4 tracking tokens for public order lookup to avoid exposing internal order IDs.

## 📈 Scale & Impact
- **Active users**: ~10-20 internal staff
- **Requests/day**: ~100-500 API requests
- **Data volume**: ~1,000 orders, ~2,000 order items
- **API p99 latency**: < 500ms
- **Uptime**: 99.9% (AWS managed services)
- **GitHub stars**: 0 (private repo)
- **Team size**: 1 developer

## 🔥 Engineering Challenges Solved

### Public Order Tracking Without Authentication
**Problem**: Customers need to track orders without creating accounts, but we can't expose all order data publicly.
**Failed approach**: Initially tried using order ID in URL, but that's easily guessable and exposes sequential order numbers.
**Solution**: UUID v4 tracking tokens stored in database, with dedicated Lambda function that only returns data for valid tokens.

### Invoice Expiration Handling
**Problem**: Invoices need to be downloadable for customers but shouldn't be permanently public for security.
**Failed approach**: First version used S3 pre-signed URLs in emails, but they expired and broke the customer experience.
**Solution**: Store invoices in public S3 bucket with invoice_timestamp, check expiration on frontend, show "contact support" message after 7 days while still including invoice in delivery emails.

### Multi-Product Order Support
**Problem**: B2B orders often contain multiple products, but the original schema only supported single product per order.
**Failed approach**: Considered denormalizing products into JSON column, but that breaks querying and reporting.
**Solution**: Created order_items table with foreign key to orders, kept first product in main orders table for backward compatibility, calculate total cost from sum of all items.

## 🎨 UI & Visual Identity

### Brand Colors
| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Primary | Teal | #00B98E | Buttons, accents, active states |
| Secondary | Dark Teal | #009B76 | Gradients |
| Background | Light Gray | #F4F7FB | Main pages |
| Background | Navy | #0D1F2D | Dark sections |
| Text Primary | Dark | #1A202C | Main text |
| Text Secondary | Gray | #94A3B4 | Secondary text |
| Text Light | White | #fff | Text on dark backgrounds |
| Status | Blue | #3B82F6 | Received |
| Status | Amber | #F59E0B | Processing |
| Status | Purple | #8B5CF6 | Ready to Dispatch |
| Status | Green | #10B981 | Delivered |

### Typography
- **Primary Font**: Inter (system-ui fallback), Manrope for headings
- **Secondary Font**: None specified
- **Monospace Font**: None specified
- **Heading sizes**: 42px hero headline, 28px page titles, 14-15px body text, 11-12px labels

### Visual Style
- **Design language**: Minimal
- **Border radius**: Subtle, 10px for buttons and cards
- **Shadows**: Subtle, 0 2px 16px rgba(0,0,0,.05) for cards
- **Spacing scale**: Base unit not specified
- **Iconography**: Lucide
- **Illustration style**: None

### Logo & Mark
- **Logo type**: Icon + wordmark
- **Logo colors**: Teal and Navy
- **Dark mode variant**: Yes, background changes to dark navy

### Component Patterns
- **Buttons**: Gradient teal background (#00B98E to #009B76), white text, 10px border radius, subtle shadow, hover lift effect
- **Cards**: White background, 20px border radius, 1px solid border (#EEF2F5), subtle shadow (0 2px 16px rgba(0,0,0,.05))
- **Badges/Tags**: Rounded 20px, colored background based on status, bold text, teal dot indicator
- **Navigation**: Sidebar navigation on desktop, hamburger menu on mobile

### Image Generation Prompt
Create a social media image for the Stellar Global Supplies Order Management System featuring a clean, modern design with teal and navy colors. Include a modern icon, a simplified dashboard screenshot with stats cards, and a mobile-responsive layout. Use the Inter font for text and ensure the image reflects the minimal, professional aesthetic of the application.

> [Generated image prompt goes here]

---

## 💡 Post Angles
- **LinkedIn**: "Streamline your B2B order management with our serverless solution. Real-time tracking, automated notifications, and secure invoice handling—all in one place."
- **X**: "Introducing Stellar Global Supplies Order Management System. Simplify order tracking, enhance customer communication, and boost efficiency. #B2B #OrderManagement"
- **Dev.to**: "Building a B2B Order Management System with React, Supabase, and Lambda. Real-time updates, public tracking, and more. #JavaScript #Supabase"
- **Bluesky**: "Efficient B2B order management made easy. Real-time status, email/WhatsApp notifications, and secure invoice storage. #Tech #OrderSystem"

## 🏷️ Hashtags
#B2B, #OrderManagement, #Serverless, #React, #Supabase, #AWS, #Lambda, #EmailNotifications, #WhatsApp, #InvoiceManagement, #PWA, #DarkMode

## 📌 Soundbites
- "Centralize and automate your B2B order management with real-time tracking and secure invoice handling."
- "Enhance customer communication with automated email and WhatsApp notifications for order updates."

## 🔍 SEO Keywords
B2B order management, serverless architecture, React frontend, Supabase, AWS Lambda, email notifications, WhatsApp integration, invoice management, PWA, dark mode, real-time tracking, public order tracking, multi-product orders, UUID tracking tokens, S3 invoice storage, automated notifications, efficient order system.