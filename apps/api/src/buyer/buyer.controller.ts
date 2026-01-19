import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BuyerService } from './buyer.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AddToShortlistSchema, type AddToShortlistInput } from '@matcha/shared';

@ApiTags('Buyer')
@ApiBearerAuth()
@Controller('buyer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUYER')
export class BuyerController {
  constructor(private readonly buyerService: BuyerService) {}

  // ==================== SHORTLIST ====================

  @Get('shortlist')
  @ApiOperation({ summary: 'Get buyer shortlist' })
  async getShortlist(@CurrentUser() user: { id: string }) {
    return this.buyerService.getShortlist(user.id);
  }

  @Post('shortlist')
  @ApiOperation({ summary: 'Add product to shortlist' })
  async addToShortlist(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(AddToShortlistSchema)) dto: AddToShortlistInput,
  ) {
    return this.buyerService.addToShortlist(user.id, dto);
  }

  @Delete('shortlist/:productId')
  @ApiOperation({ summary: 'Remove product from shortlist' })
  async removeFromShortlist(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.buyerService.removeFromShortlist(user.id, productId);
  }

  @Patch('shortlist/:productId/notes')
  @ApiOperation({ summary: 'Update shortlist item notes' })
  async updateShortlistNotes(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
    @Body('notes') notes: string,
  ) {
    return this.buyerService.updateShortlistNotes(user.id, productId, notes);
  }

  @Get('shortlist/:productId/check')
  @ApiOperation({ summary: 'Check if product is in shortlist' })
  async checkShortlist(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    const isInShortlist = await this.buyerService.isInShortlist(user.id, productId);
    return { isInShortlist };
  }
}
