// Matcha Trading Platform - Database Seed Script
// This file creates demo data for development and testing

import { PrismaClient, UserRole, ProductStatus, RfqStatus, QuoteStatus, Incoterm, CartType, CartStatus, DocumentType, TrendSeriesType } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

// Helper to create slug from name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🌱 Starting seed...\n');

  // Clear existing data (in reverse order of dependencies)
  console.log('🧹 Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.trendPoint.deleteMany();
  await prisma.trendSeries.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderLineItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.complianceEvaluation.deleteMany();
  await prisma.complianceRule.deleteMany();
  await prisma.quoteLineItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.rfqLineItem.deleteMany();
  await prisma.rfq.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.shortlist.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.priceTier.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.productDocument.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.gradeType.deleteMany();
  await prisma.region.deleteMany();
  await prisma.insightsPost.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.buyerProfile.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // ==================== REGIONS ====================
  console.log('📍 Creating regions...');
  const regions = await Promise.all([
    prisma.region.create({
      data: {
        name: 'Uji, Kyoto',
        country: 'Japan',
        description: 'The most prestigious matcha-producing region, known for over 800 years of tea cultivation.',
      },
    }),
    prisma.region.create({
      data: {
        name: 'Nishio, Aichi',
        country: 'Japan',
        description: 'Produces approximately 60% of Japan\'s matcha, known for consistent quality.',
      },
    }),
    prisma.region.create({
      data: {
        name: 'Shizuoka',
        country: 'Japan',
        description: 'Japan\'s largest tea-producing region with diverse microclimates.',
      },
    }),
    prisma.region.create({
      data: {
        name: 'Kagoshima',
        country: 'Japan',
        description: 'Southern region with early harvests and unique volcanic soil.',
      },
    }),
    prisma.region.create({
      data: {
        name: 'Kyoto',
        country: 'Japan',
        description: 'Historical center of Japanese tea culture with multiple growing areas.',
      },
    }),
  ]);

  // ==================== GRADE TYPES ====================
  console.log('🏆 Creating grade types...');
  const gradeTypes = await Promise.all([
    prisma.gradeType.create({
      data: {
        name: 'Competition Grade',
        code: 'COMP',
        description: 'Highest quality reserved for tea competitions. Hand-picked, stone-ground by master craftsmen.',
        sortOrder: 1,
      },
    }),
    prisma.gradeType.create({
      data: {
        name: 'Ceremonial Grade',
        code: 'CERE',
        description: 'Premium quality suitable for traditional Japanese tea ceremonies.',
        sortOrder: 2,
      },
    }),
    prisma.gradeType.create({
      data: {
        name: 'Premium Grade',
        code: 'PREM',
        description: 'High-quality matcha suitable for daily drinking and premium beverages.',
        sortOrder: 3,
      },
    }),
    prisma.gradeType.create({
      data: {
        name: 'Culinary Grade',
        code: 'CULI',
        description: 'Designed for cooking, baking, and blended beverages.',
        sortOrder: 4,
      },
    }),
  ]);

  // ==================== COMPANIES ====================
  console.log('🏢 Creating companies...');
  const companies = await Promise.all([
    // Seller Companies
    prisma.company.create({
      data: {
        name: 'Kyoto Matcha Farm',
        legalName: 'Kyoto Matcha Farm Co., Ltd.',
        taxId: 'JP1234567890',
        website: 'https://kyoto-matcha.example.com',
        phone: '+81-75-123-4567',
        email: 'info@kyoto-matcha.example.com',
        description: 'Family-owned matcha farm in Uji, Kyoto since 1892. Specializing in ceremonial-grade matcha.',
        addresses: {
          create: {
            label: 'Main Farm',
            line1: '123 Tea Garden Road',
            city: 'Uji',
            state: 'Kyoto',
            postalCode: '611-0011',
            country: 'JP',
            isDefault: true,
          },
        },
      },
    }),
    prisma.company.create({
      data: {
        name: 'Nishio Green Tea Co.',
        legalName: 'Nishio Green Tea Corporation',
        taxId: 'JP0987654321',
        website: 'https://nishio-tea.example.com',
        phone: '+81-566-98-7654',
        email: 'sales@nishio-tea.example.com',
        description: 'Large-scale matcha producer in Nishio, Aichi. Organic certified with modern facilities.',
        addresses: {
          create: {
            label: 'Headquarters',
            line1: '456 Green Leaf Avenue',
            city: 'Nishio',
            state: 'Aichi',
            postalCode: '445-0073',
            country: 'JP',
            isDefault: true,
          },
        },
      },
    }),
    // Buyer Companies
    prisma.company.create({
      data: {
        name: 'Urban Tea Co.',
        legalName: 'Urban Tea Company LLC',
        taxId: 'US123456789',
        website: 'https://urbantea.example.com',
        phone: '+1-415-555-0123',
        email: 'purchasing@urbantea.example.com',
        description: 'Premium tea café chain in the San Francisco Bay Area.',
        addresses: {
          create: {
            label: 'Corporate Office',
            line1: '789 Market Street',
            line2: 'Suite 500',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94103',
            country: 'US',
            isDefault: true,
          },
        },
      },
    }),
    prisma.company.create({
      data: {
        name: 'Healthy Bites Cafe',
        legalName: 'Healthy Bites Inc.',
        taxId: 'US987654321',
        website: 'https://healthybites.example.com',
        phone: '+1-212-555-0456',
        email: 'orders@healthybites.example.com',
        description: 'Health-focused café chain specializing in organic beverages and foods.',
        addresses: {
          create: {
            label: 'Main Office',
            line1: '321 Broadway',
            city: 'New York',
            state: 'NY',
            postalCode: '10007',
            country: 'US',
            isDefault: true,
          },
        },
      },
    }),
  ]);

  // ==================== USERS ====================
  console.log('👤 Creating users...');
  const hashedPassword = await hashPassword('Admin123!');
  const sellerPassword = await hashPassword('Seller123!');
  const buyerPassword = await hashPassword('Buyer123!');

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@matcha-trade.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });

  // Seller users
  const seller1User = await prisma.user.create({
    data: {
      email: 'seller@kyoto-matcha.com',
      passwordHash: sellerPassword,
      name: 'Tanaka Kenji',
      role: UserRole.SELLER,
      companyId: companies[0].id,
    },
  });

  const seller2User = await prisma.user.create({
    data: {
      email: 'seller@nishio-green.com',
      passwordHash: sellerPassword,
      name: 'Yamamoto Akiko',
      role: UserRole.SELLER,
      companyId: companies[1].id,
    },
  });

  // Buyer users
  const buyer1User = await prisma.user.create({
    data: {
      email: 'buyer@urbantea.com',
      passwordHash: buyerPassword,
      name: 'Sarah Johnson',
      role: UserRole.BUYER,
      companyId: companies[2].id,
    },
  });

  const buyer2User = await prisma.user.create({
    data: {
      email: 'buyer@healthybites.com',
      passwordHash: buyerPassword,
      name: 'Michael Chen',
      role: UserRole.BUYER,
      companyId: companies[3].id,
    },
  });

  // ==================== SELLER PROFILES ====================
  console.log('🏪 Creating seller profiles...');
  const sellerProfiles = await Promise.all([
    prisma.sellerProfile.create({
      data: {
        userId: seller1User.id,
        companyId: companies[0].id,
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
        yearsInBusiness: 130,
        annualCapacityKg: 5000,
        exportLicenseNo: 'JP-EXP-2024-001',
        isOrganic: true,
        isJasCertified: true,
        isUsdaCertified: true,
        isEuCertified: true,
        bio: 'Fifth-generation matcha farmers dedicated to preserving traditional cultivation methods while embracing sustainable practices.',
      },
    }),
    prisma.sellerProfile.create({
      data: {
        userId: seller2User.id,
        companyId: companies[1].id,
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
        yearsInBusiness: 45,
        annualCapacityKg: 50000,
        exportLicenseNo: 'JP-EXP-2024-002',
        isOrganic: true,
        isJasCertified: true,
        isUsdaCertified: false,
        isEuCertified: true,
        bio: 'Modern matcha production facility with traditional stone grinding and state-of-the-art quality control.',
      },
    }),
  ]);

  // ==================== BUYER PROFILES ====================
  console.log('🛒 Creating buyer profiles...');
  const buyerProfiles = await Promise.all([
    prisma.buyerProfile.create({
      data: {
        userId: buyer1User.id,
        companyId: companies[2].id,
        businessType: 'Cafe Chain',
        annualVolumeKg: 500,
        preferredIncoterm: Incoterm.DDP,
      },
    }),
    prisma.buyerProfile.create({
      data: {
        userId: buyer2User.id,
        companyId: companies[3].id,
        businessType: 'Restaurant Chain',
        annualVolumeKg: 300,
        preferredIncoterm: Incoterm.CIF,
      },
    }),
  ]);

  // ==================== PRODUCTS ====================
  console.log('🍵 Creating products...');
  
  // Product data with image and document references
  const productData = [
    {
      name: 'Premium Ceremonial Uji',
      slug: 'premium-ceremonial-uji',
      description: 'Our finest ceremonial grade matcha from first harvest leaves in Uji, Kyoto. Stone-ground to a silky 1000+ mesh powder with an intense umami flavor and vibrant green color.',
      shortDesc: 'First harvest ceremonial matcha from Uji',
      leadTimeDays: 14,
      moqKg: 5,
      certifications: ['JAS Organic', 'USDA Organic', 'EU Organic'],
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      sellerId: sellerProfiles[0].id,
      regionId: regions[0].id,
      gradeTypeId: gradeTypes[1].id,
      skus: [
        { sku: 'PCU-30G-TIN', name: '30g Tin', packagingType: 'Tin', netWeightG: 30, pricePerUnit: 45 },
        { sku: 'PCU-100G-POUCH', name: '100g Pouch', packagingType: 'Pouch', netWeightG: 100, pricePerUnit: 120 },
        { sku: 'PCU-500G-BAG', name: '500g Bulk Bag', packagingType: 'Bag', netWeightG: 500, pricePerUnit: 500 },
        { sku: 'PCU-1KG-BAG', name: '1kg Bulk Bag', packagingType: 'Bag', netWeightG: 1000, pricePerUnit: 900 },
      ],
    },
    {
      name: 'Organic Culinary Nishio',
      slug: 'organic-culinary-nishio',
      description: 'Versatile culinary-grade matcha perfect for lattes, baking, and cooking. Robust flavor that stands up to milk and other ingredients.',
      shortDesc: 'Organic culinary matcha for cooking and lattes',
      leadTimeDays: 10,
      moqKg: 10,
      certifications: ['JAS Organic', 'USDA Organic'],
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      sellerId: sellerProfiles[1].id,
      regionId: regions[1].id,
      gradeTypeId: gradeTypes[3].id,
      skus: [
        { sku: 'OCN-100G-POUCH', name: '100g Pouch', packagingType: 'Pouch', netWeightG: 100, pricePerUnit: 25 },
        { sku: 'OCN-500G-BAG', name: '500g Bulk Bag', packagingType: 'Bag', netWeightG: 500, pricePerUnit: 100 },
        { sku: 'OCN-1KG-BAG', name: '1kg Bulk Bag', packagingType: 'Bag', netWeightG: 1000, pricePerUnit: 180 },
      ],
    },
    {
      name: 'Classic Usucha Blend',
      slug: 'classic-usucha-blend',
      description: 'A balanced everyday matcha blend perfect for usucha (thin tea) preparation. Smooth taste with pleasant umami notes.',
      shortDesc: 'Balanced blend for daily drinking',
      leadTimeDays: 12,
      moqKg: 5,
      certifications: ['JAS Organic'],
      status: ProductStatus.ACTIVE,
      isFeatured: false,
      sellerId: sellerProfiles[0].id,
      regionId: regions[0].id,
      gradeTypeId: gradeTypes[2].id,
      skus: [
        { sku: 'CUB-30G-TIN', name: '30g Tin', packagingType: 'Tin', netWeightG: 30, pricePerUnit: 28 },
        { sku: 'CUB-100G-POUCH', name: '100g Pouch', packagingType: 'Pouch', netWeightG: 100, pricePerUnit: 75 },
        { sku: 'CUB-500G-BAG', name: '500g Bulk Bag', packagingType: 'Bag', netWeightG: 500, pricePerUnit: 320 },
      ],
    },
    {
      name: 'First Harvest Shincha',
      slug: 'first-harvest-shincha',
      description: 'Limited edition first harvest matcha, available seasonally. Exceptionally fresh with bright, grassy notes.',
      shortDesc: 'Seasonal first harvest, limited availability',
      leadTimeDays: 7,
      moqKg: 2,
      certifications: ['JAS Organic', 'Single Origin'],
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      sellerId: sellerProfiles[0].id,
      regionId: regions[2].id,
      gradeTypeId: gradeTypes[1].id,
      skus: [
        { sku: 'FHS-30G-TIN', name: '30g Tin', packagingType: 'Tin', netWeightG: 30, pricePerUnit: 55 },
        { sku: 'FHS-100G-POUCH', name: '100g Pouch', packagingType: 'Pouch', netWeightG: 100, pricePerUnit: 150 },
      ],
    },
    {
      name: 'Daily Matcha Kagoshima',
      slug: 'daily-matcha-kagoshima',
      description: 'Affordable everyday matcha from Kagoshima. Great value for high-volume applications.',
      shortDesc: 'Budget-friendly matcha for daily use',
      leadTimeDays: 7,
      moqKg: 25,
      certifications: [],
      status: ProductStatus.ACTIVE,
      isFeatured: false,
      sellerId: sellerProfiles[1].id,
      regionId: regions[3].id,
      gradeTypeId: gradeTypes[3].id,
      skus: [
        { sku: 'DMK-500G-BAG', name: '500g Bulk Bag', packagingType: 'Bag', netWeightG: 500, pricePerUnit: 60 },
        { sku: 'DMK-1KG-BAG', name: '1kg Bulk Bag', packagingType: 'Bag', netWeightG: 1000, pricePerUnit: 100 },
        { sku: 'DMK-5KG-DRUM', name: '5kg Drum', packagingType: 'Drum', netWeightG: 5000, pricePerUnit: 450 },
      ],
    },
    {
      name: 'Competition Grade Uji',
      slug: 'competition-grade-uji',
      description: 'Ultra-premium competition-grade matcha. Hand-picked and stone-ground by master craftsmen. Reserved for the most discerning tea connoisseurs.',
      shortDesc: 'Ultra-premium competition quality',
      leadTimeDays: 21,
      moqKg: 1,
      certifications: ['JAS Organic', 'Award Winner', 'Single Estate'],
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      sellerId: sellerProfiles[0].id,
      regionId: regions[0].id,
      gradeTypeId: gradeTypes[0].id,
      skus: [
        { sku: 'CGU-20G-TIN', name: '20g Tin', packagingType: 'Tin', netWeightG: 20, pricePerUnit: 80 },
        { sku: 'CGU-40G-TIN', name: '40g Tin', packagingType: 'Tin', netWeightG: 40, pricePerUnit: 150 },
      ],
    },
    {
      name: 'Organic Ceremonial Kyoto',
      slug: 'organic-ceremonial-kyoto',
      description: 'Pure organic ceremonial matcha from Kyoto region farms. Smooth, refined taste suitable for traditional tea preparation.',
      shortDesc: 'Organic ceremonial matcha from Kyoto',
      leadTimeDays: 14,
      moqKg: 5,
      certifications: ['JAS Organic', 'USDA Organic', 'EU Organic', 'Kosher'],
      status: ProductStatus.ACTIVE,
      isFeatured: false,
      sellerId: sellerProfiles[0].id,
      regionId: regions[4].id,
      gradeTypeId: gradeTypes[1].id,
      skus: [
        { sku: 'OCK-30G-TIN', name: '30g Tin', packagingType: 'Tin', netWeightG: 30, pricePerUnit: 42 },
        { sku: 'OCK-100G-POUCH', name: '100g Pouch', packagingType: 'Pouch', netWeightG: 100, pricePerUnit: 110 },
        { sku: 'OCK-500G-BAG', name: '500g Bulk Bag', packagingType: 'Bag', netWeightG: 500, pricePerUnit: 480 },
      ],
    },
    {
      name: 'Cafe Blend Matcha',
      slug: 'cafe-blend-matcha',
      description: 'Specially blended for café and food service applications. Consistent quality batch-to-batch with strong flavor that holds up in lattes.',
      shortDesc: 'Consistent blend for food service',
      leadTimeDays: 7,
      moqKg: 20,
      certifications: ['Food Service Grade'],
      status: ProductStatus.ACTIVE,
      isFeatured: false,
      sellerId: sellerProfiles[1].id,
      regionId: regions[1].id,
      gradeTypeId: gradeTypes[3].id,
      skus: [
        { sku: 'CBM-500G-BAG', name: '500g Bulk Bag', packagingType: 'Bag', netWeightG: 500, pricePerUnit: 70 },
        { sku: 'CBM-1KG-BAG', name: '1kg Bulk Bag', packagingType: 'Bag', netWeightG: 1000, pricePerUnit: 125 },
        { sku: 'CBM-5KG-DRUM', name: '5kg Drum', packagingType: 'Drum', netWeightG: 5000, pricePerUnit: 550 },
      ],
    },
  ];

  const createdProducts = [];

  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDesc: p.shortDesc,
        leadTimeDays: p.leadTimeDays,
        moqKg: p.moqKg,
        certifications: p.certifications,
        status: p.status,
        isFeatured: p.isFeatured,
        sellerId: p.sellerId,
        regionId: p.regionId,
        gradeTypeId: p.gradeTypeId,
        // Create product images
        images: {
          create: [
            {
              url: `/uploads/images/products/${p.slug}.jpg`,
              altText: p.name,
              sortOrder: 0,
              isPrimary: true,
            },
            {
              url: `/uploads/images/products/${p.slug}-thumb.jpg`,
              altText: `${p.name} thumbnail`,
              sortOrder: 1,
              isPrimary: false,
            },
          ],
        },
        // Create product documents (spec sheets)
        documents: {
          create: [
            {
              type: DocumentType.SPEC_SHEET,
              name: `${p.name} - Specification Sheet`,
              url: `/uploads/docs/${p.slug}-spec.pdf`,
              fileSize: 150000, // ~150KB
            },
          ],
        },
        // Create SKUs with price tiers and inventory
        skus: {
          create: p.skus.map((sku) => ({
            sku: sku.sku,
            name: sku.name,
            packagingType: sku.packagingType,
            netWeightG: sku.netWeightG,
            originCountry: 'JP',
            currency: 'USD',
            priceTiers: {
              create: [
                { minQty: 1, maxQty: 9, unit: 'unit', pricePerUnit: sku.pricePerUnit },
                { minQty: 10, maxQty: 49, unit: 'unit', pricePerUnit: sku.pricePerUnit * 0.95 },
                { minQty: 50, maxQty: null, unit: 'unit', pricePerUnit: sku.pricePerUnit * 0.90 },
              ],
            },
            inventory: {
              create: {
                availableQty: Math.floor(Math.random() * 200) + 50,
                reservedQty: Math.floor(Math.random() * 20),
                unit: 'unit',
                warehouseLocation: p.sellerId === sellerProfiles[0].id ? 'Uji-WH1' : 'Nishio-WH2',
              },
            },
          })),
        },
      },
      include: {
        skus: true,
      },
    });
    createdProducts.push(product);
    console.log(`  ✓ Created product: ${product.name}`);
  }

  // ==================== SAMPLE RFQ ====================
  console.log('📋 Creating sample RFQ...');
  const rfq = await prisma.rfq.create({
    data: {
      rfqNumber: 'RFQ-2024-0001',
      buyerProfileId: buyerProfiles[0].id,
      title: 'Q2 Matcha Supply for Bay Area Cafes',
      notes: 'Looking for reliable matcha supply for our 12 cafe locations. Need ceremonial grade for traditional service and culinary grade for lattes.',
      destinationCountry: 'US',
      destinationCity: 'San Francisco',
      incoterm: Incoterm.DDP,
      neededByDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: RfqStatus.SUBMITTED,
      lineItems: {
        create: [
          {
            skuId: createdProducts[0].skus[2].id, // 500g bag
            qty: 50,
            unit: 'unit',
            notes: 'Prefer vacuum-sealed packaging',
          },
          {
            skuId: createdProducts[1].skus[1].id, // 500g bag
            qty: 100,
            unit: 'unit',
            notes: 'For latte preparation',
          },
        ],
      },
    },
    include: {
      lineItems: true,
    },
  });

  // ==================== SAMPLE QUOTE ====================
  console.log('💰 Creating sample quote...');
  await prisma.quote.create({
    data: {
      quoteNumber: 'QT-2024-0001',
      rfqId: rfq.id,
      sellerProfileId: sellerProfiles[0].id,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      subtotal: 35000,
      shippingCost: 1500,
      taxAmount: 0,
      totalAmount: 36500,
      currency: 'USD',
      incoterm: Incoterm.DDP,
      estimatedLeadDays: 21,
      notes: 'Price includes air freight and customs clearance. 30-day payment terms available for established customers.',
      status: QuoteStatus.SUBMITTED,
      lineItems: {
        create: [
          {
            skuId: createdProducts[0].skus[2].id,
            qty: 50,
            unit: 'unit',
            unitPrice: 475, // 5% discount from listed price
            totalPrice: 23750,
            notes: 'Ceremonial grade, vacuum sealed',
          },
          {
            skuId: createdProducts[1].skus[1].id,
            qty: 100,
            unit: 'unit',
            unitPrice: 95, // Bulk discount
            totalPrice: 9500,
            notes: 'Culinary grade for café use',
          },
        ],
      },
    },
  });

  // ==================== SAMPLE CART ====================
  console.log('🛒 Creating sample cart...');
  const skuForCart = createdProducts[2].skus[0]; // Classic Usucha 30g tin
  const unitPrice = 28; // Price from productData
  const qty = 10;
  
  await prisma.cart.create({
    data: {
      userId: buyer1User.id,
      type: CartType.DIRECT,
      status: CartStatus.ACTIVE,
      subtotal: unitPrice * qty,
      itemCount: 1,
      items: {
        create: [
          {
            skuId: skuForCart.id,
            qty: qty,
            unit: 'unit',
            unitPrice: unitPrice,
            totalPrice: unitPrice * qty,
            currency: 'USD',
          },
        ],
      },
    },
  });

  // ==================== SHORTLIST ====================
  console.log('⭐ Creating shortlist entries...');
  await prisma.shortlist.create({
    data: {
      buyerProfileId: buyerProfiles[0].id,
      productId: createdProducts[0].id,
      notes: 'Great quality, considering for next quarter order',
    },
  });

  await prisma.shortlist.create({
    data: {
      buyerProfileId: buyerProfiles[0].id,
      productId: createdProducts[5].id,
      notes: 'Competition grade for special events',
    },
  });

  // ==================== COMPLIANCE RULES ====================
  console.log('📜 Creating compliance rules...');
  await prisma.complianceRule.create({
    data: {
      destinationCountry: 'US',
      productCategory: 'matcha',
      minDeclaredValueUsd: 2500,
      requiredCertifications: [],
      requiredDocs: ['commercial-invoice', 'packing-list'],
      warnings: ['FDA prior notice required for food imports'],
      disclaimerText: 'Buyer is responsible for ensuring compliance with FDA food import regulations and any applicable state requirements.',
      createdByAdminId: adminUser.id,
    },
  });

  await prisma.complianceRule.create({
    data: {
      destinationCountry: 'EU',
      productCategory: 'organic-tea',
      requiredCertifications: ['EU Organic'],
      requiredDocs: ['certificate-of-origin', 'organic-certificate', 'phytosanitary-certificate'],
      warnings: ['EU organic certification required for organic labeling'],
      disclaimerText: 'Products marketed as organic in the EU must have valid EU organic certification. Buyer assumes responsibility for proper documentation.',
      createdByAdminId: adminUser.id,
    },
  });

  // ==================== CONTENT (Categories & Tags) ====================
  console.log('📰 Creating content categories and tags...');
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: 'Industry News', slug: 'industry-news', description: 'Latest news from the matcha industry', sortOrder: 1 },
    }),
    prisma.category.create({
      data: { name: 'Market Trends', slug: 'market-trends', description: 'Market analysis and pricing trends', sortOrder: 2 },
    }),
    prisma.category.create({
      data: { name: 'Guides', slug: 'guides', description: 'Educational guides and how-tos', sortOrder: 3 },
    }),
  ]);

  await Promise.all([
    prisma.tag.create({ data: { name: 'Organic', slug: 'organic' } }),
    prisma.tag.create({ data: { name: 'Pricing', slug: 'pricing' } }),
    prisma.tag.create({ data: { name: 'Sustainability', slug: 'sustainability' } }),
    prisma.tag.create({ data: { name: 'Quality', slug: 'quality' } }),
  ]);

  // Sample insight post
  await prisma.insightsPost.create({
    data: {
      title: '2024 Matcha Market Outlook',
      slug: '2024-matcha-market-outlook',
      excerpt: 'An analysis of global matcha demand trends and what they mean for B2B buyers.',
      content: `
## Global Matcha Market Overview

The global matcha market continues to show strong growth, driven by increasing consumer awareness of health benefits and the expansion of matcha-based products in cafes and food service.

### Key Trends for 2024

1. **Organic Certification Demand**: Buyers increasingly require organic certification, particularly for ceremonial-grade products.

2. **Supply Chain Resilience**: Following recent disruptions, buyers are diversifying their supplier base across multiple regions.

3. **Sustainability Focus**: Environmental certifications and sustainable farming practices are becoming key differentiators.

### Price Projections

Ceremonial-grade matcha prices are expected to remain stable, while culinary-grade may see slight increases due to rising demand from food manufacturers.
      `,
      isPublished: true,
      publishedAt: new Date(),
      authorId: adminUser.id,
      categoryId: categories[1].id,
    },
  });

  // ==================== TREND DATA ====================
  console.log('📈 Creating trend series...');
  const pricingSeries = await prisma.trendSeries.create({
    data: {
      name: 'Ceremonial Matcha Price Index',
      description: 'Average wholesale price for ceremonial-grade matcha',
      type: TrendSeriesType.PRICING,
      unit: 'USD/kg',
      regionId: regions[0].id,
    },
  });

  // Generate 12 months of price data
  const basePrice = 95;
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const variation = (Math.random() - 0.5) * 10;
    await prisma.trendPoint.create({
      data: {
        seriesId: pricingSeries.id,
        date: date,
        value: basePrice + variation,
        unit: 'USD/kg',
      },
    });
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('  Admin: admin@matcha-trade.com / Admin123!');
  console.log('  Seller 1: seller@kyoto-matcha.com / Seller123!');
  console.log('  Seller 2: seller@nishio-green.com / Seller123!');
  console.log('  Buyer 1: buyer@urbantea.com / Buyer123!');
  console.log('  Buyer 2: buyer@healthybites.com / Buyer123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
