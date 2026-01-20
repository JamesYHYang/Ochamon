# Supabase Migration Guide for Matcha Trading Platform

This guide walks you through migrating your local PostgreSQL database to Supabase for production deployment.

## Prerequisites

- Supabase account (free tier available at [supabase.com](https://supabase.com))
- Node.js 18+ installed
- pnpm package manager
- Your local development environment working

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Organization**: Select or create one
   - **Name**: `matcha-trading` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for provisioning (~2 minutes)

## Step 2: Get Connection Strings

Once your project is ready:

1. Go to **Project Settings** → **Database**
2. Find the **Connection string** section
3. Copy the **URI** connection string (looks like):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

**Important**: There are two connection modes:
- **Transaction mode (port 6543)**: For serverless/edge functions, short-lived connections
- **Session mode (port 5432)**: For migrations and long-running connections

For Prisma migrations, use **Session mode (port 5432)**:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## Step 3: Update Environment Variables

### For Migrations (apps/api/.env)

Create or update `apps/api/.env`:

```env
# Supabase Database (Session mode for migrations)
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?schema=public"

# JWT Secrets (generate new secure ones for production!)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server Config
PORT=3001
CORS_ORIGIN=https://your-production-domain.com

# Optional: For connection pooling in production
# DATABASE_URL_POOLED="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true"
```

### For Web App (apps/web/.env.local → .env.production)

Create `apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

## Step 4: Run Database Migrations

```bash
# Navigate to API directory
cd apps/api

# Generate Prisma client (if not already done)
pnpm prisma generate

# Push schema to Supabase (creates tables)
pnpm prisma db push

# Or run migrations if you have them
pnpm prisma migrate deploy
```

**Expected output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-0-..."

🚀  Your database is now in sync with your Prisma schema.
```

## Step 5: Seed the Database

```bash
# Run the seed script
pnpm prisma db seed
```

This will create:
- Demo users (admin, sellers, buyers)
- Regions and grade types
- Sample products with SKUs, prices, and inventory
- Sample RFQs and quotes

## Step 6: Verify in Supabase Dashboard

1. Go to your Supabase project
2. Click on **Table Editor** in the sidebar
3. You should see all your tables:
   - `users`
   - `companies`
   - `seller_profiles`
   - `buyer_profiles`
   - `products`
   - `skus`
   - `price_tiers`
   - `inventory`
   - etc.

4. Click on `users` table to verify demo accounts were created

## Step 7: Configure Row Level Security (RLS) - Optional but Recommended

Supabase has Row Level Security enabled by default. For the API-only approach (your NestJS backend handles auth), you can either:

### Option A: Disable RLS (Simpler, API handles security)

In Supabase SQL Editor, run:

```sql
-- Disable RLS for all tables (API handles auth)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE skus DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE grade_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE carts DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

### Option B: Keep RLS with Service Role Key

Use the `service_role` key in your API (gives full access):

1. Go to **Project Settings** → **API**
2. Copy the `service_role` key (keep this secret!)
3. Your Prisma connection will use this automatically via the password

## Step 8: Production Deployment Checklist

### API (NestJS)

Deploy to: Railway, Render, Fly.io, or any Node.js host

```bash
# Build the API
cd apps/api
pnpm build

# Start in production
NODE_ENV=production pnpm start:prod
```

Environment variables needed:
- `DATABASE_URL` - Supabase connection string
- `JWT_ACCESS_SECRET` - Strong secret (32+ chars)
- `JWT_REFRESH_SECRET` - Strong secret (32+ chars)
- `CORS_ORIGIN` - Your frontend URL

### Web (Next.js)

Deploy to: Vercel (recommended), Netlify, or any Next.js host

```bash
# Build the web app
cd apps/web
pnpm build
```

Environment variables needed:
- `NEXT_PUBLIC_API_URL` - Your deployed API URL

## Step 9: Update CORS for Production

In your API, update CORS settings in `apps/api/src/main.ts`:

```typescript
app.enableCors({
  origin: [
    'https://your-production-domain.com',
    'https://www.your-production-domain.com',
    // Add staging URLs if needed
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
});
```

## Step 10: File Storage (Optional)

For product images and documents, you can use Supabase Storage:

1. Go to **Storage** in Supabase dashboard
2. Create buckets:
   - `product-images` (public)
   - `documents` (private)
3. Update your file upload endpoints to use Supabase Storage

Example upload code:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function uploadProductImage(file: Buffer, filename: string) {
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(`products/${filename}`, file, {
      contentType: 'image/jpeg',
    });
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(`products/${filename}`);
  
  return urlData.publicUrl;
}
```

## Troubleshooting

### Connection Timeout
- Use Session mode (port 5432) for migrations
- Use Transaction mode (port 6543) for runtime with `?pgbouncer=true`

### "prepared statement already exists"
Add `?pgbouncer=true&statement_cache_size=0` to connection string

### Migration Fails
1. Check your password doesn't have special characters that need URL encoding
2. Ensure you're using port 5432 for migrations
3. Check Supabase project is fully provisioned

### Prisma Generate Fails
```bash
# Clear Prisma cache
rm -rf node_modules/.prisma
pnpm prisma generate
```

## Quick Reference Commands

```bash
# Generate Prisma client
pnpm prisma generate

# Push schema changes (dev)
pnpm prisma db push

# Create migration (production)
pnpm prisma migrate dev --name your_migration_name

# Deploy migrations (production)
pnpm prisma migrate deploy

# Seed database
pnpm prisma db seed

# Open Prisma Studio
pnpm prisma studio

# Reset database (CAUTION: deletes all data)
pnpm prisma migrate reset
```

## Demo Accounts (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@matcha-trade.com | Admin123! |
| Seller 1 | seller@kyoto-matcha.com | Seller123! |
| Seller 2 | seller@nishio-green.com | Seller123! |
| Buyer 1 | buyer@urbantea.com | Buyer123! |
| Buyer 2 | buyer@healthybites.com | Buyer123! |

---

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Configure environment variables
3. ✅ Run migrations and seed
4. ⬜ Deploy API to Railway/Render
5. ⬜ Deploy Web to Vercel
6. ⬜ Configure custom domain
7. ⬜ Set up monitoring (Sentry, LogRocket)
8. ⬜ Configure backup schedule in Supabase

Need help? Check the [Supabase Docs](https://supabase.com/docs) or [Prisma Docs](https://www.prisma.io/docs).
