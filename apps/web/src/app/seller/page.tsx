'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { sellerApi, rfqApi, quoteApi, orderApi, Product } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  Plus,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Eye,
  AlertCircle,
  FileText,
  MessageSquare,
} from 'lucide-react';

export default function SellerDashboard() {
  const { user, accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalSkus: 0,
    lowStock: 0,
    pendingRfqs: 0,
    pendingQuotes: 0,
    activeOrders: 0,
  });
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      loadDashboardData();
    }
  }, [accessToken]);

  const loadDashboardData = async () => {
    try {
      const [productsRes, allProductsRes, rfqsRes, quotesRes, ordersRes] = await Promise.all([
        sellerApi.getProducts(accessToken!, { limit: 5 }),
        sellerApi.getProducts(accessToken!, { limit: 100 }),
        rfqApi.getSellerRfqs(accessToken!).catch(() => []),
        quoteApi.getSellerQuotes(accessToken!).catch(() => []),
        orderApi.getSellerOrders(accessToken!).catch(() => []),
      ]);

      setProducts(productsRes.data);
      setRfqs(rfqsRes.slice(0, 5));
      setOrders(ordersRes.slice(0, 5));

      // Calculate stats
      const active = allProductsRes.data.filter((p) => p.status === 'ACTIVE').length;
      const totalSkus = allProductsRes.data.reduce((acc, p) => acc + p.skus.length, 0);
      const lowStockSkus = allProductsRes.data.reduce((acc, p) => {
        return acc + p.skus.filter((s) => s.inventory && s.inventory.availableQty < 10).length;
      }, 0);

      const pendingRfqs = rfqsRes.filter((r: any) => r.status === 'SUBMITTED').length;
      const pendingQuotes = quotesRes.filter((q: any) => q.status === 'PENDING').length;
      const activeOrders = ordersRes.filter((o: any) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length;

      setStats({
        totalProducts: allProductsRes.meta.total,
        activeProducts: active,
        totalSkus,
        lowStock: lowStockSkus,
        pendingRfqs,
        pendingQuotes,
        activeOrders,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-gray-500">
            Here&apos;s what&apos;s happening with your products today.
          </p>
        </div>
        <Link href="/seller/products/new">
          <Button className="bg-matcha-600 hover:bg-matcha-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-10 w-10 bg-matcha-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Package className="h-5 w-5 text-matcha-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500">Products</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeProducts}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.pendingRfqs > 0 ? 'border-yellow-300 bg-yellow-50/30' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRfqs}</p>
              <p className="text-xs text-gray-500">Pending RFQs</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingQuotes}</p>
              <p className="text-xs text-gray-500">Pending Quotes</p>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.activeOrders > 0 ? 'border-green-300 bg-green-50/30' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeOrders}</p>
              <p className="text-xs text-gray-500">Active Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStock}</p>
              <p className="text-xs text-gray-500">Low Stock</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Products</CardTitle>
          <Link href="/seller/products">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No products yet</p>
              <Link href="/seller/products/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {product.images.length > 0 ? (
                        <img
                          src={`http://localhost:3001${product.images[0].url}`}
                          alt={product.name}
                          className="h-12 w-12 object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        {product.gradeType.name} • {product.region.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : product.status === 'DRAFT'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {product.status}
                    </span>
                    <Link href={`/seller/products/${product.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/seller/rfqs">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View RFQs</p>
                <p className="text-sm text-gray-500">Review and respond to quotes</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/seller/orders">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Orders</p>
                <p className="text-sm text-gray-500">Process and ship orders</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/seller/products/new">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 bg-matcha-100 rounded-lg flex items-center justify-center">
                <Plus className="h-5 w-5 text-matcha-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Add Product</p>
                <p className="text-sm text-gray-500">Create a new product</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/seller/company-profile">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Update Profile</p>
                <p className="text-sm text-gray-500">Edit company info</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
