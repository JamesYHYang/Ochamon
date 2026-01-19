/**
 * Insights Module DTOs
 *
 * Re-exports Zod schemas and types from @matcha/shared for insights.
 */

export {
  // Schemas
  InsightsPostSchema,
  CreateInsightsPostSchema,
  UpdateInsightsPostSchema,
  InsightsQuerySchema,
  AdminInsightsQuerySchema,
  InsightsPostWithRelationsSchema,
  CategorySchema,
  TagSchema,
  INSIGHT_STATUSES,

  // Types
  type InsightsPost,
  type CreateInsightsPostInput,
  type UpdateInsightsPostInput,
  type InsightsQueryInput,
  type AdminInsightsQueryInput,
  type InsightsPostWithRelations,
  type Category,
  type Tag,
  type InsightStatus,
} from '@matcha/shared';
