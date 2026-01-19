import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';
import type { AddToShortlistInput } from '@matcha/shared';

@Injectable()
export class BuyerService {
  constructor(private prisma: PrismaService) {}

  // ==================== SHORTLIST ====================

  /**
   * Add product to buyer's shortlist
   */
  async addToShortlist(userId: string, dto: AddToShortlistInput) {
    const buyerProfile = await this.getBuyerProfile(userId);

    // Verify product exists and is active
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found');
    }

    // Check if already in shortlist
    const existing = await this.prisma.shortlist.findUnique({
      where: {
        buyerProfileId_productId: {
          buyerProfileId: buyerProfile.id,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Product already in shortlist');
    }

    // Add to shortlist
    const shortlistItem = await this.prisma.shortlist.create({
      data: {
        buyerProfileId: buyerProfile.id,
        productId: dto.productId,
        notes: dto.notes,
      },
      include: {
        product: {
          include: {
            region: {
              select: { id: true, name: true, country: true },
            },
            gradeType: {
              select: { id: true, name: true, code: true },
            },
            seller: {
              include: {
                company: {
                  select: { name: true },
                },
              },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
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
        },
      },
    });

    return this.transformShortlistItem(shortlistItem);
  }

  /**
   * Get buyer's complete shortlist
   */
  async getShortlist(userId: string) {
    const buyerProfile = await this.getBuyerProfile(userId);

    const items = await this.prisma.shortlist.findMany({
      where: { buyerProfileId: buyerProfile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            region: {
              select: { id: true, name: true, country: true },
            },
            gradeType: {
              select: { id: true, name: true, code: true },
            },
            seller: {
              include: {
                company: {
                  select: { name: true },
                },
              },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
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
        },
      },
    });

    return {
      data: items.map((item) => this.transformShortlistItem(item)),
      total: items.length,
    };
  }

  /**
   * Remove product from buyer's shortlist
   */
  async removeFromShortlist(userId: string, productId: string) {
    const buyerProfile = await this.getBuyerProfile(userId);

    const existing = await this.prisma.shortlist.findUnique({
      where: {
        buyerProfileId_productId: {
          buyerProfileId: buyerProfile.id,
          productId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Product not in shortlist');
    }

    await this.prisma.shortlist.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  /**
   * Update shortlist item notes
   */
  async updateShortlistNotes(userId: string, productId: string, notes: string) {
    const buyerProfile = await this.getBuyerProfile(userId);

    const existing = await this.prisma.shortlist.findUnique({
      where: {
        buyerProfileId_productId: {
          buyerProfileId: buyerProfile.id,
          productId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Product not in shortlist');
    }

    const updated = await this.prisma.shortlist.update({
      where: { id: existing.id },
      data: { notes },
    });

    return updated;
  }

  /**
   * Check if product is in shortlist
   */
  async isInShortlist(userId: string, productId: string): Promise<boolean> {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) return false;

    const item = await this.prisma.shortlist.findUnique({
      where: {
        buyerProfileId_productId: {
          buyerProfileId: buyerProfile.id,
          productId,
        },
      },
    });

    return !!item;
  }

  // ==================== HELPERS ====================

  private async getBuyerProfile(userId: string) {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

    return buyerProfile;
  }

  private transformShortlistItem(item: any) {
    const product = item.product;
    const startingPrice = this.getStartingPrice(product.skus);

    return {
      id: item.id,
      productId: item.productId,
      notes: item.notes,
      createdAt: item.createdAt,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        shortDesc: product.shortDesc,
        leadTimeDays: product.leadTimeDays,
        moqKg: Number(product.moqKg),
        certifications: product.certifications,
        status: product.status,
        region: product.region,
        gradeType: product.gradeType,
        seller: {
          companyName: product.seller.company.name,
          isVerified: product.seller.verificationStatus === 'APPROVED',
        },
        primaryImage: product.images[0]?.url ?? null,
        startingPrice,
        skuCount: product._count.skus,
      },
    };
  }

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
}
