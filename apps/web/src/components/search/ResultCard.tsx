'use client';

import { useState } from 'react';
import { MapPin, Clock, Package, Award, HelpCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SearchResult } from '@matcha/shared';

interface ResultCardProps {
  result: SearchResult;
  onExplain: () => void;
  onAddToCart?: () => void;
}

export function ResultCard({ result, onExplain, onAddToCart }: ResultCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{result.productName}</h3>
          <p className="text-sm text-gray-600">{result.sellerName}</p>
        </div>
        {result.price !== null && (
          <div className="text-right">
            <p className="text-lg font-bold text-green-600">
              ${result.price.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">per unit</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>{result.origin}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Award className="h-4 w-4 text-gray-400" />
          <span>{result.grade}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Package className="h-4 w-4 text-gray-400" />
          <span>MOQ: {result.moq}kg</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>Lead: {result.leadTimeDays} days</span>
        </div>
      </div>

      {result.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {result.certifications.map((cert) => (
            <span
              key={cert}
              className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full"
            >
              {cert}
            </span>
          ))}
        </div>
      )}

      {result.reasons.length > 0 && (
        <div className="flex items-center gap-1 mb-3">
          <span className="text-xs text-gray-500">
            {result.reasons.length} matching criteria
          </span>
          <div className="flex gap-1">
            {result.reasons.slice(0, 3).map((reason, idx) => (
              <span
                key={idx}
                className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded"
              >
                {reason.field}
              </span>
            ))}
            {result.reasons.length > 3 && (
              <span className="text-xs text-gray-400">
                +{result.reasons.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExplain}
          className="flex-1"
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          Why matched?
        </Button>
        {onAddToCart && (
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={onAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to Cart
          </Button>
        )}
      </div>
    </div>
  );
}
