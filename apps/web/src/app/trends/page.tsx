'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trendsApi, libraryApi, type TrendSeries, type LibraryRegion } from '@/lib/api';
import { TrendChart } from '@/components/trends/TrendChart';

const TREND_TYPE_LABELS: Record<string, string> = {
  PRICING: 'Pricing',
  WEATHER: 'Weather',
  DEMAND: 'Demand',
  SUPPLY: 'Supply',
};

const TREND_TYPE_COLORS: Record<string, string> = {
  PRICING: 'text-green-600',
  WEATHER: 'text-blue-600',
  DEMAND: 'text-purple-600',
  SUPPLY: 'text-orange-600',
};

const TREND_TYPE_ICONS: Record<string, string> = {
  PRICING: '💰',
  WEATHER: '☀️',
  DEMAND: '📈',
  SUPPLY: '📦',
};

export default function TrendsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [trendSeries, setTrendSeries] = useState<TrendSeries[]>([]);
  const [regions, setRegions] = useState<LibraryRegion[]>([]);
  const [trendTypes, setTrendTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<(TrendSeries & { dataPoints: any[] }) | null>(null);
  const [meta, setMeta] = useState({ total: 0, skip: 0, take: 20, totalPages: 0 });

  const [filters, setFilters] = useState<{
    type: 'PRICING' | 'WEATHER' | 'DEMAND' | 'SUPPLY' | '';
    regionId: string;
    page: number;
  }>({
    type: (searchParams.get('type') as 'PRICING' | 'WEATHER' | 'DEMAND' | 'SUPPLY') || '',
    regionId: searchParams.get('regionId') || '',
    page: parseInt(searchParams.get('page') || '1'),
  });

  useEffect(() => {
    Promise.all([
      libraryApi.getRegions(),
      trendsApi.getTrendTypes(),
    ])
      .then(([regs, types]) => {
        setRegions(regs);
        setTrendTypes(types);
      })
      .catch(console.error);
  }, []);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (filters.page - 1) * 20;
      const result = await trendsApi.getTrendSeries({
        skip,
        take: 20,
        type: filters.type as any || undefined,
        regionId: filters.regionId || undefined,
      });
      setTrendSeries(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters, page: 1 };
    setFilters(updated);

    const params = new URLSearchParams();
    if (updated.type) params.set('type', updated.type);
    if (updated.regionId) params.set('regionId', updated.regionId);
    if (updated.page > 1) params.set('page', updated.page.toString());
    router.push(`/trends${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const loadSeriesData = async (series: TrendSeries) => {
    try {
      // Get last 90 days of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const data = await trendsApi.getTrendSeriesById(series.id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setSelectedSeries(data);
    } catch (error) {
      console.error('Error loading series data:', error);
    }
  };

  const clearFilters = () => {
    setFilters({ type: '', regionId: '', page: 1 });
    router.push('/trends');
  };

  const activeFilterCount = [filters.type, filters.regionId].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-700">🍵 Matcha Trade</Link>
          <nav className="flex items-center gap-6">
            <Link href="/marketplace" className="text-gray-600 hover:text-green-700">Marketplace</Link>
            <Link href="/insights" className="text-gray-600 hover:text-green-700">Insights</Link>
            <Link href="/trends" className="text-green-700 font-medium">Trends</Link>
            <Link href="/library/regions" className="text-gray-600 hover:text-green-700">Library</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login"><Button variant="outline">Sign In</Button></Link>
            <Link href="/register"><Button>Get Started</Button></Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Market Trends</h1>
          <p className="text-gray-600 mt-2">Track matcha pricing, weather, supply, and demand trends</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={filters.type || 'all'} onValueChange={(v) => updateFilters({ type: v === 'all' ? '' : v as any })}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {trendTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TREND_TYPE_ICONS[type]} {TREND_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.regionId || 'all'} onValueChange={(v) => updateFilters({ regionId: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All regions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>

        {/* Selected Series Chart */}
        {selectedSeries && (
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedSeries.name}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedSeries.description || 'No description available'}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedSeries(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <TrendChart
                  data={selectedSeries.dataPoints}
                  unit={selectedSeries.unit}
                  type={selectedSeries.type}
                />
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                <span>
                  <strong>Type:</strong> {TREND_TYPE_LABELS[selectedSeries.type] || selectedSeries.type}
                </span>
                <span>
                  <strong>Unit:</strong> {selectedSeries.unit}
                </span>
                {selectedSeries.region && (
                  <span>
                    <strong>Region:</strong> {selectedSeries.region.name}, {selectedSeries.region.country}
                  </span>
                )}
                <span>
                  <strong>Data points:</strong> {selectedSeries.dataPoints?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="mb-4 text-gray-600">
          {loading ? 'Loading...' : `${meta.total} trend series found`}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : trendSeries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No trend data found</p>
            <p className="text-gray-400 mt-2">Try adjusting your filters</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear all filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendSeries.map((series) => (
              <Card
                key={series.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => loadSeriesData(series)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{TREND_TYPE_ICONS[series.type]}</span>
                    <span className={`text-sm font-medium ${TREND_TYPE_COLORS[series.type]}`}>
                      {TREND_TYPE_LABELS[series.type] || series.type}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{series.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {series.description || 'Click to view trend data'}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Unit: {series.unit}</span>
                    {series.region && (
                      <span>{series.region.name}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={filters.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              Previous
            </Button>
            <span className="px-4 text-gray-600">
              Page {filters.page} of {meta.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={filters.page >= meta.totalPages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
