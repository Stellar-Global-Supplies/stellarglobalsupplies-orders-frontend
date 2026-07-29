# Stellar OMS v2.0 — Replace Guide

## Files to replace (drop-in)

| Your path | Replace with |
|-----------|-------------|
| `frontend/src/pages/LoginPage.jsx`          | `frontend/src/pages/LoginPage.jsx` |
| `frontend/src/components/Sidebar.jsx`       | `frontend/src/components/Sidebar.jsx` |
| `frontend/src/pages/TrackOrderPage.jsx`     | `frontend/src/pages/TrackOrderPage.jsx` |
| `frontend/src/utils/whatsapp.js`            | `frontend/src/utils/whatsapp.js` |
| `lambda/create-order/emailTemplates.js`     | `lambda/create-order/emailTemplates.js` |

> Also copy `emailTemplates.js` to `lambda/update-order-status/lib/emailTemplates.js` if you have a copy there.

---

## What changed

### LoginPage — Full revamp
- **Split-panel layout**: animated particle network left, clean form right
- **Show/hide password** toggle
- **Trust row**: SSL · Supabase Auth · AWS Hosted
- Live "v2.0" badge
- Gradient headline with teal accent
- Stats row (orders processed, on-time %, revenue)
- Mobile: hides left panel, form on dark bg

### Sidebar — Premium upgrade
- Inline SgsLogo SVG (same as tracking page — no img dependency)
- "v2.0 Live" pulsing badge
- Active nav link with left accent stripe + gradient background
- Quick stats mini-panel (wired to show — if live data, populate via context)
- Gradient user avatar with teal glow
- Sign-out button turns red on hover

### TrackOrderPage — CEO-ready redesign
- **Uses SgsLogo SVG** — no external image fetch, renders everywhere
- Sticky top nav bar with logo + Call Us chip
- Dark hero card with animated timeline (glow ring on active step)
- Delivery date chip inside hero card
- Invoice card: teal gradient when valid, neutral when expired
- Two CTA buttons (Call + WhatsApp) + website link
- Full mobile-first, no horizontal scroll

### WhatsApp messages — Fixed long URLs
**Before:** sent raw S3 pre-signed URL (~600 chars) — ugly, expires, breaks in WhatsApp
**After:** sends only `orders.stellarglobalsupplies.com/track/{token}` (short, permanent)
- Invoice: "Download from your tracking page above" — customer taps the short link, sees the button
- Business message similarly shortened

### Email templates — Complete redesign
- Gradient accent bar on header (colour matches order status)
- Icon-labelled section blocks (📦 📍 🔗 📄)
- Status hero section: full-width coloured card with emoji + status pill
- Alternating row colour in detail table
- Responsive `@media` block for mobile
- Preheader text on every email type
- Delay email: prominent "New Delivery Date" box in amber
- All three templates (Confirmation, Status Update, Delay) updated
