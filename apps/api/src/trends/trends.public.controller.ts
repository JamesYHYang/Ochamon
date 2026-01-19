import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TrendsService } from './trends.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../auth/decorators';
import { TrendsQuerySchema, type TrendsQueryInput } from '@matcha/shared';

/**
 * Public Trends Controller
 *
 * Handles public-facing endpoints for market trends data.
 * No authentication required.
 */
@ApiTags('trends')
@Controller('trends')
export class TrendsPublicController {
  constructor(private readonly trendsService: TrendsService) {}

  /**
   * Get active trend series with filtering
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get trend series (public)' })
  @ApiResponse({ status: 200, description: 'List of trend series' })
  async getTrendSeries(
    @Query(new ZodValidationPipe(TrendsQuerySchema)) query: TrendsQueryInput
  ) {
    return this.trendsService.getTrendSeries(query);
  }

  /**
   * Get available trend types for filtering
   */
  @Get('types')
  @Public()
  @ApiOperation({ summary: 'Get trend types (public)' })
  @ApiResponse({ status: 200, description: 'List of trend types' })
  async getTrendTypes() {
    return this.trendsService.getTrendTypes();
  }

  /**
   * Get latest trends summary (dashboard view)
   */
  @Get('latest')
  @Public()
  @ApiOperation({ summary: 'Get latest trends summary (public)' })
  @ApiResponse({ status: 200, description: 'Latest trend data points' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLatestTrends(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.trendsService.getLatestTrends(parsedLimit);
  }

  /**
   * Get a single trend series with data points
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get trend series by ID (public)' })
  @ApiResponse({ status: 200, description: 'Trend series with data points' })
  @ApiResponse({ status: 404, description: 'Trend series not found' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getTrendSeriesById(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.trendsService.getTrendSeriesById(id, start, end);
  }
}
