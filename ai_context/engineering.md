# Engineering

## Architecture Pattern
Single-Page Application (SPA) with serverless backend

## System Overview
```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (CDN)                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React SPA (frontend/)                 │  │
│  │                                                    │  │
│  │  ┌────────────┐  ┌──────────┐  ┌───────────────┐  │  │
│  │  │ Components  │  │  Pages   │  │    Hooks      │  │  │
│  │  │ Sidebar     │  │ Login    │  │ useAuth       │  │  │
│  │  │ StatusBadge │  │ Dashboard│  │ useTheme      │  │  │
│  │  │ OrderTimeline│ │ Orders   │  └───────────────┘  │  │
│  │  └────────────┘  │ NewOrder │                     │  │
│  │                   │ Detail   │  ┌───────────────┐  │  │
│  │                   │ Track    │  │   Utils       │  │  │
│  │                   └──────────┘  │ api.js        │  │  │
│  │                                │ supabase.js   │  │  │
│  │                                │ whatsapp.js   │  │  │
│  │                                └───────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                          │
           ▼                          ▼
  ┌──────────────────┐     ┌──────────────────┐
  │  API Gateway     │     │   Supabase       │
  │  (Lambda)        │     │  (Auth + DB)     │
  │  Backend API     │     │  + Realtime      │
  └──────────────────┘     └──────────────────┘
```

## Key Architectural Decisions
- Chose Vercel for frontend hosting over CloudFront/S3 to eliminate infrastructure management overhead, get instant edge deployment, and automatic SSL
- Used Supabase Realtime subscriptions instead of polling for order updates, reducing unnecessary API calls and providing instant UI updates
- Implemented CSS Variables for theming instead of a CSS-in-JS library to avoid runtime overhead while still providing dark/light mode with persistent preference
- Built as a standard Create React App SPA for simplicity — no SSR needed since this is an internal dashboard with authenticated routes

## Hard Problems Solved

### Public Order Tracking Without Authentication
**The problem:** Customers need to track orders without creating accounts, but we can't expose all order data publicly.
**What failed first:** Initially tried using order ID in URL, but that's easily guessable and exposes sequential order numbers.
**The solution:** UUID v4 tracking tokens stored in database, with a dedicated public route `/track/:token` that fetches order data from the backend API using just the token. The frontend never exposes internal IDs.

### Invoice Expiration Handling
**The problem:** Invoices need to be downloadable for customers but shouldn't be permanently public for security.
**What failed first:** First version used S3 pre-signed URLs in emails, but they expired and broke the customer experience.
**The solution:** Store invoices in public S3 bucket with invoice_timestamp, check expiration on the frontend tracking page, show "contact support" message after 7 days while still including invoice in delivery emails. All expiration logic runs client-side.

### Multi-Product Order Support
**The problem:** B2B orders often contain multiple products, but the original schema only supported single product per order.
**What failed first:** Considered denormalizing products into JSON column, but that breaks querying and reporting.
**The solution:** Frontend allows dynamic add/remove of product rows in the New Order form, sends data as an array of order items to the backend API. The UI calculates total cost from sum of all items in real-time.

## Scale & Metrics
- Active users: ~10-20 internal staff
- Data volume: ~1,000 orders, ~2,000 order items displayed
- Frontend bundle size: ~200KB gzipped
- Uptime: 99.99% (Vercel edge network)
- Team size: 1 developer

## Performance Wins
- Used Supabase Realtime subscriptions instead of polling for order updates, reducing unnecessary API calls
- PWA service worker caches static assets for instant repeat visits
- Vercel edge CDN serves the app from locations closest to users globally

## What We'd Do Differently
- Would consider Next.js for SSR/SSG if SEO for public tracking pages becomes important
- Would add end-to-end tests (Cypress/Playwright) for the order creation and tracking flows

## Related Engineering Posts / Talks
NONE

---