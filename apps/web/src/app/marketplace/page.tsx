'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  leadTimeDays: number;
  moqKg: number;
  certifications: string[];
  region: { id: string; name: string; country: string };
  gradeType: { id: string; name: string; code: string };
  seller: { companyName: string; isVerified: boolean };
  primaryImage: string | null;
  startingPrice: number | null;
  skuCount: number;
}

interface FilterOptions {
  regions: { id: string; name: string; country: string }[];
  grades: { id: string; name: string; code: string }[];
  certifications: string[];
  priceRange: { min: number; max: number };
}

export default function MarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    regionId: searchParams.get('regionId') || '',
    gradeTypeId: searchParams.get('gradeTypeId') || '',
    certification: searchParams.get('certification') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    moqMax: searchParams.get('moqMax') || '',
    leadTimeMax: searchParams.get('leadTimeMax') || '',
    verifiedOnly: searchParams.get('verifiedOnly') === 'true',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: parseInt(searchParams.get('page') || '1'),
  });

  useEffect(() => {
    fetch(`${API_URL}/products/filters`)
      .then((res) => res.json())
      .then(setFilterOptions)
      .catch(console.error);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.regionId) params.set('regionId', filters.regionId);
      if (filters.gradeTypeId) params.set('gradeTypeId', filters.gradeTypeId);
      if (filters.certification) params.set('certification', filters.certification);
      if (filters.priceMin) params.set('priceMin', filters.priceMin);
      if (filters.priceMax) params.set('priceMax', filters.priceMax);
      if (filters.moqMax) params.set('moqMax', filters.moqMax);
      if (filters.leadTimeMax) params.set('leadTimeMax', filters.leadTimeMax);
      if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      params.set('page', filters.page.toString());
      params.set('limit', '20');

      const res = await fetch(`${API_URL}/products?${params}`);
      const data = await res.json();
      setProducts(data.data || []);
      setMeta(data.meta || { total: 0, page: 1, limit: 20, totalPages: 0 });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters, page: 1 };
    setFilters(updated);

    const params = new URLSearchParams();
    Object.entries(updated).forEach(([key, value]) => {
      if (value && value !== '' && !(key === 'page' && value === 1)) {
        params.set(key, value.toString());
      }
    });
    router.push(`/marketplace?${params.toString()}`, { scroll: false });
  };

  const setPage = (page: number) => {
    const updated = { ...filters, page };
    setFilters(updated);

    const params = new URLSearchParams();
    Object.entries(updated).forEach(([key, value]) => {
      if (value && value !== '' && !(key === 'page' && value === 1)) {
        params.set(key, value.toString());
      }
    });
    router.push(`/marketplace?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    const cleared = {
      q: '', regionId: '', gradeTypeId: '', certification: '',
      priceMin: '', priceMax: '', moqMax: '', leadTimeMax: '',
      verifiedOnly: false, sortBy: 'newest', page: 1,
    };
    setFilters(cleared);
    router.push('/marketplace');
  };

  const activeFilterCount = [
    filters.q, filters.regionId, filters.gradeTypeId, filters.certification,
    filters.priceMin, filters.priceMax, filters.moqMax, filters.leadTimeMax,
    filters.verifiedOnly,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-700">🍵 Matcha Trade</Link>
          <div className="flex items-center gap-4">
            <Link href="/login"><Button variant="outline">Sign In</Button></Link>
            <Link href="/register"><Button>Get Started</Button></Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600 mt-1">Browse premium matcha from verified Japanese suppliers</p>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-72 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-5 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Filters</h2>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear ({activeFilterCount})
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search products..."
                    value={filters.q}
                    onChange={(e) => updateFilters({ q: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Region</Label>
                  <Select value={filters.regionId} onValueChange={(v) => updateFilters({ regionId: v === 'all' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="All regions" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All regions</SelectItem>
                      {filterOptions?.regions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Grade</Label>
                  <Select value={filters.gradeTypeId} onValueChange={(v) => updateFilters({ gradeTypeId: v === 'all' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="All grades" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All grades</SelectItem>
                      {filterOptions?.grades.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Certification</Label>
                  <Select value={filters.certification} onValueChange={(v) => updateFilters({ certification: v === 'all' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Any certification" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any certification</SelectItem>
                      {filterOptions?.certifications.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Price Range (USD/unit)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="number" placeholder="Min" value={filters.priceMin} onChange={(e) => updateFilters({ priceMin: e.target.value })} />
                    <Input type="number" placeholder="Max" value={filters.priceMax} onChange={(e) => updateFilters({ priceMax: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>Max MOQ (kg)</Label>
                  <Input type="number" placeholder="e.g. 50" value={filters.moqMax} onChange={(e) => updateFilters({ moqMax: e.target.value })} />
                </div>

                <div>
                  <Label>Max Lead Time (days)</Label>
                  <Input type="number" placeholder="e.g. 14" value={filters.leadTimeMax} onChange={(e) => updateFilters({ leadTimeMax: e.target.value })} />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="verifiedOnly"
                    checked={filters.verifiedOnly}
                    onChange={(e) => updateFilters({ verifiedOnly: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="verifiedOnly" className="cursor-pointer">Verified sellers only</Label>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {loading ? 'Loading...' : `${meta.total} products found`}
              </p>
              <Select value={filters.sortBy} onValueChange={(v) => updateFilters({ sortBy: v })}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="moq">Lowest MOQ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-lg" />
                    <CardContent className="p-4"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2" /><div className="h-4 bg-gray-200 rounded w-1/2" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No products found</p>
                <p className="text-gray-400 mt-2">Try adjusting your filters</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear all filters</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Link key={product.id} href={`/marketplace/products/${product.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <div className="h-48 bg-gradient-to-br from-green-100 to-green-200 rounded-t-lg flex items-center justify-center">
                          {product.primaryImage ? (
                            <img src={product.primaryImage} alt={product.name} className="h-full w-full object-cover rounded-t-lg" />
                          ) : (
                            <span className="text-6xl">🍵</span>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                            {product.seller.isVerified && <span className="text-blue-500 text-sm" title="Verified Seller">✓</span>}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{product.seller.companyName}</p>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{product.shortDesc || 'Premium Japanese matcha'}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">{product.gradeType.name}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{product.region.name}</span>
                            {product.certifications.slice(0, 2).map((c) => (
                              <span key={c} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">{c}</span>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between">
                          <div>
                            {product.startingPrice !== null ? (
                              <p className="font-semibold text-green-700">From ${product.startingPrice.toFixed(2)}</p>
                            ) : (
                              <p className="text-gray-500 text-sm">Login for pricing</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">MOQ: {product.moqKg}kg</p>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {meta.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button variant="outline" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>Previous</Button>
                    <span className="px-4 text-gray-600">Page {meta.page} of {meta.totalPages}</span>
                    <Button variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>Next</Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
