# Matcha Trading Platform - Setup Assets

This package contains generated assets and configuration files for the Matcha Trading Platform.

## Contents

```
matcha-setup/
├── README.md                    # This file
├── SUPABASE_MIGRATION.md        # Complete Supabase migration guide
├── setup-assets.sh              # Script to copy files to project
├── seed.ts                      # Updated seed file with proper URLs
├── images/                      # Generated product images
│   ├── premium-ceremonial-uji.jpg
│   ├── premium-ceremonial-uji-thumb.jpg
│   ├── organic-culinary-nishio.jpg
│   ├── ... (16 images total + placeholder)
├── docs/                        # Generated PDF specification sheets
│   ├── premium-ceremonial-uji-spec.pdf
│   ├── organic-culinary-nishio-spec.pdf
│   ├── ... (8 PDFs total)
└── scripts/                     # Generation scripts (for reference)
    ├── generate_images.py
    └── generate_pdfs.py
```

## Quick Setup

### Option 1: Automated Setup

1. Copy this entire `matcha-setup` folder to your project root and rename it to `setup-assets`:
   ```bash
   cp -r matcha-setup /path/to/Ochamon/setup-assets
   ```

2. Run the setup script from your project root:
   ```bash
   cd /path/to/Ochamon
   chmod +x setup-assets/setup-assets.sh
   ./setup-assets/setup-assets.sh
   ```

3. Re-seed your database:
   ```bash
   pnpm db:seed
   ```

### Option 2: Manual Setup

1. **Copy images to API uploads:**
   ```bash
   mkdir -p apps/api/uploads/images/products
   cp matcha-setup/images/*.jpg apps/api/uploads/images/products/
   ```

2. **Copy PDFs to API uploads:**
   ```bash
   mkdir -p apps/api/uploads/docs
   cp matcha-setup/docs/*.pdf apps/api/uploads/docs/
   ```

3. **Update seed file:**
   ```bash
   cp matcha-setup/seed.ts apps/api/prisma/seed.ts
   ```

4. **Re-seed database:**
   ```bash
   pnpm db:seed
   ```

## Static File Serving

Make sure your NestJS API is configured to serve static files. In `apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // ... rest of your config
}
```

## Image URLs

After setup, images will be available at:
- Full size: `http://localhost:3001/uploads/images/products/{slug}.jpg`
- Thumbnail: `http://localhost:3001/uploads/images/products/{slug}-thumb.jpg`

## PDF URLs

Specification sheets will be available at:
- `http://localhost:3001/uploads/docs/{slug}-spec.pdf`

## Supabase Migration

See [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) for complete instructions on deploying to production with Supabase.

## Regenerating Assets

If you need to regenerate assets with different products or styling:

```bash
# Install dependencies
pip install Pillow reportlab

# Generate images
python scripts/generate_images.py

# Generate PDFs
python scripts/generate_pdfs.py
```

## Customization

### Adding New Products

1. Add product data to both `generate_images.py` and `generate_pdfs.py`
2. Run both scripts
3. Update `seed.ts` with the new product
4. Re-seed database

### Changing Styles

- **Images**: Edit `GRADE_COLORS` in `generate_images.py`
- **PDFs**: Edit `MATCHA_GREEN`, `MATCHA_LIGHT`, `MATCHA_DARK` in `generate_pdfs.py`

## Troubleshooting

### Images not showing
1. Check the API server is running
2. Verify files exist in `apps/api/uploads/images/products/`
3. Check static file serving is configured in NestJS
4. Check browser console for 404 errors

### PDFs not downloading
1. Verify files exist in `apps/api/uploads/docs/`
2. Check the URL includes the API base URL
3. Ensure proper CORS configuration

### Seed fails
1. Make sure all dependencies are installed
2. Check database connection string
3. Run `pnpm db:generate` first
