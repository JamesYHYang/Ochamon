import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RfqStatus } from '@prisma/client';
import type { CreateRfqInput } from '@matcha/shared';

@Injectable()
export class RfqService {
  constructor(private prisma: PrismaService) {}

  // ==================== BUYER OPERATIONS ====================

  async createRfq(userId: string, dto: CreateRfqInput) {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

    // Verify all SKUs exist and are active
    const skuIds = dto.lineItems.map((item) => item.skuId);
    const skus = await this.prisma.sku.findMany({
      where: { id: { in: skuIds }, isActive: true },
      include: { product: true },
    });

    if (skus.length !== skuIds.length) {
      throw new BadRequestException('One or more SKUs not found or inactive');
    }

    // Generate RFQ number
    const rfqNumber = `RFQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const rfq = await this.prisma.rfq.create({
      data: {
        rfqNumber,
        title: dto.title,
        notes: dto.notes,
        destinationCountry: dto.destinationCountry,
        destinationCity: dto.destinationCity,
        incoterm: dto.incoterm as any,
        neededByDate: dto.neededByDate ? new Date(dto.neededByDate as string) : null,
        status: RfqStatus.SUBMITTED,
        submittedAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        buyerProfileId: buyerProfile.id,
        lineItems: {
          create: dto.lineItems.map((item) => ({
            skuId: item.skuId,
            qty: item.qty,
            unit: item.unit || 'kg',
            notes: item.notes,
            targetPrice: item.targetPrice,
          })),
        },
        messageThread: {
          create: {
            subject: `RFQ: ${dto.title}`,
          },
        },
      },
      include: {
        lineItems: {
          include: {
            sku: {
              include: {
                product: {
                  include: {
                    seller: {
                      include: { company: { select: { name: true } } },
                    },
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        buyerProfile: {
          include: { company: { select: { name: true } } },
        },
      },
    });

    return this.transformRfq(rfq);
  }

  async getBuyerRfqs(userId: string) {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

    const rfqs = await this.prisma.rfq.findMany({
      where: { buyerProfileId: buyerProfile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: {
          include: {
            sku: {
              include: {
                product: {
                  include: {
                    seller: { include: { company: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
        quotes: {
          include: {
            sellerProfile: { include: { company: { select: { name: true } } } },
          },
        },
        _count: { select: { quotes: true } },
      },
    });

    return rfqs.map((rfq) => this.transformRfqSummary(rfq));
  }

  async getBuyerRfqDetail(userId: string, rfqId: string) {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        lineItems: {
          include: {
            sku: {
              include: {
                product: {
                  include: {
                    seller: { include: { company: { select: { name: true } } } },
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
                priceTiers: { orderBy: { minQty: 'asc' } },
              },
            },
          },
        },
        quotes: {
          include: {
            sellerProfile: { include: { company: { select: { name: true } } } },
            lineItems: { include: { sku: true } },
          },
        },
        messageThread: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              include: { sender: { select: { id: true, name: true, role: true } } },
            },
          },
        },
        buyerProfile: { include: { company: { select: { name: true } } } },
      },
    });

    if (!rfq || rfq.buyerProfileId !== buyerProfile.id) {
      throw new NotFoundException('RFQ not found');
    }

    return this.transformRfqDetail(rfq);
  }

  // ==================== SELLER OPERATIONS ====================

  async getSellerRfqs(userId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new ForbiddenException('Seller profile not found');
    }

    // Get all SKUs belonging to this seller
    const sellerSkuIds = await this.prisma.sku.findMany({
      where: { product: { sellerId: sellerProfile.id } },
      select: { id: true },
    });
    const skuIdSet = new Set(sellerSkuIds.map((s) => s.id));

    // Get RFQs that contain at least one of the seller's SKUs
    const rfqs = await this.prisma.rfq.findMany({
      where: {
        status: { in: [RfqStatus.SUBMITTED, RfqStatus.QUOTED, RfqStatus.PARTIALLY_QUOTED] },
        lineItems: {
          some: {
            skuId: { in: Array.from(skuIdSet) },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: {
          include: {
            sku: {
              include: {
                product: {
                  include: {
                    seller: { include: { company: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
        buyerProfile: { include: { company: { select: { name: true } } } },
        quotes: {
          where: { sellerProfileId: sellerProfile.id },
        },
      },
    });

    // Filter line items to only show seller's SKUs
    return rfqs.map((rfq) => {
      const relevantLineItems = rfq.lineItems.filter((item) => skuIdSet.has(item.skuId));
      const hasQuoted = rfq.quotes.length > 0;

      return {
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        title: rfq.title,
        status: rfq.status,
        destinationCountry: rfq.destinationCountry,
        incoterm: rfq.incoterm,
        neededByDate: rfq.neededByDate,
        expiresAt: rfq.expiresAt,
        createdAt: rfq.createdAt,
        buyer: {
          companyName: rfq.buyerProfile.company.name,
        },
        lineItemCount: relevantLineItems.length,
        hasQuoted,
        quoteId: rfq.quotes[0]?.id || null,
      };
    });
  }

  async getSellerRfqDetail(userId: string, rfqId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new ForbiddenException('Seller profile not found');
    }

    // Get seller's SKU IDs
    const sellerSkuIds = await this.prisma.sku.findMany({
      where: { product: { sellerId: sellerProfile.id } },
      select: { id: true },
    });
    const skuIdSet = new Set(sellerSkuIds.map((s) => s.id));

    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        lineItems: {
          include: {
            sku: {
              include: {
                product: {
                  include: {
                    seller: { include: { company: { select: { name: true } } } },
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
                priceTiers: { orderBy: { minQty: 'asc' } },
                inventory: true,
              },
            },
          },
        },
        buyerProfile: {
          include: {
            company: { select: { name: true, email: true, phone: true } },
            user: { select: { name: true, email: true } },
          },
        },
        quotes: {
          where: { sellerProfileId: sellerProfile.id },
          include: { lineItems: true },
        },
        messageThread: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              include: { sender: { select: { id: true, name: true, role: true } } },
            },
          },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    // Check if this RFQ contains any of seller's SKUs
    const hasRelevantItems = rfq.lineItems.some((item) => skuIdSet.has(item.skuId));
    if (!hasRelevantItems) {
      throw new ForbiddenException('You do not have access to this RFQ');
    }

    // Filter to only show seller's relevant line items
    const relevantLineItems = rfq.lineItems.filter((item) => skuIdSet.has(item.skuId));

    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      title: rfq.title,
      notes: rfq.notes,
      status: rfq.status,
      destinationCountry: rfq.destinationCountry,
      destinationCity: rfq.destinationCity,
      incoterm: rfq.incoterm,
      neededByDate: rfq.neededByDate,
      expiresAt: rfq.expiresAt,
      createdAt: rfq.createdAt,
      buyer: {
        companyName: rfq.buyerProfile.company.name,
        contactName: rfq.buyerProfile.user.name,
        contactEmail: rfq.buyerProfile.user.email,
      },
      lineItems: relevantLineItems.map((item) => ({
        id: item.id,
        qty: Number(item.qty),
        unit: item.unit,
        notes: item.notes,
        targetPrice: item.targetPrice ? Number(item.targetPrice) : null,
        sku: {
          id: item.sku.id,
          sku: item.sku.sku,
          name: item.sku.name,
          packagingType: item.sku.packagingType,
          netWeightG: item.sku.netWeightG,
          currency: item.sku.currency,
          product: {
            id: item.sku.product.id,
            name: item.sku.product.name,
            primaryImage: item.sku.product.images[0]?.url || null,
          },
          priceTiers: item.sku.priceTiers.map((t) => ({
            minQty: t.minQty,
            maxQty: t.maxQty,
            pricePerUnit: Number(t.pricePerUnit),
            unit: t.unit,
          })),
          inventory: item.sku.inventory
            ? { availableQty: item.sku.inventory.availableQty, unit: item.sku.inventory.unit }
            : null,
        },
      })),
      existingQuote: rfq.quotes[0]
        ? {
            id: rfq.quotes[0].id,
            quoteNumber: rfq.quotes[0].quoteNumber,
            status: rfq.quotes[0].status,
            totalAmount: Number(rfq.quotes[0].totalAmount),
            validUntil: rfq.quotes[0].validUntil,
          }
        : null,
      messageThread: rfq.messageThread
        ? {
            id: rfq.messageThread.id,
            messages: rfq.messageThread.messages.map((m) => ({
              id: m.id,
              body: m.body,
              createdAt: m.createdAt,
              sender: m.sender,
            })),
          }
        : null,
    };
  }

  // ==================== HELPERS ====================

  private transformRfq(rfq: any) {
    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      title: rfq.title,
      notes: rfq.notes,
      status: rfq.status,
      destinationCountry: rfq.destinationCountry,
      destinationCity: rfq.destinationCity,
      incoterm: rfq.incoterm,
      neededByDate: rfq.neededByDate,
      expiresAt: rfq.expiresAt,
      submittedAt: rfq.submittedAt,
      createdAt: rfq.createdAt,
      lineItems: rfq.lineItems.map((item: any) => ({
        id: item.id,
        qty: Number(item.qty),
        unit: item.unit,
        notes: item.notes,
        targetPrice: item.targetPrice ? Number(item.targetPrice) : null,
        sku: {
          id: item.sku.id,
          sku: item.sku.sku,
          name: item.sku.name,
          product: {
            id: item.sku.product.id,
            name: item.sku.product.name,
            seller: { companyName: item.sku.product.seller.company.name },
            primaryImage: item.sku.product.images[0]?.url || null,
          },
        },
      })),
    };
  }

  private transformRfqSummary(rfq: any) {
    const sellers = new Set(
      rfq.lineItems.map((item: any) => item.sku.product.seller.company.name),
    );

    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      title: rfq.title,
      status: rfq.status,
      destinationCountry: rfq.destinationCountry,
      incoterm: rfq.incoterm,
      neededByDate: rfq.neededByDate,
      expiresAt: rfq.expiresAt,
      createdAt: rfq.createdAt,
      lineItemCount: rfq.lineItems.length,
      quoteCount: rfq._count.quotes,
      sellers: Array.from(sellers),
      quotes: rfq.quotes.map((q: any) => ({
        id: q.id,
        status: q.status,
        sellerName: q.sellerProfile.company.name,
        totalAmount: Number(q.totalAmount),
      })),
    };
  }

  private transformRfqDetail(rfq: any) {
    return {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      title: rfq.title,
      notes: rfq.notes,
      status: rfq.status,
      destinationCountry: rfq.destinationCountry,
      destinationCity: rfq.destinationCity,
      incoterm: rfq.incoterm,
      neededByDate: rfq.neededByDate,
      expiresAt: rfq.expiresAt,
      submittedAt: rfq.submittedAt,
      createdAt: rfq.createdAt,
      buyer: {
        companyName: rfq.buyerProfile.company.name,
      },
      lineItems: rfq.lineItems.map((item: any) => ({
        id: item.id,
        qty: Number(item.qty),
        unit: item.unit,
        notes: item.notes,
        targetPrice: item.targetPrice ? Number(item.targetPrice) : null,
        sku: {
          id: item.sku.id,
          sku: item.sku.sku,
          name: item.sku.name,
          packagingType: item.sku.packagingType,
          netWeightG: item.sku.netWeightG,
          currency: item.sku.currency,
          product: {
            id: item.sku.product.id,
            name: item.sku.product.name,
            seller: { companyName: item.sku.product.seller.company.name },
            primaryImage: item.sku.product.images[0]?.url || null,
          },
          priceTiers: item.sku.priceTiers?.map((t: any) => ({
            minQty: t.minQty,
            maxQty: t.maxQty,
            pricePerUnit: Number(t.pricePerUnit),
            unit: t.unit,
          })),
        },
      })),
      quotes: rfq.quotes.map((q: any) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        totalAmount: Number(q.totalAmount),
        currency: q.currency,
        validUntil: q.validUntil,
        seller: { companyName: q.sellerProfile.company.name },
        lineItems: q.lineItems.map((li: any) => ({
          id: li.id,
          qty: Number(li.qty),
          unit: li.unit,
          unitPrice: Number(li.unitPrice),
          totalPrice: Number(li.totalPrice),
          skuId: li.skuId,
        })),
      })),
      messageThread: rfq.messageThread
        ? {
            id: rfq.messageThread.id,
            messages: rfq.messageThread.messages.map((m: any) => ({
              id: m.id,
              body: m.body,
              createdAt: m.createdAt,
              sender: m.sender,
            })),
          }
        : null,
    };
  }
}
