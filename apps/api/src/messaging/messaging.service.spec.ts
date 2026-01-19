import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('MessagingService', () => {
  let service: MessagingService;
  let prismaService: PrismaService;

  // Mock data
  const mockBuyerUser = {
    id: 'user-buyer-123',
    name: 'Buyer User',
    email: 'buyer@example.com',
    role: UserRole.BUYER,
    buyerProfile: {
      id: 'buyer-profile-123',
    },
    sellerProfile: null,
  };

  const mockSellerUser = {
    id: 'user-seller-456',
    name: 'Seller User',
    email: 'seller@example.com',
    role: UserRole.SELLER,
    buyerProfile: null,
    sellerProfile: {
      id: 'seller-profile-456',
    },
  };

  const mockOtherSellerUser = {
    id: 'user-seller-789',
    name: 'Other Seller',
    email: 'other@example.com',
    role: UserRole.SELLER,
    buyerProfile: null,
    sellerProfile: {
      id: 'seller-profile-789',
    },
  };

  const mockUnrelatedUser = {
    id: 'user-unrelated',
    name: 'Unrelated User',
    email: 'unrelated@example.com',
    role: UserRole.BUYER,
    buyerProfile: {
      id: 'unrelated-buyer-profile',
    },
    sellerProfile: null,
  };

  const mockSku = {
    id: 'sku-123',
    product: {
      id: 'product-123',
      sellerId: 'seller-profile-456', // Belongs to mockSellerUser
    },
  };

  const mockOtherSku = {
    id: 'sku-456',
    product: {
      id: 'product-456',
      sellerId: 'seller-profile-789', // Belongs to other seller
    },
  };

  const mockMessageThread = {
    id: 'thread-123',
    subject: 'RFQ: Test RFQ',
    rfqId: 'rfq-123',
    messages: [
      {
        id: 'msg-1',
        body: 'Hello, I am interested in your products',
        senderUserId: 'user-buyer-123',
        isRead: false,
        createdAt: new Date(),
        sender: { id: 'user-buyer-123', name: 'Buyer User', role: UserRole.BUYER },
      },
      {
        id: 'msg-2',
        body: 'Thank you for your interest!',
        senderUserId: 'user-seller-456',
        isRead: true,
        createdAt: new Date(),
        sender: { id: 'user-seller-456', name: 'Seller User', role: UserRole.SELLER },
      },
    ],
  };

  const mockRfq = {
    id: 'rfq-123',
    title: 'Test RFQ',
    buyerProfileId: 'buyer-profile-123',
    buyerProfile: { id: 'buyer-profile-123' },
    messageThread: mockMessageThread,
    lineItems: [
      {
        id: 'line-item-1',
        skuId: 'sku-123',
        sku: mockSku,
      },
    ],
  };

  const mockRfqNoThread = {
    ...mockRfq,
    messageThread: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    rfq: {
      findUnique: jest.fn(),
    },
    sku: {
      findMany: jest.fn(),
    },
    messageThread: {
      create: jest.fn(),
    },
    message: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should allow buyer to send message on their RFQ', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.message.create.mockResolvedValue({
        id: 'new-msg-1',
        body: 'Test message',
        createdAt: new Date(),
        sender: { id: 'user-buyer-123', name: 'Buyer User', role: UserRole.BUYER },
      });

      const result = await service.sendMessage(
        'user-buyer-123',
        'rfq-123',
        'Test message',
      );

      expect(result.id).toBe('new-msg-1');
      expect(result.body).toBe('Test message');
      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            threadId: 'thread-123',
            senderUserId: 'user-buyer-123',
            body: 'Test message',
          }),
        }),
      );
    });

    it('should allow seller with SKUs in RFQ to send message', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockSellerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.message.create.mockResolvedValue({
        id: 'new-msg-2',
        body: 'Seller response',
        createdAt: new Date(),
        sender: { id: 'user-seller-456', name: 'Seller User', role: UserRole.SELLER },
      });

      const result = await service.sendMessage(
        'user-seller-456',
        'rfq-123',
        'Seller response',
      );

      expect(result.id).toBe('new-msg-2');
      expect(result.body).toBe('Seller response');
    });

    it('should create message thread if it does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfqNoThread);
      mockPrismaService.messageThread.create.mockResolvedValue({
        id: 'new-thread-123',
        subject: 'RFQ: Test RFQ',
      });
      mockPrismaService.message.create.mockResolvedValue({
        id: 'new-msg-1',
        body: 'First message',
        createdAt: new Date(),
        sender: { id: 'user-buyer-123', name: 'Buyer User', role: UserRole.BUYER },
      });

      const result = await service.sendMessage(
        'user-buyer-123',
        'rfq-123',
        'First message',
      );

      expect(mockPrismaService.messageThread.create).toHaveBeenCalledWith({
        data: {
          rfqId: 'rfq-123',
          subject: 'RFQ: Test RFQ',
        },
      });
      expect(result.id).toBe('new-msg-1');
    });

    it('should throw ForbiddenException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage('non-existent-user', 'rfq-123', 'Test'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if RFQ not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage('user-buyer-123', 'non-existent-rfq', 'Test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access to RFQ', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUnrelatedUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      // No SKUs belong to unrelated user's seller profile (which doesn't exist)

      await expect(
        service.sendMessage('user-unrelated', 'rfq-123', 'Test'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if seller has no SKUs in RFQ', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockOtherSellerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      // Other seller's SKUs don't match the RFQ line items
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-other' }]);

      await expect(
        service.sendMessage('user-seller-789', 'rfq-123', 'Test'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages', () => {
    it('should return messages for buyer on their RFQ', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.getMessages('user-buyer-123', 'rfq-123');

      expect(result.threadId).toBe('thread-123');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].body).toBe('Hello, I am interested in your products');
    });

    it('should return messages for seller with SKUs in RFQ', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockSellerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.getMessages('user-seller-456', 'rfq-123');

      expect(result.messages).toHaveLength(2);
    });

    it('should mark unread messages as read', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 1 });

      await service.getMessages('user-buyer-123', 'rfq-123');

      expect(mockPrismaService.message.updateMany).toHaveBeenCalledWith({
        where: {
          threadId: 'thread-123',
          senderUserId: { not: 'user-buyer-123' },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should return empty messages array if no thread exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfqNoThread);

      const result = await service.getMessages('user-buyer-123', 'rfq-123');

      expect(result.threadId).toBeNull();
      expect(result.messages).toHaveLength(0);
    });

    it('should throw ForbiddenException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages('non-existent-user', 'rfq-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if RFQ not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages('user-buyer-123', 'non-existent-rfq'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access to RFQ', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUnrelatedUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);

      await expect(
        service.getMessages('user-unrelated', 'rfq-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include isOwn flag in messages', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.getMessages('user-buyer-123', 'rfq-123');

      // First message is from buyer, so isOwn should be true
      expect(result.messages[0].isOwn).toBe(true);
      // Second message is from seller, so isOwn should be false
      expect(result.messages[1].isOwn).toBe(false);
    });
  });

  describe('Access Control', () => {
    it('should only allow RFQ buyer to access messages', async () => {
      // Different buyer trying to access
      const differentBuyer = {
        ...mockBuyerUser,
        id: 'user-different-buyer',
        buyerProfile: { id: 'different-buyer-profile' },
      };
      mockPrismaService.user.findUnique.mockResolvedValue(differentBuyer);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);

      await expect(
        service.getMessages('user-different-buyer', 'rfq-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should only allow sellers with SKUs in RFQ to access messages', async () => {
      // Seller without SKUs in this RFQ
      mockPrismaService.user.findUnique.mockResolvedValue(mockOtherSellerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'other-sku' }]);

      await expect(
        service.getMessages('user-seller-789', 'rfq-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should check SKU ownership for seller access', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockSellerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });

      await service.getMessages('user-seller-456', 'rfq-123');

      expect(mockPrismaService.sku.findMany).toHaveBeenCalledWith({
        where: { product: { sellerId: 'seller-profile-456' } },
        select: { id: true },
      });
    });
  });

  describe('Message Thread Management', () => {
    it('should use existing thread when sending message', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfq);
      mockPrismaService.message.create.mockResolvedValue({
        id: 'new-msg',
        body: 'Test',
        createdAt: new Date(),
        sender: mockBuyerUser,
      });

      await service.sendMessage('user-buyer-123', 'rfq-123', 'Test');

      // Should not create new thread
      expect(mockPrismaService.messageThread.create).not.toHaveBeenCalled();
      // Should use existing thread ID
      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            threadId: 'thread-123',
          }),
        }),
      );
    });

    it('should create new thread when none exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockBuyerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(mockRfqNoThread);
      mockPrismaService.messageThread.create.mockResolvedValue({
        id: 'new-thread',
        subject: 'RFQ: Test RFQ',
      });
      mockPrismaService.message.create.mockResolvedValue({
        id: 'new-msg',
        body: 'Test',
        createdAt: new Date(),
        sender: mockBuyerUser,
      });

      await service.sendMessage('user-buyer-123', 'rfq-123', 'Test');

      expect(mockPrismaService.messageThread.create).toHaveBeenCalled();
      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            threadId: 'new-thread',
          }),
        }),
      );
    });
  });

  describe('Multi-Seller RFQ Access', () => {
    it('should allow multiple sellers to access RFQ messages if they have SKUs', async () => {
      // RFQ with SKUs from multiple sellers
      const multiSellerRfq = {
        ...mockRfq,
        lineItems: [
          { id: 'line-1', skuId: 'sku-123', sku: mockSku },
          { id: 'line-2', skuId: 'sku-456', sku: mockOtherSku },
        ],
      };

      // First seller access
      mockPrismaService.user.findUnique.mockResolvedValue(mockSellerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(multiSellerRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-123' }]);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });

      const result1 = await service.getMessages('user-seller-456', 'rfq-123');
      expect(result1.messages).toBeDefined();

      jest.clearAllMocks();

      // Second seller access
      mockPrismaService.user.findUnique.mockResolvedValue(mockOtherSellerUser);
      mockPrismaService.rfq.findUnique.mockResolvedValue(multiSellerRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([{ id: 'sku-456' }]);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });

      const result2 = await service.getMessages('user-seller-789', 'rfq-123');
      expect(result2.messages).toBeDefined();
    });

    it('should deny access to seller without SKUs even in multi-seller RFQ', async () => {
      const multiSellerRfq = {
        ...mockRfq,
        lineItems: [
          { id: 'line-1', skuId: 'sku-123', sku: mockSku },
        ],
      };

      // Third seller with no SKUs in RFQ
      const thirdSeller = {
        id: 'user-seller-third',
        name: 'Third Seller',
        buyerProfile: null,
        sellerProfile: { id: 'seller-profile-third' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(thirdSeller);
      mockPrismaService.rfq.findUnique.mockResolvedValue(multiSellerRfq);
      mockPrismaService.sku.findMany.mockResolvedValue([]); // No SKUs found

      await expect(
        service.getMessages('user-seller-third', 'rfq-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
