import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MarketplaceQuerySchema, type MarketplaceQueryInput } from '@matcha/shared';
import { JwtAuthGuard } from '../auth/guards';
import { Public } from '../auth/decorators';

/**
 * Optional Auth Guard - allows both authenticated and unauthenticated access
 */
class OptionalJwtAuthGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any) {
    // Don't throw error if no user, just return null
    return user || null;
  }
}

@ApiTags('Marketplace')
@Controller('products')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Browse products (public)' })
  async getProducts(
    @Query(new ZodValidationPipe(MarketplaceQuerySchema)) query: MarketplaceQueryInput,
  ) {
    return this.marketplaceService.getProducts(query);
  }

  @Get('filters')
  @Public()
  @ApiOperation({ summary: 'Get available filter options' })
  async getFilterOptions() {
    return this.marketplaceService.getFilterOptions();
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product details (enhanced for buyers)' })
  async getProduct(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    return this.marketplaceService.getProduct(id, userId, userRole);
  }
}
