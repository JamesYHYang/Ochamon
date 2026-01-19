'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { insightsApi, type InsightsPost, type Category, type Tag } from '@/lib/api';

export default function InsightsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [insights, setInsights] = useState<InsightsPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, skip: 0, take: 10, totalPages: 0 });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('categoryId') || '',
    tag: searchParams.get('tag') || '',
    page: parseInt(searchParams.get('page') || '1'),
  });

  useEffect(() => {
    Promise.all([
      insightsApi.getCategories(),
      insightsApi.getTags(),
    ])
      .then(([cats, tgs]) => {
        setCategories(cats);
        setTags(tgs);
      })
      .catch(console.error);
  }, []);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (filters.page - 1) * 10;
      const result = await insightsApi.getInsights({
        skip,
        take: 10,
        categoryId: filters.categoryId || undefined,
        tag: filters.tag || undefined,
        search: filters.search || undefined,
      });
      setInsights(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters, page: 1 };
    setFilters(updated);

    const params = new URLSearchParams();
    if (updated.search) params.set('search', updated.search);
    if (updated.categoryId) params.set('categoryId', updated.categoryId);
    if (updated.tag) params.set('tag', updated.tag);
    if (updated.page > 1) params.set('page', updated.page.toString());
    router.push(`/insights${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const setPage = (page: number) => {
    const updated = { ...filters, page };
    setFilters(updated);

    const params = new URLSearchParams();
    if (updated.search) params.set('search', updated.search);
    if (updated.categoryId) params.set('categoryId', updated.categoryId);
    if (updated.tag) params.set('tag', updated.tag);
    if (page > 1) params.set('page', page.toString());
    router.push(`/insights${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const clearFilters = () => {
    setFilters({ search: '', categoryId: '', tag: '', page: 1 });
    router.push('/insights');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const activeFilterCount = [filters.search, filters.categoryId, filters.tag].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-700">🍵 Matcha Trade</Link>
          <nav className="flex items-center gap-6">
            <Link href="/marketplace" className="text-gray-600 hover:text-green-700">Marketplace</Link>
            <Link href="/insights" className="text-green-700 font-medium">Insights</Link>
            <Link href="/trends" className="text-gray-600 hover:text-green-700">Trends</Link>
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
          <h1 className="text-4xl font-bold text-gray-900">Matcha Insights</h1>
          <p className="text-gray-600 mt-2">Industry news, guides, and expert knowledge about Japanese matcha</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search articles..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />
            </div>

            <Select value={filters.categoryId || 'all'} onValueChange={(v) => updateFilters({ categoryId: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tag || 'all'} onValueChange={(v) => updateFilters({ tag: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All tags" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.slug}>{tag.name}</SelectItem>
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

        {/* Results */}
        <div className="mb-4 text-gray-600">
          {loading ? 'Loading...' : `${meta.total} articles found`}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No articles found</p>
            <p className="text-gray-400 mt-2">Try adjusting your filters</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear all filters</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {insights.map((post) => (
                <Link key={post.id} href={`/insights/${post.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                    <div className="h-48 bg-gradient-to-br from-green-100 to-green-200 rounded-t-lg flex items-center justify-center overflow-hidden">
                      {post.featuredImage ? (
                        <img src={post.featuredImage} alt={post.title} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-6xl">📝</span>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1">
                      {post.category && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full mb-2 inline-block">
                          {post.category.name}
                        </span>
                      )}
                      <h3 className="font-semibold text-lg line-clamp-2 mb-2">{post.title}</h3>
                      <p className="text-gray-600 text-sm line-clamp-3">{post.excerpt || 'Read more...'}</p>
                    </CardContent>
                    <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between text-sm text-gray-500">
                      <span>{formatDate(post.publishedAt)}</span>
                      <span>{post.viewCount} views</span>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={filters.page <= 1}
                  onClick={() => setPage(filters.page - 1)}
                >
                  Previous
                </Button>
                <span className="px-4 text-gray-600">
                  Page {filters.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={filters.page >= meta.totalPages}
                  onClick={() => setPage(filters.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
