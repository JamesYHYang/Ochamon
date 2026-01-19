'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { sellerApi, Product, Region, GradeType } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  AlertCircle,
} from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [gradeTypes, setGradeTypes] = useState<GradeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [gradeTypeId, setGradeTypeId] = useState('');
  const [regionId, setRegionId] = useState('');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (accessToken) {
      loadLookups();
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      loadProducts();
    }
  }, [accessToken, meta.page, search, status, gradeTypeId, regionId]);

  const loadLookups = async () => {
    try {
      const [regionsData, gradesData] = await Promise.all([
        sellerApi.getRegions(accessToken!),
        sellerApi.getGradeTypes(accessToken!),
      ]);
      setRegions(regionsData);
      setGradeTypes(gradesData);
    } catch (error) {
      console.error('Failed to load lookups:', error);
    }
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sellerApi.getProducts(accessToken!, {
        page: meta.page,
        limit: meta.limit,
        search: search || undefined,
        status: status || undefined,
        gradeTypeId: gradeTypeId || undefined,
        regionId: regionId || undefined,
      });
      setProducts(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, meta.page, search, status, gradeTypeId, regionId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (productId: string) => {
    setDeleting(true);
    try {
      await sellerApi.deleteProduct(accessToken!, productId);
      setDeleteId(null);
      loadProducts();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-700';
      case 'INACTIVE':
        return 'bg-amber-100 text-amber-700';
      case 'ARCHIVED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getLowestPrice = (product: Product) => {
    const prices = product.skus.flatMap((sku) =>
      sku.priceTiers.map((tier) => Number(tier.pricePerUnit))
    );
    if (prices.length === 0) return null;
    return Math.min(...prices);
  };

  const getTotalStock = (product: Product) => {
    return product.skus.reduce(
      (acc, sku) => acc + (sku.inventory?.availableQty || 0),
      0
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">Manage your product catalog</p>
        </div>
        <Link href="/seller/products/new">
          <Button className="bg-matcha-600 hover:bg-matcha-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={status} onValueChange={(val) => { setStatus(val); setMeta((prev) => ({ ...prev, page: 1 })); }}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gradeTypeId} onValueChange={(val) => { setGradeTypeId(val); setMeta((prev) => ({ ...prev, page: 1 })); }}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Grades</SelectItem>
                {gradeTypes.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={regionId} onValueChange={(val) => { setRegionId(val); setMeta((prev) => ({ ...prev, page: 1 })); }}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </form>
        </CardContent>
      </Card>

      {/* Products list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600"></div>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">
              {search || status || gradeTypeId || regionId
                ? 'Try adjusting your filters'
                : 'Get started by adding your first product'}
            </p>
            {!search && !status && !gradeTypeId && !regionId && (
              <Link href="/seller/products/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade / Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKUs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const lowestPrice = getLowestPrice(product);
                  const totalStock = getTotalStock(product);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                            {product.images.length > 0 ? (
                              <img
                                src={`http://localhost:3001${product.images[0].url}`}
                                alt={product.name}
                                className="h-10 w-10 object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              MOQ: {Number(product.moqKg)}kg
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.gradeType.name}</div>
                        <div className="text-sm text-gray-500">{product.region.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.skus.length} SKU{product.skus.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lowestPrice ? `$${lowestPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm ${
                            totalStock < 10 ? 'text-amber-600 font-medium' : 'text-gray-500'
                          }`}
                        >
                          {totalStock} units
                        </span>
                        {totalStock < 10 && (
                          <AlertCircle className="h-4 w-4 text-amber-500 inline ml-1" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                            product.status
                          )}`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/seller/products/${product.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(product.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} products
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMeta((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={meta.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMeta((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={meta.page === meta.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Product?</h3>
            <p className="text-gray-500 mb-4">
              This action cannot be undone. This will permanently delete the product and all its
              SKUs.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
