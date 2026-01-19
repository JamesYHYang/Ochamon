'use client';

import { X, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SearchResult, Reason } from '@matcha/shared';

interface ExplanationDrawerProps {
  result: SearchResult | null;
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  origin: 'Origin/Region',
  grade: 'Grade',
  certification: 'Certification',
  moq: 'MOQ',
  leadTimeDays: 'Lead Time',
  price: 'Price',
  productName: 'Product Name',
};

const MATCH_RULE_LABELS: Record<string, string> = {
  exact_match: 'exact match',
  range_contains: 'within range',
  substring_match: 'keyword match',
  array_contains: 'has certification',
  less_than_or_equal: 'meets requirement',
  greater_than_or_equal: 'meets minimum',
};

function formatReasonValue(reason: Reason): string {
  const value = reason.matchedValue;
  if (typeof value === 'number') {
    if (reason.field === 'price') {
      return `$${value.toFixed(2)}`;
    }
    if (reason.field === 'moq') {
      return `${value}kg`;
    }
    if (reason.field === 'leadTimeDays') {
      return `${value} days`;
    }
    return String(value);
  }
  return String(value);
}

function formatReasonExplanation(reason: Reason): string {
  const fieldLabel = FIELD_LABELS[reason.field] || reason.field;
  const value = formatReasonValue(reason);
  const rule = MATCH_RULE_LABELS[reason.matchRule] || reason.matchRule;

  switch (reason.matchRule) {
    case 'exact_match':
      return `${fieldLabel} is "${value}" (you asked for this)`;
    case 'array_contains':
      return `Has "${value}" certification (you requested this)`;
    case 'less_than_or_equal':
      if (reason.field === 'moq') {
        return `MOQ of ${value} is within your quantity needs`;
      }
      if (reason.field === 'leadTimeDays') {
        return `Lead time of ${value} meets your timeline`;
      }
      return `${fieldLabel} of ${value} (${rule})`;
    case 'substring_match':
      return `Product name contains "${value}"`;
    case 'range_contains':
      return `${fieldLabel} of ${value} is in your preferred range`;
    default:
      return `${fieldLabel}: ${value} (${rule})`;
  }
}

export function ExplanationDrawer({
  result,
  isOpen,
  onClose,
}: ExplanationDrawerProps) {
  if (!isOpen || !result) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Why This Matched</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900">{result.productName}</h3>
            <p className="text-sm text-gray-600">{result.sellerName}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 bg-white rounded border">
                {result.origin}
              </span>
              <span className="px-2 py-0.5 bg-white rounded border">
                {result.grade}
              </span>
              <span className="px-2 py-0.5 bg-white rounded border">
                MOQ: {result.moq}kg
              </span>
            </div>
          </div>

          {/* Reasons */}
          {result.reasons.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Matched because:
              </h4>
              <ul className="space-y-2">
                {result.reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-green-50 rounded-lg"
                  >
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-800">
                        {formatReasonExplanation(reason)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Field: {reason.field} | Rule: {reason.matchRule}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-8">
              <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                This product was included in results but didn&apos;t match specific
                search criteria. It may have been returned based on general
                relevance.
              </p>
            </div>
          )}

          {/* Note about data */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <p className="font-medium mb-1">About this explanation:</p>
            <p>
              Only attributes that actually exist in our database are shown.
              If you asked for something we don&apos;t track (e.g., specific flavor
              notes), we won&apos;t claim a match. Ask us if you need more detailed
              product information.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
