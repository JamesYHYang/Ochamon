'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  leadTimeDays: number;
  moqKg: number;
  certifications: string[];
  status: ProductStatus;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
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
    altText: string | null;
    isPrimary: boolean;
  }[];
  skus?: {
    id: string;
    sku: string;
    name: string;
    packagingType: string;
    netWeightG: number;
    isActive: boolean;
    priceTiers?: {
      id: string;
      minQty: number;
      maxQty: number | null;
      pricePerUnit: number;
      unit: string;
    }[];
    inventory?: {
      availableQty: number;
      reservedQty: number;
      unit: string;
    };
  }[];
  documents?: {
    id: string;
    type: string;
    name: string;
    url: string;
  }[];
}

const STATUS_CONFIG: Record<ProductStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inactive', className: 'bg-yellow-100 text-yellow-800' },
  ARCHIVED: { label: 'Archived', className: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }: { status: ProductStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const tokensStr = localStorage.getItem('matcha_tokens');
        if (!tokensStr) {
          throw new Error('Not authenticated. Please log in.');
        }

        const tokens = JSON.parse(tokensStr);
        const accessToken = tokens.accessToken;

        if (!accessToken) {
          throw new Error('No access token found. Please log in again.');
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/seller/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Product not found');
          }
          throw new Error('Failed to fetch product');
        }

        const data = await res.json();
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Product</h2>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => window.location.href = '/dashboard/products'}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Product not found.</p>
      </div>
    );
  }

  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => window.location.href = '/dashboard/products'}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Products
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                <StatusBadge status={product.status} />
                {product.isFeatured && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-gray-500 mt-1">Slug: {product.slug}</p>
            </div>
            <button
              onClick={() => window.location.href = `/dashboard/products/${product.id}/edit`}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Edit Product
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          <div className="md:col-span-1">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {primaryImage ? (
                <img
                  src={primaryImage.url}
                  alt={primaryImage.altText || product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {product.images.map((img) => (
                  <div
                    key={img.id}
                    className={`w-16 h-16 flex-shrink-0 rounded border-2 overflow-hidden ${
                      img.isPrimary ? 'border-indigo-500' : 'border-gray-200'
                    }`}
                  >
                    <img src={img.url} alt={img.altText || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              {product.shortDesc && (
                <p className="text-gray-700 font-medium mb-2">{product.shortDesc}</p>
              )}
              <p className="text-gray-600">{product.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Region</h3>
                <p className="text-gray-900">{product.region?.name || '-'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Grade</h3>
                <p className="text-gray-900">
                  {product.gradeType ? `${product.gradeType.name} (${product.gradeType.code})` : '-'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">MOQ</h3>
                <p className="text-gray-900">{product.moqKg} kg</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Lead Time</h3>
                <p className="text-gray-900">{product.leadTimeDays} days</p>
              </div>
            </div>

            {product.certifications && product.certifications.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {product.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {product.skus && product.skus.length > 0 && (
          <div className="border-t border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">SKUs & Pricing</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packaging</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Tiers</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {product.skus.map((sku) => (
                    <tr key={sku.id}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{sku.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{sku.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sku.packagingType}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sku.netWeightG}g</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sku.priceTiers && sku.priceTiers.length > 0 ? (
                          <div className="space-y-1">
                            {sku.priceTiers.map((tier) => (
                              <div key={tier.id} className="text-xs">
                                {tier.minQty}+ {tier.unit}: ${tier.pricePerUnit}/{tier.unit}
                              </div>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sku.inventory ? `${sku.inventory.availableQty} ${sku.inventory.unit}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            sku.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {sku.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Created: {formatDate(product.createdAt)}</span>
            <span>Last updated: {formatDate(product.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}