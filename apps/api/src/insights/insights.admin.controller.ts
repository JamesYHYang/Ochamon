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
import { InsightsService } from './insights.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateInsightsPostSchema,
  UpdateInsightsPostSchema,
  AdminInsightsQuerySchema,
  type CreateInsightsPostInput,
  type UpdateInsightsPostInput,
  type AdminInsightsQueryInput,
} from '@matcha/shared';

/**
 * Admin Insights Controller
 *
 * Handles admin-only endpoints for insights/blog post management.
 * Requires ADMIN role.
 */
@ApiTags('insights')
@ApiBearerAuth('access-token')
@Controller('admin/insights')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class InsightsAdminController {
  constructor(
    private readonly insightsService: InsightsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all insights (including drafts) for admin
   */
  @Get()
  @ApiOperation({ summary: 'List all insights (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of insights' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async listInsights(
    @Query(new ZodValidationPipe(AdminInsightsQuerySchema))
    query: AdminInsightsQueryInput
  ) {
    return this.insightsService.listAdminInsights(query);
  }

  /**
   * Get a single insight by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get insight by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Insight details' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Insight not found' })
  async getInsight(@Param('id') id: string) {
    return this.insightsService.getInsightById(id);
  }

  /**
   * Create a new insight
   */
  @Post()
  @ApiOperation({ summary: 'Create new insight (Admin only)' })
  @ApiResponse({ status: 201, description: 'Insight created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async createInsight(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateInsightsPostSchema))
    dto: CreateInsightsPostInput,
    @Req() req: Request,
  ) {
    const insight = await this.insightsService.createInsight(dto, user.id);

    await this.auditService.logCreate(
      'InsightsPost',
      insight.id,
      `Created insight post: ${dto.title}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      { title: dto.title, categoryId: dto.categoryId },
    );

    return insight;
  }

  /**
   * Update an existing insight
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update insight (Admin only)' })
  @ApiResponse({ status: 200, description: 'Insight updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Insight not found' })
  async updateInsight(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateInsightsPostSchema))
    dto: UpdateInsightsPostInput,
    @Req() req: Request,
  ) {
    const insight = await this.insightsService.updateInsight(id, dto, user.id);

    await this.auditService.logUpdate(
      'InsightsPost',
      id,
      `Updated insight post: ${insight.title}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      { changes: dto },
    );

    return insight;
  }

  /**
   * Publish an insight
   */
  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish insight (Admin only)' })
  @ApiResponse({ status: 200, description: 'Insight published' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Insight not found' })
  async publishInsight(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    const insight = await this.insightsService.publishInsight(id);

    await this.auditService.logPublish(
      'InsightsPost',
      id,
      `Published insight post: ${insight.title}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return insight;
  }

  /**
   * Unpublish an insight (set to draft)
   */
  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish insight (Admin only)' })
  @ApiResponse({ status: 200, description: 'Insight unpublished' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Insight not found' })
  async unpublishInsight(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    const insight = await this.insightsService.unpublishInsight(id);

    await this.auditService.logUnpublish(
      'InsightsPost',
      id,
      `Unpublished insight post: ${insight.title}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return insight;
  }

  /**
   * Delete an insight
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete insight (Admin only)' })
  @ApiResponse({ status: 200, description: 'Insight deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Insight not found' })
  async deleteInsight(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    await this.insightsService.deleteInsight(id);

    await this.auditService.logDelete(
      'InsightsPost',
      id,
      `Deleted insight post ${id}`,
      {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );

    return { success: true, message: 'Insight deleted' };
  }
}
