'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { sellerApi, Product, Region, GradeType } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  ChevronLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle,
} from 'lucide-react';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [gradeTypes, setGradeTypes] = useState<GradeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDesc: '',
    regionId: '',
    gradeTypeId: '',
    moqKg: '',
    leadTimeDays: '',
    certifications: [] as string[],
    status: '' as string,
  });

  useEffect(() => {
    if (accessToken && productId) {
      loadData();
    }
  }, [accessToken, productId]);

  const loadData = async () => {
    try {
      const [productData, regionsData, gradesData] = await Promise.all([
        sellerApi.getProduct(accessToken!, productId),
        sellerApi.getRegions(accessToken!),
        sellerApi.getGradeTypes(accessToken!),
      ]);

      setProduct(productData);
      setRegions(regionsData);
      setGradeTypes(gradesData);

      setFormData({
        name: productData.name,
        description: productData.description || '',
        shortDesc: productData.shortDesc || '',
        regionId: productData.region.id,
        gradeTypeId: productData.gradeType.id,
        moqKg: String(productData.moqKg),
        leadTimeDays: String(productData.leadTimeDays),
        certifications: productData.certifications,
        status: productData.status,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const updated = await sellerApi.updateProduct(accessToken!, productId, {
        name: formData.name,
        description: formData.description || undefined,
        shortDesc: formData.shortDesc || undefined,
        regionId: formData.regionId,
        gradeTypeId: formData.gradeTypeId,
        moqKg: parseFloat(formData.moqKg),
        leadTimeDays: parseInt(formData.leadTimeDays),
        certifications: formData.certifications,
        status: formData.status,
      });

      setProduct(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');

    try {
      const isPrimary = (product?.images.length || 0) === 0;
      await sellerApi.uploadProductImage(accessToken!, productId, file, isPrimary);
      await loadData(); // Reload product to get updated images
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await sellerApi.deleteProductImage(accessToken!, productId, imageId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddSku = async () => {
    const skuNum = (product?.skus.length || 0) + 1;
    const newSku = {
      sku: `${product?.slug?.toUpperCase().slice(0, 6) || 'SKU'}-${skuNum}`,
      name: `Variant ${skuNum}`,
      packagingType: 'Pouch',
      netWeightG: 100,
      priceTiers: [{ minQty: 1, pricePerUnit: 10 }],
      inventory: { availableQty: 0 },
    };

    try {
      await sellerApi.addSku(accessToken!, productId, newSku);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteSku = async (skuId: string) => {
    if (!confirm('Delete this SKU? This cannot be undone.')) return;

    try {
      await sellerApi.deleteSku(accessToken!, productId, skuId);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
        <Link href="/seller/products">
          <Button className="mt-4">Back to Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/seller/products">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-500">{product.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Saved</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-matcha-600 hover:bg-matcha-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* Product details */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={formData.regionId}
                onValueChange={(val) => handleChange('regionId', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grade</Label>
              <Select
                value={formData.gradeTypeId}
                onValueChange={(val) => handleChange('gradeTypeId', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradeTypes.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>MOQ (kg)</Label>
              <Input
                type="number"
                value={formData.moqKg}
                onChange={(e) => handleChange('moqKg', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Lead Time (days)</Label>
              <Input
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) => handleChange('leadTimeDays', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => handleChange('status', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-500"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Short Description</Label>
            <Input
              value={formData.shortDesc}
              onChange={(e) => handleChange('shortDesc', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>Upload images of your product</CardDescription>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Image
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {product.images.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No images uploaded</p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload First Image
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.images.map((image) => (
                <div
                  key={image.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border"
                >
                  <img
                    src={`http://localhost:3001${image.url}`}
                    alt={image.altText || product.name}
                    className="w-full h-full object-cover"
                  />
                  {image.isPrimary && (
                    <span className="absolute top-2 left-2 bg-matcha-600 text-white text-xs px-2 py-1 rounded">
                      Primary
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SKUs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>SKUs ({product.skus.length})</CardTitle>
            <CardDescription>Manage product variants and pricing</CardDescription>
          </div>
          <Button variant="outline" onClick={handleAddSku}>
            <Plus className="h-4 w-4 mr-2" />
            Add SKU
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {product.skus.map((sku) => (
              <div
                key={sku.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{sku.name}</h4>
                    <p className="text-sm text-gray-500">
                      SKU: {sku.sku} • {sku.packagingType} • {sku.netWeightG}g
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sku.priceTiers.map((tier, idx) => (
                        <span
                          key={tier.id}
                          className="text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          {tier.minQty}+ units: ${Number(tier.pricePerUnit).toFixed(2)}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm mt-2">
                      <span
                        className={
                          (sku.inventory?.availableQty || 0) < 10
                            ? 'text-amber-600 font-medium'
                            : 'text-gray-600'
                        }
                      >
                        Stock: {sku.inventory?.availableQty || 0} units
                      </span>
                      {sku.inventory?.warehouseLocation && (
                        <span className="text-gray-400 ml-2">
                          ({sku.inventory.warehouseLocation})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        sku.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sku.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {product.skus.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSku(sku.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
