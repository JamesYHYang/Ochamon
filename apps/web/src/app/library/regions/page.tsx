'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { libraryApi, type LibraryRegion } from '@/lib/api';

export default function RegionsPage() {
  const [regions, setRegions] = useState<LibraryRegion[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      libraryApi.getRegions(true),
      libraryApi.getCountries(),
    ])
      .then(([regs, ctrs]) => {
        setRegions(regs);
        setCountries(ctrs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredRegions = selectedCountry
    ? regions.filter((r) => r.country === selectedCountry)
    : regions;

  const groupedByCountry = filteredRegions.reduce((acc, region) => {
    if (!acc[region.country]) {
      acc[region.country] = [];
    }
    acc[region.country].push(region);
    return acc;
  }, {} as Record<string, LibraryRegion[]>);

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
            <Button variant="default">Regions</Button>
          </Link>
          <Link href="/library/grades">
            <Button variant="outline">Grades</Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Matcha Growing Regions</h1>
          <p className="text-gray-600 mt-2">
            Explore the famous tea-growing regions of Japan and their unique characteristics
          </p>
        </div>

        {/* Country Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Filter by Country</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCountry === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCountry(null)}
            >
              All Countries
            </Button>
            {countries.map((country) => (
              <Button
                key={country}
                variant={selectedCountry === country ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCountry(country)}
              >
                {country}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          Object.entries(groupedByCountry).map(([country, countryRegions]) => (
            <div key={country} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">
                  {country === 'Japan' ? '🇯🇵' : country === 'China' ? '🇨🇳' : '🌍'}
                </span>
                {country}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {countryRegions.map((region) => (
                  <Card key={region.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{region.name}</span>
                        {region._count && (
                          <span className="text-sm font-normal text-gray-500">
                            {region._count.products} products
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        {region.description || 'A renowned tea-growing region known for its high-quality matcha production.'}
                      </p>
                      <Link href={`/marketplace?regionId=${region.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Products from {region.name}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {!loading && filteredRegions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No regions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
