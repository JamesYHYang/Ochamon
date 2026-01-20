'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  leadTimeDays: number;
  moqKg: number;
  certifications: string[];
  status: string;
  isFeatured: boolean;
  region?: {
    id: string;
    name: string;
    country: string;
  };
  gradeType?: {
    id: string;
    name: string;
    code: string;
  };
  seller?: {
    id: string;
    company?: {
      name: string;
    };
  };
  images?: {
    id: string;
    url: string;
    isPrimary: boolean;
  }[];
  skus?: {
    id: string;
    sku: string;
    name: string;
    priceTiers?: {
      minQty: number;
      pricePerUnit: number;
    }[];
  }[];
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const tokensStr = localStorage.getItem('matcha_tokens');
        const headers: Record<string, string> = {};
        
        if (tokensStr) {
          const tokens = JSON.parse(tokensStr);
          if (tokens.accessToken) {
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
          }
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
          headers,
        });

        if (!res.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await res.json();
        setProducts(Array.isArray(data) ? data : data.data || data.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const getLowestPrice = (product: Product): number | null => {
    if (!product.skus || product.skus.length === 0) return null;
    
    let lowestPrice: number | null = null;
    for (const sku of product.skus) {
      if (sku.priceTiers && sku.priceTiers.length > 0) {
        for (const tier of sku.priceTiers) {
          if (lowestPrice === null || tier.pricePerUnit < lowestPrice) {
            lowestPrice = tier.pricePerUnit;
          }
        }
      }
    }
    return lowestPrice;
  };

  const getPrimaryImage = (product: Product): string | null => {
    if (!product.images || product.images.length === 0) return null;
    const primary = product.images.find(img => img.isPrimary);
    return primary?.url || product.images[0]?.url || null;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.shortDesc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.region?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.gradeType?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Products</h2>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-600 mt-1">Browse premium matcha products from verified sellers</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products by name, region, or grade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Products will appear here when sellers list them.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const imageUrl = getPrimaryImage(product);
            const lowestPrice = getLowestPrice(product);

            return (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="h-48 bg-gray-100 relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {product.isFeatured && (
                    <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-medium rounded">
                      Featured
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                    {product.gradeType && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded shrink-0">
                        {product.gradeType.code}
                      </span>
                    )}
                  </div>

                  {product.shortDesc && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{product.shortDesc}</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {product.region && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {product.region.name}
                      </span>
                    )}
                    {product.certifications?.slice(0, 2).map((cert) => (
                      <span key={cert} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                        {cert}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      {lowestPrice !== null ? (
                        <p className="text-lg font-bold text-gray-900">
                          ${lowestPrice.toFixed(2)}<span className="text-sm font-normal text-gray-500">/kg</span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">Contact for pricing</p>
                      )}
                      <p className="text-xs text-gray-500">MOQ: {product.moqKg}kg</p>
                    </div>
                    <button
                      onClick={() => window.location.href = `/dashboard/marketplace/${product.slug}`}
                      className="px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

