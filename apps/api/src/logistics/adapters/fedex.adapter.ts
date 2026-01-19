import type { ShippingEstimate, ServiceLevel } from '@matcha/shared';
import {
  type ShippingProvider,
  type EstimateParams,
  FEDEX_RATES,
  KG_TO_LBS,
  SERVICE_LEVEL_MULTIPLIERS,
  ETA_DAYS_DOMESTIC,
  ETA_DAYS_INTERNATIONAL,
  isDomestic,
  isOversized,
  getBillableWeight,
} from '../interfaces/shipping-provider.interface';

/**
 * FedEx Shipping Provider Adapter
 *
 * Provides shipping estimates for FedEx services:
 * - Economy (5-7 days)
 * - Standard (2-3 days)
 * - Express (1-2 days)
 *
 * Rate calculation:
 * - Base: (weightLbs * baseRatePerPound)
 * - Surcharges: residential (+$3.50), Saturday (+$2.00), oversized (+12%), heavy (+8% per 10kg)
 */
export class FedExAdapter implements ShippingProvider {
  readonly id = 'fedex';
  readonly name = 'FedEx';

  /**
   * Check if FedEx supports this route
   * FedEx supports most routes except very heavy shipments (>300kg)
   */
  supportsRoute(originCountry: string, destinationCountry: string, weightKg: number): boolean {
    // FedEx doesn't handle extremely heavy freight
    if (weightKg > 300) return false;
    // FedEx operates globally
    return true;
  }

  /**
   * Calculate FedEx shipping estimates
   */
  async estimate(params: EstimateParams): Promise<ShippingEstimate[]> {
    const { originCountry, destinationCountry, weightKg, dimensionsCm, serviceLevel } = params;

    if (!this.supportsRoute(originCountry, destinationCountry, weightKg)) {
      return [];
    }

    const domestic = isDomestic(originCountry, destinationCountry);
    const billableWeight = getBillableWeight(weightKg, dimensionsCm, domestic);
    const weightLbs = billableWeight * KG_TO_LBS;

    // Calculate base cost
    const baseRates = domestic
      ? { min: FEDEX_RATES.DOMESTIC_BASE_RATE_MIN, max: FEDEX_RATES.DOMESTIC_BASE_RATE_MAX }
      : { min: FEDEX_RATES.INTERNATIONAL_BASE_RATE_MIN, max: FEDEX_RATES.INTERNATIONAL_BASE_RATE_MAX };

    let baseCostMin = weightLbs * baseRates.min;
    let baseCostMax = weightLbs * baseRates.max;

    // Calculate percentage surcharges
    const percentSurcharge = this.calculatePercentSurcharge(dimensionsCm, weightKg);
    baseCostMin *= 1 + percentSurcharge;
    baseCostMax *= 1 + percentSurcharge;

    // Add fixed surcharges
    const fixedSurcharge = this.calculateFixedSurcharge();
    baseCostMin += fixedSurcharge;
    baseCostMax += fixedSurcharge;

    // Build notes for any applied surcharges
    const notes = this.buildSurchargeNotes(dimensionsCm, weightKg);

    // Generate estimates based on service level
    const estimates: ShippingEstimate[] = [];
    const serviceLevelConfig = SERVICE_LEVEL_MULTIPLIERS[serviceLevel];
    const etaDays = domestic ? ETA_DAYS_DOMESTIC[serviceLevel] : ETA_DAYS_INTERNATIONAL[serviceLevel];

    // Map service level to FedEx service names
    const serviceNames = this.getServiceNames(serviceLevel, domestic);

    for (const serviceName of serviceNames) {
      estimates.push({
        providerId: 'fedex',
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
   * Calculate percentage-based surcharges
   */
  private calculatePercentSurcharge(
    dimensionsCm: { length: number; width: number; height: number },
    weightKg: number,
  ): number {
    let surcharge = 0;

    // Oversized surcharge
    if (isOversized(dimensionsCm, FEDEX_RATES.OVERSIZE_THRESHOLD_CM)) {
      surcharge += FEDEX_RATES.OVERSIZE_SURCHARGE;
    }

    // Heavy shipment surcharge
    if (weightKg > FEDEX_RATES.HEAVY_THRESHOLD_KG) {
      const extraWeight = weightKg - FEDEX_RATES.HEAVY_THRESHOLD_KG;
      const extra10kgBlocks = Math.ceil(extraWeight / 10);
      surcharge += extra10kgBlocks * FEDEX_RATES.HEAVY_SURCHARGE_PER_10KG;
    }

    return surcharge;
  }

  /**
   * Calculate fixed surcharges
   * For simplicity, we apply residential delivery as a standard surcharge
   */
  private calculateFixedSurcharge(): number {
    // Assume residential delivery by default for B2B matcha shipments
    // (many buyers are small businesses operating from residential addresses)
    return FEDEX_RATES.RESIDENTIAL_SURCHARGE;
  }

  /**
   * Build notes string describing applied surcharges
   */
  private buildSurchargeNotes(
    dimensionsCm: { length: number; width: number; height: number },
    weightKg: number,
  ): string | null {
    const notes: string[] = [];

    notes.push('Residential delivery surcharge included');

    if (isOversized(dimensionsCm, FEDEX_RATES.OVERSIZE_THRESHOLD_CM)) {
      notes.push('Oversized package surcharge (+12%)');
    }

    if (weightKg > FEDEX_RATES.HEAVY_THRESHOLD_KG) {
      notes.push(`Heavy package surcharge (weight: ${weightKg.toFixed(1)}kg)`);
    }

    return notes.length > 0 ? notes.join('; ') : null;
  }

  /**
   * Get FedEx service names based on service level
   */
  private getServiceNames(serviceLevel: ServiceLevel, domestic: boolean): string[] {
    if (domestic) {
      switch (serviceLevel) {
        case 'economy':
          return ['FedEx Ground Economy'];
        case 'standard':
          return ['FedEx Ground'];
        case 'express':
          return ['FedEx Express Saver'];
        case 'overnight':
          return ['FedEx Priority Overnight'];
      }
    } else {
      switch (serviceLevel) {
        case 'economy':
          return ['FedEx International Economy'];
        case 'standard':
          return ['FedEx International Ground'];
        case 'express':
          return ['FedEx International Priority'];
        case 'overnight':
          return ['FedEx International First'];
      }
    }
  }
}
