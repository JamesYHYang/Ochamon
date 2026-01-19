'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { EstimateResponse, ShippingEstimate } from '@matcha/shared';
import { useRfqShippingEstimate, type ShippingEstimateFormState } from '@/hooks/useLogistics';
import { ShippingEstimateForm } from './ShippingEstimateForm';
import { ShippingEstimateCard } from './ShippingEstimateCard';
import { Package, AlertCircle, Info } from 'lucide-react';

interface ShippingEstimatesSectionProps {
  /** RFQ ID to calculate estimates for */
  rfqId: string;
  /** Default destination country from RFQ */
  destinationCountry?: string;
  /** Callback when an estimate is selected */
  onSelectEstimate?: (estimate: ShippingEstimate) => void;
  /** Currently selected estimate ID */
  selectedEstimateId?: string;
  /** Read-only mode (for order display) */
  readonly?: boolean;
  /** Selected shipping option (for display in readonly mode) */
  selectedShipping?: ShippingEstimate;
}

export function ShippingEstimatesSection({
  rfqId,
  destinationCountry = 'US',
  onSelectEstimate,
  selectedEstimateId,
  readonly = false,
  selectedShipping,
}: ShippingEstimatesSectionProps) {
  const [estimateResponse, setEstimateResponse] = useState<EstimateResponse | null>(null);
  const estimateMutation = useRfqShippingEstimate();

  const handleCalculate = useCallback(
    async (formValues: ShippingEstimateFormState) => {
      try {
        const result = await estimateMutation.mutateAsync({
          rfqId,
          originCountry: formValues.originCountry,
          originPostal: formValues.originPostal || undefined,
          destinationPostal: formValues.destinationPostal || undefined,
          dimensionsCm: {
            length: formValues.length,
            width: formValues.width,
            height: formValues.height,
          },
          serviceLevel: formValues.serviceLevel,
        });
        setEstimateResponse(result);
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message || 'Failed to calculate shipping estimates');
        }
      }
    },
    [rfqId, estimateMutation],
  );

  // Readonly mode - show selected shipping only
  if (readonly && selectedShipping) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          Shipping Method
        </h3>
        <ShippingEstimateCard estimate={selectedShipping} isSelected />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          Shipping Estimates
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Calculate shipping costs based on your order
        </p>
      </div>

      <div className="p-4">
        {/* Estimate Form */}
        <ShippingEstimateForm
          initialValues={{ destinationCountry }}
          onSubmit={handleCalculate}
          isLoading={estimateMutation.isPending}
          showOrigin
          destinationReadonly={false}
        />

        {/* Weight Breakdown Info */}
        {estimateResponse?.calculationDetails.weightBreakdown && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">Weight Calculation</p>
                <p>Items: {estimateResponse.calculationDetails.weightBreakdown.itemsWeightKg.toFixed(3)} kg</p>
                <p>Packing allowance (5%): +{estimateResponse.calculationDetails.weightBreakdown.packingAllowanceKg.toFixed(3)} kg</p>
                <p className="font-medium mt-1">
                  Total: {estimateResponse.calculationDetails.weightBreakdown.totalWeightKg.toFixed(3)} kg
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {estimateMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div className="text-xs text-red-700">
              <p className="font-medium">Failed to calculate estimates</p>
              <p>{estimateMutation.error?.message || 'Please try again'}</p>
            </div>
          </div>
        )}

        {/* Estimates List */}
        {estimateResponse && estimateResponse.estimates.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Available Options ({estimateResponse.estimates.length})
            </h4>
            <div className="space-y-3">
              {estimateResponse.estimates.map((estimate, index) => (
                <ShippingEstimateCard
                  key={`${estimate.providerId}-${estimate.service}-${index}`}
                  estimate={estimate}
                  isSelected={
                    selectedEstimateId === `${estimate.providerId}-${estimate.service}`
                  }
                  onSelect={
                    onSelectEstimate
                      ? () => onSelectEstimate(estimate)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {estimateResponse && estimateResponse.estimates.length === 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
            <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No shipping options available for this route</p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting the destination or service level
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
