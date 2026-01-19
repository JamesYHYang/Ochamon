-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'QUOTED', 'PARTIALLY_QUOTED', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "Incoterm" AS ENUM ('EXW', 'FOB', 'CIF', 'DDP', 'DAP');

-- CreateEnum
CREATE TYPE "TrendSeriesType" AS ENUM ('PRICING', 'WEATHER', 'DEMAND', 'SUPPLY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('COA', 'COO', 'ORGANIC_CERT', 'JAS_CERT', 'USDA_CERT', 'EU_CERT', 'PHYTOSANITARY', 'SPEC_SHEET', 'SDS', 'OTHER');

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "companyId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "yearsInBusiness" INTEGER,
    "annualCapacityKg" INTEGER,
    "exportLicenseNo" TEXT,
    "isOrganic" BOOLEAN NOT NULL DEFAULT false,
    "isJasCertified" BOOLEAN NOT NULL DEFAULT false,
    "isUsdaCertified" BOOLEAN NOT NULL DEFAULT false,
    "isEuCertified" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "bannerImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_profiles" (
    "id" TEXT NOT NULL,
    "businessType" TEXT,
    "annualVolumeKg" INTEGER,
    "preferredIncoterm" "Incoterm",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "buyer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDesc" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 14,
    "moqKg" DECIMAL(10,2) NOT NULL,
    "certifications" TEXT[],
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "gradeTypeId" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skus" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "packagingType" TEXT NOT NULL,
    "netWeightG" INTEGER NOT NULL,
    "lengthCm" DECIMAL(6,2),
    "widthCm" DECIMAL(6,2),
    "heightCm" DECIMAL(6,2),
    "grossWeightG" INTEGER,
    "hsCode" TEXT,
    "originCountry" TEXT NOT NULL DEFAULT 'JP',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_tiers" (
    "id" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "skuId" TEXT NOT NULL,

    CONSTRAINT "price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "warehouseLocation" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "skuId" TEXT NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_documents" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "product_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfqs" (
    "id" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "destinationCountry" TEXT NOT NULL,
    "destinationCity" TEXT,
    "incoterm" "Incoterm" NOT NULL DEFAULT 'FOB',
    "neededByDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "buyerProfileId" TEXT NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_line_items" (
    "id" TEXT NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "notes" TEXT,
    "targetPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rfqId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,

    CONSTRAINT "rfq_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shippingCost" DECIMAL(10,2),
    "taxAmount" DECIMAL(10,2),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "incoterm" "Incoterm" NOT NULL,
    "estimatedLeadDays" INTEGER,
    "notes" TEXT,
    "termsConditions" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rfqId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quoteId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shippingCost" DECIMAL(10,2),
    "taxAmount" DECIMAL(10,2),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "shipToName" TEXT NOT NULL,
    "shipToLine1" TEXT NOT NULL,
    "shipToLine2" TEXT,
    "shipToCity" TEXT NOT NULL,
    "shipToState" TEXT,
    "shipToPostal" TEXT NOT NULL,
    "shipToCountry" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "buyerNotes" TEXT,
    "sellerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quoteId" TEXT NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line_items" (
    "id" TEXT NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,

    CONSTRAINT "order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "notes" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rfqId" TEXT NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "productCategory" TEXT,
    "thresholdKg" DECIMAL(10,2),
    "thresholdValue" DECIMAL(12,2),
    "requiredDocs" TEXT[],
    "warnings" TEXT[],
    "sourceUrl" TEXT,
    "sourceAuthority" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "insights_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TrendSeriesType" NOT NULL,
    "unit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "regionId" TEXT,

    CONSTRAINT "trend_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_points" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seriesId" TEXT NOT NULL,

    CONSTRAINT "trend_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InsightsPostToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "grade_types_name_key" ON "grade_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "grade_types_code_key" ON "grade_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "addresses_companyId_idx" ON "addresses"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_userId_key" ON "seller_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_companyId_key" ON "seller_profiles"("companyId");

-- CreateIndex
CREATE INDEX "seller_profiles_verificationStatus_idx" ON "seller_profiles"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "buyer_profiles_userId_key" ON "buyer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "buyer_profiles_companyId_key" ON "buyer_profiles"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- CreateIndex
CREATE INDEX "products_regionId_idx" ON "products"("regionId");

-- CreateIndex
CREATE INDEX "products_gradeTypeId_idx" ON "products"("gradeTypeId");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skus_sku_key" ON "skus"("sku");

-- CreateIndex
CREATE INDEX "skus_productId_idx" ON "skus"("productId");

-- CreateIndex
CREATE INDEX "price_tiers_skuId_idx" ON "price_tiers"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_skuId_key" ON "inventory"("skuId");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE INDEX "product_documents_productId_idx" ON "product_documents"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_rfqNumber_key" ON "rfqs"("rfqNumber");

-- CreateIndex
CREATE INDEX "rfqs_buyerProfileId_idx" ON "rfqs"("buyerProfileId");

-- CreateIndex
CREATE INDEX "rfqs_status_idx" ON "rfqs"("status");

-- CreateIndex
CREATE INDEX "rfq_line_items_rfqId_idx" ON "rfq_line_items"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE INDEX "quotes_rfqId_idx" ON "quotes"("rfqId");

-- CreateIndex
CREATE INDEX "quotes_sellerProfileId_idx" ON "quotes"("sellerProfileId");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quote_line_items_quoteId_idx" ON "quote_line_items"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_quoteId_key" ON "orders"("quoteId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_line_items_orderId_idx" ON "order_line_items"("orderId");

-- CreateIndex
CREATE INDEX "order_status_history_orderId_idx" ON "order_status_history"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "message_threads_rfqId_key" ON "message_threads"("rfqId");

-- CreateIndex
CREATE INDEX "messages_threadId_idx" ON "messages"("threadId");

-- CreateIndex
CREATE INDEX "messages_senderUserId_idx" ON "messages"("senderUserId");

-- CreateIndex
CREATE INDEX "compliance_rules_destinationCountry_idx" ON "compliance_rules"("destinationCountry");

-- CreateIndex
CREATE INDEX "compliance_rules_isActive_idx" ON "compliance_rules"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "insights_posts_slug_key" ON "insights_posts"("slug");

-- CreateIndex
CREATE INDEX "insights_posts_isPublished_idx" ON "insights_posts"("isPublished");

-- CreateIndex
CREATE INDEX "insights_posts_categoryId_idx" ON "insights_posts"("categoryId");

-- CreateIndex
CREATE INDEX "insights_posts_authorId_idx" ON "insights_posts"("authorId");

-- CreateIndex
CREATE INDEX "trend_series_type_idx" ON "trend_series"("type");

-- CreateIndex
CREATE INDEX "trend_series_regionId_idx" ON "trend_series"("regionId");

-- CreateIndex
CREATE INDEX "trend_points_seriesId_idx" ON "trend_points"("seriesId");

-- CreateIndex
CREATE INDEX "trend_points_date_idx" ON "trend_points"("date");

-- CreateIndex
CREATE UNIQUE INDEX "_InsightsPostToTag_AB_unique" ON "_InsightsPostToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_InsightsPostToTag_B_index" ON "_InsightsPostToTag"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_gradeTypeId_fkey" FOREIGN KEY ("gradeTypeId") REFERENCES "grade_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skus" ADD CONSTRAINT "skus_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "buyer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_line_items" ADD CONSTRAINT "rfq_line_items_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_line_items" ADD CONSTRAINT "rfq_line_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights_posts" ADD CONSTRAINT "insights_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights_posts" ADD CONSTRAINT "insights_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_series" ADD CONSTRAINT "trend_series_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_points" ADD CONSTRAINT "trend_points_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "trend_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InsightsPostToTag" ADD CONSTRAINT "_InsightsPostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "insights_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InsightsPostToTag" ADD CONSTRAINT "_InsightsPostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
