/**
 * Trends Module DTOs
 *
 * Re-exports Zod schemas and types from @matcha/shared for trends.
 */

export {
  // Schemas
  TrendSeriesSchema,
  TrendPointSchema,
  TrendSeriesWithDataSchema,
  CreateTrendSeriesSchema,
  CreateTrendPointSchema,
  UpdateTrendSeriesSchema,
  UpdateTrendPointSchema,
  TrendsQuerySchema,
  TrendSeriesType,

  // Types
  type TrendSeries,
  type TrendPoint,
  type TrendSeriesWithData,
  type CreateTrendSeriesInput,
  type CreateTrendPointInput,
  type UpdateTrendSeriesInput,
  type UpdateTrendPointInput,
  type TrendsQueryInput,
} from '@matcha/shared';
