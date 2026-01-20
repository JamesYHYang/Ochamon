import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus, Prisma } from '@prisma/client';
import type {
  UpdateSellerProfileInput,
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
  CreateSkuInput,
  UpdateSkuInput,
} from './dto';

@Injectable()
export class SellerService {
  constructor(private prisma: PrismaService) {}

  // ==================== PROFILE ====================

  async getProfile(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        company: {
          include: {
            addresses: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    return seller;
  }

  async updateProfile(userId: string, dto: UpdateSellerProfileInput) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { company: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Update company if company fields provided
    if (dto.company) {
      await this.prisma.company.update({
        where: { id: seller.companyId },
        data: {
          name: dto.company.name,
          legalName: dto.company.legalName,
          taxId: dto.company.taxId,
          website: dto.company.website,
          phone: dto.company.phone,
          email: dto.company.email,
          description: dto.company.description,
        },
      });
    }

    // Update seller profile
    const updated = await this.prisma.sellerProfile.update({
      where: { userId },
      data: {
        yearsInBusiness: dto.yearsInBusiness,
        annualCapacityKg: dto.annualCapacityKg,
        exportLicenseNo: dto.exportLicenseNo,
        isOrganic: dto.isOrganic,
        isJasCertified: dto.isJasCertified,
        isUsdaCertified: dto.isUsdaCertified,
        isEuCertified: dto.isEuCertified,
        bio: dto.bio,
      },
      include: {
        company: {
          include: { addresses: true },
        },
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return updated;
  }

  // ==================== PRODUCTS ====================

  async getProducts(userId: string, query: ProductQueryInput) {
    const seller = await this.getSellerProfile(userId);

    const { page = 1, limit = 10, search, status, gradeTypeId, regionId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      sellerId: seller.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as ProductStatus;
    }

    if (gradeTypeId) {
      where.gradeTypeId = gradeTypeId;
    }

    if (regionId) {
      where.regionId = regionId;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          region: true,
          gradeType: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          skus: {
            include: {
              inventory: true,
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
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProduct(userId: string, productId: string) {
    const seller = await this.getSellerProfile(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        region: true,
        gradeType: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        documents: true,
        skus: {
          include: {
            inventory: true,
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

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You do not own this product');
    }

    return product;
  }

  async createProduct(userId: string, dto: CreateProductInput) {
    const seller = await this.getSellerProfile(userId);

    // Validate region exists
    const region = await this.prisma.region.findUnique({
      where: { id: dto.regionId },
    });
    if (!region) {
      throw new BadRequestException('Invalid region');
    }

    // Validate grade type exists
    const gradeType = await this.prisma.gradeType.findUnique({
      where: { id: dto.gradeTypeId },
    });
    if (!gradeType) {
      throw new BadRequestException('Invalid grade type');
    }

    // Generate slug
    const baseSlug = this.slugify(dto.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create product with nested SKUs, price tiers, and inventory
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        shortDesc: dto.shortDesc,
        leadTimeDays: dto.leadTimeDays ?? 14,
        moqKg: dto.moqKg,
        certifications: dto.certifications ?? [],
        status: (dto.status as ProductStatus) ?? ProductStatus.ACTIVE,
        sellerId: seller.id,
        regionId: dto.regionId,
        gradeTypeId: dto.gradeTypeId,
        skus: dto.skus ? {
          create: dto.skus.map((sku) => ({
            sku: sku.sku,
            name: sku.name,
            packagingType: sku.packagingType,
            netWeightG: sku.netWeightG,
            lengthCm: sku.lengthCm,
            widthCm: sku.widthCm,
            heightCm: sku.heightCm,
            grossWeightG: sku.grossWeightG,
            hsCode: sku.hsCode,
            originCountry: sku.originCountry ?? 'JP',
            currency: sku.currency ?? 'USD',
            priceTiers: sku.priceTiers ? {
              create: sku.priceTiers.map((tier) => ({
                minQty: tier.minQty,
                maxQty: tier.maxQty,
                unit: tier.unit ?? 'unit',
                pricePerUnit: tier.pricePerUnit,
              })),
            } : undefined,
            inventory: sku.inventory ? {
              create: {
                availableQty: sku.inventory.availableQty,
                reservedQty: sku.inventory.reservedQty ?? 0,
                unit: sku.inventory.unit ?? 'unit',
                warehouseLocation: sku.inventory.warehouseLocation,
              },
            } : undefined,
          })),
        } : undefined,
      },
      include: {
        region: true,
        gradeType: true,
        images: true,
        skus: {
          include: {
            inventory: true,
            priceTiers: {
              orderBy: { minQty: 'asc' },
            },
          },
        },
      },
    });

    return product;
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductInput) {
    const seller = await this.getSellerProfile(userId);

    const existing = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (existing.sellerId !== seller.id) {
      throw new ForbiddenException('You do not own this product');
    }

    // Handle slug update if name changed
    let slug = existing.slug;
    if (dto.name && dto.name !== existing.name) {
      const baseSlug = this.slugify(dto.name);
      slug = baseSlug;
      let counter = 1;

      while (
        await this.prisma.product.findFirst({
          where: { slug, id: { not: productId } },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        shortDesc: dto.shortDesc,
        leadTimeDays: dto.leadTimeDays,
        moqKg: dto.moqKg,
        certifications: dto.certifications,
        status: dto.status as ProductStatus | undefined,
        regionId: dto.regionId,
        gradeTypeId: dto.gradeTypeId,
      },
      include: {
        region: true,
        gradeType: true,
        images: true,
        skus: {
          include: {
            inventory: true,
            priceTiers: {
              orderBy: { minQty: 'asc' },
            },
          },
        },
      },
    });

    return product;
  }

  async deleteProduct(userId: string, productId: string) {
    const seller = await this.getSellerProfile(userId);

    const existing = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (existing.sellerId !== seller.id) {
      throw new ForbiddenException('You do not own this product');
    }

    // Check if product has active orders
    const activeOrders = await this.prisma.orderLineItem.count({
      where: {
        sku: {
          productId,
        },
        order: {
          status: {
            notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
          },
        },
      },
    });

    if (activeOrders > 0) {
      throw new BadRequestException('Cannot delete product with active orders');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    return { success: true };
  }

  // ==================== IMAGES ====================

  async addProductImage(
    userId: string,
    productId: string,
    file: Express.Multer.File,
    isPrimary: boolean = false,
  ) {
    const seller = await this.getSellerProfile(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You do not own this product');
    }

    // If setting as primary, unset other primary images
    if (isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    // Set as primary if it's the first image
    const isFirstImage = product.images.length === 0;

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url: `/uploads/products/${file.filename}`,
        altText: product.name,
        sortOrder: product.images.length,
        isPrimary: isPrimary || isFirstImage,
      },
    });

    return image;
  }

  async deleteProductImage(userId: string, productId: string, imageId: string) {
    const seller = await this.getSellerProfile(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You do not own this product');
    }

    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found');
    }

    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    return { success: true };
  }

  // ==================== SKU MANAGEMENT ====================

  async addSku(userId: string, productId: string, dto: CreateSkuInput) {
    const seller = await this.getSellerProfile(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You do not own this product');
    }

    const sku = await this.prisma.sku.create({
      data: {
        productId,
        sku: dto.sku,
        name: dto.name,
        packagingType: dto.packagingType,
        netWeightG: dto.netWeightG,
        lengthCm: dto.lengthCm,
        widthCm: dto.widthCm,
        heightCm: dto.heightCm,
        grossWeightG: dto.grossWeightG,
        hsCode: dto.hsCode,
        originCountry: dto.originCountry ?? 'JP',
        currency: dto.currency ?? 'USD',
        priceTiers: dto.priceTiers ? {
          create: dto.priceTiers.map((tier) => ({
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unit: tier.unit ?? 'unit',
            pricePerUnit: tier.pricePerUnit,
          })),
        } : undefined,
        inventory: dto.inventory ? {
          create: {
            availableQty: dto.inventory.availableQty,
            reservedQty: dto.inventory.reservedQty ?? 0,
            unit: dto.inventory.unit ?? 'unit',
            warehouseLocation: dto.inventory.warehouseLocation,
          },
        } : undefined,
      },
      include: {
        inventory: true,
        priceTiers: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    return sku;
  }

  async updateSku(userId: string, productId: string, skuId: string, dto: UpdateSkuInput) {
    const seller = await this.getSellerProfile(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You do not own this product');
    }

    const existing = await this.prisma.sku.findUnique({
      where: { id: skuId },
    });

    if (!existing || existing.productId !== productId) {
      throw new NotFoundException('SKU not found');
    }

    const sku = await this.prisma.sku.update({
      where: { id: skuId },
      data: {
        name: dto.name,
        packagingType: dto.packagingType,
        netWeightG: dto.netWeightG,
        lengthCm: dto.lengthCm,
        widthCm: dto.widthCm,
        heightCm: dto.heightCm,
        grossWeightG: dto.grossWeightG,
        hsCode: dto.hsCode,
        originCountry: dto.originCountry,
        currency: dto.currency,
        isActive: dto.isActive,
      },
      include: {
        inventory: true,
        priceTiers: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    return sku;
  }

  async deleteSku(userId: string, productId: string, skuId: string) {
    const seller = await this.getSellerProfile(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== seller.id) {
      throw new ForbiddenException('You do not own this product');
    }

    const sku = await this.prisma.sku.findUnique({
      where: { id: skuId },
    });

    if (!sku || sku.productId !== productId) {
      throw new NotFoundException('SKU not found');
    }

    await this.prisma.sku.delete({
      where: { id: skuId },
    });

    return { success: true };
  }

  // ==================== HELPERS ====================

  private async getSellerProfile(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new ForbiddenException('Seller profile not found');
    }

    return seller;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // ==================== LOOKUPS ====================

  async getRegions() {
    return this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getGradeTypes() {
    return this.prisma.gradeType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}


