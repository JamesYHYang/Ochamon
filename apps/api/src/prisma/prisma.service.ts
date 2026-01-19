import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    // Delete in reverse dependency order
    await this.trendPoint.deleteMany();
    await this.trendSeries.deleteMany();
    await this.insightsPost.deleteMany();
    await this.tag.deleteMany();
    await this.category.deleteMany();
    await this.complianceRule.deleteMany();
    await this.message.deleteMany();
    await this.messageThread.deleteMany();
    await this.orderStatusHistory.deleteMany();
    await this.orderLineItem.deleteMany();
    await this.order.deleteMany();
    await this.quoteLineItem.deleteMany();
    await this.quote.deleteMany();
    await this.rfqLineItem.deleteMany();
    await this.rfq.deleteMany();
    await this.priceTier.deleteMany();
    await this.inventory.deleteMany();
    await this.productDocument.deleteMany();
    await this.productImage.deleteMany();
    await this.sku.deleteMany();
    await this.product.deleteMany();
    await this.sellerProfile.deleteMany();
    await this.buyerProfile.deleteMany();
    await this.user.deleteMany();
    await this.address.deleteMany();
    await this.company.deleteMany();
    await this.gradeType.deleteMany();
    await this.region.deleteMany();
  }
}
