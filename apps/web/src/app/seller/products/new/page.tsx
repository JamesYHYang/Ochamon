'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { sellerApi, Region, GradeType } from '@/lib/api';
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
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Package,
  Check,
} from 'lucide-react';

interface PriceTier {
  minQty: number;
  maxQty?: number;
  pricePerUnit: number;
}

interface Sku {
  sku: string;
  name: string;
  packagingType: string;
  netWeightG: number;
  priceTiers: PriceTier[];
  inventory: {
    availableQty: number;
    warehouseLocation?: string;
  };
}

const STEPS = [
  { id: 'product', title: 'Product Info', description: 'Basic product details' },
  { id: 'skus', title: 'SKUs', description: 'Product variants' },
  { id: 'pricing', title: 'Pricing', description: 'Price tiers for each SKU' },
  { id: 'inventory', title: 'Inventory', description: 'Stock levels' },
  { id: 'review', title: 'Review', description: 'Review and create' },
];

export default function NewProductPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [gradeTypes, setGradeTypes] = useState<GradeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Product form state
  const [product, setProduct] = useState({
    name: '',
    description: '',
    shortDesc: '',
    regionId: '',
    gradeTypeId: '',
    moqKg: '',
    leadTimeDays: '14',
    certifications: [] as string[],
    status: 'DRAFT' as const,
  });

  // SKUs state
  const [skus, setSkus] = useState<Sku[]>([
    {
      sku: '',
      name: '',
      packagingType: 'Pouch',
      netWeightG: 100,
      priceTiers: [{ minQty: 1, pricePerUnit: 0 }],
      inventory: { availableQty: 0 },
    },
  ]);

  useEffect(() => {
    if (accessToken) {
      loadLookups();
    }
  }, [accessToken]);

  const loadLookups = async () => {
    try {
      const [regionsData, gradesData] = await Promise.all([
        sellerApi.getRegions(accessToken!),
        sellerApi.getGradeTypes(accessToken!),
      ]);
      setRegions(regionsData);
      setGradeTypes(gradesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (field: string, value: any) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleSkuChange = (index: number, field: string, value: any) => {
    setSkus((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      return updated;
    });
  };

  const addSku = () => {
    const skuNum = skus.length + 1;
    setSkus((prev) => [
      ...prev,
      {
        sku: '',
        name: '',
        packagingType: 'Pouch',
        netWeightG: 100,
        priceTiers: [{ minQty: 1, pricePerUnit: 0 }],
        inventory: { availableQty: 0 },
      },
    ]);
  };

  const removeSku = (index: number) => {
    if (skus.length > 1) {
      setSkus((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handlePriceTierChange = (
    skuIndex: number,
    tierIndex: number,
    field: string,
    value: number | undefined
  ) => {
    setSkus((prev) => {
      const updated = [...prev];
      (updated[skuIndex].priceTiers[tierIndex] as any)[field] = value;
      return updated;
    });
  };

  const addPriceTier = (skuIndex: number) => {
    setSkus((prev) => {
      const updated = [...prev];
      const lastTier = updated[skuIndex].priceTiers[updated[skuIndex].priceTiers.length - 1];
      updated[skuIndex].priceTiers.push({
        minQty: (lastTier.maxQty || lastTier.minQty) + 1,
        pricePerUnit: lastTier.pricePerUnit * 0.9,
      });
      return updated;
    });
  };

  const removePriceTier = (skuIndex: number, tierIndex: number) => {
    if (skus[skuIndex].priceTiers.length > 1) {
      setSkus((prev) => {
        const updated = [...prev];
        updated[skuIndex].priceTiers = updated[skuIndex].priceTiers.filter(
          (_, i) => i !== tierIndex
        );
        return updated;
      });
    }
  };

  const handleInventoryChange = (skuIndex: number, field: string, value: any) => {
    setSkus((prev) => {
      const updated = [...prev];
      (updated[skuIndex].inventory as any)[field] = value;
      return updated;
    });
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0: // Product info
        if (!product.name || !product.regionId || !product.gradeTypeId || !product.moqKg) {
          setError('Please fill in all required fields');
          return false;
        }
        break;
      case 1: // SKUs
        for (const sku of skus) {
          if (!sku.sku || !sku.name || !sku.netWeightG) {
            setError('Please fill in all SKU details');
            return false;
          }
        }
        break;
      case 2: // Pricing
        for (const sku of skus) {
          for (const tier of sku.priceTiers) {
            if (!tier.minQty || tier.pricePerUnit <= 0) {
              setError('Please set valid prices for all tiers');
              return false;
            }
          }
        }
        break;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const productData = {
        name: product.name,
        description: product.description || undefined,
        shortDesc: product.shortDesc || undefined,
        regionId: product.regionId,
        gradeTypeId: product.gradeTypeId,
        moqKg: parseFloat(product.moqKg),
        leadTimeDays: parseInt(product.leadTimeDays),
        certifications: product.certifications,
        status: product.status,
        skus: skus.map((sku) => ({
          sku: sku.sku,
          name: sku.name,
          packagingType: sku.packagingType,
          netWeightG: sku.netWeightG,
          priceTiers: sku.priceTiers.map((tier) => ({
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            pricePerUnit: tier.pricePerUnit,
          })),
          inventory: {
            availableQty: sku.inventory.availableQty,
            warehouseLocation: sku.inventory.warehouseLocation,
          },
        })),
      };

      const created = await sellerApi.createProduct(accessToken!, productData);
      router.push(`/seller/products/${created.id}/edit`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/seller/products">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Product</h1>
          <p className="text-gray-500">Add a new product to your catalog</p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index < currentStep
                  ? 'bg-matcha-600 text-white'
                  : index === currentStep
                  ? 'bg-matcha-100 text-matcha-700 border-2 border-matcha-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="hidden sm:block ml-2">
              <p
                className={`text-sm font-medium ${
                  index <= currentStep ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {step.title}
              </p>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-12 sm:w-24 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-matcha-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* Step content */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Enter the basic details of your product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={product.name}
                onChange={(e) => handleProductChange('name', e.target.value)}
                placeholder="e.g., Premium Ceremonial Matcha"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regionId">Region *</Label>
                <Select
                  value={product.regionId}
                  onValueChange={(val) => handleProductChange('regionId', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
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
                <Label htmlFor="gradeTypeId">Grade *</Label>
                <Select
                  value={product.gradeTypeId}
                  onValueChange={(val) => handleProductChange('gradeTypeId', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="moqKg">Minimum Order Quantity (kg) *</Label>
                <Input
                  id="moqKg"
                  type="number"
                  min="0"
                  step="0.1"
                  value={product.moqKg}
                  onChange={(e) => handleProductChange('moqKg', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min="1"
                  value={product.leadTimeDays}
                  onChange={(e) => handleProductChange('leadTimeDays', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-500"
                value={product.description}
                onChange={(e) => handleProductChange('description', e.target.value)}
                placeholder="Describe your product..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDesc">Short Description</Label>
              <Input
                id="shortDesc"
                value={product.shortDesc}
                onChange={(e) => handleProductChange('shortDesc', e.target.value)}
                placeholder="Brief tagline for the product"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <div className="space-y-4">
          {skus.map((sku, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">SKU #{index + 1}</CardTitle>
                {skus.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSku(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU Code *</Label>
                    <Input
                      value={sku.sku}
                      onChange={(e) => handleSkuChange(index, 'sku', e.target.value)}
                      placeholder="e.g., MATCHA-100G"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU Name *</Label>
                    <Input
                      value={sku.name}
                      onChange={(e) => handleSkuChange(index, 'name', e.target.value)}
                      placeholder="e.g., 100g Pouch"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Packaging Type</Label>
                    <Select
                      value={sku.packagingType}
                      onValueChange={(val) => handleSkuChange(index, 'packagingType', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pouch">Pouch</SelectItem>
                        <SelectItem value="Tin">Tin</SelectItem>
                        <SelectItem value="Bag">Bag</SelectItem>
                        <SelectItem value="Box">Box</SelectItem>
                        <SelectItem value="Drum">Drum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Net Weight (grams) *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={sku.netWeightG}
                      onChange={(e) =>
                        handleSkuChange(index, 'netWeightG', parseInt(e.target.value))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addSku} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another SKU
          </Button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4">
          {skus.map((sku, skuIndex) => (
            <Card key={skuIndex}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {sku.name || `SKU #${skuIndex + 1}`} - Price Tiers
                </CardTitle>
                <CardDescription>
                  Set quantity-based pricing (higher quantities = better prices)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sku.priceTiers.map((tier, tierIndex) => (
                  <div key={tierIndex} className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Min Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tier.minQty}
                        onChange={(e) =>
                          handlePriceTierChange(
                            skuIndex,
                            tierIndex,
                            'minQty',
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Max Qty</Label>
                      <Input
                        type="number"
                        min={tier.minQty}
                        value={tier.maxQty || ''}
                        onChange={(e) =>
                          handlePriceTierChange(
                            skuIndex,
                            tierIndex,
                            'maxQty',
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        placeholder="No limit"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Price per Unit ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.pricePerUnit}
                        onChange={(e) =>
                          handlePriceTierChange(
                            skuIndex,
                            tierIndex,
                            'pricePerUnit',
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>
                    {sku.priceTiers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePriceTier(skuIndex, tierIndex)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addPriceTier(skuIndex)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tier
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-4">
          {skus.map((sku, skuIndex) => (
            <Card key={skuIndex}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {sku.name || `SKU #${skuIndex + 1}`} - Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Available Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      value={sku.inventory.availableQty}
                      onChange={(e) =>
                        handleInventoryChange(
                          skuIndex,
                          'availableQty',
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warehouse Location</Label>
                    <Input
                      value={sku.inventory.warehouseLocation || ''}
                      onChange={(e) =>
                        handleInventoryChange(skuIndex, 'warehouseLocation', e.target.value)
                      }
                      placeholder="e.g., Tokyo-WH1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Product</CardTitle>
            <CardDescription>
              Please review the details before creating the product
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Product Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p><strong>Name:</strong> {product.name}</p>
                <p><strong>Region:</strong> {regions.find((r) => r.id === product.regionId)?.name}</p>
                <p><strong>Grade:</strong> {gradeTypes.find((g) => g.id === product.gradeTypeId)?.name}</p>
                <p><strong>MOQ:</strong> {product.moqKg} kg</p>
                <p><strong>Lead Time:</strong> {product.leadTimeDays} days</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">SKUs ({skus.length})</h3>
              <div className="space-y-2">
                {skus.map((sku, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">{sku.name} ({sku.sku})</p>
                    <p className="text-sm text-gray-600">
                      {sku.packagingType} • {sku.netWeightG}g • Stock: {sku.inventory.availableQty}
                    </p>
                    <p className="text-sm text-gray-600">
                      {sku.priceTiers.length} price tier{sku.priceTiers.length !== 1 ? 's' : ''} •
                      From ${sku.priceTiers[0]?.pricePerUnit.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={product.status}
                onValueChange={(val: any) => handleProductChange('status', val)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft (not visible to buyers)</SelectItem>
                  <SelectItem value="ACTIVE">Active (visible to buyers)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={nextStep} className="bg-matcha-600 hover:bg-matcha-700">
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-matcha-600 hover:bg-matcha-700"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Create Product
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
