'use client';

import type { ShippingEstimate } from '@matcha/shared';
import { formatShippingCost, formatEtaDays } from '@/hooks/useLogistics';
import { Truck, Plane, Ship, Package } from 'lucide-react';

interface ShippingEstimateCardProps {
  estimate: ShippingEstimate;
  isSelected?: boolean;
  onSelect?: () => void;
}

/**
 * Get icon for provider
 */
function getProviderIcon(providerId: string, service: string) {
  if (service.toLowerCase().includes('sea') || service.toLowerCase().includes('ocean')) {
    return <Ship className="h-5 w-5" />;
  }
  if (service.toLowerCase().includes('air') || service.toLowerCase().includes('express') || service.toLowerCase().includes('overnight')) {
    return <Plane className="h-5 w-5" />;
  }
  if (providerId === 'freightforwarder') {
    return <Package className="h-5 w-5" />;
  }
  return <Truck className="h-5 w-5" />;
}

/**
 * Get provider brand color
 */
function getProviderColor(providerId: string): string {
  switch (providerId) {
    case 'ups':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'fedex':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'freightforwarder':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function ShippingEstimateCard({
  estimate,
  isSelected,
  onSelect,
}: ShippingEstimateCardProps) {
  const providerColor = getProviderColor(estimate.providerId);

  return (
    <div
      className={`
        relative rounded-lg border p-4 transition-all
        ${isSelected
          ? 'border-green-500 bg-green-50 ring-2 ring-green-500'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${onSelect ? 'cursor-pointer' : ''}
      `}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Provider Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${providerColor}`}>
          {getProviderIcon(estimate.providerId, estimate.service)}
          <span>{estimate.providerName}</span>
        </div>
        {isSelected && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Selected
          </span>
        )}
      </div>

      {/* Service Name */}
      <h4 className="font-medium text-gray-900 mb-2">{estimate.service}</h4>

      {/* Cost & ETA */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">Estimated Cost</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatShippingCost(estimate.costMin, estimate.costMax, estimate.currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Delivery Time</p>
          <p className="text-sm font-medium text-gray-700">
            {formatEtaDays(estimate.etaDaysMin, estimate.etaDaysMax)}
          </p>
        </div>
      </div>

      {/* Notes */}
      {estimate.notes && (
        <p className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
          {estimate.notes}
        </p>
      )}
    </div>
  );
}
