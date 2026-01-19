import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateQuoteSchema,
  AcceptQuoteSchema,
  type CreateQuoteInput,
  type AcceptQuoteInput,
} from '@matcha/shared';

@ApiTags('Quote')
@ApiBearerAuth()
@Controller('quote')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  // ==================== SELLER ENDPOINTS ====================

  @Post()
  @Roles('SELLER')
  @ApiOperation({ summary: 'Create quote for RFQ (Seller)' })
  async createQuote(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateQuoteSchema)) dto: CreateQuoteInput,
  ) {
    return this.quoteService.createQuote(user.id, dto);
  }

  @Get('seller')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Get all quotes by seller' })
  async getSellerQuotes(@CurrentUser() user: { id: string }) {
    return this.quoteService.getSellerQuotes(user.id);
  }

  @Get('seller/:id')
  @Roles('SELLER')
  @ApiOperation({ summary: 'Get quote detail for seller' })
  async getSellerQuoteDetail(
    @CurrentUser() user: { id: string },
    @Param('id') quoteId: string,
  ) {
    return this.quoteService.getSellerQuoteDetail(user.id, quoteId);
  }

  // ==================== BUYER ENDPOINTS ====================

  @Get('buyer')
  @Roles('BUYER')
  @ApiOperation({ summary: 'Get quotes for buyer RFQs' })
  async getBuyerQuotes(@CurrentUser() user: { id: string }) {
    return this.quoteService.getBuyerQuotes(user.id);
  }

  @Post('accept')
  @Roles('BUYER')
  @ApiOperation({ summary: 'Accept quote and create order (Buyer)' })
  async acceptQuote(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(AcceptQuoteSchema)) dto: AcceptQuoteInput,
  ) {
    return this.quoteService.acceptQuote(user.id, dto);
  }
}
