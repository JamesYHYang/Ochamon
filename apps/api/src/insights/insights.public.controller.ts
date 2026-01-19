import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../auth/decorators';
import { InsightsQuerySchema, type InsightsQueryInput } from '@matcha/shared';

/**
 * Public Insights Controller
 *
 * Handles public-facing endpoints for insights/blog posts.
 * No authentication required.
 */
@ApiTags('insights')
@Controller('insights')
export class InsightsPublicController {
  constructor(private readonly insightsService: InsightsService) {}

  /**
   * Get published insights with pagination and filtering
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get published insights (public)' })
  @ApiResponse({ status: 200, description: 'Paginated list of insights' })
  async getInsights(
    @Query(new ZodValidationPipe(InsightsQuerySchema)) query: InsightsQueryInput
  ) {
    return this.insightsService.getPublicInsights(query);
  }

  /**
   * Get available categories for filtering
   */
  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get insight categories (public)' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories() {
    return this.insightsService.getCategories();
  }

  /**
   * Get available tags for filtering
   */
  @Get('tags')
  @Public()
  @ApiOperation({ summary: 'Get insight tags (public)' })
  @ApiResponse({ status: 200, description: 'List of tags' })
  async getTags() {
    return this.insightsService.getTags();
  }

  /**
   * Get a single insight by slug
   */
  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get insight by slug (public)' })
  @ApiResponse({ status: 200, description: 'Full insight with content' })
  @ApiResponse({ status: 404, description: 'Insight not found' })
  async getInsight(@Param('slug') slug: string) {
    const insight = await this.insightsService.getInsightBySlug(slug);

    // Get related insights
    const tagIds = (insight as any).tags?.map((t: any) => t.id) || [];
    const related = await this.insightsService.getRelatedInsights(
      insight.id,
      tagIds,
      3
    );

    return {
      ...insight,
      related,
    };
  }
}
