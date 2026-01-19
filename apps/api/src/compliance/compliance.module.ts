import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

/**
 * Compliance Module
 *
 * Provides compliance rule management and evaluation functionality.
 * - Admin endpoints for CRUD operations on compliance rules
 * - Evaluation endpoints for determining compliance requirements
 * - Audit trail for compliance evaluations
 */
@Module({
  imports: [PrismaModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
