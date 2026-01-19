import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('OrderService', () => {
  let service: OrderService;
  let prismaService: PrismaService;

  // Mock data
  const mockBuyerProfile = {
    id: 'buyer-profile-123',
    userId: 'user-buyer-123',
    company: { name: 'Buyer Company', email: 'buyer@company.com', phone: '123-456' },
    user: { name: 'Buyer User', email: 'buyer@example.com' },
  };

  const mockSellerProfile = {
    id: 'seller-profile-456',
    userId: 'user-seller-456',
    company: { name: 'Seller Company', email: 'seller@company.com', phone: '789-012' },
    user: { name: 'Seller User', email: 'seller@example.com' },
  };

  const mockOtherSellerProfile = {
    id: 'seller-profile-789',
    userId: 'user-seller-789',
    company: { name: 'Other Seller Company' },
  };

  const mockRfq = {
    id: 'rfq-123',
    rfqNumber: 'RFQ-001',
    title: 'Test RFQ',
    buyerProfileId: mockBuyerProfile.id,
    buyerProfile: mockBuyerProfile,
  };

  const mockQuote = {
    id: 'quote-123',
    quoteNumber: 'QT-001',
    rfqId: mockRfq.id,
    sellerProfileId: mockSellerProfile.id,
    sellerProfile: mockSellerProfile,
    rfq: mockRfq,
  };

  const mockSku = {
    id: 'sku-123',
    sku: 'MAT-001',
    name: 'Premium Matcha',
    product: {
      id: 'product-123',
      name: 'Premium Matcha',
      images: [{ url: '/images/product.jpg' }],
      seller: { company: { name: 'Seller Company' } },
    },
  };

  const mockOrder = {
    id: 'order-123',
    orderNumber: 'ORD-001',
    status: OrderStatus.PENDING_PAYMENT,
    subtotal: 500,
    shippingCost: 50,
    totalAmount: 550,
    currency: 'USD',
    shipToName: 'John Doe',
    shipToLine1: '123 Main St',
    shipToLine2: null,
    shipToCity: 'Los Angeles',
    shipToState: 'CA',
    shipToPostal: '90001',
    shipToCountry: 'USA',
    trackingNumber: null,
    carrier: null,
    shippedAt: null,
    deliveredAt: null,
    buyerNotes: null,
    sellerNotes: null,
    createdAt: new Date(),
    quoteId: mockQuote.id,
    quote: mockQuote,
    lineItems: [
      {
        id: 'order-line-1',
        qty: 10,
        unit: 'kg',
        unitPrice: 50,
        totalPrice: 500,
        skuId: mockSku.id,
        sku: mockSku,
      },
    ],
    statusHistory: [
      {
        id: 'history-1',
        status: OrderStatus.PENDING_PAYMENT,
        notes: 'Order created',
        createdAt: new Date(),
        changedBy: 'user-buyer-123',
      },
    ],
  };

  const mockPrismaService: any = {
    buyerProfile: {
      findUnique: jest.fn(),
    },
    sellerProfile: {
      findUnique: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Set up $transaction to use the mockPrismaService
  mockPrismaService.$transaction.mockImplementation((callback: any) => callback(mockPrismaService));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getBuyerOrders', () => {
    it('should return orders for the buyer', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getBuyerOrders('user-buyer-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-123');
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            quote: { rfq: { buyerProfileId: mockBuyerProfile.id } },
          }),
        }),
      );
    });

    it('should throw ForbiddenException if buyer profile not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerOrders('non-buyer')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return empty array if buyer has no orders', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getBuyerOrders('user-buyer-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getBuyerOrderDetail', () => {
    it('should return order detail for the owner buyer', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getBuyerOrderDetail('user-buyer-123', 'order-123');

      expect(result.id).toBe('order-123');
      expect(result.orderNumber).toBe('ORD-001');
    });

    it('should throw ForbiddenException if buyer profile not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerOrderDetail('non-buyer', 'order-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerOrderDetail('user-buyer-123', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if order belongs to different buyer', async () => {
      const differentBuyerProfile = { ...mockBuyerProfile, id: 'different-buyer' };
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(differentBuyerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.getBuyerOrderDetail('different-buyer', 'order-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSellerOrders', () => {
    it('should return orders for the seller', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getSellerOrders('user-seller-456');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-123');
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { quote: { sellerProfileId: mockSellerProfile.id } },
        }),
      );
    });

    it('should throw ForbiddenException if seller profile not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSellerOrders('non-seller')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSellerOrderDetail', () => {
    it('should return order detail for the owner seller', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getSellerOrderDetail('user-seller-456', 'order-123');

      expect(result.id).toBe('order-123');
    });

    it('should throw ForbiddenException if order belongs to different seller', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockOtherSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.getSellerOrderDetail('user-seller-789', 'order-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should update status from PENDING_PAYMENT to PAID', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
      });

      const result = await service.updateOrderStatus(
        'user-seller-456',
        'order-123',
        OrderStatus.PAID,
        'Payment confirmed',
      );

      expect(result.success).toBe(true);
      expect(result.order.status).toBe(OrderStatus.PAID);
    });

    it('should update status from PAID to PROCESSING', async () => {
      const paidOrder = { ...mockOrder, status: OrderStatus.PAID };
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(paidOrder);
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({
        ...paidOrder,
        status: OrderStatus.PROCESSING,
      });

      const result = await service.updateOrderStatus(
        'user-seller-456',
        'order-123',
        OrderStatus.PROCESSING,
      );

      expect(result.success).toBe(true);
      expect(result.order.status).toBe(OrderStatus.PROCESSING);
    });

    it('should update status from PROCESSING to SHIPPED with tracking info', async () => {
      const processingOrder = { ...mockOrder, status: OrderStatus.PROCESSING };
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({
        ...processingOrder,
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRACK123',
        carrier: 'FedEx',
        shippedAt: new Date(),
      });

      const result = await service.updateOrderStatus(
        'user-seller-456',
        'order-123',
        OrderStatus.SHIPPED,
        'Package shipped',
        'TRACK123',
        'FedEx',
      );

      expect(result.success).toBe(true);
      expect(result.order.trackingNumber).toBe('TRACK123');
      expect(result.order.carrier).toBe('FedEx');
    });

    it('should throw ForbiddenException if seller profile not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('non-seller', 'order-123', OrderStatus.PAID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('user-seller-456', 'non-existent', OrderStatus.PAID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if seller does not own the order', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockOtherSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateOrderStatus('user-seller-789', 'order-123', OrderStatus.PAID),
      ).rejects.toThrow(ForbiddenException);
    });

    describe('Status Transitions', () => {
      const testInvalidTransition = async (fromStatus: OrderStatus, toStatus: OrderStatus) => {
        const orderWithStatus = { ...mockOrder, status: fromStatus };
        mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
        mockPrismaService.order.findUnique.mockResolvedValue(orderWithStatus);

        await expect(
          service.updateOrderStatus('user-seller-456', 'order-123', toStatus),
        ).rejects.toThrow(BadRequestException);
      };

      it('should reject PENDING_PAYMENT -> PROCESSING (must pay first)', async () => {
        await testInvalidTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.PROCESSING);
      });

      it('should reject PENDING_PAYMENT -> SHIPPED (must pay and process first)', async () => {
        await testInvalidTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.SHIPPED);
      });

      it('should reject PAID -> SHIPPED (must process first)', async () => {
        await testInvalidTransition(OrderStatus.PAID, OrderStatus.SHIPPED);
      });

      it('should reject PROCESSING -> DELIVERED (must ship first)', async () => {
        await testInvalidTransition(OrderStatus.PROCESSING, OrderStatus.DELIVERED);
      });

      it('should reject SHIPPED -> COMPLETED (must deliver first)', async () => {
        await testInvalidTransition(OrderStatus.SHIPPED, OrderStatus.COMPLETED);
      });

      it('should reject COMPLETED -> any status', async () => {
        await testInvalidTransition(OrderStatus.COMPLETED, OrderStatus.SHIPPED);
        await testInvalidTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED);
      });

      it('should reject CANCELLED -> any status', async () => {
        await testInvalidTransition(OrderStatus.CANCELLED, OrderStatus.PAID);
        await testInvalidTransition(OrderStatus.CANCELLED, OrderStatus.PROCESSING);
      });

      it('should reject REFUNDED -> any status', async () => {
        await testInvalidTransition(OrderStatus.REFUNDED, OrderStatus.PAID);
        await testInvalidTransition(OrderStatus.REFUNDED, OrderStatus.PROCESSING);
      });

      it('should allow PENDING_PAYMENT -> CANCELLED', async () => {
        mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
        mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
        mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
        mockPrismaService.order.update.mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
        });

        const result = await service.updateOrderStatus(
          'user-seller-456',
          'order-123',
          OrderStatus.CANCELLED,
        );

        expect(result.success).toBe(true);
        expect(result.order.status).toBe(OrderStatus.CANCELLED);
      });

      it('should allow PAID -> REFUNDED', async () => {
        const paidOrder = { ...mockOrder, status: OrderStatus.PAID };
        mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
        mockPrismaService.order.findUnique.mockResolvedValue(paidOrder);
        mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
        mockPrismaService.order.update.mockResolvedValue({
          ...paidOrder,
          status: OrderStatus.REFUNDED,
        });

        const result = await service.updateOrderStatus(
          'user-seller-456',
          'order-123',
          OrderStatus.REFUNDED,
        );

        expect(result.success).toBe(true);
        expect(result.order.status).toBe(OrderStatus.REFUNDED);
      });

      it('should allow full happy path: PENDING_PAYMENT -> PAID -> PROCESSING -> SHIPPED -> IN_TRANSIT -> DELIVERED -> COMPLETED', async () => {
        const statuses = [
          { from: OrderStatus.PENDING_PAYMENT, to: OrderStatus.PAID },
          { from: OrderStatus.PAID, to: OrderStatus.PROCESSING },
          { from: OrderStatus.PROCESSING, to: OrderStatus.SHIPPED },
          { from: OrderStatus.SHIPPED, to: OrderStatus.IN_TRANSIT },
          { from: OrderStatus.IN_TRANSIT, to: OrderStatus.DELIVERED },
          { from: OrderStatus.DELIVERED, to: OrderStatus.COMPLETED },
        ];

        for (const { from, to } of statuses) {
          const orderWithStatus = { ...mockOrder, status: from };
          mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
          mockPrismaService.order.findUnique.mockResolvedValue(orderWithStatus);
          mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
          mockPrismaService.order.update.mockResolvedValue({
            ...orderWithStatus,
            status: to,
          });

          const result = await service.updateOrderStatus(
            'user-seller-456',
            'order-123',
            to,
          );

          expect(result.success).toBe(true);
          expect(result.order.status).toBe(to);

          jest.clearAllMocks();
        }
      });
    });
  });

  describe('RBAC - Role-Based Access Control', () => {
    it('should not allow buyer to access seller order endpoints', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSellerOrders('user-buyer-123')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(
        service.getSellerOrderDetail('user-buyer-123', 'order-123'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateOrderStatus('user-buyer-123', 'order-123', OrderStatus.PAID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not allow seller to access buyer order endpoints', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerOrders('user-seller-456')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(
        service.getBuyerOrderDetail('user-seller-456', 'order-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should isolate orders between sellers', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockOtherSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder); // Belongs to mockSellerProfile

      await expect(
        service.getSellerOrderDetail('user-seller-789', 'order-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should isolate orders between buyers', async () => {
      const differentBuyerProfile = { ...mockBuyerProfile, id: 'different-buyer' };
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(differentBuyerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.getBuyerOrderDetail('different-buyer', 'order-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Status History', () => {
    it('should create status history entry when updating status', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
      });

      await service.updateOrderStatus(
        'user-seller-456',
        'order-123',
        OrderStatus.PAID,
        'Payment received via bank transfer',
      );

      expect(mockPrismaService.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-123',
          status: OrderStatus.PAID,
          notes: 'Payment received via bank transfer',
          changedBy: 'user-seller-456',
        },
      });
    });

    it('should create history entry even without notes', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
      });

      await service.updateOrderStatus(
        'user-seller-456',
        'order-123',
        OrderStatus.PAID,
      );

      expect(mockPrismaService.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-123',
          status: OrderStatus.PAID,
          notes: undefined,
          changedBy: 'user-seller-456',
        },
      });
    });
  });

  describe('Shipping Information', () => {
    it('should set shippedAt timestamp when marking as shipped', async () => {
      const processingOrder = { ...mockOrder, status: OrderStatus.PROCESSING };
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({
        ...processingOrder,
        status: OrderStatus.SHIPPED,
        shippedAt: new Date(),
      });

      await service.updateOrderStatus(
        'user-seller-456',
        'order-123',
        OrderStatus.SHIPPED,
      );

      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.SHIPPED,
            shippedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should set deliveredAt timestamp when marking as delivered', async () => {
      const inTransitOrder = { ...mockOrder, status: OrderStatus.IN_TRANSIT };
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(inTransitOrder);
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({
        ...inTransitOrder,
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      await service.updateOrderStatus(
        'user-seller-456',
        'order-123',
        OrderStatus.DELIVERED,
      );

      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED,
            deliveredAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should save tracking number and carrier when provided', async () => {
      const processingOrder = { ...mockOrder, status: OrderStatus.PROCESSING };
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.order.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({
        ...processingOrder,
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRACK123456',
        carrier: 'DHL',
      });

      await service.updateOrderStatus(
        'user-seller-456',
        'order-123',
        OrderStatus.SHIPPED,
        'Shipped via DHL',
        'TRACK123456',
        'DHL',
      );

      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trackingNumber: 'TRACK123456',
            carrier: 'DHL',
          }),
        }),
      );
    });
  });
});
