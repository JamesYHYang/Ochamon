#!/bin/bash
# Matcha Trading Platform - Asset Setup Script
# This script copies generated images and PDFs to the correct locations in your project

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🍵 Matcha Trading Platform - Asset Setup${NC}"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Create directories if they don't exist
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p apps/api/uploads/images/products
mkdir -p apps/api/uploads/docs
mkdir -p apps/web/public/images/products

# Copy product images
echo -e "${YELLOW}Copying product images...${NC}"
if [ -d "setup-assets/images" ]; then
    cp setup-assets/images/*.jpg apps/api/uploads/images/products/
    cp setup-assets/images/*.jpg apps/web/public/images/products/
    echo -e "${GREEN}  ✓ Copied $(ls -1 setup-assets/images/*.jpg 2>/dev/null | wc -l) images${NC}"
else
    echo -e "${RED}  ✗ Image directory not found (setup-assets/images)${NC}"
fi

# Copy PDF spec sheets
echo -e "${YELLOW}Copying PDF specification sheets...${NC}"
if [ -d "setup-assets/docs" ]; then
    cp setup-assets/docs/*.pdf apps/api/uploads/docs/
    echo -e "${GREEN}  ✓ Copied $(ls -1 setup-assets/docs/*.pdf 2>/dev/null | wc -l) PDFs${NC}"
else
    echo -e "${RED}  ✗ Docs directory not found (setup-assets/docs)${NC}"
fi

# Update seed file if provided
if [ -f "setup-assets/seed.ts" ]; then
    echo -e "${YELLOW}Updating seed file...${NC}"
    cp setup-assets/seed.ts apps/api/prisma/seed.ts
    echo -e "${GREEN}  ✓ Updated seed.ts${NC}"
fi

echo ""
echo -e "${GREEN}✅ Asset setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm db:seed' to re-seed with new image/doc URLs"
echo "  2. Restart your development server"
echo "  3. Check the marketplace to see product images"
echo ""
echo "File locations:"
echo "  - Product images: apps/api/uploads/images/products/"
echo "  - Spec sheets: apps/api/uploads/docs/"
echo "  - Seed file: apps/api/prisma/seed.ts"
