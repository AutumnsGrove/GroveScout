#!/bin/bash
# Scout - Initial Setup Script
# Run this once after cloning to set up all Cloudflare resources
#
# INSTRUCTIONS:
# 1. Fill in your credentials below
# 2. Make sure you're logged into wrangler: npx wrangler login
# 3. Run: bash setup-cloudflare.sh

set -e

echo "🔍 Scout Setup - Creating Cloudflare Resources"
echo "================================================"

# ============================================================================
# STEP 1: Create Cloudflare Resources
# ============================================================================

echo ""
echo "📦 Creating D1 Database..."
npx wrangler d1 create scout-db

echo ""
echo "📦 Creating KV Namespace..."
npx wrangler kv:namespace create SCOUT_CACHE

echo ""
echo "📦 Creating Queue..."
npx wrangler queues create scout-search-jobs

echo ""
echo "⚠️  IMPORTANT: Copy the IDs from above and update wrangler.toml!"
echo "   - database_id for D1"
echo "   - id for KV namespace"
echo ""
read -p "Press Enter after updating wrangler.toml..."

# ============================================================================
# STEP 2: Run Database Migration
# ============================================================================

echo ""
echo "🗄️  Running database migration..."
npm run db:migrate

# ============================================================================
# STEP 3: Set Secrets
# Fill in your actual values below!
# ============================================================================

echo ""
echo "🔐 Setting secrets..."

# Google OAuth (get from Google Cloud Console)
# https://console.cloud.google.com/apis/credentials
echo "YOUR_GOOGLE_CLIENT_ID" | npx wrangler secret put GOOGLE_CLIENT_ID
echo "YOUR_GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET

# Anthropic API Key (get from console.anthropic.com)
echo "sk-ant-YOUR_KEY_HERE" | npx wrangler secret put ANTHROPIC_API_KEY

# Brave Search API Key (get from brave.com/search/api)
echo "BSA_YOUR_KEY_HERE" | npx wrangler secret put BRAVE_API_KEY

# Stripe (get from dashboard.stripe.com/apikeys)
echo "sk_test_YOUR_KEY_HERE" | npx wrangler secret put STRIPE_SECRET_KEY
echo "whsec_YOUR_WEBHOOK_SECRET" | npx wrangler secret put STRIPE_WEBHOOK_SECRET

# Resend (get from resend.com)
echo "re_YOUR_KEY_HERE" | npx wrangler secret put RESEND_API_KEY

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. npm run dev        - Start local development"
echo "  2. npm run deploy     - Deploy to Cloudflare Pages"
echo ""
