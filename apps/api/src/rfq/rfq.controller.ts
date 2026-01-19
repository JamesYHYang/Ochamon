import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RfqService } from './rfq.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CreateRfqSchema, type CreateRfqInput } from '@matcha/shared';

@ApiTags('RFQ')
@ApiBearerAuth()
@Controller('rfq')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  // ==================== BUYER ENDPOINTS ====================

  @Post()
  @Roles('BUYER')
  @ApiOperation({ summary: 'Create new RFQ (Buyer)' })
  async createRfq(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateRfqSchema)) dto: CreateRfqInput,
  ) {
    return this.rfqService.createRfq(user.id, dto);
  }

  @Get('buyer')
  @Roles('BUYER')
  @ApiOperation({ summary: 'Get all RFQs for buyer' })
  async getBuyerRfqs(@CurrentUser() user: { id: string }) {
    return this.rfqService.getBuyerRfqs(user.id);
  }

  @Get('buyer/:id')
  @Roles('BUYER')
  @ApiOperation({ summary: 'Get RFQ detail for buyer' })
  async getBuyerRfqDetail(
    @CurrentUser() user: { id: string },
    @Param('id') rfqId: string,
  ) {
    return this.rfqService.getBuyerRfqDetail(user.id, rfqId);
  }

  // ==================== SELLER ENDPOINTS ====================

  @Get('seller')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Get RFQs containing seller SKUs' })
  async getSellerRfqs(@CurrentUser() user: { id: string }) {
    return this.rfqService.getSellerRfqs(user.id);
  }

  @Get('seller/:id')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Get RFQ detail for seller (filtered to their SKUs)' })
  async getSellerRfqDetail(
    @CurrentUser() user: { id: string },
    @Param('id') rfqId: string,
  ) {
    return this.rfqService.getSellerRfqDetail(user.id, rfqId);
  }
}
