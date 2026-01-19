import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InsightsService } from './insights.service';
import { InsightsPublicController } from './insights.public.controller';
import { InsightsAdminController } from './insights.admin.controller';

/**
 * Insights Module
 *
 * Provides insights/blog post functionality:
 * - Public endpoints for reading published insights
 * - Admin endpoints for CRUD operations and publishing
 */
@Module({
  imports: [PrismaModule],
  controllers: [InsightsPublicController, InsightsAdminController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
