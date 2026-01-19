import { z } from 'zod';

// Reason for why a result matched a query
export const ReasonSchema = z.object({
  field: z.string(), // e.g., "origin", "certification", "moq", "leadTime"
  matchedValue: z.union([z.string(), z.number()]),
  matchRule: z.enum([
    'exact_match',
    'range_contains',
    'substring_match',
    'array_contains',
    'less_than_or_equal',
    'greater_than_or_equal',
  ]),
});

export type Reason = z.infer<typeof ReasonSchema>;

// Search result with explainability
export const SearchResultSchema = z.object({
  skuId: z.string(),
  productName: z.string(),
  sellerName: z.string(),
  grade: z.string(),
  origin: z.string(),
  moq: z.number(),
  leadTimeDays: z.number(),
  price: z.number().nullable(),
  certifications: z.array(z.string()),
  reasons: z.array(ReasonSchema),
  score: z.number().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// Search request input
export const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
  destinationCountry: z.string().optional(),
  filters: z
    .object({
      grades: z.array(z.string()).optional(),
      origins: z.array(z.string()).optional(),
      certifications: z.array(z.string()).optional(),
      moqMin: z.number().optional(),
      moqMax: z.number().optional(),
      leadTimeMin: z.number().optional(),
      leadTimeMax: z.number().optional(),
      priceMin: z.number().optional(),
      priceMax: z.number().optional(),
    })
    .optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

// Parsed query constraints extracted from natural language
export const ParsedQuerySchema = z.object({
  keywords: z.array(z.string()),
  regions: z.array(z.string()),
  grades: z.array(z.string()),
  certifications: z.array(z.string()),
  moqMax: z.number().nullable(),
  moqMin: z.number().nullable(),
  leadTimeMax: z.number().nullable(),
  priceMax: z.number().nullable(),
  priceMin: z.number().nullable(),
  destinationCountry: z.string().nullable(),
});

export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;

// Search response
export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  executionTime: z.number(), // in milliseconds
  parsedQuery: ParsedQuerySchema.optional(),
  suggestion: z.string().nullable(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
