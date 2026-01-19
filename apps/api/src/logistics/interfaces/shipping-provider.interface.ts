import type { ShippingEstimate, Dimensions, ServiceLevel } from '@matcha/shared';

/**
 * Parameters for shipping estimate calculation
 */
export interface EstimateParams {
  /** ISO 3166-1 alpha-2 country code */
  originCountry: string;
  /** Optional postal/zip code */
  originPostal?: string;
  /** ISO 3166-1 alpha-2 country code */
  destinationCountry: string;
  /** Optional postal/zip code */
  destinationPostal?: string;
  /** Total weight in kilograms */
  weightKg: number;
  /** Package dimensions in centimeters */
  dimensionsCm: Dimensions;
  /** Declared value in USD */
  declaredValue: number;
  /** Desired service level */
  serviceLevel: ServiceLevel;
}

/**
 * Shipping provider adapter interface
 * All shipping provider adapters must implement this interface
 */
export interface ShippingProvider {
  /** Unique identifier for the provider (e.g., 'ups', 'fedex') */
  readonly id: string;
  /** Human-readable provider name */
  readonly name: string;

  /**
   * Calculate shipping estimates for the given parameters
   * @param params - Shipping parameters
   * @returns Array of shipping estimates for different service options
   */
  estimate(params: EstimateParams): Promise<ShippingEstimate[]>;

  /**
   * Check if this provider supports the given route
   * @param originCountry - Origin country code
   * @param destinationCountry - Destination country code
   * @param weightKg - Shipment weight
   * @returns True if provider can handle this route
   */
  supportsRoute(originCountry: string, destinationCountry: string, weightKg: number): boolean;
}

// ==================== RATE CONSTANTS ====================

/** Conversion factor: kilograms to pounds */
export const KG_TO_LBS = 2.20462;

/** Conversion factor: centimeters to inches */
export const CM_TO_INCHES = 0.393701;

/** Packing allowance percentage (5%) */
export const PACKING_ALLOWANCE = 0.05;

// ==================== UPS RATE CONSTANTS ====================

export const UPS_RATES = {
  /** Base rate per pound for domestic USA shipments */
  DOMESTIC_BASE_RATE_MIN: 0.50,
  DOMESTIC_BASE_RATE_MAX: 2.00,
  /** Base rate per pound for international shipments */
  INTERNATIONAL_BASE_RATE_MIN: 2.00,
  INTERNATIONAL_BASE_RATE_MAX: 5.00,
  /** Oversize surcharge (any dimension > 30cm) */
  OVERSIZE_SURCHARGE: 0.15,
  /** Heavy shipment surcharge per 10kg above 30kg threshold */
  HEAVY_SURCHARGE_PER_10KG: 0.10,
  /** Heavy weight threshold in kg */
  HEAVY_THRESHOLD_KG: 30,
  /** High value surcharge (declaredValue > $1000) */
  HIGH_VALUE_SURCHARGE: 0.20,
  /** High value threshold in USD */
  HIGH_VALUE_THRESHOLD: 1000,
  /** Oversize dimension threshold in cm */
  OVERSIZE_THRESHOLD_CM: 30,
} as const;

// ==================== FEDEX RATE CONSTANTS ====================

export const FEDEX_RATES = {
  /** Base rate per pound for domestic USA shipments */
  DOMESTIC_BASE_RATE_MIN: 0.45,
  DOMESTIC_BASE_RATE_MAX: 1.80,
  /** Base rate per pound for international shipments */
  INTERNATIONAL_BASE_RATE_MIN: 1.80,
  INTERNATIONAL_BASE_RATE_MAX: 4.50,
  /** Residential delivery surcharge */
  RESIDENTIAL_SURCHARGE: 3.50,
  /** Saturday delivery surcharge */
  SATURDAY_SURCHARGE: 2.00,
  /** Oversize surcharge */
  OVERSIZE_SURCHARGE: 0.12,
  /** Heavy shipment surcharge per 10kg above threshold */
  HEAVY_SURCHARGE_PER_10KG: 0.08,
  /** Heavy weight threshold in kg */
  HEAVY_THRESHOLD_KG: 30,
  /** Oversize dimension threshold in cm */
  OVERSIZE_THRESHOLD_CM: 30,
} as const;

// ==================== FREIGHT FORWARDER RATE CONSTANTS ====================

export const FREIGHT_RATES = {
  /** Sea freight rate per kg */
  SEA_RATE_PER_KG: 0.30,
  /** Sea freight minimum charge */
  SEA_MINIMUM: 500,
  /** Air freight rate per kg */
  AIR_RATE_PER_KG: 2.00,
  /** Air freight minimum charge */
  AIR_MINIMUM: 1000,
  /** Insurance rate (% of declared value) */
  INSURANCE_RATE: 0.02,
  /** Handling fee per shipment */
  HANDLING_FEE: 50,
  /** Weight threshold for freight (kg) - prefer freight for heavy shipments */
  WEIGHT_THRESHOLD_KG: 100,
} as const;

// ==================== SERVICE LEVEL MULTIPLIERS ====================

/**
 * Rate multipliers by service level
 * Applied to base cost to get final estimate
 */
export const SERVICE_LEVEL_MULTIPLIERS: Record<ServiceLevel, { min: number; max: number }> = {
  economy: { min: 0.6, max: 0.8 },
  standard: { min: 1.0, max: 1.2 },
  express: { min: 1.5, max: 1.8 },
  overnight: { min: 2.0, max: 2.5 },
};

// ==================== ETA DAYS BY SERVICE LEVEL ====================

/**
 * Estimated delivery days by service level (domestic)
 */
export const ETA_DAYS_DOMESTIC: Record<ServiceLevel, { min: number; max: number }> = {
  economy: { min: 5, max: 7 },
  standard: { min: 3, max: 5 },
  express: { min: 1, max: 2 },
  overnight: { min: 1, max: 1 },
};

/**
 * Estimated delivery days by service level (international)
 */
export const ETA_DAYS_INTERNATIONAL: Record<ServiceLevel, { min: number; max: number }> = {
  economy: { min: 10, max: 21 },
  standard: { min: 5, max: 10 },
  express: { min: 2, max: 5 },
  overnight: { min: 1, max: 3 },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if shipment is domestic (same country)
 */
export function isDomestic(originCountry: string, destinationCountry: string): boolean {
  return originCountry.toUpperCase() === destinationCountry.toUpperCase();
}

/**
 * Check if package is oversized
 */
export function isOversized(dimensionsCm: Dimensions, thresholdCm: number): boolean {
  return (
    dimensionsCm.length > thresholdCm ||
    dimensionsCm.width > thresholdCm ||
    dimensionsCm.height > thresholdCm
  );
}

/**
 * Calculate volumetric weight (dimensional weight)
 * Standard formula: (L x W x H) / 5000 for international air, /6000 for domestic
 */
export function calculateVolumetricWeight(dimensionsCm: Dimensions, isDomesticRoute: boolean): number {
  const volume = dimensionsCm.length * dimensionsCm.width * dimensionsCm.height;
  const divisor = isDomesticRoute ? 6000 : 5000;
  return volume / divisor;
}

/**
 * Get billable weight (greater of actual or volumetric)
 */
export function getBillableWeight(actualWeightKg: number, dimensionsCm: Dimensions, isDomesticRoute: boolean): number {
  const volumetricWeight = calculateVolumetricWeight(dimensionsCm, isDomesticRoute);
  return Math.max(actualWeightKg, volumetricWeight);
}
