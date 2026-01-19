'use client';

import { useState, useEffect } from 'react';
import {
  type ShippingEstimateFormState,
  DEFAULT_SHIPPING_FORM,
  SERVICE_LEVEL_LABELS,
} from '@/hooks/useLogistics';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ShippingEstimateFormProps {
  initialValues?: Partial<ShippingEstimateFormState>;
  onSubmit: (values: ShippingEstimateFormState) => void;
  isLoading?: boolean;
  showOrigin?: boolean;
  destinationReadonly?: boolean;
}

/**
 * Common country options for shipping
 */
const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'AE', name: 'United Arab Emirates' },
];

export function ShippingEstimateForm({
  initialValues,
  onSubmit,
  isLoading,
  showOrigin = true,
  destinationReadonly = false,
}: ShippingEstimateFormProps) {
  const [values, setValues] = useState<ShippingEstimateFormState>({
    ...DEFAULT_SHIPPING_FORM,
    ...initialValues,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      setValues((prev) => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  const handleChange = (
    field: keyof ShippingEstimateFormState,
    value: string | number,
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Service Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Service Level
        </label>
        <select
          value={values.serviceLevel}
          onChange={(e) => handleChange('serviceLevel', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          {Object.entries(SERVICE_LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Destination Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destination Country
        </label>
        <select
          value={values.destinationCountry}
          onChange={(e) => handleChange('destinationCountry', e.target.value)}
          disabled={destinationReadonly}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
        >
          {COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Destination Postal (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destination Postal Code
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </label>
        <input
          type="text"
          value={values.destinationPostal}
          onChange={(e) => handleChange('destinationPostal', e.target.value)}
          placeholder="e.g., 10001"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
      </button>

      {showAdvanced && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {/* Origin Country */}
          {showOrigin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origin Country
              </label>
              <select
                value={values.originCountry}
                onChange={(e) => handleChange('originCountry', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Origin Postal */}
          {showOrigin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origin Postal Code
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={values.originPostal}
                onChange={(e) => handleChange('originPostal', e.target.value)}
                placeholder="e.g., 611-0011"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          )}

          {/* Package Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Package Dimensions (cm)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  value={values.length}
                  onChange={(e) => handleChange('length', Number(e.target.value))}
                  min={1}
                  placeholder="L"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <span className="text-xs text-gray-500 mt-0.5 block">Length</span>
              </div>
              <div>
                <input
                  type="number"
                  value={values.width}
                  onChange={(e) => handleChange('width', Number(e.target.value))}
                  min={1}
                  placeholder="W"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <span className="text-xs text-gray-500 mt-0.5 block">Width</span>
              </div>
              <div>
                <input
                  type="number"
                  value={values.height}
                  onChange={(e) => handleChange('height', Number(e.target.value))}
                  min={1}
                  placeholder="H"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <span className="text-xs text-gray-500 mt-0.5 block">Height</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Calculate Shipping
          </>
        )}
      </button>
    </form>
  );
}
