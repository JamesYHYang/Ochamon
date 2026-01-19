-- CreateEnum
CREATE TYPE "CartType" AS ENUM ('DIRECT', 'RFQ');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');

-- CreateTable
CREATE TABLE "shortlist" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "type" "CartType" NOT NULL DEFAULT 'DIRECT',
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "destinationCountry" TEXT,
    "incoterm" "Incoterm",
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cartId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shortlist_buyerProfileId_idx" ON "shortlist"("buyerProfileId");

-- CreateIndex
CREATE INDEX "shortlist_productId_idx" ON "shortlist"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "shortlist_buyerProfileId_productId_key" ON "shortlist"("buyerProfileId", "productId");

-- CreateIndex
CREATE INDEX "carts_userId_status_idx" ON "carts"("userId", "status");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_skuId_key" ON "cart_items"("cartId", "skuId");

-- AddForeignKey
ALTER TABLE "shortlist" ADD CONSTRAINT "shortlist_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "buyer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist" ADD CONSTRAINT "shortlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
