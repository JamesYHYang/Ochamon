import { z } from 'zod';

export const TrendSeriesType = z.enum(['PRICING', 'WEATHER', 'DEMAND', 'SUPPLY']);
export type TrendSeriesType = z.infer<typeof TrendSeriesType>;

// Category & Tag
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
});
export type Category = z.infer<typeof CategorySchema>;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

// Insights Post
export const InsightsPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  featuredImage: z.string().nullable(),
  isPublished: z.boolean(),
  publishedAt: z.string().or(z.date()).nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  viewCount: z.number(),
  authorId: z.string(),
  categoryId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type InsightsPost = z.infer<typeof InsightsPostSchema>;

export const CreateInsightsPostSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  featuredImage: z.string().url().optional(),
  categoryId: z.string(),
  tagIds: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().optional().default(false),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});
export type CreateInsightsPostInput = z.infer<typeof CreateInsightsPostSchema>;

// Trend Series
export const TrendSeriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: TrendSeriesType,
  unit: z.string(),
  isActive: z.boolean(),
  regionId: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type TrendSeries = z.infer<typeof TrendSeriesSchema>;

export const TrendPointSchema = z.object({
  id: z.string(),
  date: z.string().or(z.date()),
  value: z.number(),
  unit: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  seriesId: z.string(),
  createdAt: z.string().or(z.date()),
});
export type TrendPoint = z.infer<typeof TrendPointSchema>;

export const TrendSeriesWithDataSchema = TrendSeriesSchema.extend({
  dataPoints: z.array(TrendPointSchema),
});
export type TrendSeriesWithData = z.infer<typeof TrendSeriesWithDataSchema>;

export const CreateTrendSeriesSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: TrendSeriesType,
  unit: z.string().min(1),
  regionId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateTrendSeriesInput = z.infer<typeof CreateTrendSeriesSchema>;

export const CreateTrendPointSchema = z.object({
  date: z.string().or(z.date()),
  value: z.number(),
  unit: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateTrendPointInput = z.infer<typeof CreateTrendPointSchema>;

// ==================== QUERY SCHEMAS ====================

/**
 * Query schema for public insights listing
 */
export const InsightsQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(50).optional().default(10),
  categoryId: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});
export type InsightsQueryInput = z.infer<typeof InsightsQuerySchema>;

/**
 * Query schema for admin insights listing
 */
export const AdminInsightsQuerySchema = InsightsQuerySchema.extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ALL']).optional().default('ALL'),
});
export type AdminInsightsQueryInput = z.infer<typeof AdminInsightsQuerySchema>;

/**
 * Query schema for trends listing
 */
export const TrendsQuerySchema = z.object({
  type: TrendSeriesType.optional(),
  regionId: z.string().optional(),
  isPublic: z.coerce.boolean().optional(),
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type TrendsQueryInput = z.infer<typeof TrendsQuerySchema>;

/**
 * Update schema for insights
 */
export const UpdateInsightsPostSchema = CreateInsightsPostSchema.partial();
export type UpdateInsightsPostInput = z.infer<typeof UpdateInsightsPostSchema>;

/**
 * Update schema for trend series
 */
export const UpdateTrendSeriesSchema = CreateTrendSeriesSchema.partial();
export type UpdateTrendSeriesInput = z.infer<typeof UpdateTrendSeriesSchema>;

/**
 * Update schema for trend point
 */
export const UpdateTrendPointSchema = CreateTrendPointSchema.partial();
export type UpdateTrendPointInput = z.infer<typeof UpdateTrendPointSchema>;

// ==================== INSIGHT STATUSES ====================

export const INSIGHT_STATUSES = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

export type InsightStatus = typeof INSIGHT_STATUSES[keyof typeof INSIGHT_STATUSES];

// ==================== EXTENDED TYPES WITH RELATIONS ====================

/**
 * Insights post with related data for display
 */
export const InsightsPostWithRelationsSchema = InsightsPostSchema.extend({
  author: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  category: CategorySchema.optional(),
  tags: z.array(TagSchema).optional(),
});
export type InsightsPostWithRelations = z.infer<typeof InsightsPostWithRelationsSchema>;

// Note: Region and GradeType schemas are exported from product.ts
