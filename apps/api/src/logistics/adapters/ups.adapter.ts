import type { ShippingEstimate, ServiceLevel } from '@matcha/shared';
import {
  type ShippingProvider,
  type EstimateParams,
  UPS_RATES,
  KG_TO_LBS,
  SERVICE_LEVEL_MULTIPLIERS,
  ETA_DAYS_DOMESTIC,
  ETA_DAYS_INTERNATIONAL,
  isDomestic,
  isOversized,
  getBillableWeight,
} from '../interfaces/shipping-provider.interface';

/**
 * UPS Shipping Provider Adapter
 *
 * Provides shipping estimates for UPS services:
 * - Ground (3-5 days domestic)
 * - Expedited (2 days)
 * - Express (1 day)
 * - Overnight (next day)
 *
 * Rate calculation:
 * - Base: (weightLbs * baseRatePerPound)
 * - Surcharges: oversized (+15%), heavy (+10% per 10kg above 30kg), high value (+20%)
 */
export class UpsAdapter implements ShippingProvider {
  readonly id = 'ups';
  readonly name = 'UPS';

  /**
   * Check if UPS supports this route
   * UPS supports most routes except very heavy shipments (>500kg)
   */
  supportsRoute(originCountry: string, destinationCountry: string, weightKg: number): boolean {
    // UPS doesn't handle extremely heavy freight
    if (weightKg > 500) return false;
    // UPS operates globally
    return true;
  }

  /**
   * Calculate UPS shipping estimates
   */
  async estimate(params: EstimateParams): Promise<ShippingEstimate[]> {
    const { originCountry, destinationCountry, weightKg, dimensionsCm, declaredValue, serviceLevel } = params;

    if (!this.supportsRoute(originCountry, destinationCountry, weightKg)) {
      return [];
    }

    const domestic = isDomestic(originCountry, destinationCountry);
    const billableWeight = getBillableWeight(weightKg, dimensionsCm, domestic);
    const weightLbs = billableWeight * KG_TO_LBS;

    // Calculate base cost
    const baseRates = domestic
      ? { min: UPS_RATES.DOMESTIC_BASE_RATE_MIN, max: UPS_RATES.DOMESTIC_BASE_RATE_MAX }
      : { min: UPS_RATES.INTERNATIONAL_BASE_RATE_MIN, max: UPS_RATES.INTERNATIONAL_BASE_RATE_MAX };

    let baseCostMin = weightLbs * baseRates.min;
    let baseCostMax = weightLbs * baseRates.max;

    // Calculate surcharges
    const surchargeMultiplier = this.calculateSurchargeMultiplier(dimensionsCm, weightKg, declaredValue);
    baseCostMin *= 1 + surchargeMultiplier;
    baseCostMax *= 1 + surchargeMultiplier;

    // Build notes for any applied surcharges
    const notes = this.buildSurchargeNotes(dimensionsCm, weightKg, declaredValue);

    // Generate estimates based on service level
    const estimates: ShippingEstimate[] = [];
    const serviceLevelConfig = SERVICE_LEVEL_MULTIPLIERS[serviceLevel];
    const etaDays = domestic ? ETA_DAYS_DOMESTIC[serviceLevel] : ETA_DAYS_INTERNATIONAL[serviceLevel];

    // Map service level to UPS service names
    const serviceNames = this.getServiceNames(serviceLevel, domestic);

    for (const serviceName of serviceNames) {
      estimates.push({
        providerId: 'ups',
        providerName: this.name,
        service: serviceName,
        costMin: Math.round(baseCostMin * serviceLevelConfig.min * 100) / 100,
        costMax: Math.round(baseCostMax * serviceLevelConfig.max * 100) / 100,
        currency: 'USD',
        etaDaysMin: etaDays.min,
        etaDaysMax: etaDays.max,
        notes: notes || undefined,
      });
    }

    return estimates;
  }

  /**
   * Calculate total surcharge multiplier
   */
  private calculateSurchargeMultiplier(
    dimensionsCm: { length: number; width: number; height: number },
    weightKg: number,
    declaredValue: number,
  ): number {
    let surcharge = 0;

    // Oversized surcharge
    if (isOversized(dimensionsCm, UPS_RATES.OVERSIZE_THRESHOLD_CM)) {
      surcharge += UPS_RATES.OVERSIZE_SURCHARGE;
    }

    // Heavy shipment surcharge
    if (weightKg > UPS_RATES.HEAVY_THRESHOLD_KG) {
      const extraWeight = weightKg - UPS_RATES.HEAVY_THRESHOLD_KG;
      const extra10kgBlocks = Math.ceil(extraWeight / 10);
      surcharge += extra10kgBlocks * UPS_RATES.HEAVY_SURCHARGE_PER_10KG;
    }

    // High value surcharge (food/hazardous indicator)
    if (declaredValue > UPS_RATES.HIGH_VALUE_THRESHOLD) {
      surcharge += UPS_RATES.HIGH_VALUE_SURCHARGE;
    }

    return surcharge;
  }

  /**
   * Build notes string describing applied surcharges
   */
  private buildSurchargeNotes(
    dimensionsCm: { length: number; width: number; height: number },
    weightKg: number,
    declaredValue: number,
  ): string | null {
    const notes: string[] = [];

    if (isOversized(dimensionsCm, UPS_RATES.OVERSIZE_THRESHOLD_CM)) {
      notes.push('Oversized item surcharge applied (+15%)');
    }

    if (weightKg > UPS_RATES.HEAVY_THRESHOLD_KG) {
      notes.push(`Heavy shipment surcharge applied (weight: ${weightKg.toFixed(1)}kg)`);
    }

    if (declaredValue > UPS_RATES.HIGH_VALUE_THRESHOLD) {
      notes.push('High value item handling surcharge applied (+20%)');
    }

    return notes.length > 0 ? notes.join('; ') : null;
  }

  /**
   * Get UPS service names based on service level
   */
  private getServiceNames(serviceLevel: ServiceLevel, domestic: boolean): string[] {
    if (domestic) {
      switch (serviceLevel) {
        case 'economy':
          return ['UPS Ground Saver'];
        case 'standard':
          return ['UPS Ground'];
        case 'express':
          return ['UPS 2nd Day Air'];
        case 'overnight':
          return ['UPS Next Day Air'];
      }
    } else {
      switch (serviceLevel) {
        case 'economy':
          return ['UPS Worldwide Economy'];
        case 'standard':
          return ['UPS Worldwide Expedited'];
        case 'express':
          return ['UPS Worldwide Express'];
        case 'overnight':
          return ['UPS Worldwide Express Plus'];
      }
    }
  }
}
