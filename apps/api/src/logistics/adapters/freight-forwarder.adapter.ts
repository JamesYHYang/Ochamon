import type { ShippingEstimate, ServiceLevel } from '@matcha/shared';
import {
  type ShippingProvider,
  type EstimateParams,
  FREIGHT_RATES,
  isDomestic,
} from '../interfaces/shipping-provider.interface';

/**
 * Freight Forwarder Shipping Provider Adapter
 *
 * Provides shipping estimates for freight services:
 * - Sea Freight (14-30 days) - Best for heavy/bulk shipments
 * - Air Freight (3-7 days) - Faster but more expensive
 *
 * Best suited for:
 * - Non-USA origins/destinations
 * - Heavy shipments (>100kg)
 * - Bulk orders
 *
 * Rate calculation:
 * - Sea: (weightKg * $0.30/kg) + $500 minimum
 * - Air: (weightKg * $2.00/kg) + $1000 minimum
 * - Surcharges: Insurance (+2% of declared value), Handling ($50)
 */
export class FreightForwarderAdapter implements ShippingProvider {
  readonly id = 'freightforwarder';
  readonly name = 'Global Freight Services';

  /**
   * Check if freight forwarder is suitable for this route
   * Freight is preferred for:
   * - International shipments (non-US to non-US)
   * - Heavy shipments (>100kg)
   * - Any cross-continental shipment
   */
  supportsRoute(originCountry: string, destinationCountry: string, weightKg: number): boolean {
    const domestic = isDomestic(originCountry, destinationCountry);

    // Freight is always suitable for heavy shipments
    if (weightKg >= FREIGHT_RATES.WEIGHT_THRESHOLD_KG) {
      return true;
    }

    // Freight is suitable for international shipments over 20kg
    if (!domestic && weightKg >= 20) {
      return true;
    }

    // For lighter domestic shipments, traditional carriers are better
    return !domestic;
  }

  /**
   * Calculate freight shipping estimates
   */
  async estimate(params: EstimateParams): Promise<ShippingEstimate[]> {
    const { originCountry, destinationCountry, weightKg, declaredValue, serviceLevel } = params;

    if (!this.supportsRoute(originCountry, destinationCountry, weightKg)) {
      return [];
    }

    const estimates: ShippingEstimate[] = [];

    // Calculate common surcharges
    const insuranceCost = declaredValue * FREIGHT_RATES.INSURANCE_RATE;
    const handlingFee = FREIGHT_RATES.HANDLING_FEE;
    const totalSurcharges = insuranceCost + handlingFee;

    // Determine which services to offer based on service level
    const services = this.getServicesForLevel(serviceLevel);

    for (const service of services) {
      const estimate = this.calculateServiceEstimate(
        service,
        weightKg,
        totalSurcharges,
        originCountry,
        destinationCountry,
      );
      if (estimate) {
        estimates.push(estimate);
      }
    }

    return estimates;
  }

  /**
   * Determine which freight services to offer based on requested service level
   */
  private getServicesForLevel(serviceLevel: ServiceLevel): ('sea' | 'air')[] {
    switch (serviceLevel) {
      case 'economy':
        return ['sea']; // Only sea freight for economy
      case 'standard':
        return ['sea', 'air']; // Both options
      case 'express':
      case 'overnight':
        return ['air']; // Only air freight for faster options
    }
  }

  /**
   * Calculate estimate for a specific freight service
   */
  private calculateServiceEstimate(
    service: 'sea' | 'air',
    weightKg: number,
    surcharges: number,
    originCountry: string,
    destinationCountry: string,
  ): ShippingEstimate | null {
    if (service === 'sea') {
      return this.calculateSeaFreight(weightKg, surcharges, originCountry, destinationCountry);
    } else {
      return this.calculateAirFreight(weightKg, surcharges, originCountry, destinationCountry);
    }
  }

  /**
   * Calculate sea freight estimate
   */
  private calculateSeaFreight(
    weightKg: number,
    surcharges: number,
    originCountry: string,
    destinationCountry: string,
  ): ShippingEstimate {
    // Base cost: rate per kg or minimum, whichever is higher
    const baseCost = Math.max(weightKg * FREIGHT_RATES.SEA_RATE_PER_KG, FREIGHT_RATES.SEA_MINIMUM);

    // Route-based adjustment (longer routes cost more)
    const routeMultiplier = this.getRouteMultiplier(originCountry, destinationCountry);
    const adjustedCost = baseCost * routeMultiplier;

    // Total cost with surcharges
    const totalCost = adjustedCost + surcharges;

    // ETA varies by route
    const eta = this.getSeaFreightEta(originCountry, destinationCountry);

    return {
      providerId: 'freightforwarder',
      providerName: this.name,
      service: 'Sea Freight (FCL/LCL)',
      costMin: Math.round(totalCost * 0.9 * 100) / 100, // 10% variance
      costMax: Math.round(totalCost * 1.1 * 100) / 100,
      currency: 'USD',
      etaDaysMin: eta.min,
      etaDaysMax: eta.max,
      notes: `Includes insurance (2%) and handling. ${weightKg >= 100 ? 'Recommended for bulk shipments.' : ''} Port-to-port delivery.`,
    };
  }

  /**
   * Calculate air freight estimate
   */
  private calculateAirFreight(
    weightKg: number,
    surcharges: number,
    originCountry: string,
    destinationCountry: string,
  ): ShippingEstimate {
    // Base cost: rate per kg or minimum, whichever is higher
    const baseCost = Math.max(weightKg * FREIGHT_RATES.AIR_RATE_PER_KG, FREIGHT_RATES.AIR_MINIMUM);

    // Route-based adjustment
    const routeMultiplier = this.getRouteMultiplier(originCountry, destinationCountry);
    const adjustedCost = baseCost * routeMultiplier;

    // Total cost with surcharges
    const totalCost = adjustedCost + surcharges;

    // ETA varies by route
    const eta = this.getAirFreightEta(originCountry, destinationCountry);

    return {
      providerId: 'freightforwarder',
      providerName: this.name,
      service: 'Air Freight',
      costMin: Math.round(totalCost * 0.9 * 100) / 100, // 10% variance
      costMax: Math.round(totalCost * 1.1 * 100) / 100,
      currency: 'USD',
      etaDaysMin: eta.min,
      etaDaysMax: eta.max,
      notes: `Includes insurance (2%) and handling. Airport-to-airport delivery with customs clearance.`,
    };
  }

  /**
   * Get route-based cost multiplier
   * Longer routes cost more
   */
  private getRouteMultiplier(originCountry: string, destinationCountry: string): number {
    const origin = originCountry.toUpperCase();
    const dest = destinationCountry.toUpperCase();

    // Same region
    if (this.isSameRegion(origin, dest)) {
      return 1.0;
    }

    // Asia to US/EU (common matcha routes)
    if (this.isAsian(origin) && (this.isNorthAmerican(dest) || this.isEuropean(dest))) {
      return 1.2;
    }

    // US/EU to Asia
    if ((this.isNorthAmerican(origin) || this.isEuropean(origin)) && this.isAsian(dest)) {
      return 1.2;
    }

    // Transcontinental (other combinations)
    return 1.5;
  }

  /**
   * Get sea freight ETA based on route
   */
  private getSeaFreightEta(originCountry: string, destinationCountry: string): { min: number; max: number } {
    const origin = originCountry.toUpperCase();
    const dest = destinationCountry.toUpperCase();

    // Same region - faster
    if (this.isSameRegion(origin, dest)) {
      return { min: 7, max: 14 };
    }

    // Asia to US West Coast
    if (this.isAsian(origin) && dest === 'US') {
      return { min: 14, max: 21 };
    }

    // Asia to Europe
    if (this.isAsian(origin) && this.isEuropean(dest)) {
      return { min: 21, max: 35 };
    }

    // Default international
    return { min: 21, max: 42 };
  }

  /**
   * Get air freight ETA based on route
   */
  private getAirFreightEta(originCountry: string, destinationCountry: string): { min: number; max: number } {
    const origin = originCountry.toUpperCase();
    const dest = destinationCountry.toUpperCase();

    // Same region
    if (this.isSameRegion(origin, dest)) {
      return { min: 2, max: 4 };
    }

    // Intercontinental
    return { min: 3, max: 7 };
  }

  // Region helper methods
  private isAsian(country: string): boolean {
    return ['JP', 'CN', 'KR', 'TW', 'HK', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'IN'].includes(country);
  }

  private isNorthAmerican(country: string): boolean {
    return ['US', 'CA', 'MX'].includes(country);
  }

  private isEuropean(country: string): boolean {
    return ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'PT', 'IE'].includes(country);
  }

  private isSameRegion(origin: string, dest: string): boolean {
    return (
      (this.isAsian(origin) && this.isAsian(dest)) ||
      (this.isNorthAmerican(origin) && this.isNorthAmerican(dest)) ||
      (this.isEuropean(origin) && this.isEuropean(dest))
    );
  }
}
