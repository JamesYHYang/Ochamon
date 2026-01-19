'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type {
  EstimateRequestInput,
  EstimateRfqRequestInput,
  EstimateResponse,
} from '@matcha/shared';

/**
 * Hook to get shipping estimates for a shipment
 */
export function useShippingEstimate() {
  const { accessToken } = useAuth();

  return useMutation({
    mutationFn: async (input: EstimateRequestInput): Promise<EstimateResponse> => {
      if (!accessToken) throw new Error('Not authenticated');
      return api<EstimateResponse>('/logistics/estimate', {
        method: 'POST',
        body: input,
        token: accessToken,
      });
    },
  });
}

/**
 * Hook to get shipping estimates for an RFQ
 * Automatically calculates weight from RFQ line items
 */
export function useRfqShippingEstimate() {
  const { accessToken } = useAuth();

  return useMutation({
    mutationFn: async (input: EstimateRfqRequestInput): Promise<EstimateResponse> => {
      if (!accessToken) throw new Error('Not authenticated');
      return api<EstimateResponse>('/logistics/estimate-rfq', {
        method: 'POST',
        body: input,
        token: accessToken,
      });
    },
  });
}

/**
 * Utility type for shipping estimate form state
 */
export interface ShippingEstimateFormState {
  originCountry: string;
  originPostal: string;
  destinationCountry: string;
  destinationPostal: string;
  length: number;
  width: number;
  height: number;
  serviceLevel: 'economy' | 'standard' | 'express' | 'overnight';
}

/**
 * Default form values for shipping estimate
 */
export const DEFAULT_SHIPPING_FORM: ShippingEstimateFormState = {
  originCountry: 'JP',
  originPostal: '',
  destinationCountry: 'US',
  destinationPostal: '',
  length: 30,
  width: 20,
  height: 15,
  serviceLevel: 'standard',
};

/**
 * Service level display labels
 */
export const SERVICE_LEVEL_LABELS: Record<ShippingEstimateFormState['serviceLevel'], string> = {
  economy: 'Economy (7-21 days)',
  standard: 'Standard (5-10 days)',
  express: 'Express (2-5 days)',
  overnight: 'Overnight (1-3 days)',
};

/**
 * Format currency for display
 */
export function formatShippingCost(min: number, max: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (min === max) {
    return formatter.format(min);
  }

  return `${formatter.format(min)} - ${formatter.format(max)}`;
}

/**
 * Format ETA days for display
 */
export function formatEtaDays(min: number, max: number): string {
  if (min === max) {
    return `${min} day${min === 1 ? '' : 's'}`;
  }
  return `${min}-${max} days`;
}
