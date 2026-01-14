import { 
  PrismaClient, 
  UserRole, 
  VerificationStatus,
  ProductStatus,
  MatchaGrade,
  MatchaOrigin,
  InsightCategory,
  ComplianceCategory,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...\n');

  // Clean existing data in correct order
  console.log('🧹 Cleaning existing data...');
  await prisma.trendPoint.deleteMany();
  await prisma.trendSeries.deleteMany();
  await prisma.insightPost.deleteMany();
  await prisma.complianceRule.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.orderLineItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quoteLineItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.rfqLineItem.deleteMany();
  await prisma.rfq.deleteMany();
  await prisma.priceTier.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.product.deleteMany();
  await prisma.sellerVerification.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.buyerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // ============== ADMIN USER ==============
  console.log('\n👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@matcha-trade.com',
      passwordHash: adminPassword,
      name: 'Platform Admin',
      role: UserRole.ADMIN,
      isVerified: true,
      companyName: 'Matcha Trading Platform',
    },
  });
  console.log(`   ✅ Admin: ${admin.email}`);

  // ============== SELLER 1: Kyoto Premium ==============
  console.log('\n🏭 Creating Seller 1: Kyoto Premium Matcha...');
  const seller1Password = await bcrypt.hash('Seller123!', 12);
  
  const seller1Company = await prisma.company.create({
    data: {
      name: 'Kyoto Premium Matcha Co.',
      description: 'Fourth-generation family tea farm specializing in stone-ground ceremonial matcha from Uji region.',
      website: 'https://kyoto-matcha.example.com',
      phone: '+81-75-123-4567',
      email: 'info@kyoto-matcha.example.com',
      addressLine1: '123 Uji Tea Road',
      city: 'Uji',
      state: 'Kyoto',
      postalCode: '611-0021',
      country: 'JP',
    },
  });

  const seller1User = await prisma.user.create({
    data: {
      email: 'seller@kyoto-matcha.com',
      passwordHash: seller1Password,
      name: 'Takeshi Yamamoto',
      role: UserRole.SELLER,
      isVerified: true,
      companyName: seller1Company.name,
      companyId: seller1Company.id,
    },
  });

  const seller1Profile = await prisma.sellerProfile.create({
    data: {
      userId: seller1User.id,
      companyId: seller1Company.id,
      businessLicense: 'JP-KYOTO-TEA-2024-001',
      taxId: 'JP1234567890',
      yearsInBusiness: 85,
      annualRevenue: '$5M-$10M',
      employeeCount: '50-100',
      exportCapable: true,
      organicCertified: true,
      jgapCertified: true,
      haccpCertified: true,
      primaryOrigins: [MatchaOrigin.KYOTO_UJIREGION],
      primaryGrades: [MatchaGrade.CEREMONIAL, MatchaGrade.PREMIUM],
      minimumOrderValue: 500,
      leadTimeDays: 14,
      bio: 'Our family has been cultivating premium matcha in the Uji region for four generations. We use traditional stone grinding methods and shade-growing techniques perfected over 85 years.',
    },
  });

  await prisma.sellerVerification.create({
    data: {
      sellerProfileId: seller1Profile.id,
      status: VerificationStatus.APPROVED,
      documentsUrls: ['/docs/kyoto-business-license.pdf', '/docs/kyoto-organic-cert.pdf'],
      reviewNotes: 'Verified premium Uji matcha producer. All certifications validated.',
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });
  console.log(`   ✅ Seller 1: ${seller1User.email}`);

  // ============== SELLER 2: Nishio Green ==============
  console.log('\n🏭 Creating Seller 2: Nishio Green Tea...');
  const seller2Password = await bcrypt.hash('Seller123!', 12);
  
  const seller2Company = await prisma.company.create({
    data: {
      name: 'Nishio Green Tea Industries',
      description: 'Large-scale matcha producer from Aichi prefecture, specializing in food service and industrial grades.',
      website: 'https://nishio-green.example.com',
      phone: '+81-566-987-6543',
      email: 'sales@nishio-green.example.com',
      addressLine1: '456 Tea Factory Blvd',
      city: 'Nishio',
      state: 'Aichi',
      postalCode: '445-0000',
      country: 'JP',
    },
  });

  const seller2User = await prisma.user.create({
    data: {
      email: 'seller@nishio-green.com',
      passwordHash: seller2Password,
      name: 'Kenji Tanaka',
      role: UserRole.SELLER,
      isVerified: true,
      companyName: seller2Company.name,
      companyId: seller2Company.id,
    },
  });

  const seller2Profile = await prisma.sellerProfile.create({
    data: {
      userId: seller2User.id,
      companyId: seller2Company.id,
      businessLicense: 'JP-AICHI-TEA-2024-042',
      taxId: 'JP0987654321',
      yearsInBusiness: 45,
      annualRevenue: '$10M-$50M',
      employeeCount: '100-500',
      exportCapable: true,
      organicCertified: false,
      jgapCertified: true,
      haccpCertified: true,
      primaryOrigins: [MatchaOrigin.NISHIO_AICHI],
      primaryGrades: [MatchaGrade.CULINARY, MatchaGrade.FOOD_SERVICE, MatchaGrade.INDUSTRIAL],
      minimumOrderValue: 1000,
      leadTimeDays: 7,
      bio: 'Nishio Green Tea Industries is a leading producer of culinary and food service matcha. Our modern facilities can handle large volume orders with consistent quality.',
    },
  });

  await prisma.sellerVerification.create({
    data: {
      sellerProfileId: seller2Profile.id,
      status: VerificationStatus.APPROVED,
      documentsUrls: ['/docs/nishio-business-license.pdf', '/docs/nishio-haccp-cert.pdf'],
      reviewNotes: 'Major Nishio producer verified. HACCP and JGAP certifications confirmed.',
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });
  console.log(`   ✅ Seller 2: ${seller2User.email}`);

  // ============== BUYER 1: Urban Tea Cafe ==============
  console.log('\n🛒 Creating Buyer 1: Urban Tea Cafe...');
  const buyer1Password = await bcrypt.hash('Buyer123!', 12);
  
  const buyer1Company = await prisma.company.create({
    data: {
      name: 'Urban Tea Cafe LLC',
      description: 'Specialty tea cafe chain with 15 locations across California.',
      website: 'https://urbanteacafe.example.com',
      phone: '+1-415-555-0101',
      email: 'purchasing@urbanteacafe.example.com',
      addressLine1: '789 Market Street',
      addressLine2: 'Suite 100',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US',
    },
  });

  const buyer1User = await prisma.user.create({
    data: {
      email: 'buyer@urbanteacafe.com',
      passwordHash: buyer1Password,
      name: 'Sarah Chen',
      role: UserRole.BUYER,
      isVerified: true,
      companyName: buyer1Company.name,
      companyId: buyer1Company.id,
    },
  });

  await prisma.buyerProfile.create({
    data: {
      userId: buyer1User.id,
      companyId: buyer1Company.id,
      businessType: 'Restaurant/Cafe Chain',
      taxId: 'US12-3456789',
      annualMatchaVolume: '500-1000 kg',
      preferredGrades: [MatchaGrade.CEREMONIAL, MatchaGrade.PREMIUM],
      preferredOrigins: [MatchaOrigin.KYOTO_UJIREGION, MatchaOrigin.NISHIO_AICHI],
      shippingAddressLine1: '789 Market Street',
      shippingAddressLine2: 'Suite 100',
      shippingCity: 'San Francisco',
      shippingState: 'CA',
      shippingPostalCode: '94102',
      shippingCountry: 'US',
    },
  });
  console.log(`   ✅ Buyer 1: ${buyer1User.email}`);

  // ============== BUYER 2: Healthy Foods Corp ==============
  console.log('\n🛒 Creating Buyer 2: Healthy Foods Corp...');
  const buyer2Password = await bcrypt.hash('Buyer123!', 12);
  
  const buyer2Company = await prisma.company.create({
    data: {
      name: 'Healthy Foods Corp',
      description: 'Food manufacturer specializing in health-focused snacks and beverages.',
      website: 'https://healthyfoods.example.com',
      phone: '+1-212-555-0202',
      email: 'sourcing@healthyfoods.example.com',
      addressLine1: '1000 Industrial Parkway',
      city: 'Newark',
      state: 'NJ',
      postalCode: '07102',
      country: 'US',
    },
  });

  const buyer2User = await prisma.user.create({
    data: {
      email: 'buyer@healthyfoods.com',
      passwordHash: buyer2Password,
      name: 'Michael Rodriguez',
      role: UserRole.BUYER,
      isVerified: true,
      companyName: buyer2Company.name,
      companyId: buyer2Company.id,
    },
  });

  await prisma.buyerProfile.create({
    data: {
      userId: buyer2User.id,
      companyId: buyer2Company.id,
      businessType: 'Food Manufacturer',
      taxId: 'US98-7654321',
      annualMatchaVolume: '5000+ kg',
      preferredGrades: [MatchaGrade.CULINARY, MatchaGrade.FOOD_SERVICE, MatchaGrade.INDUSTRIAL],
      preferredOrigins: [MatchaOrigin.NISHIO_AICHI, MatchaOrigin.KAGOSHIMA],
      shippingAddressLine1: '1000 Industrial Parkway',
      shippingCity: 'Newark',
      shippingState: 'NJ',
      shippingPostalCode: '07102',
      shippingCountry: 'US',
    },
  });
  console.log(`   ✅ Buyer 2: ${buyer2User.email}`);

  // ============== PRODUCTS & SKUS ==============
  console.log('\n🍵 Creating products and SKUs...');

  // Helper to create product with SKUs
  async function createProduct(
    sellerId: string,
    data: {
      name: string;
      slug: string;
      description: string;
      shortDescription: string;
      grade: MatchaGrade;
      origin: MatchaOrigin;
      attributes: object;
      skus: Array<{
        name: string;
        sku: string;
        weightGrams: number;
        packagingType: string;
        basePrice: number;
        unitsPerCase: number;
        quantityOnHand: number;
        priceTiers: Array<{ minQty: number; maxQty: number | null; price: number }>;
      }>;
    }
  ) {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription,
        grade: data.grade,
        origin: data.origin,
        attributes: data.attributes,
        status: ProductStatus.ACTIVE,
        sellerId: sellerId,
        images: {
          create: [
            { url: `/images/products/${data.slug}-1.jpg`, altText: `${data.name} - Main`, isPrimary: true, sortOrder: 0 },
            { url: `/images/products/${data.slug}-2.jpg`, altText: `${data.name} - Detail`, sortOrder: 1 },
          ],
        },
      },
    });

    for (const skuData of data.skus) {
      const sku = await prisma.sku.create({
        data: {
          productId: product.id,
          sku: skuData.sku,
          name: skuData.name,
          weightGrams: skuData.weightGrams,
          packagingType: skuData.packagingType,
          unitsPerCase: skuData.unitsPerCase,
          basePrice: skuData.basePrice,
          isActive: true,
        },
      });

      await prisma.inventory.create({
        data: {
          skuId: sku.id,
          quantityOnHand: skuData.quantityOnHand,
          reorderPoint: Math.floor(skuData.quantityOnHand * 0.2),
          reorderQuantity: Math.floor(skuData.quantityOnHand * 0.5),
        },
      });

      for (const tier of skuData.priceTiers) {
        await prisma.priceTier.create({
          data: {
            skuId: sku.id,
            minQuantity: tier.minQty,
            maxQuantity: tier.maxQty,
            pricePerUnit: tier.price,
          },
        });
      }
    }

    return product;
  }

  // SELLER 1 PRODUCTS (5 products - Premium/Ceremonial focus)
  await createProduct(seller1Profile.id, {
    name: 'Imperial Ceremonial Matcha',
    slug: 'imperial-ceremonial-matcha',
    description: 'Our highest grade ceremonial matcha, stone-ground from first-harvest tencha leaves. Vibrant jade color with umami-rich, naturally sweet flavor and zero bitterness. Perfect for traditional tea ceremony or premium lattes.',
    shortDescription: 'Supreme first-harvest ceremonial grade with intense umami',
    grade: MatchaGrade.CEREMONIAL,
    origin: MatchaOrigin.KYOTO_UJIREGION,
    attributes: {
      flavorProfile: ['umami', 'sweet', 'vegetal'],
      colorGrade: 'A+',
      meshSize: '5-10 microns',
      lRating: 52,
      harvestSeason: 'First Flush (Ichibancha)',
      shadingDays: 21,
    },
    skus: [
      {
        name: '30g Ceremonial Tin',
        sku: 'KPM-ICM-30G',
        weightGrams: 30,
        packagingType: 'Tin',
        basePrice: 45.00,
        unitsPerCase: 12,
        quantityOnHand: 200,
        priceTiers: [
          { minQty: 1, maxQty: 11, price: 45.00 },
          { minQty: 12, maxQty: 47, price: 40.50 },
          { minQty: 48, maxQty: null, price: 36.00 },
        ],
      },
      {
        name: '100g Ceremonial Tin',
        sku: 'KPM-ICM-100G',
        weightGrams: 100,
        packagingType: 'Tin',
        basePrice: 120.00,
        unitsPerCase: 6,
        quantityOnHand: 150,
        priceTiers: [
          { minQty: 1, maxQty: 5, price: 120.00 },
          { minQty: 6, maxQty: 23, price: 108.00 },
          { minQty: 24, maxQty: null, price: 96.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 1: Imperial Ceremonial Matcha');

  await createProduct(seller1Profile.id, {
    name: 'Daily Ceremonial Matcha',
    slug: 'daily-ceremonial-matcha',
    description: 'Excellent everyday ceremonial grade matcha from second-harvest leaves. Smooth, balanced flavor with mild sweetness. Ideal for daily tea practice or high-quality cafe drinks.',
    shortDescription: 'Balanced everyday ceremonial for daily enjoyment',
    grade: MatchaGrade.CEREMONIAL,
    origin: MatchaOrigin.KYOTO_UJIREGION,
    attributes: {
      flavorProfile: ['balanced', 'smooth', 'mild sweetness'],
      colorGrade: 'A',
      meshSize: '10-15 microns',
      lRating: 48,
      harvestSeason: 'Second Flush (Nibancha)',
      shadingDays: 18,
    },
    skus: [
      {
        name: '100g Pouch',
        sku: 'KPM-DCM-100G',
        weightGrams: 100,
        packagingType: 'Resealable Pouch',
        basePrice: 55.00,
        unitsPerCase: 10,
        quantityOnHand: 300,
        priceTiers: [
          { minQty: 1, maxQty: 9, price: 55.00 },
          { minQty: 10, maxQty: 49, price: 49.50 },
          { minQty: 50, maxQty: null, price: 44.00 },
        ],
      },
      {
        name: '500g Bulk Bag',
        sku: 'KPM-DCM-500G',
        weightGrams: 500,
        packagingType: 'Bulk Bag',
        basePrice: 220.00,
        unitsPerCase: 4,
        quantityOnHand: 100,
        priceTiers: [
          { minQty: 1, maxQty: 3, price: 220.00 },
          { minQty: 4, maxQty: 19, price: 198.00 },
          { minQty: 20, maxQty: null, price: 176.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 2: Daily Ceremonial Matcha');

  await createProduct(seller1Profile.id, {
    name: 'Premium Latte Grade',
    slug: 'premium-latte-grade',
    description: 'Specially blended for milk-based drinks. Robust flavor that stands up to milk while maintaining beautiful green color. Popular with specialty cafes.',
    shortDescription: 'Robust matcha optimized for lattes and milk drinks',
    grade: MatchaGrade.PREMIUM,
    origin: MatchaOrigin.KYOTO_UJIREGION,
    attributes: {
      flavorProfile: ['robust', 'vegetal', 'slight astringency'],
      colorGrade: 'A-',
      meshSize: '15-20 microns',
      lRating: 45,
      idealUse: 'Lattes, Milk Drinks, Smoothies',
    },
    skus: [
      {
        name: '250g Cafe Pouch',
        sku: 'KPM-PLG-250G',
        weightGrams: 250,
        packagingType: 'Cafe Pouch',
        basePrice: 85.00,
        unitsPerCase: 8,
        quantityOnHand: 250,
        priceTiers: [
          { minQty: 1, maxQty: 7, price: 85.00 },
          { minQty: 8, maxQty: 31, price: 76.50 },
          { minQty: 32, maxQty: null, price: 68.00 },
        ],
      },
      {
        name: '1kg Bulk Bag',
        sku: 'KPM-PLG-1KG',
        weightGrams: 1000,
        packagingType: 'Bulk Bag',
        basePrice: 280.00,
        unitsPerCase: 2,
        quantityOnHand: 80,
        priceTiers: [
          { minQty: 1, maxQty: 1, price: 280.00 },
          { minQty: 2, maxQty: 9, price: 252.00 },
          { minQty: 10, maxQty: null, price: 224.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 3: Premium Latte Grade');

  await createProduct(seller1Profile.id, {
    name: 'Organic Ceremonial Reserve',
    slug: 'organic-ceremonial-reserve',
    description: 'JAS Organic certified ceremonial matcha from our organic tea gardens. Same exceptional quality with full organic certification for health-conscious consumers.',
    shortDescription: 'JAS Organic certified ceremonial grade',
    grade: MatchaGrade.CEREMONIAL,
    origin: MatchaOrigin.KYOTO_UJIREGION,
    attributes: {
      flavorProfile: ['umami', 'clean', 'vegetal'],
      colorGrade: 'A',
      meshSize: '5-10 microns',
      lRating: 50,
      certifications: ['JAS Organic', 'USDA Organic', 'EU Organic'],
    },
    skus: [
      {
        name: '40g Organic Tin',
        sku: 'KPM-OCR-40G',
        weightGrams: 40,
        packagingType: 'Tin',
        basePrice: 58.00,
        unitsPerCase: 12,
        quantityOnHand: 180,
        priceTiers: [
          { minQty: 1, maxQty: 11, price: 58.00 },
          { minQty: 12, maxQty: 47, price: 52.20 },
          { minQty: 48, maxQty: null, price: 46.40 },
        ],
      },
      {
        name: '200g Organic Pouch',
        sku: 'KPM-OCR-200G',
        weightGrams: 200,
        packagingType: 'Resealable Pouch',
        basePrice: 240.00,
        unitsPerCase: 5,
        quantityOnHand: 60,
        priceTiers: [
          { minQty: 1, maxQty: 4, price: 240.00 },
          { minQty: 5, maxQty: 19, price: 216.00 },
          { minQty: 20, maxQty: null, price: 192.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 4: Organic Ceremonial Reserve');

  await createProduct(seller1Profile.id, {
    name: 'Competition Grade Matcha',
    slug: 'competition-grade-matcha',
    description: 'Ultra-premium matcha selected for Japanese tea competitions. Extremely limited production from our oldest tea bushes. The pinnacle of matcha craftsmanship.',
    shortDescription: 'Ultra-rare competition-winning matcha',
    grade: MatchaGrade.CEREMONIAL,
    origin: MatchaOrigin.KYOTO_UJIREGION,
    attributes: {
      flavorProfile: ['complex umami', 'sweet', 'lingering finish'],
      colorGrade: 'A++',
      meshSize: '3-5 microns',
      lRating: 58,
      harvestSeason: 'First Flush (Ichibancha)',
      shadingDays: 25,
      bushAge: '80+ years',
    },
    skus: [
      {
        name: '20g Competition Tin',
        sku: 'KPM-CGM-20G',
        weightGrams: 20,
        packagingType: 'Premium Tin',
        basePrice: 95.00,
        unitsPerCase: 6,
        quantityOnHand: 30,
        priceTiers: [
          { minQty: 1, maxQty: 5, price: 95.00 },
          { minQty: 6, maxQty: null, price: 85.50 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 5: Competition Grade Matcha');

  // SELLER 2 PRODUCTS (5 products - Culinary/Industrial focus)
  await createProduct(seller2Profile.id, {
    name: 'Culinary Grade A',
    slug: 'culinary-grade-a',
    description: 'Our best culinary matcha for baking, cooking, and food manufacturing. Vibrant green color, clean taste, and excellent heat stability. Perfect for confectionery and beverages.',
    shortDescription: 'Top-tier culinary matcha for professional kitchens',
    grade: MatchaGrade.CULINARY,
    origin: MatchaOrigin.NISHIO_AICHI,
    attributes: {
      flavorProfile: ['clean', 'vegetal', 'mild bitterness'],
      colorGrade: 'B+',
      meshSize: '20-25 microns',
      heatStable: true,
      idealUse: 'Baking, Cooking, Ice Cream, Confectionery',
    },
    skus: [
      {
        name: '500g Culinary Bag',
        sku: 'NGT-CGA-500G',
        weightGrams: 500,
        packagingType: 'Vacuum Bag',
        basePrice: 65.00,
        unitsPerCase: 6,
        quantityOnHand: 400,
        priceTiers: [
          { minQty: 1, maxQty: 5, price: 65.00 },
          { minQty: 6, maxQty: 29, price: 58.50 },
          { minQty: 30, maxQty: null, price: 52.00 },
        ],
      },
      {
        name: '2kg Bulk Box',
        sku: 'NGT-CGA-2KG',
        weightGrams: 2000,
        packagingType: 'Bulk Box',
        basePrice: 220.00,
        unitsPerCase: 1,
        quantityOnHand: 150,
        priceTiers: [
          { minQty: 1, maxQty: 4, price: 220.00 },
          { minQty: 5, maxQty: 19, price: 198.00 },
          { minQty: 20, maxQty: null, price: 176.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 6: Culinary Grade A');

  await createProduct(seller2Profile.id, {
    name: 'Food Service Matcha',
    slug: 'food-service-matcha',
    description: 'Consistent quality matcha designed for high-volume food service operations. Excellent value with reliable color and flavor batch after batch.',
    shortDescription: 'Reliable high-volume matcha for food service',
    grade: MatchaGrade.FOOD_SERVICE,
    origin: MatchaOrigin.NISHIO_AICHI,
    attributes: {
      flavorProfile: ['consistent', 'mild', 'versatile'],
      colorGrade: 'B',
      meshSize: '25-30 microns',
      batchConsistency: 'High',
    },
    skus: [
      {
        name: '1kg Service Bag',
        sku: 'NGT-FSM-1KG',
        weightGrams: 1000,
        packagingType: 'Service Bag',
        basePrice: 95.00,
        unitsPerCase: 4,
        quantityOnHand: 300,
        priceTiers: [
          { minQty: 1, maxQty: 3, price: 95.00 },
          { minQty: 4, maxQty: 19, price: 85.50 },
          { minQty: 20, maxQty: null, price: 76.00 },
        ],
      },
      {
        name: '5kg Bulk Box',
        sku: 'NGT-FSM-5KG',
        weightGrams: 5000,
        packagingType: 'Bulk Box',
        basePrice: 400.00,
        unitsPerCase: 1,
        quantityOnHand: 100,
        priceTiers: [
          { minQty: 1, maxQty: 4, price: 400.00 },
          { minQty: 5, maxQty: 19, price: 360.00 },
          { minQty: 20, maxQty: null, price: 320.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 7: Food Service Matcha');

  await createProduct(seller2Profile.id, {
    name: 'Industrial Matcha Powder',
    slug: 'industrial-matcha-powder',
    description: 'Cost-effective matcha powder for large-scale food manufacturing. Suitable for products where matcha is a secondary ingredient. Consistent quality in bulk quantities.',
    shortDescription: 'Economical matcha for manufacturing',
    grade: MatchaGrade.INDUSTRIAL,
    origin: MatchaOrigin.NISHIO_AICHI,
    attributes: {
      flavorProfile: ['functional', 'stable'],
      colorGrade: 'C+',
      meshSize: '30-40 microns',
      minOrderKg: 25,
    },
    skus: [
      {
        name: '10kg Industrial Bag',
        sku: 'NGT-IMP-10KG',
        weightGrams: 10000,
        packagingType: 'Industrial Bag',
        basePrice: 550.00,
        unitsPerCase: 1,
        quantityOnHand: 80,
        priceTiers: [
          { minQty: 1, maxQty: 4, price: 550.00 },
          { minQty: 5, maxQty: 19, price: 495.00 },
          { minQty: 20, maxQty: null, price: 440.00 },
        ],
      },
      {
        name: '25kg Industrial Drum',
        sku: 'NGT-IMP-25KG',
        weightGrams: 25000,
        packagingType: 'Drum',
        basePrice: 1200.00,
        unitsPerCase: 1,
        quantityOnHand: 40,
        priceTiers: [
          { minQty: 1, maxQty: 3, price: 1200.00 },
          { minQty: 4, maxQty: 9, price: 1080.00 },
          { minQty: 10, maxQty: null, price: 960.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 8: Industrial Matcha Powder');

  await createProduct(seller2Profile.id, {
    name: 'Cafe Blend Matcha',
    slug: 'cafe-blend-matcha',
    description: 'Specially formulated blend optimized for cafe beverage programs. Strong matcha flavor that shines through milk and sweeteners. Easy to work with for baristas.',
    shortDescription: 'Barista-friendly matcha blend for cafes',
    grade: MatchaGrade.CULINARY,
    origin: MatchaOrigin.NISHIO_AICHI,
    attributes: {
      flavorProfile: ['bold', 'slightly sweet', 'creamy'],
      colorGrade: 'B+',
      meshSize: '18-22 microns',
      baristaFriendly: true,
    },
    skus: [
      {
        name: '500g Cafe Blend',
        sku: 'NGT-CBM-500G',
        weightGrams: 500,
        packagingType: 'Cafe Pouch',
        basePrice: 75.00,
        unitsPerCase: 8,
        quantityOnHand: 350,
        priceTiers: [
          { minQty: 1, maxQty: 7, price: 75.00 },
          { minQty: 8, maxQty: 39, price: 67.50 },
          { minQty: 40, maxQty: null, price: 60.00 },
        ],
      },
      {
        name: '2kg Cafe Bulk',
        sku: 'NGT-CBM-2KG',
        weightGrams: 2000,
        packagingType: 'Bulk Bag',
        basePrice: 260.00,
        unitsPerCase: 2,
        quantityOnHand: 120,
        priceTiers: [
          { minQty: 1, maxQty: 1, price: 260.00 },
          { minQty: 2, maxQty: 9, price: 234.00 },
          { minQty: 10, maxQty: null, price: 208.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 9: Cafe Blend Matcha');

  await createProduct(seller2Profile.id, {
    name: 'Matcha Extract Powder',
    slug: 'matcha-extract-powder',
    description: 'Concentrated matcha extract for supplement and nutraceutical applications. Standardized EGCG content for consistent dosing. Pharmaceutical grade processing.',
    shortDescription: 'Concentrated extract for supplements',
    grade: MatchaGrade.INDUSTRIAL,
    origin: MatchaOrigin.NISHIO_AICHI,
    attributes: {
      egcgContent: '45%',
      catechinContent: '80%',
      extractRatio: '20:1',
      pharmaGrade: true,
    },
    skus: [
      {
        name: '1kg Extract',
        sku: 'NGT-MEP-1KG',
        weightGrams: 1000,
        packagingType: 'Pharma Container',
        basePrice: 180.00,
        unitsPerCase: 4,
        quantityOnHand: 60,
        priceTiers: [
          { minQty: 1, maxQty: 3, price: 180.00 },
          { minQty: 4, maxQty: 19, price: 162.00 },
          { minQty: 20, maxQty: null, price: 144.00 },
        ],
      },
      {
        name: '5kg Extract Bulk',
        sku: 'NGT-MEP-5KG',
        weightGrams: 5000,
        packagingType: 'Bulk Container',
        basePrice: 800.00,
        unitsPerCase: 1,
        quantityOnHand: 25,
        priceTiers: [
          { minQty: 1, maxQty: 2, price: 800.00 },
          { minQty: 3, maxQty: 9, price: 720.00 },
          { minQty: 10, maxQty: null, price: 640.00 },
        ],
      },
    ],
  });
  console.log('   ✅ Product 10: Matcha Extract Powder');

  // ============== COMPLIANCE RULES ==============
  console.log('\n📋 Creating compliance rules...');

  await prisma.complianceRule.createMany({
    data: [
      {
        title: 'FDA Food Facility Registration',
        description: 'Foreign food facilities must register with the FDA before exporting food products to the United States.',
        fullText: 'Under the Public Health Security and Bioterrorism Preparedness and Response Act of 2002, domestic and foreign facilities that manufacture, process, pack, or hold food for human or animal consumption in the United States must register with FDA. Registration must be renewed every two years during the biennial registration period.',
        category: ComplianceCategory.IMPORT_EXPORT,
        countries: ['US'],
        productGrades: [],
        requirements: {
          documents: ['FDA Registration Number', 'DUNS Number'],
          links: ['https://www.fda.gov/food/food-facility-registration'],
        },
        isActive: true,
        sourceUrl: 'https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/registration-food-facilities',
        sourceAuthority: 'U.S. Food and Drug Administration',
        createdById: admin.id,
      },
      {
        title: 'Prior Notice for Food Imports',
        description: 'Prior notice must be submitted to FDA before food arrives in the US, providing information about the shipment.',
        fullText: 'Prior Notice of imported food, including animal feed, must be received and confirmed by FDA no more than 15 days before the article arrives and no fewer than: 2 hours before arrival by land via road, 4 hours before arrival by air or by land via rail, 8 hours before arrival by water.',
        category: ComplianceCategory.CUSTOMS,
        countries: ['US'],
        productGrades: [],
        requirements: {
          timeframes: {
            road: '2 hours',
            air: '4 hours',
            rail: '4 hours',
            water: '8 hours',
          },
          documents: ['Prior Notice Confirmation'],
        },
        isActive: true,
        sourceUrl: 'https://www.fda.gov/food/importing-food-products-united-states/prior-notice-imported-foods',
        sourceAuthority: 'U.S. Food and Drug Administration',
        createdById: admin.id,
      },
      {
        title: 'Japan Tea Export Certificate',
        description: 'Tea products exported from Japan may require export certificates depending on destination country requirements.',
        fullText: 'Japanese tea exporters should obtain appropriate export certificates including phytosanitary certificates, radiation testing certificates (for certain countries), and organic certifications if applicable. Requirements vary by destination country.',
        category: ComplianceCategory.CERTIFICATION,
        countries: ['JP', 'US', 'EU', 'CA', 'AU'],
        productGrades: [],
        requirements: {
          documents: ['Phytosanitary Certificate', 'Certificate of Origin', 'Radiation Test Results (if required)'],
        },
        isActive: true,
        sourceAuthority: 'Japan Ministry of Agriculture, Forestry and Fisheries',
        createdById: admin.id,
      },
      {
        title: 'EU Novel Food Regulation',
        description: 'Matcha is considered a traditional food in the EU and does not require novel food authorization, but must meet general food safety standards.',
        fullText: 'While matcha itself is not classified as a novel food in the EU, products containing matcha extracts with concentrated levels of certain compounds may fall under Novel Food Regulation (EU) 2015/2283. Standard matcha powder must comply with general food safety requirements, proper labeling, and contaminant limits.',
        category: ComplianceCategory.FOOD_SAFETY,
        countries: ['EU'],
        productGrades: [],
        requirements: {
          standards: ['Regulation (EC) No 178/2002', 'Regulation (EU) No 1169/2011'],
          limits: {
            lead: '3.0 mg/kg',
            cadmium: '1.0 mg/kg',
          },
        },
        isActive: true,
        sourceAuthority: 'European Food Safety Authority',
        createdById: admin.id,
      },
      {
        title: 'Organic Certification Requirements',
        description: 'Matcha marketed as organic must have valid certification recognized in the destination country.',
        fullText: 'To sell matcha as "organic" in different markets, products must be certified under recognized standards: USDA Organic for the US market, EU Organic Regulation for European markets, JAS Organic for Japanese domestic market. Many certifications have equivalency agreements, but importers should verify specific requirements.',
        category: ComplianceCategory.CERTIFICATION,
        countries: ['US', 'EU', 'JP', 'CA'],
        productGrades: [MatchaGrade.CEREMONIAL, MatchaGrade.PREMIUM],
        requirements: {
          certifications: {
            US: 'USDA Organic',
            EU: 'EU Organic',
            JP: 'JAS Organic',
            CA: 'Canada Organic Regime',
          },
        },
        isActive: true,
        createdById: admin.id,
      },
    ],
  });
  console.log('   ✅ Created 5 compliance rules');

  // ============== INSIGHT POSTS ==============
  console.log('\n📰 Creating insight posts...');

  await prisma.insightPost.createMany({
    data: [
      {
        title: '2024 Matcha Market Outlook: Trends and Opportunities',
        slug: '2024-matcha-market-outlook',
        excerpt: 'An in-depth analysis of the global matcha market, including growth projections, emerging consumer preferences, and sourcing strategies for businesses.',
        content: `# 2024 Matcha Market Outlook

The global matcha market continues to show strong growth, with projections indicating a CAGR of 8.5% through 2028. This growth is driven by increasing consumer awareness of health benefits, premiumization trends in the beverage industry, and expanding applications in food manufacturing.

## Key Market Trends

### 1. Premiumization
Consumers are increasingly willing to pay premium prices for high-quality, single-origin matcha. This trend is particularly strong in North America and Europe, where specialty tea shops and premium grocery retailers are expanding their matcha offerings.

### 2. Functional Foods Integration
Food manufacturers are incorporating matcha into a wider range of products, from energy bars to skincare formulations. The natural caffeine content and antioxidant properties make matcha an attractive ingredient for functional food applications.

### 3. Sustainability Focus
Buyers are increasingly interested in sustainable sourcing practices, organic certification, and transparent supply chains. Sellers who can demonstrate environmental responsibility have a competitive advantage.

## Sourcing Recommendations

For buyers looking to enter or expand in the matcha market:
- Establish direct relationships with verified Japanese producers
- Consider diversifying between premium (Uji, Nishio) and value-oriented origins
- Request samples and quality certifications before committing to large orders

The matcha market remains highly attractive for both new entrants and established players looking to premiumize their offerings.`,
        category: InsightCategory.MARKET_TRENDS,
        tags: ['market analysis', '2024 trends', 'sourcing', 'premiumization'],
        isPublished: true,
        publishedAt: new Date('2024-01-15'),
        authorId: admin.id,
      },
      {
        title: 'Understanding Matcha Grades: A Buyer\'s Guide',
        slug: 'understanding-matcha-grades',
        excerpt: 'Learn the differences between ceremonial, premium, culinary, and industrial matcha grades to make informed purchasing decisions.',
        content: `# Understanding Matcha Grades

Navigating matcha grades can be confusing for new buyers. This guide breaks down the key differences to help you choose the right grade for your needs.

## Ceremonial Grade

The highest quality matcha, intended for traditional tea ceremony and drinking straight.

**Characteristics:**
- Vibrant jade green color
- Smooth, umami-rich flavor with natural sweetness
- Very fine particle size (5-10 microns)
- Made from first-harvest (ichibancha) leaves
- Shade-grown for 20+ days

**Best For:** Tea service, premium lattes, high-end retail

**Price Range:** $0.80-$2.00+ per gram

## Premium Grade

High-quality matcha suitable for both drinking and culinary use.

**Characteristics:**
- Bright green color
- Balanced flavor with mild vegetal notes
- Fine to medium particle size (10-20 microns)
- Often from second harvest or mixed harvests

**Best For:** Specialty cafes, quality-focused food service, retail

**Price Range:** $0.30-$0.80 per gram

## Culinary Grade

Designed for cooking and baking applications.

**Characteristics:**
- Good green color with slight yellow tones
- Stronger, more astringent flavor that holds up to other ingredients
- Medium particle size (20-30 microns)
- May include leaves from later harvests

**Best For:** Baking, cooking, ice cream, confectionery

**Price Range:** $0.10-$0.30 per gram

## Industrial Grade

Cost-effective option for large-scale manufacturing.

**Characteristics:**
- Varies in color and flavor
- Larger particle size (30+ microns)
- Focus on consistency and value

**Best For:** Food manufacturing, supplements, cosmetics

**Price Range:** $0.03-$0.10 per gram

## Making Your Decision

Consider these factors when selecting a grade:
1. End application (drinking vs. cooking vs. manufacturing)
2. Volume requirements
3. Budget constraints
4. Brand positioning (premium vs. value)`,
        category: InsightCategory.SOURCING_TIPS,
        tags: ['matcha grades', 'buyers guide', 'quality', 'sourcing'],
        isPublished: true,
        publishedAt: new Date('2024-01-20'),
        authorId: admin.id,
      },
      {
        title: 'Import Regulations Update: New FDA Requirements for 2024',
        slug: 'fda-requirements-2024-update',
        excerpt: 'Important updates to FDA food import requirements that matcha importers need to know for 2024.',
        content: `# FDA Import Requirements Update for 2024

The FDA has announced several updates to food import procedures that will affect matcha importers. Here's what you need to know.

## Key Changes

### Enhanced Prior Notice Requirements
Starting March 2024, prior notice submissions will require additional information about the supply chain, including:
- Grower/producer identification
- Processing facility details
- Testing and certification information

### FSVP Updates
The Foreign Supplier Verification Program continues to be enforced, with increased focus on:
- Hazard analysis documentation
- Supplier verification activities
- Corrective action procedures

## Action Items for Importers

1. **Review your supply chain documentation** - Ensure you can provide complete chain of custody information
2. **Update supplier agreements** - Include clauses requiring necessary certifications and testing
3. **Train your team** - Make sure compliance staff understand new requirements
4. **Work with customs brokers** - Verify your broker is aware of changes

## Resources

- FDA Import Program website
- Matcha Trading Platform Compliance Center
- Licensed customs broker consultation

Stay ahead of regulatory changes by subscribing to our compliance updates.`,
        category: InsightCategory.COMPLIANCE_UPDATE,
        tags: ['FDA', 'regulations', 'compliance', 'import'],
        isPublished: true,
        publishedAt: new Date('2024-02-01'),
        authorId: admin.id,
      },
      {
        title: 'Producer Spotlight: Uji Region Heritage Farms',
        slug: 'producer-spotlight-uji-heritage',
        excerpt: 'Discover the centuries-old traditions and modern innovations of matcha producers in Japan\'s famous Uji region.',
        content: `# Producer Spotlight: Uji Region Heritage Farms

The Uji region of Kyoto has been the spiritual home of Japanese matcha for over 800 years. Today, multi-generational family farms continue to produce some of the world's finest matcha while embracing sustainable innovations.

## Historical Significance

Uji's matcha production dates back to the Kamakura period (1185-1333), when Zen Buddhist monk Eisai introduced tea cultivation to Japan. The region's unique microclimate—misty mornings, moderate temperatures, and mineral-rich soil from the Uji River—creates ideal conditions for shade-grown tea.

## Traditional Techniques

### Shade Growing (Tana)
Uji farmers use traditional shelf-shading structures called "tana" to cover tea plants for 20-30 days before harvest. This technique increases chlorophyll and L-theanine content, creating matcha's characteristic color and umami flavor.

### Stone Grinding
Authentic Uji matcha is stone-ground using traditional granite mills. A single mill produces only 30-40 grams per hour, ensuring low heat and preserving delicate flavors and nutrients.

## Modern Innovations

While honoring tradition, Uji producers are also innovating:
- Precision agriculture for optimized cultivation
- Quality control through spectral analysis
- Sustainable packaging and waste reduction
- Direct trade relationships with international buyers

## Sourcing from Uji

For buyers interested in Uji matcha:
- Look for producers with verifiable Uji provenance
- Request cultivation and processing documentation
- Consider visiting during harvest season (late April to May)
- Build long-term relationships for allocation priority`,
        category: InsightCategory.PRODUCT_SPOTLIGHT,
        tags: ['Uji', 'Japan', 'producers', 'heritage', 'quality'],
        isPublished: true,
        publishedAt: new Date('2024-02-15'),
        authorId: admin.id,
      },
      {
        title: 'Matcha in Food Manufacturing: Applications and Considerations',
        slug: 'matcha-food-manufacturing-guide',
        excerpt: 'A comprehensive guide for food manufacturers looking to incorporate matcha into their product lines.',
        content: `# Matcha in Food Manufacturing

Matcha has become one of the most versatile functional ingredients in food manufacturing. This guide covers key applications, technical considerations, and sourcing strategies.

## Popular Applications

### Beverages
- Ready-to-drink matcha lattes
- Energy drinks
- Smoothie mixes
- Alcoholic beverages (matcha cocktails)

### Confectionery
- Chocolates and truffles
- Cookies and biscuits
- Ice cream and gelato
- Cakes and pastries

### Health Products
- Protein powders
- Energy bars
- Dietary supplements
- Functional foods

## Technical Considerations

### Heat Stability
Matcha's color and flavor can degrade with heat exposure. Consider:
- Processing temperature limits
- Encapsulation for high-heat applications
- Timing of addition in production process

### Color Retention
Factors affecting green color:
- pH levels (acidic environments cause yellowing)
- Light exposure
- Oxygen contact
- Storage temperature

### Dosage and Flavor Balance
- Light matcha flavor: 0.5-1% by weight
- Medium matcha presence: 1-2%
- Strong matcha flavor: 2-4%

## Sourcing for Manufacturing

### Volume Requirements
- Establish minimum order quantities
- Negotiate annual contracts for price stability
- Maintain safety stock (recommend 2-3 months)

### Quality Specifications
Define specifications including:
- Color (L*a*b* values)
- Particle size distribution
- Moisture content
- Microbiological limits
- Heavy metals

### Supplier Qualification
- Audit facilities when possible
- Request certificates of analysis
- Conduct incoming quality testing
- Establish corrective action procedures`,
        category: InsightCategory.INDUSTRY_NEWS,
        tags: ['manufacturing', 'food industry', 'applications', 'technical'],
        isPublished: true,
        publishedAt: new Date('2024-03-01'),
        authorId: admin.id,
      },
    ],
  });
  console.log('   ✅ Created 5 insight posts');

  // ============== TREND SERIES & DATA ==============
  console.log('\n📈 Creating trend series and data points...');

  const priceSeries = await prisma.trendSeries.create({
    data: {
      name: 'Ceremonial Matcha Price Index',
      description: 'Average wholesale price for ceremonial grade matcha (Uji region)',
      unit: 'USD/kg',
      source: 'Matcha Trading Platform',
      frequency: 'monthly',
      isActive: true,
    },
  });

  const volumeSeries = await prisma.trendSeries.create({
    data: {
      name: 'Monthly Trade Volume',
      description: 'Total matcha trade volume on platform',
      unit: 'kg',
      source: 'Matcha Trading Platform',
      frequency: 'monthly',
      isActive: true,
    },
  });

  const demandSeries = await prisma.trendSeries.create({
    data: {
      name: 'RFQ Demand Index',
      description: 'Number of RFQs submitted (normalized)',
      unit: 'index',
      source: 'Matcha Trading Platform',
      frequency: 'weekly',
      isActive: true,
    },
  });

  // Generate 12 months of price data
  const priceData = [];
  const volumeData = [];
  const basePrice = 280;
  const baseVolume = 5000;
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1);
    
    // Price with seasonal variation and trend
    const seasonalFactor = 1 + 0.1 * Math.sin((date.getMonth() - 3) * Math.PI / 6);
    const trendFactor = 1 + (11 - i) * 0.008;
    const randomFactor = 1 + (Math.random() - 0.5) * 0.05;
    const price = basePrice * seasonalFactor * trendFactor * randomFactor;
    
    priceData.push({
      seriesId: priceSeries.id,
      date: date,
      value: Number(price.toFixed(2)),
      metadata: { grade: 'ceremonial', origin: 'uji' },
    });
    
    // Volume with growth trend
    const volumeGrowth = 1 + (11 - i) * 0.03;
    const volumeRandom = 1 + (Math.random() - 0.5) * 0.2;
    const volume = baseVolume * volumeGrowth * volumeRandom;
    
    volumeData.push({
      seriesId: volumeSeries.id,
      date: date,
      value: Number(volume.toFixed(0)),
    });
  }

  await prisma.trendPoint.createMany({ data: priceData });
  await prisma.trendPoint.createMany({ data: volumeData });

  // Generate weekly demand data for last 8 weeks
  const demandData = [];
  const baseDemand = 100;
  
  for (let i = 7; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 7));
    
    const demand = baseDemand * (1 + (Math.random() - 0.3) * 0.4);
    demandData.push({
      seriesId: demandSeries.id,
      date: date,
      value: Number(demand.toFixed(1)),
    });
  }
  
  await prisma.trendPoint.createMany({ data: demandData });
  console.log('   ✅ Created 3 trend series with data points');

  // ============== SUMMARY ==============
  console.log('\n' + '='.repeat(50));
  console.log('🌱 Seed completed successfully!\n');
  console.log('📋 Summary:');
  console.log('   • 1 Admin user');
  console.log('   • 2 Sellers (with profiles & verification)');
  console.log('   • 2 Buyers (with profiles)');
  console.log('   • 10 Products with 20 SKUs');
  console.log('   • Price tiers & inventory for all SKUs');
  console.log('   • 5 Compliance rules');
  console.log('   • 5 Insight posts');
  console.log('   • 3 Trend series with data points');
  console.log('\n📋 Demo Accounts:');
  console.log('   Admin:   admin@matcha-trade.com / Admin123!');
  console.log('   Seller1: seller@kyoto-matcha.com / Seller123!');
  console.log('   Seller2: seller@nishio-green.com / Seller123!');
  console.log('   Buyer1:  buyer@urbanteacafe.com / Buyer123!');
  console.log('   Buyer2:  buyer@healthyfoods.com / Buyer123!');
  console.log('='.repeat(50) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
