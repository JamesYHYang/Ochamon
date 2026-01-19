import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, InsightsPost } from '@prisma/client';
import type {
  CreateInsightsPostInput,
  UpdateInsightsPostInput,
  InsightsQueryInput,
  AdminInsightsQueryInput,
} from '@matcha/shared';

/**
 * Insights Service
 *
 * Handles all insights/blog post related business logic including:
 * - Public insights listing and detail views
 * - Admin CRUD operations
 * - Publishing workflow
 */
@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== PUBLIC METHODS ====================

  /**
   * Get published insights for public display
   *
   * @param query - Query parameters including pagination and filters
   * @returns Paginated list of published insights
   */
  async getPublicInsights(query: InsightsQueryInput): Promise<{
    data: InsightsPost[];
    meta: { total: number; skip: number; take: number; totalPages: number };
  }> {
    const { skip, take, categoryId, tag, search } = query;

    const where: Prisma.InsightsPostWhereInput = {
      isPublished: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (tag) {
      where.tags = {
        some: {
          slug: tag,
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.insightsPost.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          featuredImage: true,
          publishedAt: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true,
          isPublished: true,
          content: false,
          metaTitle: true,
          metaDescription: true,
          authorId: true,
          categoryId: true,
          author: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.insightsPost.count({ where }),
    ]);

    return {
      data: data as unknown as InsightsPost[],
      meta: {
        total,
        skip,
        take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get a published insight by slug
   *
   * @param slug - The unique slug of the insight
   * @returns Full insight with content
   */
  async getInsightBySlug(slug: string): Promise<InsightsPost> {
    const insight = await this.prisma.insightsPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
        tags: true,
      },
    });

    if (!insight) {
      throw new NotFoundException(`Insight not found: ${slug}`);
    }

    if (!insight.isPublished) {
      throw new NotFoundException(`Insight not found: ${slug}`);
    }

    // Increment view count asynchronously (fire and forget)
    this.prisma.insightsPost
      .update({
        where: { id: insight.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {
        // Ignore errors on view count update
      });

    return insight;
  }

  /**
   * Get related insights based on tags
   *
   * @param insightId - Current insight ID to exclude
   * @param tagIds - Tag IDs to match
   * @param limit - Number of related posts to return
   * @returns List of related insights
   */
  async getRelatedInsights(
    insightId: string,
    tagIds: string[],
    limit: number = 3
  ): Promise<InsightsPost[]> {
    if (tagIds.length === 0) {
      return [];
    }

    return this.prisma.insightsPost.findMany({
      where: {
        isPublished: true,
        id: { not: insightId },
        tags: {
          some: {
            id: { in: tagIds },
          },
        },
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
        tags: true,
      },
    });
  }

  /**
   * Get all categories for filtering
   */
  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get all tags for filtering
   */
  async getTags() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // ==================== ADMIN METHODS ====================

  /**
   * List all insights for admin (including drafts)
   *
   * @param query - Query parameters including pagination and status filter
   * @returns Paginated list of all insights
   */
  async listAdminInsights(query: AdminInsightsQueryInput): Promise<{
    data: InsightsPost[];
    meta: { total: number; skip: number; take: number; totalPages: number };
  }> {
    const { skip, take, status, categoryId, search } = query;

    const where: Prisma.InsightsPostWhereInput = {};

    if (status && status !== 'ALL') {
      where.isPublished = status === 'PUBLISHED';
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.insightsPost.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
          category: true,
          tags: true,
        },
      }),
      this.prisma.insightsPost.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        skip,
        take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get a single insight by ID (admin)
   *
   * @param id - Insight ID
   * @returns Full insight
   */
  async getInsightById(id: string): Promise<InsightsPost> {
    const insight = await this.prisma.insightsPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
        tags: true,
      },
    });

    if (!insight) {
      throw new NotFoundException(`Insight not found: ${id}`);
    }

    return insight;
  }

  /**
   * Create a new insight (admin only)
   *
   * @param dto - Insight creation data
   * @param authorId - ID of the admin creating the insight
   * @returns Created insight
   */
  async createInsight(
    dto: CreateInsightsPostInput,
    authorId: string
  ): Promise<InsightsPost> {
    // Generate slug from title if not provided
    const slug = this.generateSlug(dto.title);

    // Check slug uniqueness
    const existingSlug = await this.prisma.insightsPost.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new BadRequestException(`Slug "${slug}" is already in use`);
    }

    // Validate category exists
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException(`Category not found: ${dto.categoryId}`);
      }
    }

    // Sanitize HTML content
    const sanitizedContent = this.sanitizeHtml(dto.content);

    return this.prisma.insightsPost.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt || null,
        content: sanitizedContent,
        featuredImage: dto.featuredImage || null,
        metaTitle: dto.metaTitle || null,
        metaDescription: dto.metaDescription || null,
        isPublished: false, // Always start as draft
        authorId,
        categoryId: dto.categoryId,
        tags: dto.tagIds?.length
          ? {
              connect: dto.tagIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
        tags: true,
      },
    });
  }

  /**
   * Update an existing insight (admin only)
   *
   * @param id - Insight ID
   * @param dto - Update data
   * @param adminId - ID of admin making the update (for audit)
   * @returns Updated insight
   */
  async updateInsight(
    id: string,
    dto: UpdateInsightsPostInput,
    adminId: string
  ): Promise<InsightsPost> {
    const existing = await this.prisma.insightsPost.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Insight not found: ${id}`);
    }

    // If title changed, regenerate slug
    let slug = existing.slug;
    if (dto.title && dto.title !== existing.title) {
      slug = this.generateSlug(dto.title);

      // Check slug uniqueness (excluding current record)
      const existingSlug = await this.prisma.insightsPost.findFirst({
        where: { slug, id: { not: id } },
      });

      if (existingSlug) {
        throw new BadRequestException(`Slug "${slug}" is already in use`);
      }
    }

    // Sanitize content if provided
    const sanitizedContent = dto.content
      ? this.sanitizeHtml(dto.content)
      : undefined;

    return this.prisma.insightsPost.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title, slug }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(sanitizedContent !== undefined && { content: sanitizedContent }),
        ...(dto.featuredImage !== undefined && {
          featuredImage: dto.featuredImage,
        }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && {
          metaDescription: dto.metaDescription,
        }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.tagIds && {
          tags: {
            set: dto.tagIds.map((tagId) => ({ id: tagId })),
          },
        }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
        tags: true,
      },
    });
  }

  /**
   * Publish an insight
   *
   * @param id - Insight ID
   * @returns Published insight
   */
  async publishInsight(id: string): Promise<InsightsPost> {
    const existing = await this.prisma.insightsPost.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Insight not found: ${id}`);
    }

    return this.prisma.insightsPost.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
        tags: true,
      },
    });
  }

  /**
   * Unpublish an insight (set to draft)
   *
   * @param id - Insight ID
   * @returns Updated insight
   */
  async unpublishInsight(id: string): Promise<InsightsPost> {
    const existing = await this.prisma.insightsPost.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Insight not found: ${id}`);
    }

    return this.prisma.insightsPost.update({
      where: { id },
      data: {
        isPublished: false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
        tags: true,
      },
    });
  }

  /**
   * Delete an insight
   *
   * @param id - Insight ID
   */
  async deleteInsight(id: string): Promise<void> {
    const existing = await this.prisma.insightsPost.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Insight not found: ${id}`);
    }

    await this.prisma.insightsPost.delete({
      where: { id },
    });
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate a URL-safe slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  private sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }
}
