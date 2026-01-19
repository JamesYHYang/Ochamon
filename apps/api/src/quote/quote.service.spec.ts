import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteStatus, RfqStatus, OrderStatus } from '@prisma/client';

describe('QuoteService', () => {
  let service: QuoteService;
  let prismaService: PrismaService;

  // Mock data
  const mockBuyerProfile = {
    id: 'buyer-profile-123',
    userId: 'user-buyer-123',
    company: { name: 'Buyer Company' },
    user: { name: 'Buyer User', email: 'buyer@example.com' },
  };

  const mockSellerProfile = {
    id: 'seller-profile-456',
    userId: 'user-seller-456',
    company: { name: 'Seller Company' },
    user: { name: 'Seller User', email: 'seller@example.com' },
  };

  const mockOtherSellerProfile = {
    id: 'seller-profile-789',
    userId: 'user-seller-789',
    company: { name: 'Other Seller Company' },
  };

  const mockSku = {
    id: 'sku-123',
    sku: 'MAT-001',
    name: 'Premium Matcha 100g',
    product: {
      id: 'product-123',
      name: 'Premium Matcha',
      sellerId: mockSellerProfile.id,
      images: [{ url: 'https://example.com/image.jpg' }],
    },
  };

  const mockOtherSku = {
    id: 'sku-456',
    sku: 'MAT-002',
    name: 'Other Matcha',
    product: {
      id: 'product-456',
      name: 'Other Matcha Product',
      sellerId: mockOtherSellerProfile.id,
    },
  };

  const mockRfq = {
    id: 'rfq-123',
    rfqNumber: 'RFQ-001',
    title: 'Test RFQ',
    status: RfqStatus.SUBMITTED,
    buyerProfileId: mockBuyerProfile.id,
    buyerProfile: mockBuyerProfile,
    lineItems: [
      {
        id: 'line-item-1',
        skuId: mockSku.id,
        qty: 10,
        unit: 'kg',
        sku: mockSku,
      },
    ],
  };

  const mockQuote = {
    id: 'quote-123',
    quoteNumber: 'QT-001',
    rfqId: mockRfq.id,
    sellerProfileId: mockSellerProfile.id,
    status: QuoteStatus.SUBMITTED,
    subtotal: 500,
    shippingCost: 50,
    totalAmount: 550,
    currency: 'USD',
    incoterm: 'FOB',
    estimatedLeadDays: 14,
    notes: 'Test quote',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    submittedAt: new Date(),
    createdAt: new Date(),
    sellerProfile: mockSellerProfile,
    rfq: mockRfq,
    lineItems: [
      {
        id: 'quote-line-1',
        skuId: mockSku.id,
        qty: 10,
        unit: 'kg',
        unitPrice: 50,
        totalPrice: 500,
        sku: mockSku,
      },
    ],
    order: null,
  };

  const mockExpiredQuote = {
    ...mockQuote,
    id: 'quote-expired',
    validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  };

  const mockPrismaService: any = {
    sellerProfile: {
      findUnique: jest.fn(),
    },
    buyerProfile: {
      findUnique: jest.fn(),
    },
    rfq: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sku: {
      findMany: jest.fn(),
    },
    quote: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Set up $transaction to use the mockPrismaService
  mockPrismaService.$transaction.mockImplementation((callback: any) => callback(mockPrismaService));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<QuoteService>(QuoteService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('createQuote', () => {
    const createQuoteDto = {
      rfqId: 'rfq-123',
      incoterm: 'FOB' as const,
      shippingCost: 50,
      estimatedLeadDays: 14,
      notes: 'Best price for you',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: [
        { skuId: 'sku-123', qty: 10, unit: 'kg', unitPrice: 50 },
      ],
    };

    it('should create a quote successfully', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.quote.findFirst.mockResolvedValue(null);
      mockPrismaService.quote.create.mockResolvedValue(mockQuote);
      mockPrismaService.rfq.update.mockResolvedValue({ ...mockRfq, status: RfqStatus.QUOTED });

      const result = await service.createQuote('user-seller-456', createQuoteDto);

      expect(result.id).toBe('quote-123');
      expect(result.totalAmount).toBe(550);
      expect(mockPrismaService.quote.create).toHaveBeenCalled();
      expect(mockPrismaService.rfq.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rfq-123' },
          data: { status: RfqStatus.QUOTED },
        }),
      );
    });

    it('should throw ForbiddenException if seller profile not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.createQuote('non-seller', createQuoteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if RFQ not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(null);

      await expect(service.createQuote('user-seller-456', createQuoteDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if RFQ is cancelled', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue({
        ...mockRfq,
        status: RfqStatus.CANCELLED,
      });

      await expect(service.createQuote('user-seller-456', createQuoteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if RFQ is expired', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue({
        ...mockRfq,
        status: RfqStatus.EXPIRED,
      });

      await expect(service.createQuote('user-seller-456', createQuoteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if SKU does not belong to seller', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([]); // No SKUs belong to seller

      await expect(service.createQuote('user-seller-456', createQuoteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if seller already quoted this RFQ', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.quote.findFirst.mockResolvedValue(mockQuote); // Existing quote

      await expect(service.createQuote('user-seller-456', createQuoteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate totals correctly', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.quote.findFirst.mockResolvedValue(null);
      mockPrismaService.quote.create.mockResolvedValue(mockQuote);
      mockPrismaService.rfq.update.mockResolvedValue(mockRfq);

      await service.createQuote('user-seller-456', createQuoteDto);

      // Verify the quote.create was called with correct totals
      expect(mockPrismaService.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 500, // 10 * 50
            totalAmount: 550, // 500 + 50 shipping
          }),
        }),
      );
    });
  });

  describe('getSellerQuotes', () => {
    it('should return quotes for the seller', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);

      const result = await service.getSellerQuotes('user-seller-456');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('quote-123');
    });

    it('should throw ForbiddenException if seller profile not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSellerQuotes('non-seller')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSellerQuoteDetail', () => {
    it('should return quote detail for the owner seller', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        rfq: {
          ...mockRfq,
          buyerProfile: mockBuyerProfile,
          lineItems: mockRfq.lineItems,
        },
      });

      const result = await service.getSellerQuoteDetail('user-seller-456', 'quote-123');

      expect(result.id).toBe('quote-123');
    });

    it('should throw NotFoundException if quote not found', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.getSellerQuoteDetail('user-seller-456', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if quote belongs to different seller', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockOtherSellerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote); // Belongs to mockSellerProfile

      await expect(service.getSellerQuoteDetail('user-seller-789', 'quote-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBuyerQuotes', () => {
    it('should return quotes for RFQs belonging to buyer', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);

      const result = await service.getBuyerQuotes('user-buyer-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rfq: { buyerProfileId: mockBuyerProfile.id },
          }),
        }),
      );
    });

    it('should throw ForbiddenException if buyer profile not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getBuyerQuotes('non-buyer')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('acceptQuote', () => {
    const acceptQuoteDto = {
      quoteId: 'quote-123',
      shipToName: 'John Doe',
      shipToLine1: '123 Main St',
      shipToCity: 'Los Angeles',
      shipToState: 'CA',
      shipToPostal: '90001',
      shipToCountry: 'USA',
    };

    const mockOrder = {
      id: 'order-123',
      orderNumber: 'ORD-001',
      totalAmount: 550,
      currency: 'USD',
      status: OrderStatus.PENDING_PAYMENT,
      lineItems: [],
      quote: {
        sellerProfile: { company: { name: 'Seller Company' } },
      },
    };

    it('should accept quote and create order successfully', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        rfq: { ...mockRfq, buyerProfileId: mockBuyerProfile.id },
      });
      mockPrismaService.quote.update.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.ACCEPTED,
      });
      mockPrismaService.rfq.update.mockResolvedValue({ ...mockRfq, status: RfqStatus.ACCEPTED });
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      const result = await service.acceptQuote('user-buyer-123', acceptQuoteDto);

      expect(result.success).toBe(true);
      expect(result.order.id).toBe('order-123');
    });

    it('should throw ForbiddenException if buyer profile not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(service.acceptQuote('non-buyer', acceptQuoteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if quote not found', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue(null);

      await expect(service.acceptQuote('user-buyer-123', acceptQuoteDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if quote is for different buyer\'s RFQ', async () => {
      const otherBuyerProfile = { ...mockBuyerProfile, id: 'other-buyer-profile' };
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(otherBuyerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        rfq: { ...mockRfq, buyerProfileId: mockBuyerProfile.id },
      });

      await expect(service.acceptQuote('other-buyer', acceptQuoteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if quote is not in SUBMITTED status', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.ACCEPTED,
        rfq: { ...mockRfq, buyerProfileId: mockBuyerProfile.id },
      });

      await expect(service.acceptQuote('user-buyer-123', acceptQuoteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if quote has expired', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockExpiredQuote,
        rfq: { ...mockRfq, buyerProfileId: mockBuyerProfile.id },
      });

      await expect(service.acceptQuote('user-buyer-123', acceptQuoteDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('RBAC - Role-Based Access Control', () => {
    it('should not allow buyer to create quotes', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuote('user-buyer-123', {
          rfqId: 'rfq-123',
          incoterm: 'FOB',
          validUntil: new Date().toISOString(),
          lineItems: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not allow seller to accept quotes', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptQuote('user-seller-456', {
          quoteId: 'quote-123',
          shipToName: 'Test',
          shipToLine1: '123 Main St',
          shipToCity: 'City',
          shipToPostal: '12345',
          shipToCountry: 'USA',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should isolate quotes between sellers', async () => {
      mockPrismaService.sellerProfile.findUnique.mockResolvedValue(mockOtherSellerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue(mockQuote); // Belongs to mockSellerProfile

      await expect(
        service.getSellerQuoteDetail('user-seller-789', 'quote-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only return quotes for buyer\'s own RFQs', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.quote.findMany.mockResolvedValue([mockQuote]);

      await service.getBuyerQuotes('user-buyer-123');

      expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rfq: { buyerProfileId: mockBuyerProfile.id },
          }),
        }),
      );
    });
  });

  describe('Quote Validation', () => {
    it('should validate quote validity date before acceptance', async () => {
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...mockExpiredQuote,
        rfq: { ...mockRfq, buyerProfileId: mockBuyerProfile.id },
      });

      await expect(
        service.acceptQuote('user-buyer-123', {
          quoteId: 'quote-expired',
          shipToName: 'Test',
          shipToLine1: '123 Main St',
          shipToCity: 'City',
          shipToPostal: '12345',
          shipToCountry: 'USA',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only allow accepting SUBMITTED quotes', async () => {
      const acceptedQuote = { ...mockQuote, status: QuoteStatus.ACCEPTED };
      mockPrismaService.buyerProfile.findUnique.mockResolvedValue(mockBuyerProfile);
      mockPrismaService.quote.findUnique.mockResolvedValue({
        ...acceptedQuote,
        rfq: { ...mockRfq, buyerProfileId: mockBuyerProfile.id },
      });

      await expect(
        service.acceptQuote('user-buyer-123', {
          quoteId: 'quote-123',
          shipToName: 'Test',
          shipToLine1: '123 Main St',
          shipToCity: 'City',
          shipToPostal: '12345',
          shipToCountry: 'USA',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
