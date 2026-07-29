# Stellar OMS — Complete Deployment Guide

> **orders.stellarglobalsupplies.com**  
> React + AWS Lambda + Supabase Auth (Google OAuth)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| AWS CLI | ≥ 2.x | `brew install awscli` |
| Terraform | ≥ 1.5 | `brew install terraform` |
| Node.js | ≥ 20 | `brew install node` |
| Git | any | pre-installed |

---

## Step 1 — One-Time AWS Setup

### 1a. Create IAM user for deployments

```bash
# Create user
aws iam create-user --user-name stellar-oms-deploy

# Attach policies
aws iam attach-user-policy \
  --user-name stellar-oms-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy \
  --user-name stellar-oms-deploy \
  --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess

aws iam attach-user-policy \
  --user-name stellar-oms-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonRoute53FullAccess

aws iam attach-user-policy \
  --user-name stellar-oms-deploy \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess

aws iam attach-user-policy \
  --user-name stellar-oms-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonAPIGatewayAdministrator

aws iam attach-user-policy \
  --user-name stellar-oms-deploy \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess

aws iam attach-user-policy \
  --user-name stellar-oms-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMFullAccess

aws iam attach-user-policy \
  --user-name stellar-oms-deploy \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

# Create access key (save these — shown only once)
aws iam create-access-key --user-name stellar-oms-deploy
# → Copy AccessKeyId and SecretAccessKey
```

### 1b. Create Terraform state bucket

```bash
aws s3api create-bucket \
  --bucket stellar-oms-tf-state \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

aws s3api put-bucket-versioning \
  --bucket stellar-oms-tf-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket stellar-oms-tf-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### 1c. Gmail API Setup (one-time — get your Refresh Token)

Emails are sent via the Gmail API using OAuth2. You need **Client ID**, **Client Secret** (you already have these), and a **Refresh Token**.

**Get the Refresh Token in 3 minutes:**

1. Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground)
2. Click the **gear icon ⚙️** (top-right) → tick **"Use your own OAuth credentials"**
3. Enter your **Client ID** and **Client Secret** → Close
4. In the left panel, scroll to **"Gmail API v1"** → select:
   ```
   https://mail.google.com/
   ```
5. Click **"Authorise APIs"** → sign in with `orders@stellarglobalsupplies.com` → Allow
6. Click **"Exchange authorization code for tokens"**
7. Copy the **Refresh token** value — this is your `GMAIL_REFRESH_TOKEN`

> **Important:** In [Google Cloud Console](https://console.cloud.google.com) → your project → **APIs & Services** → **Credentials** → your OAuth 2.0 Client:
> - Add `https://developers.google.com/oauthplayground` to **Authorised redirect URIs** before step 4
> - Enable the **Gmail API**: APIs & Services → Library → search "Gmail API" → Enable

---

## Step 2 — Supabase Setup

### 2a. Run the database migration

1. Open **Supabase Dashboard** → your project → **SQL Editor**
2. Copy & paste the contents of `supabase/migrations/001_create_orders.sql`
3. Click **Run**
4. Confirm the `orders` table was created

### 2b. Enable Google OAuth in Supabase

1. Go to **Authentication** → **Providers** → **Google**
2. Toggle **Enable Google provider** ON
3. Enter your **Google Client ID** and **Google Client Secret**
4. Copy the **Callback URL** shown (looks like `https://xxxx.supabase.co/auth/v1/callback`)

### 2c. Configure Google OAuth Credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Open your project → **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID (or create one)
4. Under **Authorised JavaScript origins**, add:
   ```
   https://orders.stellarglobalsupplies.com
   http://localhost:3000
   ```
5. Under **Authorised redirect URIs**, add the Supabase callback URL from step 2b:
   ```
   https://xxxx.supabase.co/auth/v1/callback
   ```
6. Save

### 2d. Collect Supabase credentials

From **Project Settings** → **API**:
- **Project URL** → `SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` *(keep secret)*

---

## Step 3 — Terraform (Infrastructure)

### 3a. Create tfvars file

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
aws_region  = "ap-south-1"
root_domain = "stellarglobalsupplies.com"
domain_name = "orders.stellarglobalsupplies.com"
environment = "production"

# Your existing ACM cert ARN (us-east-1 region):
existing_acm_cert_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Leave blank here — set via env vars below
supabase_url         = ""
supabase_service_key = ""
```

### 3b. Install Lambda dependencies first

```bash
cd ../lambda
npm install
cd ../terraform
```

### 3c. Run Terraform

```bash
# Set secrets as env vars (not in tfvars file)
export TF_VAR_supabase_url="https://xxxx.supabase.co"
export TF_VAR_supabase_service_key="eyJ..."

# Configure AWS CLI
export AWS_ACCESS_KEY_ID="AKIAxxxxxxxxxxxxxxxx"
export AWS_SECRET_ACCESS_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export AWS_DEFAULT_REGION="ap-south-1"

# Initialize
terraform init

# Preview changes
terraform plan

# Apply (creates S3, CloudFront, API Gateway, 3 Lambdas, Route53 records)
terraform apply
```

**Terraform will output:**
```
oms_url         = "https://orders.stellarglobalsupplies.com"
cloudfront_id   = "EXXXXXXXXXXXX"
s3_bucket_name  = "stellar-oms-frontend-production"
api_gateway_url = "https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com"
```

---

## Step 4 — GitHub Actions Secrets

In your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Value | Where to find |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key | Step 1a output |
| `AWS_SECRET_ACCESS_KEY` | IAM secret | Step 1a output |
| `SUPABASE_URL` | Project URL | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | anon/public key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | Supabase → Settings → API |
| `ACM_CERT_ARN` | ACM cert ARN | Your existing cert ARN (us-east-1) |
| `GMAIL_CLIENT_ID` | OAuth2 Client ID | Google Cloud Console → Credentials |
| `GMAIL_CLIENT_SECRET` | OAuth2 Client Secret | Google Cloud Console → Credentials |
| `GMAIL_REFRESH_TOKEN` | Refresh Token | Step 1c — OAuth2 Playground |
| `GMAIL_SENDER` | `orders@stellarglobalsupplies.com` | Gmail account used above |
| `WHATSAPP_NUMBER` | `919637655556` | Your business WhatsApp |
| `S3_BUCKET_NAME` | bucket name | Terraform output (fallback) |
| `CLOUDFRONT_DISTRIBUTION_ID` | CF ID | Terraform output (fallback) |
| `API_BASE_URL` | API Gateway URL | Terraform output (fallback) |

---

## Step 5 — First Deploy

```bash
# Push to main to trigger the full pipeline
git add -A
git commit -m "feat: initial Stellar OMS deployment"
git push origin main
```

### Pipeline stages (watch in GitHub Actions tab):

```
Build React App          ~2 min   ✅ compile check
  ↓
Terraform                ~3 min   ✅ apply infra
  ↓
Deploy Lambda Functions  ~2 min   ✅ 3 functions updated
  ↓
Deploy Frontend          ~3 min   ✅ S3 sync + CF invalidation
```

Total: **~10 minutes** from push to live.

---

## Step 6 — Verify Everything Works

```bash
# 1. Check the site is live
curl -I https://orders.stellarglobalsupplies.com

# 2. Test API Gateway
export API_URL=$(terraform -chdir=terraform output -raw api_gateway_url)
curl -X POST "$API_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' 
# → Should return 401 Unauthorized (auth is working)

# 3. Check Lambda logs
aws logs tail /aws/lambda/stellar-oms-create-order --follow

# 4. Check CloudFront is serving
curl -I https://orders.stellarglobalsupplies.com | grep -i "x-cache"
# → Should show: x-cache: Hit from cloudfront (after first load)
```

---

## Step 7 — Update Supabase Auth Redirect URLs

In **Supabase Dashboard** → **Authentication** → **URL Configuration**:

- **Site URL:** `https://orders.stellarglobalsupplies.com`
- **Redirect URLs:** Add `https://orders.stellarglobalsupplies.com/**`

---

## Environment Variables Reference

### Frontend (`frontend/.env`)
```bash
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...          # anon/public key only
REACT_APP_API_BASE_URL=https://xxxx.execute-api.ap-south-1.amazonaws.com
REACT_APP_WHATSAPP_NUMBER=919637655556
```

### Lambda (set via Terraform → AWS Console)
```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # service role — has full DB access
GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-xxxx
GMAIL_REFRESH_TOKEN=1//xxxx
GMAIL_SENDER=orders@stellarglobalsupplies.com
NODE_ENV=production
```

---

## Local Development

```bash
# Terminal 1 — Frontend
cd frontend
cp .env.example .env     # fill in your values
npm install
npm start                # http://localhost:3000

# Test Lambda functions locally (optional)
cd lambda
npm install
# Use AWS SAM or just test via the deployed API Gateway
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Google sign-in redirects back with error | Check Supabase redirect URLs & Google OAuth authorised URIs |
| `products` dropdown empty | Verify `top_sku` view exists with `skus` column in Supabase |
| `materials` dropdown empty | Verify `material_spilt` view exists with `material_type` column |
| Emails not sending | Check SES is out of sandbox; verify `orders@stellarglobalsupplies.com` |
| 403 on CloudFront | S3 bucket policy may not have propagated — wait 2 min and retry |
| Lambda error logs | `aws logs tail /aws/lambda/stellar-oms-create-order --follow` |
| Terraform state lock | `terraform force-unlock LOCK_ID` |
| Route53 cert validation stuck | DNS propagation can take up to 30 min for new certs |

---

## Architecture Diagram

```
User Browser
     │
     ▼
CloudFront (HTTPS)                         Google OAuth
     │           orders.stellarglobalsupplies.com     │
     ▼                                                 │
S3 Bucket ◄── React SPA ──────────────── Supabase Auth ◄─┘
                  │
                  │  JWT Bearer token
                  ▼
          API Gateway (HTTP API)
                  │
          ┌───────┼───────┐
          ▼       ▼       ▼
     Lambda   Lambda   Lambda
     create   update   notify
     -order   -status  -email
          │       │       │
          └───────┴───────┘
                  │
          Supabase (orders table)
                  │
                  ▼
              AWS SES → Customer Email
```