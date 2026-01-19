import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartStatus, Prisma } from '@prisma/client';
import type {
  AddToCartInput,
  UpdateCartItemInput,
  CheckoutInput,
  ConvertToRfqInput,
} from './dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get or create user's active cart
   */
  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: {
                  include: {
                    seller: {
                      include: {
                        company: { select: { name: true } },
                      },
                    },
                    images: {
                      where: { isPrimary: true },
                      take: 1,
                    },
                  },
                },
                inventory: true,
                priceTiers: {
                  orderBy: { minQty: 'asc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              sku: {
                include: {
                  product: {
                    include: {
                      seller: {
                        include: {
                          company: { select: { name: true } },
                        },
                      },
                      images: {
                        where: { isPrimary: true },
                        take: 1,
                      },
                    },
                  },
                  inventory: true,
                  priceTiers: {
                    orderBy: { minQty: 'asc' },
                  },
                },
              },
            },
          },
        },
      });
    }

    return this.transformCart(cart);
  }

  /**
   * Add item to cart
   */
  async addItem(userId: string, dto: AddToCartInput) {
    const cart = await this.getOrCreateActiveCart(userId);

    // Verify SKU exists and is active
    const sku = await this.prisma.sku.findUnique({
      where: { id: dto.skuId },
      include: {
        product: true,
        inventory: true,
        priceTiers: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    if (!sku || !sku.isActive) {
      throw new NotFoundException('SKU not found or not available');
    }

    // Check minimum order quantity
    if (dto.qty < Number(sku.product.moqKg)) {
      throw new BadRequestException(
        `Minimum order quantity is ${sku.product.moqKg} ${dto.unit}`,
      );
    }

    // Check inventory if available
    if (sku.inventory && dto.qty > sku.inventory.availableQty) {
      throw new BadRequestException(
        `Only ${sku.inventory.availableQty} ${sku.inventory.unit} available`,
      );
    }

    // Calculate unit price based on price tiers
    const unitPrice = this.calculateUnitPrice(sku.priceTiers, dto.qty);
    const totalPrice = dto.qty * unitPrice;

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_skuId: {
          cartId: cart.id,
          skuId: dto.skuId,
        },
      },
    });

    if (existingItem) {
      // Update existing item
      const newQty = Number(existingItem.qty) + dto.qty;
      const newUnitPrice = this.calculateUnitPrice(sku.priceTiers, newQty);
      const newTotalPrice = newQty * newUnitPrice;

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          qty: newQty,
          unitPrice: newUnitPrice,
          totalPrice: newTotalPrice,
          notes: dto.notes || existingItem.notes,
        },
      });
    } else {
      // Create new item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          skuId: dto.skuId,
          qty: dto.qty,
          unit: dto.unit,
          unitPrice,
          totalPrice,
          currency: sku.currency,
          notes: dto.notes,
        },
      });
    }

    // Update cart totals
    await this.recalculateCartTotals(cart.id);

    return this.getOrCreateCart(userId);
  }

  /**
   * Update cart item quantity
   */
  async updateItem(userId: string, itemId: string, dto: UpdateCartItemInput) {
    const cart = await this.getOrCreateActiveCart(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        sku: {
          include: {
            product: true,
            inventory: true,
            priceTiers: {
              orderBy: { minQty: 'asc' },
            },
          },
        },
      },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    const updates: Prisma.CartItemUpdateInput = {};

    if (dto.qty !== undefined) {
      // Validate quantity
      if (dto.qty < Number(item.sku.product.moqKg)) {
        throw new BadRequestException(
          `Minimum order quantity is ${item.sku.product.moqKg} ${item.unit}`,
        );
      }

      if (item.sku.inventory && dto.qty > item.sku.inventory.availableQty) {
        throw new BadRequestException(
          `Only ${item.sku.inventory.availableQty} ${item.sku.inventory.unit} available`,
        );
      }

      const unitPrice = this.calculateUnitPrice(item.sku.priceTiers, dto.qty);
      updates.qty = dto.qty;
      updates.unitPrice = unitPrice;
      updates.totalPrice = dto.qty * unitPrice;
    }

    if (dto.notes !== undefined) {
      updates.notes = dto.notes;
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: updates,
    });

    await this.recalculateCartTotals(cart.id);

    return this.getOrCreateCart(userId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateActiveCart(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    await this.recalculateCartTotals(cart.id);

    return this.getOrCreateCart(userId);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(userId: string) {
    const cart = await this.getOrCreateActiveCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        subtotal: 0,
        itemCount: 0,
      },
    });

    return this.getOrCreateCart(userId);
  }

  /**
   * B2C Direct Checkout - Create Order from cart
   */
  async checkout(userId: string, dto: CheckoutInput) {
    const cart = await this.getOrCreateActiveCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Group items by seller to create separate orders per seller
    const itemsBySeller = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const sellerId = item.sku.product.sellerId;
      if (!itemsBySeller.has(sellerId)) {
        itemsBySeller.set(sellerId, []);
      }
      itemsBySeller.get(sellerId)!.push(item);
    }

    const orders: any[] = [];

    // Create orders for each seller
    for (const [sellerId, items] of itemsBySeller) {
      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0,
      );

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Get buyer profile for the RFQ reference (we'll create a dummy quote)
      const buyerProfile = await this.prisma.buyerProfile.findUnique({
        where: { userId },
      });

      if (!buyerProfile) {
        throw new ForbiddenException('Buyer profile not found');
      }

      // For direct checkout without RFQ flow, we create a minimal quote
      const rfqNumber = `RFQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const quoteNumber = `QT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const order = await this.prisma.$transaction(async (tx) => {
        // Create RFQ
        const rfq = await tx.rfq.create({
          data: {
            rfqNumber,
            title: `Direct Order - ${orderNumber}`,
            destinationCountry: dto.shipToCountry,
            destinationCity: dto.shipToCity,
            incoterm: 'DDP',
            status: 'ACCEPTED',
            submittedAt: new Date(),
            buyerProfileId: buyerProfile.id,
            lineItems: {
              create: items.map((item) => ({
                skuId: item.skuId,
                qty: item.qty,
                unit: item.unit,
              })),
            },
          },
        });

        // Create Quote
        const quote = await tx.quote.create({
          data: {
            quoteNumber,
            rfqId: rfq.id,
            sellerProfileId: sellerId,
            subtotal,
            totalAmount: subtotal,
            currency: cart.currency,
            incoterm: 'DDP',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'ACCEPTED',
            submittedAt: new Date(),
            acceptedAt: new Date(),
            lineItems: {
              create: items.map((item) => ({
                skuId: item.skuId,
                qty: item.qty,
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
        });

        // Create Order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            quoteId: quote.id,
            subtotal,
            totalAmount: subtotal,
            currency: cart.currency,
            status: 'PENDING_PAYMENT',
            shipToName: dto.shipToName,
            shipToLine1: dto.shipToLine1,
            shipToLine2: dto.shipToLine2,
            shipToCity: dto.shipToCity,
            shipToState: dto.shipToState,
            shipToPostal: dto.shipToPostal,
            shipToCountry: dto.shipToCountry,
            buyerNotes: dto.buyerNotes,
            lineItems: {
              create: items.map((item) => ({
                skuId: item.skuId,
                qty: item.qty,
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
            statusHistory: {
              create: {
                status: 'PENDING_PAYMENT',
                notes: 'Order created from direct checkout',
              },
            },
          },
        });

        return newOrder;
      });

      orders.push(order);
    }

    // Mark cart as converted
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: CartStatus.CONVERTED },
    });

    return {
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        totalAmount: Number(o.totalAmount),
        currency: o.currency,
      })),
    };
  }

  /**
   * B2B Convert cart to RFQ
   */
  async convertToRfq(userId: string, dto: ConvertToRfqInput) {
    const cart = await this.getOrCreateActiveCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new ForbiddenException('Buyer profile not found');
    }

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
        status: 'SUBMITTED',
        submittedAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        buyerProfileId: buyerProfile.id,
        lineItems: {
          create: cart.items.map((item) => ({
            skuId: item.skuId,
            qty: item.qty,
            unit: item.unit,
            notes: item.notes,
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });

    // Mark cart as converted
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        status: CartStatus.CONVERTED,
        incoterm: dto.incoterm as any,
        destinationCountry: dto.destinationCountry,
      },
    });

    return {
      success: true,
      rfq: {
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        title: rfq.title,
        status: rfq.status,
        lineItemCount: rfq.lineItems.length,
      },
    };
  }

  // ==================== HELPERS ====================

  private async getOrCreateActiveCart(userId: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
                inventory: true,
                priceTiers: {
                  orderBy: { minQty: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              sku: {
                include: {
                  product: true,
                  inventory: true,
                  priceTiers: {
                    orderBy: { minQty: 'asc' },
                  },
                },
              },
            },
          },
        },
      });
    }

    return cart;
  }

  private calculateUnitPrice(priceTiers: any[], qty: number): number {
    if (!priceTiers || priceTiers.length === 0) {
      return 0;
    }

    // Find the applicable price tier
    for (let i = priceTiers.length - 1; i >= 0; i--) {
      const tier = priceTiers[i];
      if (qty >= tier.minQty) {
        return Number(tier.pricePerUnit);
      }
    }

    // Default to first tier if no match
    return Number(priceTiers[0].pricePerUnit);
  }

  private async recalculateCartTotals(cartId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0,
    );
    const itemCount = items.length;

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { subtotal, itemCount },
    });
  }

  private transformCart(cart: any) {
    return {
      id: cart.id,
      type: cart.type,
      status: cart.status,
      destinationCountry: cart.destinationCountry,
      incoterm: cart.incoterm,
      subtotal: Number(cart.subtotal),
      currency: cart.currency,
      itemCount: cart.itemCount,
      notes: cart.notes,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: cart.items.map((item: any) => this.transformCartItem(item)),
    };
  }

  private transformCartItem(item: any) {
    return {
      id: item.id,
      qty: Number(item.qty),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      currency: item.currency,
      notes: item.notes,
      skuId: item.skuId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
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
          slug: item.sku.product.slug,
          moqKg: Number(item.sku.product.moqKg),
          seller: {
            companyName: item.sku.product.seller?.company?.name || 'Unknown',
            isVerified:
              item.sku.product.seller?.verificationStatus === 'APPROVED',
          },
          primaryImage: item.sku.product.images?.[0]?.url || null,
        },
        inventory: item.sku.inventory
          ? {
              availableQty: item.sku.inventory.availableQty,
              unit: item.sku.inventory.unit,
            }
          : null,
      },
    };
  }
}
