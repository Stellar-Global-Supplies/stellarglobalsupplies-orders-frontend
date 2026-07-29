# Engineering

## Architecture Pattern
Serverless

## System Overview
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│  API Gateway     │────▶│  Lambda         │
│  (S3 + CF)     │     │  HTTP API        │     │  Functions      │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐                               ┌─────────────────┐
│  Supabase       │◀──────────────────────────────│  Gmail API      │
│  (PostgreSQL)  │                               │  (OAuth2)       │
└─────────────────┘                               └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐                               ┌─────────────────┐
│  SSM Params     │                               │  S3 Invoices    │
│  (Secrets)      │                               │  (Public)       │
└─────────────────┘                               └─────────────────┘
```

## Key Architectural Decisions
- Chose Supabase over raw PostgreSQL to get auth, realtime, and RLS out of the box without building them from scratch
- Used Gmail API instead of AWS SES to avoid deliverability issues and leverage existing business email reputation
- Split invoice storage into separate S3 bucket with public read access to enable direct download links without Lambda proxy
- Implemented UUID-based tracking tokens for public order lookup to avoid exposing internal order IDs

## Hard Problems Solved

### Public Order Tracking Without Authentication
**The problem:** Customers need to track orders without creating accounts, but we can't expose all order data publicly.
**What failed first:** Initially tried using order ID in URL, but that's easily guessable and exposes sequential order numbers.
**The solution:** UUID v4 tracking tokens stored in database, with dedicated Lambda function that only returns data for valid tokens.

### Invoice Expiration Handling
**The problem:** Invoices need to be downloadable for customers but shouldn't be permanently public for security.
**What failed first:** First version used S3 pre-signed URLs in emails, but they expired and broke the customer experience.
**The solution:** Store invoices in public S3 bucket with invoice_timestamp, check expiration on frontend, show "contact support" message after 7 days while still including invoice in delivery emails.

### Multi-Product Order Support
**The problem:** B2B orders often contain multiple products, but the original schema only supported single product per order.
**What failed first:** Considered denormalizing products into JSON column, but that breaks querying and reporting.
**The solution:** Created order_items table with foreign key to orders, kept first product in main orders table for backward compatibility, calculate total cost from sum of all items.

## Scale & Metrics
- Active users: ~10-20 internal staff
- Requests/day: ~100-500 API requests
- Data volume: ~1,000 orders, ~2,000 order items
- API p99 latency: < 500ms
- Uptime: 99.9% (AWS managed services)
- GitHub stars: 0 (private repo)
- Team size: 1 developer

## Performance Wins
- Used Supabase Realtime subscriptions instead of polling for order updates, reducing unnecessary API calls
- CloudFront CDN for frontend and invoice downloads reduces latency globally
- Lambda memory tuned to 256MB (create/update) and 128MB (tracking) to balance cost and performance

## What We'd Do Differently
- Would use AWS SES with proper domain verification instead of Gmail API to avoid OAuth token management complexity
- Would implement proper rate limiting on public tracking endpoint to prevent abuse

## Related Engineering Posts / Talks
NONE

---