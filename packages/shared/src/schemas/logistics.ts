import { z } from 'zod';

// ==================== ENUMS ====================

export const ServiceLevel = z.enum(['economy', 'standard', 'express', 'overnight']);
export type ServiceLevel = z.infer<typeof ServiceLevel>;

export const ProviderId = z.enum(['ups', 'fedex', 'freightforwarder']);
export type ProviderId = z.infer<typeof ProviderId>;

// ==================== INPUT SCHEMAS ====================

export const DimensionsSchema = z.object({
  length: z.number().positive('Length must be positive'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
});
export type Dimensions = z.infer<typeof DimensionsSchema>;

export const EstimateRequestSchema = z.object({
  originCountry: z.string().length(2, 'Origin country must be ISO 2-letter code').toUpperCase(),
  originPostal: z.string().regex(/^[a-zA-Z0-9\-\s]{0,20}$/, 'Invalid postal code format').optional(),
  destinationCountry: z.string().length(2, 'Destination country must be ISO 2-letter code').toUpperCase(),
  destinationPostal: z.string().regex(/^[a-zA-Z0-9\-\s]{0,20}$/, 'Invalid postal code format').optional(),
  weightKg: z.number().positive('Weight must be positive'),
  dimensionsCm: DimensionsSchema,
  declaredValue: z.number().min(0, 'Declared value must be non-negative'),
  serviceLevel: ServiceLevel.optional().default('standard'),
});
export type EstimateRequestInput = z.infer<typeof EstimateRequestSchema>;

export const EstimateRfqRequestSchema = z.object({
  rfqId: z.string().min(1, 'RFQ ID is required'),
  originCountry: z.string().length(2, 'Origin country must be ISO 2-letter code').toUpperCase().optional().default('JP'),
  originPostal: z.string().regex(/^[a-zA-Z0-9\-\s]{0,20}$/, 'Invalid postal code format').optional(),
  destinationPostal: z.string().regex(/^[a-zA-Z0-9\-\s]{0,20}$/, 'Invalid postal code format').optional(),
  dimensionsCm: DimensionsSchema,
  serviceLevel: ServiceLevel.optional().default('standard'),
});
export type EstimateRfqRequestInput = z.infer<typeof EstimateRfqRequestSchema>;

// ==================== OUTPUT SCHEMAS ====================

export const ShippingEstimateSchema = z.object({
  providerId: ProviderId,
  providerName: z.string(),
  service: z.string(),
  costMin: z.number(),
  costMax: z.number(),
  currency: z.string().default('USD'),
  etaDaysMin: z.number().int(),
  etaDaysMax: z.number().int(),
  notes: z.string().optional(),
});
export type ShippingEstimate = z.infer<typeof ShippingEstimateSchema>;

export const CalculationDetailsSchema = z.object({
  originCountry: z.string(),
  destinationCountry: z.string(),
  distanceKm: z.number().optional(),
  weightBreakdown: z.object({
    itemsWeightKg: z.number(),
    packingAllowanceKg: z.number(),
    totalWeightKg: z.number(),
  }).optional(),
});
export type CalculationDetails = z.infer<typeof CalculationDetailsSchema>;

export const EstimateResponseSchema = z.object({
  estimates: z.array(ShippingEstimateSchema),
  calculatedWeightKg: z.number(),
  calculationDetails: CalculationDetailsSchema,
});
export type EstimateResponse = z.infer<typeof EstimateResponseSchema>;

// ==================== CONSTANTS ====================

/**
 * Valid ISO 3166-1 alpha-2 country codes for shipping
 * Subset of commonly used countries for matcha trade
 */
export const VALID_COUNTRY_CODES = [
  // Asia
  'JP', 'CN', 'KR', 'TW', 'HK', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'IN',
  // North America
  'US', 'CA', 'MX',
  // Europe
  'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'PT', 'IE',
  // Oceania
  'AU', 'NZ',
  // Middle East
  'AE', 'SA', 'IL',
  // South America
  'BR', 'AR', 'CL', 'CO',
  // Africa
  'ZA', 'EG',
] as const;

export type ValidCountryCode = typeof VALID_COUNTRY_CODES[number];

/**
 * Check if a country code is valid
 */
export function isValidCountryCode(code: string): code is ValidCountryCode {
  return VALID_COUNTRY_CODES.includes(code as ValidCountryCode);
}

/**
 * Country region groupings for rate calculation
 */
export const COUNTRY_REGIONS: Record<string, string[]> = {
  NORTH_AMERICA: ['US', 'CA', 'MX'],
  EUROPE: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'PT', 'IE'],
  ASIA_PACIFIC: ['JP', 'CN', 'KR', 'TW', 'HK', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'IN', 'AU', 'NZ'],
  MIDDLE_EAST: ['AE', 'SA', 'IL'],
  SOUTH_AMERICA: ['BR', 'AR', 'CL', 'CO'],
  AFRICA: ['ZA', 'EG'],
};

/**
 * Get region for a country code
 */
export function getCountryRegion(countryCode: string): string {
  for (const [region, countries] of Object.entries(COUNTRY_REGIONS)) {
    if (countries.includes(countryCode)) {
      return region;
    }
  }
  return 'OTHER';
}
