import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

// Define valid status transitions
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.IN_TRANSIT],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // ==================== BUYER OPERATIONS ====================

  async getBuyerOrders(userId: string) {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        quote: {
          rfq: { buyerProfileId: buyerProfile.id },
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
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        quote: {
          include: {
            sellerProfile: { include: { company: { select: { name: true } } } },
            rfq: true,
          },
        },
      },
    });

    return orders.map((order) => this.transformOrderSummary(order));
  }

  async getBuyerOrderDetail(userId: string, orderId: string) {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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
              },
            },
          },
        },
        quote: {
          include: {
            sellerProfile: {
              include: {
                company: { select: { name: true, email: true, phone: true } },
                user: { select: { name: true, email: true } },
              },
            },
            rfq: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify this order belongs to the buyer
    if (order.quote.rfq.buyerProfileId !== buyerProfile.id) {
      throw new ForbiddenException('Order not found');
    }

    return this.transformOrderDetail(order);
  }

  // ==================== SELLER OPERATIONS ====================

  async getSellerOrders(userId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new ForbiddenException('Seller profile not found');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        quote: { sellerProfileId: sellerProfile.id },
      },
      orderBy: { createdAt: 'desc' },
      include: {
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
        quote: {
          include: {
            rfq: {
              include: {
                buyerProfile: { include: { company: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });

    return orders.map((order) => this.transformSellerOrderSummary(order));
  }

  async getSellerOrderDetail(userId: string, orderId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new ForbiddenException('Seller profile not found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
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
        quote: {
          include: {
            rfq: {
              include: {
                buyerProfile: {
                  include: {
                    company: { select: { name: true, email: true, phone: true } },
                    user: { select: { name: true, email: true } },
                  },
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.quote.sellerProfileId !== sellerProfile.id) {
      throw new ForbiddenException('Order not found');
    }

    return this.transformSellerOrderDetail(order);
  }

  async updateOrderStatus(
    userId: string,
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
    trackingNumber?: string,
    carrier?: string,
  ) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new ForbiddenException('Seller profile not found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { quote: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.quote.sellerProfileId !== sellerProfile.id) {
      throw new ForbiddenException('You cannot modify this order');
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}`,
      );
    }

    // Build update data
    const updateData: any = { status: newStatus };

    if (newStatus === OrderStatus.SHIPPED) {
      updateData.shippedAt = new Date();
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (carrier) updateData.carrier = carrier;
    }

    if (newStatus === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    // Update order and create history in transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          notes,
          changedBy: userId,
        },
      });

      // Update order
      return tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });
    });

    return {
      success: true,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        trackingNumber: updatedOrder.trackingNumber,
        carrier: updatedOrder.carrier,
      },
    };
  }

  // ==================== HELPERS ====================

  private transformOrderSummary(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      createdAt: order.createdAt,
      seller: {
        companyName: order.quote.sellerProfile.company.name,
      },
      lineItemCount: order.lineItems.length,
      rfqTitle: order.quote.rfq.title,
    };
  }

  private transformSellerOrderSummary(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      createdAt: order.createdAt,
      buyer: {
        companyName: order.quote.rfq.buyerProfile.company.name,
      },
      lineItemCount: order.lineItems.length,
      shipToCountry: order.shipToCountry,
    };
  }

  private transformOrderDetail(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      shippingCost: order.shippingCost ? Number(order.shippingCost) : null,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      shipToName: order.shipToName,
      shipToLine1: order.shipToLine1,
      shipToLine2: order.shipToLine2,
      shipToCity: order.shipToCity,
      shipToState: order.shipToState,
      shipToPostal: order.shipToPostal,
      shipToCountry: order.shipToCountry,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      buyerNotes: order.buyerNotes,
      createdAt: order.createdAt,
      seller: {
        companyName: order.quote.sellerProfile.company.name,
        contactName: order.quote.sellerProfile.user?.name,
        contactEmail: order.quote.sellerProfile.user?.email,
      },
      rfq: {
        id: order.quote.rfq.id,
        rfqNumber: order.quote.rfq.rfqNumber,
        title: order.quote.rfq.title,
      },
      lineItems: order.lineItems.map((li: any) => ({
        id: li.id,
        qty: Number(li.qty),
        unit: li.unit,
        unitPrice: Number(li.unitPrice),
        totalPrice: Number(li.totalPrice),
        sku: {
          id: li.sku.id,
          sku: li.sku.sku,
          name: li.sku.name,
          product: {
            id: li.sku.product.id,
            name: li.sku.product.name,
            primaryImage: li.sku.product.images[0]?.url || null,
          },
        },
      })),
      statusHistory: order.statusHistory.map((h: any) => ({
        id: h.id,
        status: h.status,
        notes: h.notes,
        createdAt: h.createdAt,
      })),
    };
  }

  private transformSellerOrderDetail(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      shippingCost: order.shippingCost ? Number(order.shippingCost) : null,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      shipToName: order.shipToName,
      shipToLine1: order.shipToLine1,
      shipToLine2: order.shipToLine2,
      shipToCity: order.shipToCity,
      shipToState: order.shipToState,
      shipToPostal: order.shipToPostal,
      shipToCountry: order.shipToCountry,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      sellerNotes: order.sellerNotes,
      buyerNotes: order.buyerNotes,
      createdAt: order.createdAt,
      buyer: {
        companyName: order.quote.rfq.buyerProfile.company.name,
        contactName: order.quote.rfq.buyerProfile.user.name,
        contactEmail: order.quote.rfq.buyerProfile.user.email,
      },
      lineItems: order.lineItems.map((li: any) => ({
        id: li.id,
        qty: Number(li.qty),
        unit: li.unit,
        unitPrice: Number(li.unitPrice),
        totalPrice: Number(li.totalPrice),
        sku: {
          id: li.sku.id,
          sku: li.sku.sku,
          name: li.sku.name,
          product: {
            id: li.sku.product.id,
            name: li.sku.product.name,
            primaryImage: li.sku.product.images[0]?.url || null,
          },
        },
      })),
      statusHistory: order.statusHistory.map((h: any) => ({
        id: h.id,
        status: h.status,
        notes: h.notes,
        changedBy: h.changedBy,
        createdAt: h.createdAt,
      })),
      allowedStatusTransitions: STATUS_TRANSITIONS[order.status as OrderStatus],
    };
  }
}
