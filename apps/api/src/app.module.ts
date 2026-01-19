import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { SellerModule } from './seller/seller.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { BuyerModule } from './buyer/buyer.module';
import { CartModule } from './cart/cart.module';
import { RfqModule } from './rfq/rfq.module';
import { QuoteModule } from './quote/quote.module';
import { OrderModule } from './order/order.module';
import { MessagingModule } from './messaging/messaging.module';
import { SearchModule } from './search/search.module';
import { LogisticsModule } from './logistics/logistics.module';
import { ComplianceModule } from './compliance/compliance.module';
import { InsightsModule } from './insights/insights.module';
import { TrendsModule } from './trends/trends.module';
import { LibraryModule } from './library/library.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: parseInt(config.get('THROTTLE_TTL', '60000'), 10), // 1 minute
            limit: parseInt(config.get('THROTTLE_LIMIT', '100'), 10), // 100 requests
          },
          {
            name: 'long',
            ttl: parseInt(config.get('THROTTLE_TTL_LONG', '3600000'), 10), // 1 hour
            limit: parseInt(config.get('THROTTLE_LIMIT_LONG', '1000'), 10), // 1000 requests
          },
        ],
      }),
    }),
    MulterModule.register({
      dest: './uploads',
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    SellerModule,
    MarketplaceModule,
    TaxonomyModule,
    BuyerModule,
    CartModule,
    RfqModule,
    QuoteModule,
    OrderModule,
    MessagingModule,
    SearchModule,
    LogisticsModule,
    ComplianceModule,
    InsightsModule,
    TrendsModule,
    LibraryModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
