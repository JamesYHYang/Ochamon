import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteStatus, RfqStatus, OrderStatus } from '@prisma/client';
import type { CreateQuoteInput, AcceptQuoteInput } from '@matcha/shared';

@Injectable()
export class QuoteService {
  constructor(private prisma: PrismaService) {}

  // ==================== SELLER OPERATIONS ====================

  async createQuote(userId: string, dto: CreateQuoteInput) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new ForbiddenException('Seller profile not found');
    }

    // Get RFQ and verify it exists
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: dto.rfqId },
      include: {
        lineItems: { include: { sku: { include: { product: true } } } },
      },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (rfq.status === RfqStatus.CANCELLED || rfq.status === RfqStatus.EXPIRED) {
      throw new BadRequestException('Cannot quote on cancelled or expired RFQ');
    }

    // Verify seller owns all quoted SKUs
    const sellerSkuIds = await this.prisma.sku.findMany({
      where: { product: { sellerId: sellerProfile.id } },
      select: { id: true },
    });
    const sellerSkuIdSet = new Set(sellerSkuIds.map((s) => s.id));

    for (const item of dto.lineItems) {
      if (!sellerSkuIdSet.has(item.skuId)) {
        throw new ForbiddenException(`SKU ${item.skuId} does not belong to you`);
      }
    }

    // Check if seller already has a quote for this RFQ
    const existingQuote = await this.prisma.quote.findFirst({
      where: { rfqId: dto.rfqId, sellerProfileId: sellerProfile.id },
    });

    if (existingQuote) {
      throw new BadRequestException('You have already submitted a quote for this RFQ');
    }

    // Calculate totals
    const lineItemsWithTotals = dto.lineItems.map((item) => ({
      ...item,
      totalPrice: item.qty * item.unitPrice,
    }));
    const subtotal = lineItemsWithTotals.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalAmount = subtotal + (dto.shippingCost || 0);

    // Generate quote number
    const quoteNumber = `QT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        rfqId: dto.rfqId,
        sellerProfileId: sellerProfile.id,
        subtotal,
        shippingCost: dto.shippingCost,
        totalAmount,
        currency: 'USD',
        incoterm: dto.incoterm as any,
        estimatedLeadDays: dto.estimatedLeadDays,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        validUntil: new Date(dto.validUntil as string),
        status: QuoteStatus.SUBMITTED,
        submittedAt: new Date(),
        lineItems: {
          create: lineItemsWithTotals.map((item) => ({
            skuId: item.skuId,
            qty: item.qty,
            unit: item.unit || 'kg',
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
          })),
        },
      },
      include: {
        lineItems: { include: { sku: true } },
        sellerProfile: { include: { company: { select: { name: true } } } },
        rfq: true,
      },
    });

    // Update RFQ status
    await this.prisma.rfq.update({
      where: { id: dto.rfqId },
      data: { status: RfqStatus.QUOTED },
    });

    return this.transformQuote(quote);
  }

  async getSellerQuotes(userId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new ForbiddenException('Seller profile not found');
    }

    const quotes = await this.prisma.quote.findMany({
      where: { sellerProfileId: sellerProfile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        rfq: {
          include: {
            buyerProfile: { include: { company: { select: { name: true } } } },
          },
        },
        lineItems: { include: { sku: true } },
        order: true,
      },
    });

    return quotes.map((q) => this.transformQuoteSummary(q));
  }

  async getSellerQuoteDetail(userId: string, quoteId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new ForbiddenException('Seller profile not found');
    }

    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        rfq: {
          include: {
            buyerProfile: {
              include: {
                company: { select: { name: true, email: true, phone: true } },
                user: { select: { name: true, email: true } },
              },
            },
            lineItems: { include: { sku: true } },
          },
        },
        lineItems: {
          include: {
            sku: {
              include: {
                product: {
                  include: { images: { where: { isPrimary: true }, take: 1 } },
                },
              },
            },
          },
        },
        order: true,
        sellerProfile: { include: { company: { select: { name: true } } } },
      },
    });

    if (!quote || quote.sellerProfileId !== sellerProfile.id) {
      throw new NotFoundException('Quote not found');
    }

    return this.transformQuoteDetail(quote);
  }

  // ==================== BUYER OPERATIONS ====================

  async getBuyerQuotes(userId: string) {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

    const quotes = await this.prisma.quote.findMany({
      where: {
        rfq: { buyerProfileId: buyerProfile.id },
        status: { in: [QuoteStatus.SUBMITTED, QuoteStatus.ACCEPTED] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        rfq: true,
        sellerProfile: { include: { company: { select: { name: true } } } },
        lineItems: { include: { sku: true } },
        order: true,
      },
    });

    return quotes.map((q) => this.transformQuoteSummary(q));
  }

  async acceptQuote(userId: string, dto: AcceptQuoteInput) {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

    const quote = await this.prisma.quote.findUnique({
      where: { id: dto.quoteId },
      include: {
        rfq: true,
        lineItems: { include: { sku: true } },
        sellerProfile: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.rfq.buyerProfileId !== buyerProfile.id) {
      throw new ForbiddenException('This quote is not for your RFQ');
    }

    if (quote.status !== QuoteStatus.SUBMITTED) {
      throw new BadRequestException('Quote is no longer available for acceptance');
    }

    if (new Date(quote.validUntil) < new Date()) {
      throw new BadRequestException('Quote has expired');
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create order in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update quote status
      await tx.quote.update({
        where: { id: dto.quoteId },
        data: {
          status: QuoteStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      // Update RFQ status
      await tx.rfq.update({
        where: { id: quote.rfqId },
        data: { status: RfqStatus.ACCEPTED },
      });

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          quoteId: quote.id,
          subtotal: quote.subtotal,
          shippingCost: quote.shippingCost,
          totalAmount: quote.totalAmount,
          currency: quote.currency,
          status: OrderStatus.PENDING_PAYMENT,
          shipToName: dto.shipToName,
          shipToLine1: dto.shipToLine1,
          shipToLine2: dto.shipToLine2,
          shipToCity: dto.shipToCity,
          shipToState: dto.shipToState,
          shipToPostal: dto.shipToPostal,
          shipToCountry: dto.shipToCountry,
          buyerNotes: dto.buyerNotes,
          lineItems: {
            create: quote.lineItems.map((item) => ({
              skuId: item.skuId,
              qty: item.qty,
              unit: item.unit,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
          statusHistory: {
            create: {
              status: OrderStatus.PENDING_PAYMENT,
              notes: 'Order created from accepted quote',
              changedBy: userId,
            },
          },
        },
        include: {
          lineItems: { include: { sku: true } },
          quote: {
            include: {
              sellerProfile: { include: { company: { select: { name: true } } } },
            },
          },
        },
      });

      return order;
    });

    return {
      success: true,
      order: {
        id: result.id,
        orderNumber: result.orderNumber,
        totalAmount: Number(result.totalAmount),
        currency: result.currency,
        status: result.status,
      },
    };
  }

  // ==================== HELPERS ====================

  private transformQuote(quote: any) {
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      rfqId: quote.rfqId,
      rfqNumber: quote.rfq.rfqNumber,
      status: quote.status,
      subtotal: Number(quote.subtotal),
      shippingCost: quote.shippingCost ? Number(quote.shippingCost) : null,
      totalAmount: Number(quote.totalAmount),
      currency: quote.currency,
      incoterm: quote.incoterm,
      estimatedLeadDays: quote.estimatedLeadDays,
      notes: quote.notes,
      validUntil: quote.validUntil,
      submittedAt: quote.submittedAt,
      createdAt: quote.createdAt,
      seller: { companyName: quote.sellerProfile.company.name },
      lineItems: quote.lineItems.map((li: any) => ({
        id: li.id,
        qty: Number(li.qty),
        unit: li.unit,
        unitPrice: Number(li.unitPrice),
        totalPrice: Number(li.totalPrice),
        sku: {
          id: li.sku.id,
          sku: li.sku.sku,
          name: li.sku.name,
        },
      })),
    };
  }

  private transformQuoteSummary(quote: any) {
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      rfqId: quote.rfqId,
      rfqNumber: quote.rfq.rfqNumber,
      rfqTitle: quote.rfq.title,
      status: quote.status,
      totalAmount: Number(quote.totalAmount),
      currency: quote.currency,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      buyer: quote.rfq.buyerProfile
        ? { companyName: quote.rfq.buyerProfile.company.name }
        : null,
      seller: quote.sellerProfile
        ? { companyName: quote.sellerProfile.company.name }
        : null,
      lineItemCount: quote.lineItems.length,
      hasOrder: !!quote.order,
      orderId: quote.order?.id || null,
    };
  }

  private transformQuoteDetail(quote: any) {
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      subtotal: Number(quote.subtotal),
      shippingCost: quote.shippingCost ? Number(quote.shippingCost) : null,
      totalAmount: Number(quote.totalAmount),
      currency: quote.currency,
      incoterm: quote.incoterm,
      estimatedLeadDays: quote.estimatedLeadDays,
      notes: quote.notes,
      termsConditions: quote.termsConditions,
      validUntil: quote.validUntil,
      submittedAt: quote.submittedAt,
      acceptedAt: quote.acceptedAt,
      createdAt: quote.createdAt,
      rfq: {
        id: quote.rfq.id,
        rfqNumber: quote.rfq.rfqNumber,
        title: quote.rfq.title,
        destinationCountry: quote.rfq.destinationCountry,
        incoterm: quote.rfq.incoterm,
        buyer: {
          companyName: quote.rfq.buyerProfile.company.name,
          contactName: quote.rfq.buyerProfile.user.name,
          contactEmail: quote.rfq.buyerProfile.user.email,
        },
      },
      lineItems: quote.lineItems.map((li: any) => ({
        id: li.id,
        qty: Number(li.qty),
        unit: li.unit,
        unitPrice: Number(li.unitPrice),
        totalPrice: Number(li.totalPrice),
        notes: li.notes,
        sku: {
          id: li.sku.id,
          sku: li.sku.sku,
          name: li.sku.name,
          packagingType: li.sku.packagingType,
          product: {
            id: li.sku.product.id,
            name: li.sku.product.name,
            primaryImage: li.sku.product.images[0]?.url || null,
          },
        },
      })),
      order: quote.order
        ? {
            id: quote.order.id,
            orderNumber: quote.order.orderNumber,
            status: quote.order.status,
          }
        : null,
    };
  }
}
