/**
 * Compliance Module DTOs
 *
 * This module re-exports Zod schemas and their inferred types from @matcha/shared.
 * All validation is handled by the ZodValidationPipe using these schemas.
 *
 * Benefits:
 * - Single source of truth for validation (shared between frontend and backend)
 * - Type-safe DTOs inferred from Zod schemas
 * - Consistent validation error messages
 */

// Re-export all compliance schemas from shared package
export {
  // Constants
  ISO_COUNTRY_CODES,
  PRODUCT_CATEGORIES,
  CERTIFICATIONS,
  REQUIRED_DOC_TYPES,
  COMPLIANCE_LEVELS,
  DEFAULT_DISCLAIMER_TEXT,

  // Rule schemas
  ComplianceRuleSchema,
  CreateComplianceRuleSchema,
  UpdateComplianceRuleSchema,
  ComplianceRuleQuerySchema,

  // Evaluation schemas
  EvaluateComplianceSchema,
  ComplianceEvaluationResultSchema,
  ComplianceEvaluationSchema,

  // Paginated response schemas
  PaginatedComplianceRulesSchema,
} from '@matcha/shared';

// Re-export all types
export type {
  // Constant types
  ISOCountryCode,
  ProductCategory,
  Certification,
  RequiredDocType,
  ComplianceLevel,

  // Rule types
  ComplianceRule,
  CreateComplianceRuleInput,
  UpdateComplianceRuleInput,
  ComplianceRuleQueryInput,

  // Evaluation types
  EvaluateComplianceInput,
  ComplianceEvaluationResult,
  ComplianceEvaluation,

  // Paginated response types
  PaginatedComplianceRules,
} from '@matcha/shared';
