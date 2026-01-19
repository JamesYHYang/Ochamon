import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ProductStatus } from '@prisma/client';
import type { MarketplaceQueryInput } from '@matcha/shared';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get paginated product listing with filters (public view)
   */
  async getProducts(query: MarketplaceQueryInput) {
    const {
      page = 1,
      limit = 12,
      regionId,
      gradeTypeId,
      certification,
      priceMin,
      priceMax,
      moqMax,
      leadTimeMax,
      verifiedOnly,
      q,
      sortBy = 'newest',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause - only ACTIVE products
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
    };

    // Region filter
    if (regionId) {
      where.regionId = regionId;
    }

    // Grade type filter
    if (gradeTypeId) {
      where.gradeTypeId = gradeTypeId;
    }

    // Certification filter
    if (certification) {
      where.certifications = {
        has: certification,
      };
    }

    // MOQ filter
    if (moqMax) {
      where.moqKg = {
        lte: moqMax,
      };
    }

    // Lead time filter
    if (leadTimeMax) {
      where.leadTimeDays = {
        lte: leadTimeMax,
      };
    }

    // Verified seller filter
    if (verifiedOnly) {
      where.seller = {
        verificationStatus: 'APPROVED',
      };
    }

    // Keyword search
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { shortDesc: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (sortBy) {
      case 'price_asc':
      case 'price_desc':
        // For price sorting, we'll handle it post-query since price is in SKU
        orderBy = { createdAt: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'moq':
        orderBy = { moqKg: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Execute query with price filtering via subquery approach
    let products = await this.prisma.product.findMany({
      where,
      skip,
      take: limit * 2, // Fetch extra for post-filter
      orderBy,
      include: {
        region: {
          select: { id: true, name: true, country: true },
        },
        gradeType: {
          select: { id: true, name: true, code: true },
        },
        seller: {
          select: {
            id: true,
            verificationStatus: true,
            company: {
              select: { name: true },
            },
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        skus: {
          where: { isActive: true },
          include: {
            priceTiers: {
              orderBy: { minQty: 'asc' },
              take: 1,
            },
          },
        },
        _count: {
          select: { skus: true },
        },
      },
    });

    // Post-filter by price if needed
    if (priceMin || priceMax) {
      products = products.filter((product) => {
        const startingPrice = this.getStartingPrice(product.skus);
        if (startingPrice === null) return false;
        if (priceMin && startingPrice < priceMin) return false;
        if (priceMax && startingPrice > priceMax) return false;
        return true;
      });
    }

    // Sort by price if needed
    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      products.sort((a, b) => {
        const priceA = this.getStartingPrice(a.skus) ?? Infinity;
        const priceB = this.getStartingPrice(b.skus) ?? Infinity;
        return sortBy === 'price_asc' ? priceA - priceB : priceB - priceA;
      });
    }

    // Trim to requested limit
    products = products.slice(0, limit);

    // Get total count
    const total = await this.prisma.product.count({ where });

    // Transform to public view
    const data = products.map((product) => this.toPublicProduct(product));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single product detail
   * - Public: limited fields, no SKU price tiers
   * - Authenticated buyer: full details with SKU tiers and documents
   */
  async getProduct(productId: string, userId?: string, userRole?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        region: true,
        gradeType: true,
        seller: {
          include: {
            company: {
              select: {
                name: true,
                description: true,
                website: true,
                logoUrl: true,
              },
            },
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        documents: userRole === 'BUYER', // Only include docs for buyers
        skus: {
          where: { isActive: true },
          include: {
            inventory: {
              select: {
                availableQty: true,
                unit: true,
              },
            },
            priceTiers: {
              orderBy: { minQty: 'asc' },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Only show ACTIVE products publicly
    if (product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found');
    }

    // Check if buyer has this in shortlist
    let isShortlisted = false;
    if (userId && userRole === 'BUYER') {
      const buyerProfile = await this.prisma.buyerProfile.findUnique({
        where: { userId },
      });
      if (buyerProfile) {
        const shortlistItem = await this.prisma.shortlist.findUnique({
          where: {
            buyerProfileId_productId: {
              buyerProfileId: buyerProfile.id,
              productId: product.id,
            },
          },
        });
        isShortlisted = !!shortlistItem;
      }
    }

    // Build response based on auth status
    const response: any = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDesc: product.shortDesc,
      leadTimeDays: product.leadTimeDays,
      moqKg: Number(product.moqKg),
      certifications: product.certifications,
      region: product.region,
      gradeType: product.gradeType,
      seller: {
        companyName: product.seller.company.name,
        companyDescription: product.seller.company.description,
        website: product.seller.company.website,
        logoUrl: product.seller.company.logoUrl,
        isVerified: product.seller.verificationStatus === 'APPROVED',
        isOrganic: product.seller.isOrganic,
        isJasCertified: product.seller.isJasCertified,
        isUsdaCertified: product.seller.isUsdaCertified,
        isEuCertified: product.seller.isEuCertified,
      },
      images: product.images,
      isShortlisted,
    };

    // Add full SKU details for authenticated buyers
    if (userRole === 'BUYER') {
      response.skus = product.skus.map((sku) => ({
        id: sku.id,
        sku: sku.sku,
        name: sku.name,
        packagingType: sku.packagingType,
        netWeightG: sku.netWeightG,
        currency: sku.currency,
        originCountry: sku.originCountry,
        inventory: sku.inventory
          ? {
              availableQty: sku.inventory.availableQty,
              unit: sku.inventory.unit,
            }
          : null,
        priceTiers: sku.priceTiers.map((tier) => ({
          minQty: tier.minQty,
          maxQty: tier.maxQty,
          unit: tier.unit,
          pricePerUnit: Number(tier.pricePerUnit),
        })),
      }));
      response.documents = product.documents;
    } else {
      // Public view: only show SKU summary without detailed pricing
      response.skus = product.skus.map((sku) => ({
        id: sku.id,
        sku: sku.sku,
        name: sku.name,
        packagingType: sku.packagingType,
        netWeightG: sku.netWeightG,
        currency: sku.currency,
        // Only show starting price for public
        startingPrice: sku.priceTiers[0]
          ? Number(sku.priceTiers[0].pricePerUnit)
          : null,
      }));
      response.priceVisibility = 'limited';
      response.loginPrompt = 'Sign in as a buyer to see full pricing tiers';
    }

    return response;
  }

  /**
   * Get available filter options based on current products
   */
  async getFilterOptions() {
    const [regions, grades, certifications, priceRange] = await Promise.all([
      this.prisma.region.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.gradeType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE },
        select: { certifications: true },
      }),
      this.prisma.priceTier.aggregate({
        _min: { pricePerUnit: true },
        _max: { pricePerUnit: true },
      }),
    ]);

    // Flatten and dedupe certifications
    const allCerts = new Set<string>();
    certifications.forEach((p) => p.certifications.forEach((c) => allCerts.add(c)));

    return {
      regions,
      grades,
      certifications: Array.from(allCerts).sort(),
      priceRange: {
        min: priceRange._min.pricePerUnit
          ? Number(priceRange._min.pricePerUnit)
          : 0,
        max: priceRange._max.pricePerUnit
          ? Number(priceRange._max.pricePerUnit)
          : 1000,
      },
    };
  }

  // ==================== HELPERS ====================

  private getStartingPrice(skus: any[]): number | null {
    let minPrice: number | null = null;
    for (const sku of skus) {
      if (sku.priceTiers && sku.priceTiers[0]) {
        const price = Number(sku.priceTiers[0].pricePerUnit);
        if (minPrice === null || price < minPrice) {
          minPrice = price;
        }
      }
    }
    return minPrice;
  }

  private toPublicProduct(product: any) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDesc: product.shortDesc,
      leadTimeDays: product.leadTimeDays,
      moqKg: Number(product.moqKg),
      certifications: product.certifications,
      region: product.region,
      gradeType: product.gradeType,
      seller: {
        companyName: product.seller.company.name,
        isVerified: product.seller.verificationStatus === 'APPROVED',
      },
      primaryImage: product.images[0]?.url ?? null,
      startingPrice: this.getStartingPrice(product.skus),
      skuCount: product._count.skus,
    };
  }
}
