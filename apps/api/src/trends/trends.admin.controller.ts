import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TrendsService } from './trends.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateTrendSeriesSchema,
  UpdateTrendSeriesSchema,
  CreateTrendPointSchema,
  UpdateTrendPointSchema,
  TrendsQuerySchema,
  type CreateTrendSeriesInput,
  type UpdateTrendSeriesInput,
  type CreateTrendPointInput,
  type UpdateTrendPointInput,
  type TrendsQueryInput,
} from '@matcha/shared';
import { z } from 'zod';

// Schema for bulk point creation
const BulkTrendPointsSchema = z.object({
  points: z.array(CreateTrendPointSchema),
});
type BulkTrendPointsInput = z.infer<typeof BulkTrendPointsSchema>;

/**
 * Admin Trends Controller
 *
 * Handles admin-only endpoints for trend series and data point management.
 * Requires ADMIN role.
 */
@ApiTags('trends')
@ApiBearerAuth('access-token')
@Controller('admin/trends')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TrendsAdminController {
  constructor(
    private readonly trendsService: TrendsService,
    private readonly auditService: AuditService,
  ) {}

  // ==================== SERIES ENDPOINTS ====================

  /**
   * List all trend series (including inactive) for admin
   */
  @Get()
  @ApiOperation({ summary: 'List all trend series (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of trend series' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async listTrendSeries(
    @Query(new ZodValidationPipe(TrendsQuerySchema)) query: TrendsQueryInput
  ) {
    return this.trendsService.listAdminTrendSeries(query);
  }

  /**
   * Get a single trend series by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get trend series by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Trend series details' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trend series not found' })
  async getTrendSeries(@Param('id') id: string) {
    return this.trendsService.getAdminTrendSeriesById(id);
  }

  /**
   * Create a new trend series
   */
  @Post()
  @ApiOperation({ summary: 'Create new trend series (Admin only)' })
  @ApiResponse({ status: 201, description: 'Trend series created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async createTrendSeries(
    @Body(new ZodValidationPipe(CreateTrendSeriesSchema))
    dto: CreateTrendSeriesInput,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    const series = await this.trendsService.createTrendSeries(dto);

    await this.auditService.logCreate(
      'TrendSeries',
      series.id,
      `Created trend series: ${dto.name}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      { name: dto.name, type: dto.type },
    );

    return series;
  }

  /**
   * Update an existing trend series
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update trend series (Admin only)' })
  @ApiResponse({ status: 200, description: 'Trend series updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trend series not found' })
  async updateTrendSeries(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTrendSeriesSchema))
    dto: UpdateTrendSeriesInput,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    const series = await this.trendsService.updateTrendSeries(id, dto);

    await this.auditService.logUpdate(
      'TrendSeries',
      id,
      `Updated trend series: ${series.name}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      { changes: dto },
    );

    return series;
  }

  /**
   * Toggle trend series active status
   */
  @Post(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle trend series active status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Trend series status toggled' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trend series not found' })
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    const series = await this.trendsService.toggleTrendSeriesActive(id);

    await this.auditService.logToggle(
      'TrendSeries',
      id,
      `Toggled trend series active status to ${series.isActive}: ${series.name}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      { isActive: series.isActive },
    );

    return series;
  }

  /**
   * Delete a trend series
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete trend series (Admin only)' })
  @ApiResponse({ status: 200, description: 'Trend series deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trend series not found' })
  async deleteTrendSeries(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    await this.trendsService.deleteTrendSeries(id);

    await this.auditService.logDelete(
      'TrendSeries',
      id,
      `Deleted trend series ${id}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return { success: true, message: 'Trend series deleted' };
  }

  // ==================== DATA POINT ENDPOINTS ====================

  /**
   * Add a data point to a trend series
   */
  @Post(':seriesId/points')
  @ApiOperation({ summary: 'Add data point to trend series (Admin only)' })
  @ApiResponse({ status: 201, description: 'Data point created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trend series not found' })
  async addTrendPoint(
    @Param('seriesId') seriesId: string,
    @Body(new ZodValidationPipe(CreateTrendPointSchema))
    dto: CreateTrendPointInput
  ) {
    return this.trendsService.addTrendPoint(seriesId, dto);
  }

  /**
   * Bulk add data points to a trend series
   */
  @Post(':seriesId/points/bulk')
  @ApiOperation({ summary: 'Bulk add data points (Admin only)' })
  @ApiResponse({ status: 201, description: 'Data points created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Trend series not found' })
  async bulkAddTrendPoints(
    @Param('seriesId') seriesId: string,
    @Body(new ZodValidationPipe(BulkTrendPointsSchema))
    dto: BulkTrendPointsInput
  ) {
    return this.trendsService.bulkAddTrendPoints(seriesId, dto.points);
  }

  /**
   * Update a data point
   */
  @Put('points/:pointId')
  @ApiOperation({ summary: 'Update data point (Admin only)' })
  @ApiResponse({ status: 200, description: 'Data point updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Data point not found' })
  async updateTrendPoint(
    @Param('pointId') pointId: string,
    @Body(new ZodValidationPipe(UpdateTrendPointSchema))
    dto: UpdateTrendPointInput
  ) {
    return this.trendsService.updateTrendPoint(pointId, dto);
  }

  /**
   * Delete a data point
   */
  @Delete('points/:pointId')
  @ApiOperation({ summary: 'Delete data point (Admin only)' })
  @ApiResponse({ status: 200, description: 'Data point deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Data point not found' })
  async deleteTrendPoint(@Param('pointId') pointId: string) {
    await this.trendsService.deleteTrendPoint(pointId);
    return { success: true, message: 'Data point deleted' };
  }
}
