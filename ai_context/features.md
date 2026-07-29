# Features

## Core Features

### Order Management Dashboard
**What it does:** Create, track, and manage customer orders through a four-stage lifecycle (Order Received → Processing → Ready to Dispatch → Delivered) with real-time updates.
**Powered by:** React 18 with React Router, Supabase Realtime subscriptions for live updates.
**Why it's notable:** Multi-product order support with dynamic add/remove product rows, real-time status updates without page refresh via Supabase Realtime.

### Public Order Tracking Page
**What it does:** Customers can track their orders using a unique URL without authentication — no account needed.
**Powered by:** React Router dynamic routes, UUID-based tracking tokens, responsive mobile-first design.
**Why it's notable:** Fully mobile-optimized tracking page with animated timeline, invoice download button, and WhatsApp/Call CTAs. No auth required for customers.

### Dark/Light Mode
**What it does:** Toggle between themes with persistent preference across sessions.
**Powered by:** CSS Variables, localStorage for persistence, React context (useTheme.js).
**Why it's notable:** Custom CSS variable implementation avoids heavy theme libraries while providing smooth transitions and consistent branding.

### Progressive Web App (PWA)
**What it does:** Full PWA support with offline capabilities and add-to-home-screen on iOS and Android.
**Powered by:** Service worker (sw.js), Web App Manifest (manifest.json), CRA PWA configuration.
**Why it's notable:** Works on iOS and Android without app store deployment, with hamburger menu navigation and app-like experience.

### Mobile-Responsive UI
**What it does:** Optimized layout for phones, tablets, and desktops with adaptive navigation.
**Powered by:** CSS media queries, responsive grid layouts, hamburger menu for mobile sidebar.
**Why it's notable:** Split-panel login page, collapsible sidebar, stacked cards on mobile — all without a CSS framework.

### WhatsApp Integration
**What it does:** Send order updates directly to customers via WhatsApp with short tracking links.
**Powered by:** wa.me URL scheme, pre-built message templates in whatsapp.js utility.
**Why it's notable:** Shortened tracking URLs instead of long S3 pre-signed URLs improve WhatsApp message readability and reliability.

### Invoice Download
**What it does:** Customers can download invoices directly from the tracking page with 7-day availability window.
**Powered by:** S3 public URLs, CloudFront CDN, invoice_timestamp for expiration tracking.
**Why it's notable:** Frontend handles expiration logic — shows download button within 7 days, "contact support" message after expiry.

---

## Recently Shipped
- **[October 2024]**: v2.0 UI redesign with split-panel login, animated timeline, and premium sidebar
- **[October 2024]**: Multi-product order support with dynamic form rows
- **[September 2024]**: Invoice expiration handling (7-day window)
- **[August 2024]**: WhatsApp message URL shortening

## In Progress / Coming Soon
- NONE

## Developer Experience Features
- Vercel auto-deploy from git push
- React Hot Toast for user feedback
- Environment variable configuration via Vercel dashboard
- ESLint/Prettier ready (standard CRA setup)

## Notable Performance Numbers
- Frontend bundle size: ~200KB gzipped
- Real-time updates via Supabase Realtime (no polling)
- PWA service worker for offline asset caching

---