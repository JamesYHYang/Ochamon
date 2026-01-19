'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { insightsApi, type InsightsPost } from '@/lib/api';

export default function InsightDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [insight, setInsight] = useState<InsightsPost & { related: InsightsPost[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    insightsApi
      .getInsightBySlug(slug)
      .then(setInsight)
      .catch((err) => {
        console.error('Error fetching insight:', err);
        setError(err.message || 'Failed to load article');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="h-64 bg-gray-200 rounded mb-8" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !insight) {
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
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-600 mb-8">{error || 'The article you\'re looking for doesn\'t exist.'}</p>
          <Link href="/insights">
            <Button>Back to Insights</Button>
          </Link>
        </div>
      </div>
    );
  }

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

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link href="/insights" className="text-green-700 hover:underline">Insights</Link>
          <span className="mx-2 text-gray-400">/</span>
          {insight.category && (
            <>
              <Link
                href={`/insights?categoryId=${insight.category.id}`}
                className="text-green-700 hover:underline"
              >
                {insight.category.name}
              </Link>
              <span className="mx-2 text-gray-400">/</span>
            </>
          )}
          <span className="text-gray-600">{insight.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          {insight.category && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full mb-4 inline-block">
              {insight.category.name}
            </span>
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{insight.title}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            {insight.author && <span>By {insight.author.name}</span>}
            <span>•</span>
            <span>{formatDate(insight.publishedAt)}</span>
            <span>•</span>
            <span>{insight.viewCount} views</span>
          </div>
        </header>

        {/* Featured Image */}
        {insight.featuredImage && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={insight.featuredImage}
              alt={insight.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Excerpt */}
        {insight.excerpt && (
          <p className="text-xl text-gray-700 mb-8 font-medium leading-relaxed">
            {insight.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: insight.content }}
        />

        {/* Tags */}
        {insight.tags && insight.tags.length > 0 && (
          <div className="mb-12 pt-8 border-t">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {insight.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/insights?tag=${tag.slug}`}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Articles */}
        {insight.related && insight.related.length > 0 && (
          <section className="pt-8 border-t">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {insight.related.map((post) => (
                <Link key={post.id} href={`/insights/${post.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="h-32 bg-gradient-to-br from-green-100 to-green-200 rounded-t-lg flex items-center justify-center overflow-hidden">
                      {post.featuredImage ? (
                        <img src={post.featuredImage} alt={post.title} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-4xl">📝</span>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-2 mb-2">{post.title}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{post.excerpt}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
