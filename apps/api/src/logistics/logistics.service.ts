import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  type EstimateRequestInput,
  type EstimateRfqRequestInput,
  type EstimateResponse,
  type ShippingEstimate,
  type CalculationDetails,
  isValidCountryCode,
} from '@matcha/shared';
import {
  type ShippingProvider,
  type EstimateParams,
  PACKING_ALLOWANCE,
} from './interfaces/shipping-provider.interface';
import { UpsAdapter } from './adapters/ups.adapter';
import { FedExAdapter } from './adapters/fedex.adapter';
import { FreightForwarderAdapter } from './adapters/freight-forwarder.adapter';

/**
 * Logistics Service
 *
 * Provides shipping estimate calculations using multiple provider adapters.
 * Handles weight calculations from RFQ line items with proper unit conversions.
 */
@Injectable()
export class LogisticsService {
  private readonly providers: ShippingProvider[];

  constructor(private readonly prisma: PrismaService) {
    // Initialize all shipping provider adapters
    this.providers = [
      new UpsAdapter(),
      new FedExAdapter(),
      new FreightForwarderAdapter(),
    ];
  }

  /**
   * Calculate shipping estimates for given parameters
   *
   * @param input - Shipping estimate request parameters
   * @returns Shipping estimates from all applicable providers, sorted by cost
   */
  async estimate(input: EstimateRequestInput): Promise<EstimateResponse> {
    // Validate input
    this.validateEstimateInput(input);

    // Build estimate params
    const params: EstimateParams = {
      originCountry: input.originCountry.toUpperCase(),
      originPostal: this.sanitizePostalCode(input.originPostal),
      destinationCountry: input.destinationCountry.toUpperCase(),
      destinationPostal: this.sanitizePostalCode(input.destinationPostal),
      weightKg: input.weightKg,
      dimensionsCm: input.dimensionsCm,
      declaredValue: input.declaredValue,
      serviceLevel: input.serviceLevel,
    };

    // Get estimates from all providers
    const allEstimates = await this.getEstimatesFromProviders(params);

    // Sort by minimum cost ascending
    allEstimates.sort((a, b) => a.costMin - b.costMin);

    // Build calculation details
    const calculationDetails: CalculationDetails = {
      originCountry: params.originCountry,
      destinationCountry: params.destinationCountry,
    };

    return {
      estimates: allEstimates,
      calculatedWeightKg: input.weightKg,
      calculationDetails,
    };
  }

  /**
   * Calculate shipping estimates for an RFQ
   * Automatically calculates weight from RFQ line items
   *
   * @param input - RFQ estimate request parameters
   * @returns Shipping estimates with calculated weight
   */
  async estimateFromRfq(input: EstimateRfqRequestInput): Promise<EstimateResponse> {
    // Fetch RFQ with line items and SKUs
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: input.rfqId },
      include: {
        lineItems: {
          include: {
            sku: {
              select: {
                id: true,
                netWeightG: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${input.rfqId} not found`);
    }

    // Calculate total weight from line items
    const weightBreakdown = this.calculateRfqWeight(rfq.lineItems);

    // Get destination country from RFQ (required field)
    const destinationCountry = rfq.destinationCountry || 'US';

    // Build estimate request
    const estimateInput: EstimateRequestInput = {
      originCountry: input.originCountry || 'JP', // Default origin is Japan for matcha
      originPostal: input.originPostal,
      destinationCountry: destinationCountry,
      destinationPostal: input.destinationPostal,
      weightKg: weightBreakdown.totalWeightKg,
      dimensionsCm: input.dimensionsCm,
      declaredValue: this.calculateDeclaredValue(rfq.lineItems),
      serviceLevel: input.serviceLevel,
    };

    // Get estimates
    const response = await this.estimate(estimateInput);

    // Add weight breakdown to calculation details
    response.calculationDetails.weightBreakdown = weightBreakdown;

    return response;
  }

  /**
   * Calculate total weight from RFQ line items
   *
   * @param lineItems - RFQ line items with SKU data
   * @returns Weight breakdown with packing allowance
   */
  calculateRfqWeight(
    lineItems: Array<{
      qty: number | { toNumber(): number };
      unit: string;
      sku: { netWeightG: number } | null;
    }>,
  ): { itemsWeightKg: number; packingAllowanceKg: number; totalWeightKg: number } {
    let totalWeightG = 0;

    for (const item of lineItems) {
      if (!item.sku) {
        continue; // Skip items without SKU data
      }

      // Get quantity as number (handle Decimal type from Prisma)
      const qty = typeof item.qty === 'number'
        ? item.qty
        : item.qty.toNumber();

      // Get net weight per unit in grams
      const unitWeightG = item.sku.netWeightG;

      // Handle unit conversion
      let itemWeightG: number;
      switch (item.unit.toLowerCase()) {
        case 'kg':
          // Quantity is in kg, multiply by weight per unit
          itemWeightG = qty * 1000; // Convert kg quantity to grams
          break;
        case 'g':
          // Quantity is in grams
          itemWeightG = qty;
          break;
        case 'unit':
        case 'units':
        case 'pcs':
        default:
          // Quantity is number of units, multiply by unit weight
          itemWeightG = qty * unitWeightG;
          break;
      }

      totalWeightG += itemWeightG;
    }

    // Convert to kg
    const itemsWeightKg = totalWeightG / 1000;

    // Add packing allowance (5%)
    const packingAllowanceKg = itemsWeightKg * PACKING_ALLOWANCE;
    const totalWeightKg = itemsWeightKg + packingAllowanceKg;

    return {
      itemsWeightKg: Math.round(itemsWeightKg * 1000) / 1000,
      packingAllowanceKg: Math.round(packingAllowanceKg * 1000) / 1000,
      totalWeightKg: Math.round(totalWeightKg * 1000) / 1000,
    };
  }

  /**
   * Calculate declared value from RFQ line items
   * Uses target price * quantity for each item
   */
  private calculateDeclaredValue(
    lineItems: Array<{
      qty: number | { toNumber(): number };
      targetPrice?: number | { toNumber(): number } | null;
    }>,
  ): number {
    let totalValue = 0;

    for (const item of lineItems) {
      if (!item.targetPrice) continue;

      const qty = typeof item.qty === 'number'
        ? item.qty
        : item.qty.toNumber();

      const targetPrice = typeof item.targetPrice === 'number'
        ? item.targetPrice
        : item.targetPrice.toNumber();

      totalValue += qty * targetPrice;
    }

    // Return at least $100 as minimum declared value
    return Math.max(totalValue, 100);
  }

  /**
   * Get estimates from all applicable providers
   */
  private async getEstimatesFromProviders(params: EstimateParams): Promise<ShippingEstimate[]> {
    const allEstimates: ShippingEstimate[] = [];

    // Query all providers in parallel
    const providerPromises = this.providers.map(async (provider) => {
      try {
        // Check if provider supports this route
        if (!provider.supportsRoute(params.originCountry, params.destinationCountry, params.weightKg)) {
          return [];
        }

        // Get estimates from provider
        return await provider.estimate(params);
      } catch (error) {
        // Log error but don't fail the entire request
        console.error(`Error getting estimate from ${provider.name}:`, error);
        return [];
      }
    });

    const results = await Promise.all(providerPromises);

    // Flatten results
    for (const estimates of results) {
      allEstimates.push(...estimates);
    }

    return allEstimates;
  }

  /**
   * Validate estimate input
   */
  private validateEstimateInput(input: EstimateRequestInput): void {
    // Validate country codes
    if (!isValidCountryCode(input.originCountry.toUpperCase())) {
      throw new BadRequestException(`Invalid origin country code: ${input.originCountry}`);
    }

    if (!isValidCountryCode(input.destinationCountry.toUpperCase())) {
      throw new BadRequestException(`Invalid destination country code: ${input.destinationCountry}`);
    }

    // Validate weight
    if (input.weightKg <= 0) {
      throw new BadRequestException('Weight must be greater than 0');
    }

    // Validate dimensions
    if (
      input.dimensionsCm.length <= 0 ||
      input.dimensionsCm.width <= 0 ||
      input.dimensionsCm.height <= 0
    ) {
      throw new BadRequestException('All dimensions must be greater than 0');
    }

    // Validate declared value
    if (input.declaredValue < 0) {
      throw new BadRequestException('Declared value must be non-negative');
    }
  }

  /**
   * Sanitize postal code
   * Only allow alphanumeric characters, hyphens, and spaces
   */
  private sanitizePostalCode(postal?: string): string | undefined {
    if (!postal) return undefined;
    return postal.replace(/[^a-zA-Z0-9\-\s]/g, '').trim().slice(0, 20);
  }
}
