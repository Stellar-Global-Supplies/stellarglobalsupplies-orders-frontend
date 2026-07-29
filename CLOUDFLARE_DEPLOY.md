# Cloudflare Pages Deployment Guide
## Stellar Global Supplies — Frontend (React)

---

## What Changed From the Old Architecture

| Removed (no longer needed) | Replaced by |
|---|---|
| S3 frontend bucket | Cloudflare Pages (free) |
| CloudFront distribution | Cloudflare's global CDN (built-in) |
| ACM SSL certificate | Cloudflare auto-provisions SSL |
| Route53 A/AAAA records | Cloudflare DNS CNAME |
| nginx.conf | `public/_redirects` (one line) |
| Dockerfile + zbpack.json | Not needed — Cloudflare builds React natively |

**Backend is untouched** — API Gateway, Lambda, Supabase, and the invoices S3 bucket remain exactly as-is.

---

## Files Added to This Repo

```
frontend/public/_redirects    ← Makes React Router work on Cloudflare Pages
CLOUDFLARE_DEPLOY.md          ← This guide
```

Contents of `_redirects`:
```
/* /index.html 200
```
That single line replaces the entire nginx.conf SPA routing config.

---

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- Your domain `stellarglobalsupplies.com` added to Cloudflare (or nameservers pointed to Cloudflare)
- This repo pushed to GitHub

---

## Part 1 — Deploy the Backend (Terraform)

> Skip this if the Lambda + API Gateway backend is already deployed.

```bash
cd terraform

# initialise (use your existing S3 backend config)
terraform init -backend-config=backend.tfbackend

# review — you should see only backend resources now (no S3 frontend, no CloudFront)
terraform plan \
  -var="supabase_url=https://xxxx.supabase.co" \
  -var="supabase_service_key=YOUR_SERVICE_KEY"

# apply
terraform apply \
  -var="supabase_url=https://xxxx.supabase.co" \
  -var="supabase_service_key=YOUR_SERVICE_KEY"
```

After apply, note the output value of `api_gateway_url` — you'll need it in Part 2.

```
api_gateway_url = "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com"
```

---

## Part 2 — Deploy Frontend to Cloudflare Pages

### Step 1 — Push your code to GitHub

Make sure the latest code (including `public/_redirects`) is committed and pushed:

```bash
git add frontend/public/_redirects CLOUDFLARE_DEPLOY.md terraform/main.tf
git commit -m "chore: migrate frontend to Cloudflare Pages"
git push origin main
```

---

### Step 2 — Create a Cloudflare Pages project

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. In the left sidebar, click **Workers & Pages**.
3. Click **Create** → **Pages** → **Connect to Git**.
4. Authorise GitHub and select your repo:
   ```
   Stellar-Global-Supplies/stellarglobalsupplies-orders
   ```
5. Click **Begin setup**.

---

### Step 3 — Configure the build

On the build settings screen, fill in:

| Field | Value |
|---|---|
| **Project name** | `stellar-oms` (or any name you like) |
| **Production branch** | `main` |
| **Framework preset** | `Create React App` |
| **Root directory** | `frontend` |
| **Build command** | `npm run build` |
| **Build output directory** | `build` |

> ⚠️ The **Root directory** field is critical — set it to `frontend` so Cloudflare builds from the right folder.

---

### Step 4 — Set environment variables

Still on the setup screen, expand **Environment variables** and add all five:

| Variable | Value |
|---|---|
| `REACT_APP_API_BASE_URL` | Paste your `api_gateway_url` from Terraform output |
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL (`https://xxxx.supabase.co`) |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `REACT_APP_WHATSAPP_NUMBER` | e.g. `+919876543210` |
| `REACT_APP_NR_LICENSE_KEY` | New Relic key, or `disabled` if not used |

> ⚠️ React bakes these into the JS bundle **at build time**. After changing any variable, you must trigger a redeploy.

---

### Step 5 — Deploy

Click **Save and Deploy**. Cloudflare will:

1. Clone your repo
2. `cd frontend` → `npm ci` → `npm run build`
3. Deploy the `build/` folder to its global CDN
4. Give you a URL like: `https://stellar-oms.pages.dev`

Watch the build log in the dashboard. A successful deploy ends with:

```
Success: Your site was deployed!
```

---

### Step 6 — Add your custom domain

1. In your Pages project, go to **Custom domains** → **Set up a custom domain**.
2. Enter:
   ```
   orders.stellarglobalsupplies.com
   ```
3. Cloudflare will prompt you to add a DNS record. Since your domain is on Cloudflare:
   - It will offer to **add the CNAME automatically** — click **Activate domain**.
   - The CNAME it creates will look like:
     ```
     orders  CNAME  stellar-oms.pages.dev  (Proxied)
     ```
4. Cloudflare automatically provisions an SSL certificate. This takes 1–5 minutes.

> If your domain is **not** on Cloudflare yet, go to **dash.cloudflare.com → Add a site** first and update your registrar's nameservers to Cloudflare's.

---

### Step 7 — Verify

Open `https://orders.stellarglobalsupplies.com` in your browser and check:

- [ ] App loads with HTTPS (padlock in browser)
- [ ] Navigating to a route (e.g. `/orders`) and refreshing the page works — no 404
- [ ] Login / Supabase auth works
- [ ] Creating an order calls the API successfully (check browser Network tab)
- [ ] Invoice download works (S3 bucket is unchanged)

---

## Redeployments

Every push to `main` triggers an automatic redeploy on Cloudflare Pages — no CI/CD config needed.

To redeploy manually (e.g. after changing env vars):
1. Go to your Pages project → **Deployments**.
2. Click the **...** menu on the latest deployment → **Retry deployment**.

---

## Rollback

If a deployment breaks the app:
1. Go to **Deployments**.
2. Find the last working deployment.
3. Click **...** → **Rollback to this deployment**.

Instant — no Terraform or AWS involved.

---

## Troubleshooting

### Page refresh gives 404
The `_redirects` file handles this. Make sure `frontend/public/_redirects` exists in the repo and contains:
```
/* /index.html 200
```

### API calls failing (CORS error in browser)
The API Gateway CORS config already allows `https://orders.stellarglobalsupplies.com`. Verify the custom domain is active (not still on `.pages.dev`) before testing. Do not use the `.pages.dev` URL in production — it's not in the CORS allowlist.

### Env vars not working
React env vars are build-time only. After adding/changing them in the Cloudflare dashboard, you must trigger a new deployment — they don't hot-reload.

### Build fails — module not found
Make sure the **Root directory** is set to `frontend` in Pages settings. If it's blank, Cloudflare tries to build from the repo root.

---

## Architecture After Migration

```
User
 │
 ▼
Cloudflare Pages (global CDN, free)
  orders.stellarglobalsupplies.com
  Auto SSL, SPA routing via _redirects
 │
 ├──► Supabase (auth + database)
 │
 └──► AWS API Gateway
          │
          ├── Lambda: create-order
          ├── Lambda: update-order-status
          ├── Lambda: send-notification
          ├── Lambda: get-order-by-token
          └── Lambda: update-order-items
                    │
                    └── S3: invoices bucket
```

---

*Stellar Global Supplies OMS — Cloudflare Pages Deployment*
