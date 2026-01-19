'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { libraryApi, type LibraryGradeType } from '@/lib/api';

// Grade color mapping for visual distinction
const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CEREMONIAL: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PREMIUM: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  CULINARY: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  COOKING: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
};

const getGradeColor = (code: string) => {
  const normalized = code.toUpperCase();
  return GRADE_COLORS[normalized] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
};

export default function GradesPage() {
  const [gradeTypes, setGradeTypes] = useState<LibraryGradeType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    libraryApi
      .getGradeTypes(true)
      .then(setGradeTypes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-700">🍵 Matcha Trade</Link>
          <nav className="flex items-center gap-6">
            <Link href="/marketplace" className="text-gray-600 hover:text-green-700">Marketplace</Link>
            <Link href="/insights" className="text-gray-600 hover:text-green-700">Insights</Link>
            <Link href="/trends" className="text-gray-600 hover:text-green-700">Trends</Link>
            <Link href="/library/regions" className="text-green-700 font-medium">Library</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login"><Button variant="outline">Sign In</Button></Link>
            <Link href="/register"><Button>Get Started</Button></Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Library Navigation */}
        <div className="flex gap-4 mb-8">
          <Link href="/library/regions">
            <Button variant="outline">Regions</Button>
          </Link>
          <Link href="/library/grades">
            <Button variant="default">Grades</Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Matcha Grades</h1>
          <p className="text-gray-600 mt-2">
            Understanding the different quality grades of matcha and their ideal uses
          </p>
        </div>

        {/* Grade Guide */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Understanding Matcha Grades</h2>
          <p className="text-gray-600 mb-4">
            Matcha is graded based on the quality of leaves used, harvesting time, processing methods,
            and final characteristics such as color, aroma, and taste. Higher grades use younger leaves
            from the first harvest, which are shade-grown for longer periods.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>Color:</strong> Vibrant green indicates higher quality</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>Texture:</strong> Finer powder = better quality</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>Umami:</strong> Sweet, savory notes in premium grades</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span><strong>Harvest:</strong> First harvest yields the highest quality</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gradeTypes.map((grade, index) => {
              const colors = getGradeColor(grade.code);
              return (
                <Card
                  key={grade.id}
                  className={`${colors.bg} ${colors.border} border-2 hover:shadow-lg transition-shadow`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className={`${colors.text} flex items-center gap-2`}>
                        <span className="text-2xl">
                          {index === 0 ? '👑' : index === 1 ? '⭐' : index === 2 ? '🍵' : '🥄'}
                        </span>
                        {grade.name}
                      </CardTitle>
                      <span className={`px-2 py-1 ${colors.bg} ${colors.text} text-xs font-mono rounded`}>
                        {grade.code}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">
                      {grade.description || getDefaultDescription(grade.code)}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Quality Rank</span>
                        <span className="font-medium">#{index + 1}</span>
                      </div>
                      {grade._count && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Available Products</span>
                          <span className="font-medium">{grade._count.products}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Ideal Uses:</h4>
                      <div className="flex flex-wrap gap-2">
                        {getIdealUses(grade.code).map((use) => (
                          <span
                            key={use}
                            className="px-2 py-1 bg-white text-gray-600 text-xs rounded-full"
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Link href={`/marketplace?gradeTypeId=${grade.id}`}>
                      <Button variant="outline" size="sm" className="w-full mt-4">
                        Browse {grade.name} Products
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && gradeTypes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No grade types found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getDefaultDescription(code: string): string {
  const descriptions: Record<string, string> = {
    CEREMONIAL: 'The highest quality matcha, made from the youngest tea leaves with all stems and veins removed. Perfect for traditional tea ceremonies and drinking straight.',
    PREMIUM: 'High-quality matcha suitable for daily drinking. Vibrant color and smooth taste with a good balance of umami and subtle sweetness.',
    CULINARY: 'A versatile grade ideal for cooking and baking. Stronger flavor that holds up well when mixed with other ingredients.',
    COOKING: 'Economical grade designed specifically for recipes. Robust flavor perfect for smoothies, lattes, and baked goods.',
  };
  return descriptions[code.toUpperCase()] || 'A quality grade of Japanese matcha suitable for various applications.';
}

function getIdealUses(code: string): string[] {
  const uses: Record<string, string[]> = {
    CEREMONIAL: ['Tea Ceremony', 'Straight Drinking', 'Premium Lattes'],
    PREMIUM: ['Daily Drinking', 'Lattes', 'Smoothies'],
    CULINARY: ['Baking', 'Cooking', 'Ice Cream'],
    COOKING: ['Smoothies', 'Lattes', 'Desserts', 'Sauces'],
  };
  return uses[code.toUpperCase()] || ['General Use'];
}
