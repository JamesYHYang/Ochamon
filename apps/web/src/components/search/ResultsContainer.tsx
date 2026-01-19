'use client';

import { useState } from 'react';
import { Search, Package, AlertCircle, Lightbulb } from 'lucide-react';
import { ResultCard } from './ResultCard';
import { ExplanationDrawer } from './ExplanationDrawer';
import type { SearchResult, ParsedQuery } from '@matcha/shared';

interface ResultsContainerProps {
  results: SearchResult[];
  isLoading: boolean;
  hasSearched: boolean;
  executionTime?: number;
  suggestion?: string | null;
  parsedQuery?: ParsedQuery;
  total?: number;
  onAddToCart?: (skuId: string) => void;
}

export function ResultsContainer({
  results,
  isLoading,
  hasSearched,
  executionTime,
  suggestion,
  parsedQuery,
  total,
  onAddToCart,
}: ResultsContainerProps) {
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleExplain = (result: SearchResult) => {
    setSelectedResult(result);
    setDrawerOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border p-4 animate-pulse"
          >
            <div className="flex justify-between mb-3">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 bg-gray-200 rounded" />
              ))}
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded flex-1" />
              <div className="h-8 bg-gray-200 rounded flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state - before first search
  if (!hasSearched) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Start Your Search
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Use natural language to describe what you&apos;re looking for. Our AI will
          find matching products and explain why each result was selected.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Example searches:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>&quot;organic uji ceremonial moq under 20kg&quot;</li>
            <li>&quot;premium matcha for cafe, quick delivery&quot;</li>
            <li>&quot;JAS certified culinary grade ship to Singapore&quot;</li>
            <li>&quot;barista blend under $60 per kg&quot;</li>
          </ul>
        </div>
      </div>
    );
  }

  // No results
  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Products Found
        </h3>
        <p className="text-gray-600 mb-4">
          We couldn&apos;t find any products matching your criteria.
        </p>

        {suggestion && (
          <div className="bg-yellow-50 rounded-lg p-4 mb-4 text-left inline-block">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Suggestion:</p>
                <p className="text-sm text-yellow-700">{suggestion}</p>
              </div>
            </div>
          </div>
        )}

        {parsedQuery && (
          <div className="mt-4 text-left max-w-md mx-auto">
            <p className="text-xs text-gray-500 mb-2">We understood your query as:</p>
            <div className="flex flex-wrap gap-1">
              {parsedQuery.regions.length > 0 && (
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                  Region: {parsedQuery.regions.join(', ')}
                </span>
              )}
              {parsedQuery.grades.length > 0 && (
                <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">
                  Grade: {parsedQuery.grades.join(', ')}
                </span>
              )}
              {parsedQuery.certifications.length > 0 && (
                <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                  Cert: {parsedQuery.certifications.join(', ')}
                </span>
              )}
              {parsedQuery.moqMax !== null && (
                <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">
                  MOQ ≤ {parsedQuery.moqMax}kg
                </span>
              )}
              {parsedQuery.leadTimeMax !== null && (
                <span className="text-xs px-2 py-1 bg-cyan-50 text-cyan-700 rounded">
                  Lead ≤ {parsedQuery.leadTimeMax}d
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Results list
  return (
    <>
      {/* Results header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600">
            Found <span className="font-medium text-gray-900">{total ?? results.length}</span> products
            {executionTime !== undefined && (
              <span className="text-gray-400"> in {executionTime}ms</span>
            )}
          </p>
        </div>
        {parsedQuery && (parsedQuery.regions.length > 0 || parsedQuery.grades.length > 0 || parsedQuery.certifications.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {parsedQuery.regions.map((r) => (
              <span key={r} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                {r}
              </span>
            ))}
            {parsedQuery.grades.map((g) => (
              <span key={g} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                {g}
              </span>
            ))}
            {parsedQuery.certifications.slice(0, 2).map((c) => (
              <span key={c} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {results.map((result) => (
          <ResultCard
            key={result.skuId}
            result={result}
            onExplain={() => handleExplain(result)}
            onAddToCart={onAddToCart ? () => onAddToCart(result.skuId) : undefined}
          />
        ))}
      </div>

      {/* Explanation drawer */}
      <ExplanationDrawer
        result={selectedResult}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
