# UI

## Pages

### Login Page
**Route:** /login
**Purpose:** Staff authentication with email/password to access the order management system.
**Layout:** Split-screen layout with 52% left panel and 48% right panel. Left panel has animated particle network background with gradient overlay, logo, hero headline, and stats. Right panel has clean white form with email/password fields, show/hide password toggle, and sign-in button. Mobile collapses to single panel with dark background.
**Key Components:** Particle canvas animation, SgsLogo SVG, email input with envelope icon, password input with lock icon and show/hide toggle, sign-in button with gradient teal background, trust row with SSL/Supabase/AWS badges.
**Colors:** Primary teal (#00B98E), dark navy background (#0D1F2D), white form background (#F4F7FB), gradient left panel (#0A1929 to #0A2E20).
**Mobile Behavior:** Left panel hidden, right panel background changes to dark navy (#0D1F2D), form card gets white background with rounded corners.

### Dashboard Page
**Route:** /
**Purpose:** Statistics overview showing order metrics and quick access to order management.
**Layout:** Main content area with sidebar on left. Header with page title, stats cards in grid layout, order status summary.
**Key Components:** Sidebar navigation, stats cards, order status summary, theme toggle.
**Colors:** Teal accent (#00B98E), dark text (#1A202C), light gray (#94A3B4).
**Mobile Behavior:** Hamburger menu for sidebar, stacked cards instead of grid.

### Orders Page
**Route:** /orders
**Purpose:** List and search all orders with filtering capabilities.
**Layout:** Table view with order rows, search bar, and filter controls. Each row shows order ID, customer name, status, payment status, and delivery date.
**Key Components:** Search input, status filter dropdown, order table, status badges, action buttons.
**Colors:** Status badge colors: blue for Order Received, amber for Processing, purple for Ready to Dispatch, green for Delivered.
**Mobile Behavior:** Horizontal scroll table, condensed row information.

### New Order Page
**Route:** /new-order
**Purpose:** Create new customer orders with product details and delivery timeline.
**Layout:** Form with customer details section, products section (dynamic add/remove), and submit button.
**Key Components:** Customer form fields (name, phone, email), product selector with add/remove buttons, date picker for delivery timeline, payment status dropdown, submit button.
**Colors:** Teal primary (#00B98E), white form background, gray borders (#DDE4EB).
**Mobile Behavior:** Stacked form fields, full-width buttons.

### Order Detail Page
**Route:** /orders/:id
**Purpose:** View and manage individual order with status updates and actions.
**Layout:** Order header with status, customer details card, products table, action buttons for status changes.
**Key Components:** Status badge, customer info card, products table, delay button, status update buttons, invoice upload section.
**Colors:** Status-specific colors matching timeline, teal accents, white cards.
**Mobile Behavior:** Single column layout, stacked action buttons.

### Track Order Page
**Route:** /track/:token
**Purpose:** Public order tracking page for customers to view order status and download invoices.
**Layout:** Sticky top navigation bar, status hero card with timeline, payment reminder banner (if unpaid), order details card, invoice card, contact card.
**Key Components:** SgsLogo in header, StatusPill component, Timeline with 4 steps (Order Received, Processing, Ready to Dispatch, Delivered), ProductsTable, invoice download button, Call/WhatsApp buttons.
**Colors:** Dark header (#0D1F2D), teal accent (#00B98E), status colors: blue (#3B82F6), amber (#F59E0B), purple (#8B5CF6), green (#10B981).
**Mobile Behavior:** Full mobile-first design, no horizontal scroll, responsive padding.

---

## Design System

**Color Palette:**
- Primary: #00B98E (teal) - used for buttons, accents, active states
- Secondary: #009B76 (darker teal) - used for gradients
- Background: #F4F7FB (light gray) for main pages, #0D1F2D (navy) for dark sections
- Text: #1A202C (dark), #94A3B4 (gray), #fff (white on dark)
- Status: #3B82F6 (blue - received), #F59E0B (amber - processing), #8B5CF6 (purple - ready), #10B981 (green - delivered)

**Typography:**
- Font family: Inter (system-ui fallback), Manrope for headings
- Font sizes: 42px hero headline, 28px page titles, 14-15px body text, 11-12px labels
- Font weights: 800 for headings, 700 for important text, 500-600 for secondary

**Components:**
- Buttons: Gradient teal background (#00B98E to #009B76), white text, 10px border radius, subtle shadow, hover lift effect
- Forms: White background, 10px border radius, teal focus border (#00B98E), subtle box-shadow on focus
- Cards: White background, 20px border radius, 1px solid border (#EEF2F5), subtle shadow (0 2px 16px rgba(0,0,0,.05))
- Status Pills: Rounded 20px, colored background based on status, bold text, teal dot indicator

---