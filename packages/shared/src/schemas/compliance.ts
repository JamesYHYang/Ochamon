import { z } from 'zod';

/**
 * Valid ISO 3166-1 alpha-2 country codes
 * Used for validating destination countries
 */
export const ISO_COUNTRY_CODES = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB',
  'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM',
  'CA', 'CV', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'HR', 'CU', 'CY',
  'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FJ', 'FI',
  'FR', 'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'HU',
  'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP', 'JO', 'KZ', 'KE', 'KI', 'KP',
  'KR', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MG', 'MW', 'MY',
  'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM',
  'NA', 'NR', 'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'MK', 'NO', 'OM', 'PK', 'PW', 'PA', 'PG',
  'PY', 'PE', 'PH', 'PL', 'PT', 'QA', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM', 'ST',
  'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD',
  'SR', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM',
  'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'YE', 'ZM', 'ZW',
  'HK', 'MO', 'PR', 'VI', 'GU', 'AS', 'MP', 'UM',
] as const;

export type ISOCountryCode = typeof ISO_COUNTRY_CODES[number];

/**
 * Common product categories for compliance rules
 */
export const PRODUCT_CATEGORIES = [
  'matcha',
  'green-tea',
  'tea',
  'organic-tea',
  'organic-matcha',
  'ceremonial-matcha',
  'culinary-matcha',
  'sencha',
  'gyokuro',
  'hojicha',
  'genmaicha',
  'other',
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

/**
 * Common certifications for compliance
 */
export const CERTIFICATIONS = [
  'JAS',
  'USDA-organic',
  'EU-organic',
  'fair-trade',
  'rainforest-alliance',
  'non-gmo',
  'kosher',
  'halal',
] as const;

export type Certification = typeof CERTIFICATIONS[number];

/**
 * Common required document types
 */
export const REQUIRED_DOC_TYPES = [
  'packing-list',
  'commercial-invoice',
  'proforma-invoice',
  'bill-of-lading',
  'phytosanitary-certificate',
  'certificate-of-origin',
  'organic-certificate',
  'jas-certificate',
  'certificate-of-analysis',
  'health-certificate',
  'import-permit',
  'fumigation-certificate',
  'insurance-certificate',
  'customs-declaration',
] as const;

export type RequiredDocType = typeof REQUIRED_DOC_TYPES[number];

/**
 * Compliance levels based on number of matching rules
 */
export const COMPLIANCE_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type ComplianceLevel = typeof COMPLIANCE_LEVELS[keyof typeof COMPLIANCE_LEVELS];

// ==================== COMPLIANCE RULE SCHEMAS ====================

/**
 * Schema for a ComplianceRule entity
 */
export const ComplianceRuleSchema = z.object({
  id: z.string(),
  destinationCountry: z.string().length(2),
  productCategory: z.string().min(1),
  minDeclaredValueUsd: z.number().nullable(),
  minWeightKg: z.number().nullable(),
  maxWeightKg: z.number().nullable(),
  requiredCertifications: z.array(z.string()),
  requiredDocs: z.array(z.string()),
  warnings: z.array(z.string()),
  disclaimerText: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  createdByAdminId: z.string(),
});
export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>;

/**
 * Base schema for compliance rule fields (without refinements)
 */
const ComplianceRuleBaseSchema = z.object({
  destinationCountry: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .toUpperCase()
    .refine((val) => ISO_COUNTRY_CODES.includes(val as ISOCountryCode), {
      message: 'Invalid ISO country code',
    }),
  productCategory: z.string().min(1, 'Product category is required'),
  minDeclaredValueUsd: z.number().min(0).optional().nullable(),
  minWeightKg: z.number().min(0).optional().nullable(),
  maxWeightKg: z.number().min(0).optional().nullable(),
  requiredCertifications: z.array(z.string()).optional().default([]),
  requiredDocs: z.array(z.string()).min(1, 'At least one required document must be specified'),
  warnings: z.array(z.string()).optional().default([]),
  disclaimerText: z
    .string()
    .min(1, 'Disclaimer text is required')
    .max(5000, 'Disclaimer text must be less than 5000 characters'),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema for creating a new compliance rule (admin only)
 */
export const CreateComplianceRuleSchema = ComplianceRuleBaseSchema.refine(
  (data) => {
    // If both minWeight and maxWeight are provided, ensure min <= max
    if (data.minWeightKg != null && data.maxWeightKg != null) {
      return data.minWeightKg <= data.maxWeightKg;
    }
    return true;
  },
  {
    message: 'minWeightKg must be less than or equal to maxWeightKg',
    path: ['minWeightKg'],
  }
);
export type CreateComplianceRuleInput = z.infer<typeof CreateComplianceRuleSchema>;

/**
 * Schema for updating a compliance rule (admin only)
 */
export const UpdateComplianceRuleSchema = z.object({
  destinationCountry: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .toUpperCase()
    .refine((val) => ISO_COUNTRY_CODES.includes(val as ISOCountryCode), {
      message: 'Invalid ISO country code',
    })
    .optional(),
  productCategory: z.string().min(1, 'Product category is required').optional(),
  minDeclaredValueUsd: z.number().min(0).optional().nullable(),
  minWeightKg: z.number().min(0).optional().nullable(),
  maxWeightKg: z.number().min(0).optional().nullable(),
  requiredCertifications: z.array(z.string()).optional(),
  requiredDocs: z.array(z.string()).min(1, 'At least one required document must be specified').optional(),
  warnings: z.array(z.string()).optional(),
  disclaimerText: z
    .string()
    .min(1, 'Disclaimer text is required')
    .max(5000, 'Disclaimer text must be less than 5000 characters')
    .optional(),
  isActive: z.boolean().optional(),
});
export type UpdateComplianceRuleInput = z.infer<typeof UpdateComplianceRuleSchema>;

/**
 * Schema for querying compliance rules
 */
export const ComplianceRuleQuerySchema = z.object({
  destinationCountry: z.string().length(2).toUpperCase().optional(),
  productCategory: z.string().optional(),
  activeOnly: z.coerce.boolean().optional().default(true),
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ComplianceRuleQueryInput = z.infer<typeof ComplianceRuleQuerySchema>;

// ==================== COMPLIANCE EVALUATION SCHEMAS ====================

/**
 * Schema for evaluating compliance requirements
 */
export const EvaluateComplianceSchema = z.object({
  destinationCountry: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .toUpperCase()
    .refine((val) => ISO_COUNTRY_CODES.includes(val as ISOCountryCode), {
      message: 'Invalid ISO country code',
    }),
  productCategory: z.string().min(1, 'Product category is required'),
  declaredValueUsd: z.number().min(0, 'Declared value must be non-negative'),
  weightKg: z.number().min(0.01, 'Weight must be at least 0.01 kg'),
  certifications: z.array(z.string()).optional().default([]),
  // Optional links to existing entities for audit trail
  rfqId: z.string().optional(),
  quoteId: z.string().optional(),
  orderId: z.string().optional(),
});
export type EvaluateComplianceInput = z.infer<typeof EvaluateComplianceSchema>;

/**
 * Schema for compliance evaluation result
 */
export const ComplianceEvaluationResultSchema = z.object({
  requiredDocs: z.array(z.string()),
  warnings: z.array(z.string()),
  flags: z.array(z.string()),
  disclaimerText: z.string(),
  appliedRuleIds: z.array(z.string()),
  complianceLevel: z.enum(['low', 'medium', 'high']),
  missingCertifications: z.array(z.string()).optional(),
});
export type ComplianceEvaluationResult = z.infer<typeof ComplianceEvaluationResultSchema>;

/**
 * Schema for a stored ComplianceEvaluation entity
 */
export const ComplianceEvaluationSchema = z.object({
  id: z.string(),
  rfqId: z.string().nullable(),
  quoteId: z.string().nullable(),
  orderId: z.string().nullable(),
  destinationCountry: z.string(),
  productCategory: z.string(),
  declaredValueUsd: z.number(),
  weightKg: z.number(),
  appliedRuleIds: z.array(z.string()),
  requiredDocs: z.array(z.string()),
  warnings: z.array(z.string()),
  flags: z.array(z.string()),
  disclaimerText: z.string(),
  complianceLevel: z.string(),
  evaluatedAt: z.string().or(z.date()),
});
export type ComplianceEvaluation = z.infer<typeof ComplianceEvaluationSchema>;

// ==================== PAGINATED RESPONSE SCHEMAS ====================

/**
 * Schema for paginated compliance rules response
 */
export const PaginatedComplianceRulesSchema = z.object({
  data: z.array(ComplianceRuleSchema),
  meta: z.object({
    total: z.number(),
    skip: z.number(),
    take: z.number(),
    totalPages: z.number(),
  }),
});
export type PaginatedComplianceRules = z.infer<typeof PaginatedComplianceRulesSchema>;

// ==================== DEFAULT VALUES ====================

/**
 * Default disclaimer text when no rules match
 */
export const DEFAULT_DISCLAIMER_TEXT =
  'This compliance information is provided for general guidance only and does not constitute legal advice. ' +
  'Importers are responsible for verifying all requirements with relevant authorities. ' +
  'Regulations may change without notice. Please consult with a licensed customs broker or legal professional ' +
  'for specific import/export requirements.';
