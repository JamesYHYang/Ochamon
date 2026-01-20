'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getToken, getUser } from '@/lib/auth';
import { AddToCartButton, CartIcon } from '@/components/cart';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PriceTier {
  minQty: number;
  maxQty: number | null;
  unit: string;
  pricePerUnit: number;
}

interface Sku {
  id: string;
  sku: string;
  name: string;
  packagingType: string;
  netWeightG: number;
  currency: string;
  startingPrice?: number;
  priceTiers?: PriceTier[];
  inventory?: { availableQty: number; unit: string } | null;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  leadTimeDays: number;
  moqKg: number;
  certifications: string[];
  region: { id: string; name: string; country: string; description: string | null };
  gradeType: { id: string; name: string; code: string; description: string | null };
  seller: {
    companyName: string;
    companyDescription: string | null;
    website: string | null;
    logoUrl: string | null;
    isVerified: boolean;
    isOrganic: boolean;
    isJasCertified: boolean;
    isUsdaCertified: boolean;
    isEuCertified: boolean;
  };
  images: { id: string; url: string; altText: string | null; isPrimary: boolean }[];
  skus: Sku[];
  documents?: { id: string; type: string; name: string; url: string }[];
  isShortlisted?: boolean;
  priceVisibility?: string;
  loginPrompt?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [shortlistLoading, setShortlistLoading] = useState(false);

  const user = getUser();
  const token = getToken();
  const isBuyer = user?.role === 'BUYER';

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/products/${productId}`, { headers });
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        setProduct(data);
        setIsShortlisted(data.isShortlisted || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, token]);

  const toggleShortlist = async () => {
    if (!token || !isBuyer) {
      router.push('/login?redirect=' + encodeURIComponent(`/marketplace/products/${productId}`));
      return;
    }

    setShortlistLoading(true);
    try {
      if (isShortlisted) {
        await fetch(`${API_URL}/buyer/shortlist/${productId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setIsShortlisted(false);
      } else {
        await fetch(`${API_URL}/buyer/shortlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productId }),
        });
        setIsShortlisted(true);
      }
    } catch (err) {
      console.error('Shortlist error:', err);
    } finally {
      setShortlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-500 text-lg mb-4">{error || 'Product not found'}</p>
        <Link href="/marketplace"><Button>Back to Marketplace</Button></Link>
      </div>
    );
  }

  const hasPriceTiers = product.skus.some((sku) => sku.priceTiers && sku.priceTiers.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-700">🍵 Matcha Trade</Link>
          <div className="flex items-center gap-4">
            <CartIcon />
            {user ? (
              <Link href={user.role === 'BUYER' ? '/buyer/marketplace' : '/seller'}><Button variant="outline">Dashboard</Button></Link>
            ) : (
              <>
                <Link href="/login"><Button variant="outline">Sign In</Button></Link>
                <Link href="/register"><Button>Get Started</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/marketplace" className="text-green-700 hover:underline mb-4 inline-block">← Back to Marketplace</Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                {product.images.length > 0 ? (
                  <img src={product.images[selectedImage]?.url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-9xl">🍵</span>
                )}
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 mt-4">
                {product.images.map((img, idx) => (
                  <button key={img.id} onClick={() => setSelectedImage(idx)} className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImage === idx ? 'border-green-500' : 'border-transparent'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-600">{product.seller.companyName}</span>
                  {product.seller.isVerified && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">✓ Verified</span>}
                </div>
              </div>
              {isBuyer && (
                <Button variant={isShortlisted ? 'default' : 'outline'} onClick={toggleShortlist} disabled={shortlistLoading}>
                  {isShortlisted ? '❤️ Saved' : '🤍 Save'}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">{product.gradeType.name}</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{product.region.name}, {product.region.country}</span>
              {product.certifications.map((c) => (
                <span key={c} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">{c}</span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Minimum Order</p>
                  <p className="text-xl font-semibold">{product.moqKg} kg</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Lead Time</p>
                  <p className="text-xl font-semibold">{product.leadTimeDays} days</p>
                </CardContent>
              </Card>
            </div>

            {product.description && (
              <div className="mb-6">
                <h2 className="font-semibold text-lg mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Seller Certifications */}
            <div className="mb-6">
              <h2 className="font-semibold text-lg mb-2">Seller Certifications</h2>
              <div className="flex flex-wrap gap-2">
                {product.seller.isOrganic && <span className="px-3 py-1 bg-green-50 text-green-700 rounded border border-green-200">🌿 Organic</span>}
                {product.seller.isJasCertified && <span className="px-3 py-1 bg-red-50 text-red-700 rounded border border-red-200">🇯🇵 JAS Certified</span>}
                {product.seller.isUsdaCertified && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200">🇺🇸 USDA Organic</span>}
                {product.seller.isEuCertified && <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200">🇪🇺 EU Organic</span>}
              </div>
            </div>
          </div>
        </div>

        {/* SKU & Pricing Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Available SKUs & Pricing</h2>
          
          {!user && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <p className="text-yellow-800">🔒 {product.loginPrompt || 'Sign in as a buyer to see full pricing tiers and documents'}</p>
                <Link href={`/login?redirect=${encodeURIComponent(`/marketplace/products/${productId}`)}`}>
                  <Button className="mt-2">Sign In to See Full Pricing</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {product.skus.map((sku) => (
              <Card key={sku.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{sku.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {sku.sku} • {sku.packagingType} • {sku.netWeightG}g</p>
                    </div>
                    {sku.inventory && (
                      <span className={`text-sm px-2 py-1 rounded ${sku.inventory.availableQty > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {sku.inventory.availableQty > 0 ? `${sku.inventory.availableQty} ${sku.inventory.unit} available` : 'Out of stock'}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hasPriceTiers && sku.priceTiers && sku.priceTiers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4">Quantity</th>
                            <th className="text-right py-2">Price per {sku.priceTiers[0].unit}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sku.priceTiers.map((tier, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2 pr-4">
                                {tier.maxQty ? `${tier.minQty} - ${tier.maxQty} ${tier.unit}` : `${tier.minQty}+ ${tier.unit}`}
                              </td>
                              <td className="text-right py-2 font-semibold text-green-700">
                                ${tier.pricePerUnit.toFixed(2)} {sku.currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      {sku.startingPrice ? `From $${sku.startingPrice.toFixed(2)} ${sku.currency}` : 'Contact for pricing'}
                    </p>
                  )}

                  {/* Add to Cart */}
                  <div className="mt-4 pt-4 border-t">
                    <AddToCartButton
                      skuId={sku.id}
                      productName={product.name}
                      minQty={product.moqKg}
                      maxQty={sku.inventory?.availableQty}
                      unit="kg"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Documents Section (Buyers only) */}
        {isBuyer && product.documents && product.documents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.documents.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div className="flex-1">
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-gray-500 uppercase">{doc.type}</p>
                    </div>
                    <a href={`${API_URL}${doc.url}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">Download</Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


