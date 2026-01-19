'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  SearchHeader,
  FilterSidebar,
  ResultsContainer,
  type Filters,
} from '@/components/search';
import { useAISearch, useSearchFilterOptions } from '@/hooks/useSearch';
import { useAddToCart } from '@/hooks/useCart';
import type { SearchResponse } from '@matcha/shared';

const INITIAL_FILTERS: Filters = {
  grades: [],
  origins: [],
  certifications: [],
  moqMin: undefined,
  moqMax: undefined,
  leadTimeMin: undefined,
  leadTimeMax: undefined,
  priceMin: undefined,
  priceMax: undefined,
};

export default function BuyerSearchPage() {
  const router = useRouter();
  const [currentQuery, setCurrentQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // API hooks
  const { data: filterOptions, isLoading: filtersLoading } = useSearchFilterOptions();
  const searchMutation = useAISearch();
  const addToCartMutation = useAddToCart();

  const handleSearch = useCallback(
    async (query: string) => {
      setCurrentQuery(query);
      setHasSearched(true);

      try {
        const result = await searchMutation.mutateAsync({
          query,
          filters: {
            grades: filters.grades.length > 0 ? filters.grades : undefined,
            origins: filters.origins.length > 0 ? filters.origins : undefined,
            certifications:
              filters.certifications.length > 0 ? filters.certifications : undefined,
            moqMin: filters.moqMin,
            moqMax: filters.moqMax,
            leadTimeMin: filters.leadTimeMin,
            leadTimeMax: filters.leadTimeMax,
            priceMin: filters.priceMin,
            priceMax: filters.priceMax,
          },
          page: 1,
          limit: 20,
        });
        setSearchResults(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('429') || error.message.includes('Too many')) {
            toast.error('Too many requests. Please wait a moment and try again.');
          } else {
            toast.error(error.message || 'Search failed. Please try again.');
          }
        }
      }
    },
    [filters, searchMutation],
  );

  const handleFiltersChange = useCallback(
    (newFilters: Filters) => {
      setFilters(newFilters);
      // Re-run search with new filters if we have a query
      if (currentQuery) {
        handleSearch(currentQuery);
      }
    },
    [currentQuery, handleSearch],
  );

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    if (currentQuery) {
      handleSearch(currentQuery);
    }
  }, [currentQuery, handleSearch]);

  const handleAddToCart = useCallback(
    async (skuId: string) => {
      try {
        await addToCartMutation.mutateAsync({
          skuId,
          qty: 1,
          unit: 'unit',
        });
        toast.success('Added to cart');
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message || 'Failed to add to cart');
        }
      }
    },
    [addToCartMutation],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Search</h1>
        <p className="text-gray-600 mt-1">
          Find the perfect matcha using natural language
        </p>
      </div>

      {/* Search Header */}
      <SearchHeader
        onSearch={handleSearch}
        isLoading={searchMutation.isPending}
        initialQuery={currentQuery}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <FilterSidebar
            options={filterOptions ?? null}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            isLoading={filtersLoading}
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <ResultsContainer
            results={searchResults?.results ?? []}
            isLoading={searchMutation.isPending}
            hasSearched={hasSearched}
            executionTime={searchResults?.executionTime}
            suggestion={searchResults?.suggestion}
            parsedQuery={searchResults?.parsedQuery}
            total={searchResults?.total}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>
    </div>
  );
}
