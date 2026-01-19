import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(userId: string, rfqId: string, body: string) {
    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        buyerProfile: true,
        sellerProfile: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get RFQ and its message thread
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        messageThread: true,
        buyerProfile: true,
        lineItems: {
          include: {
            sku: { include: { product: true } },
          },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    // Verify user has access to this RFQ
    const isBuyer = user.buyerProfile?.id === rfq.buyerProfileId;

    // Check if seller has SKUs in this RFQ
    let isSeller = false;
    if (user.sellerProfile) {
      const sellerSkuIds = await this.prisma.sku.findMany({
        where: { product: { sellerId: user.sellerProfile.id } },
        select: { id: true },
      });
      const sellerSkuIdSet = new Set(sellerSkuIds.map((s) => s.id));
      isSeller = rfq.lineItems.some((item) => sellerSkuIdSet.has(item.skuId));
    }

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('You do not have access to this RFQ');
    }

    // Create message thread if it doesn't exist
    let threadId = rfq.messageThread?.id;
    if (!threadId) {
      const thread = await this.prisma.messageThread.create({
        data: {
          rfqId: rfq.id,
          subject: `RFQ: ${rfq.title}`,
        },
      });
      threadId = thread.id;
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderUserId: userId,
        body,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      sender: message.sender,
    };
  }

  async getMessages(userId: string, rfqId: string) {
    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        buyerProfile: true,
        sellerProfile: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get RFQ
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        messageThread: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              include: {
                sender: { select: { id: true, name: true, role: true } },
              },
            },
          },
        },
        lineItems: {
          include: {
            sku: { include: { product: true } },
          },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    // Verify user has access
    const isBuyer = user.buyerProfile?.id === rfq.buyerProfileId;

    let isSeller = false;
    if (user.sellerProfile) {
      const sellerSkuIds = await this.prisma.sku.findMany({
        where: { product: { sellerId: user.sellerProfile.id } },
        select: { id: true },
      });
      const sellerSkuIdSet = new Set(sellerSkuIds.map((s) => s.id));
      isSeller = rfq.lineItems.some((item) => sellerSkuIdSet.has(item.skuId));
    }

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('You do not have access to this RFQ');
    }

    // Mark messages as read (for the current user)
    if (rfq.messageThread) {
      await this.prisma.message.updateMany({
        where: {
          threadId: rfq.messageThread.id,
          senderUserId: { not: userId },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return {
      threadId: rfq.messageThread?.id || null,
      messages: rfq.messageThread?.messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        isRead: m.isRead,
        sender: m.sender,
        isOwn: m.senderUserId === userId,
      })) || [],
    };
  }
}
