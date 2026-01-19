import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrendsService } from './trends.service';
import { TrendsPublicController } from './trends.public.controller';
import { TrendsAdminController } from './trends.admin.controller';

/**
 * Trends Module
 *
 * Provides market trends functionality:
 * - Public endpoints for viewing trend data and charts
 * - Admin endpoints for managing trend series and data points
 */
@Module({
  imports: [PrismaModule],
  controllers: [TrendsPublicController, TrendsAdminController],
  providers: [TrendsService],
  exports: [TrendsService],
})
export class TrendsModule {}
