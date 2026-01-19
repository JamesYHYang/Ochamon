'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { SearchResponse, SearchInput } from '@matcha/shared';

const SEARCH_QUERY_KEY = ['search'];
const FILTER_OPTIONS_KEY = ['search', 'filters'];

// Types for filter options
interface FilterOptions {
  grades: Array<{ code: string; name: string }>;
  regions: Array<{ name: string; country: string }>;
  certifications: string[];
  moqRange: { min: number; max: number };
  leadTimeRange: { min: number; max: number };
  priceRange: { min: number; max: number };
}

/**
 * Hook to perform AI-powered search
 */
export function useAISearch() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SearchInput): Promise<SearchResponse> => {
      if (!accessToken) throw new Error('Not authenticated');
      return api<SearchResponse>('/search/ai', {
        method: 'POST',
        body: input,
        token: accessToken,
      });
    },
    onSuccess: (data, variables) => {
      // Cache the search results
      queryClient.setQueryData([...SEARCH_QUERY_KEY, variables.query], data);
    },
  });
}

/**
 * Hook to fetch search filter options
 */
export function useSearchFilterOptions() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const isBuyer = user?.role === 'BUYER';

  return useQuery({
    queryKey: FILTER_OPTIONS_KEY,
    queryFn: async (): Promise<FilterOptions> => {
      if (!accessToken) throw new Error('Not authenticated');
      return api<FilterOptions>('/search/filters', {
        method: 'GET',
        token: accessToken,
      });
    },
    enabled: isAuthenticated && isBuyer && !!accessToken,
    staleTime: 1000 * 60 * 30, // 30 minutes - filter options don't change often
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to get cached search results
 */
export function useCachedSearch(query: string) {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<SearchResponse>([...SEARCH_QUERY_KEY, query]);
}

/**
 * Invalidate search cache
 */
export function useInvalidateSearch() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SEARCH_QUERY_KEY });
}
