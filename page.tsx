'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Wand2,
  AlertCircle,
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

const PACKAGING_TYPES = [
  { value: 'Pouch', label: 'Pouch' },
  { value: 'Tin', label: 'Tin' },
  { value: 'Bag', label: 'Bag' },
  { value: 'Box', label: 'Box' },
  { value: 'Drum', label: 'Drum' },
];

const COMMON_WEIGHTS = [30, 50, 100, 200, 250, 500, 1000];

export default function NewProductPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [gradeTypes, setGradeTypes] = useState<GradeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
    status: 'ACTIVE' as const, // Default to ACTIVE so products appear in marketplace
  });

  // SKUs state - start with one default SKU
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

  // Generate SKU code from product name and packaging
  const generateSkuCode = useCallback((productName: string, packagingType: string, weightG: number, index: number) => {
    if (!productName) return '';
    
    // Create base code from product name (first 3-4 chars, uppercase)
    const nameBase = productName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase();
    
    // Add packaging type abbreviation
    const packAbbrev = packagingType.substring(0, 1).toUpperCase();
    
    // Add weight
    const weightStr = weightG >= 1000 ? `${weightG / 1000}KG` : `${weightG}G`;
    
    // Add index if multiple SKUs
    const suffix = index > 0 ? `-${index + 1}` : '';
    
    return `${nameBase}-${packAbbrev}${weightStr}${suffix}`;
  }, []);

  // Generate SKU name from weight and packaging
  const generateSkuName = useCallback((packagingType: string, weightG: number) => {
    const weightStr = weightG >= 1000 ? `${weightG / 1000}kg` : `${weightG}g`;
    return `${weightStr} ${packagingType}`;
  }, []);

  // Auto-generate SKU details when product name changes
  const autoGenerateSkuDetails = useCallback(() => {
    if (!product.name) return;
    
    setSkus((prev) =>
      prev.map((sku, index) => ({
        ...sku,
        sku: sku.sku || generateSkuCode(product.name, sku.packagingType, sku.netWeightG, index),
        name: sku.name || generateSkuName(sku.packagingType, sku.netWeightG),
      }))
    );
  }, [product.name, generateSkuCode, generateSkuName]);

  const handleProductChange = (field: string, value: any) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
    setValidationErrors([]);
  };

  const handleSkuChange = (index: number, field: string, value: any) => {
    setSkus((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      
      // Auto-regenerate SKU code and name when packaging or weight changes
      if (field === 'packagingType' || field === 'netWeightG') {
        if (!updated[index].sku || updated[index].sku.includes('-')) {
          // Only auto-update if empty or looks auto-generated
          updated[index].sku = generateSkuCode(product.name, updated[index].packagingType, updated[index].netWeightG, index);
        }
        updated[index].name = generateSkuName(updated[index].packagingType, updated[index].netWeightG);
      }
      
      return updated;
    });
    setValidationErrors([]);
  };

  const addSku = () => {
    const newIndex = skus.length;
    const newSku: Sku = {
      sku: generateSkuCode(product.name, 'Pouch', 100, newIndex),
      name: generateSkuName('Pouch', 100),
      packagingType: 'Pouch',
      netWeightG: 100,
      priceTiers: [{ minQty: 1, pricePerUnit: 0 }],
      inventory: { availableQty: 0 },
    };
    setSkus((prev) => [...prev, newSku]);
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
    setValidationErrors([]);
  };

  const addPriceTier = (skuIndex: number) => {
    setSkus((prev) => {
      const updated = [...prev];
      const lastTier = updated[skuIndex].priceTiers[updated[skuIndex].priceTiers.length - 1];
      updated[skuIndex].priceTiers.push({
        minQty: (lastTier.maxQty || lastTier.minQty) + 1,
        pricePerUnit: Math.round(lastTier.pricePerUnit * 0.9 * 100) / 100, // 10% discount, rounded
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

  const validateStep = (): boolean => {
    const errors: string[] = [];

    switch (currentStep) {
      case 0: // Product info
        if (!product.name || product.name.length < 2) {
          errors.push('Product name must be at least 2 characters');
        }
        if (!product.regionId) {
          errors.push('Please select a region');
        }
        if (!product.gradeTypeId) {
          errors.push('Please select a grade type');
        }
        if (!product.moqKg || parseFloat(product.moqKg) <= 0) {
          errors.push('MOQ must be greater than 0');
        }
        break;

      case 1: // SKUs
        if (skus.length === 0) {
          errors.push('At least one SKU is required');
        }
        skus.forEach((sku, index) => {
          if (!sku.sku || sku.sku.trim() === '') {
            errors.push(`SKU #${index + 1}: SKU code is required`);
          }
          if (!sku.name || sku.name.trim() === '') {
            errors.push(`SKU #${index + 1}: SKU name is required`);
          }
          if (!sku.netWeightG || sku.netWeightG <= 0) {
            errors.push(`SKU #${index + 1}: Net weight must be greater than 0`);
          }
        });
        // Check for duplicate SKU codes
        const skuCodes = skus.map((s) => s.sku.toLowerCase());
        const duplicates = skuCodes.filter((code, i) => code && skuCodes.indexOf(code) !== i);
        if (duplicates.length > 0) {
          errors.push(`Duplicate SKU codes found: ${[...new Set(duplicates)].join(', ')}`);
        }
        break;

      case 2: // Pricing
        skus.forEach((sku, skuIndex) => {
          sku.priceTiers.forEach((tier, tierIndex) => {
            if (!tier.minQty || tier.minQty <= 0) {
              errors.push(`${sku.name || `SKU #${skuIndex + 1}`}: Tier ${tierIndex + 1} min qty must be greater than 0`);
            }
            if (tier.pricePerUnit <= 0) {
              errors.push(`${sku.name || `SKU #${skuIndex + 1}`}: Tier ${tierIndex + 1} price must be greater than 0`);
            }
          });
        });
        break;

      case 3: // Inventory - no strict validation, 0 is allowed
        break;
    }

    setValidationErrors(errors);
    if (errors.length > 0) {
      setError(errors[0]); // Show first error as main error
      return false;
    }
    
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      // Auto-generate SKU details when moving from product info to SKUs
      if (currentStep === 0) {
        autoGenerateSkuDetails();
      }
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setValidationErrors([]);
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setValidationErrors([]);

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
          sku: sku.sku.trim(),
          name: sku.name.trim(),
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
      setError(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick add common SKU sizes
  const addCommonSkus = () => {
    const commonSizes = [
      { weight: 30, packaging: 'Tin' },
      { weight: 100, packaging: 'Pouch' },
      { weight: 500, packaging: 'Bag' },
      { weight: 1000, packaging: 'Bag' },
    ];

    const newSkus = commonSizes.map((size, index) => ({
      sku: generateSkuCode(product.name, size.packaging, size.weight, index),
      name: generateSkuName(size.packaging, size.weight),
      packagingType: size.packaging,
      netWeightG: size.weight,
      priceTiers: [{ minQty: 1, pricePerUnit: 0 }],
      inventory: { availableQty: 0 },
    }));

    setSkus(newSkus);
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

      {/* Error display */}
      {(error || validationErrors.length > 0) && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              {error && <p className="font-medium">{error}</p>}
              {validationErrors.length > 1 && (
                <ul className="mt-2 text-sm list-disc list-inside">
                  {validationErrors.slice(1).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 0: Product Info */}
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

      {/* Step 1: SKUs */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {/* Quick actions */}
          <Card className="bg-matcha-50 border-matcha-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-matcha-800">Quick Setup</p>
                  <p className="text-sm text-matcha-600">
                    Add common matcha packaging sizes automatically
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={addCommonSkus}
                  className="border-matcha-300 text-matcha-700 hover:bg-matcha-100"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Add Common Sizes
                </Button>
              </div>
            </CardContent>
          </Card>

          {skus.map((sku, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">SKU #{index + 1}</CardTitle>
                  {sku.name && (
                    <CardDescription>{sku.name}</CardDescription>
                  )}
                </div>
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
                      placeholder="e.g., MATCHA-P100G"
                    />
                    <p className="text-xs text-gray-500">
                      Unique identifier for this variant
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>SKU Name *</Label>
                    <Input
                      value={sku.name}
                      onChange={(e) => handleSkuChange(index, 'name', e.target.value)}
                      placeholder="e.g., 100g Pouch"
                    />
                    <p className="text-xs text-gray-500">
                      Display name for buyers
                    </p>
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
                        {PACKAGING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Net Weight (grams) *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={sku.netWeightG}
                        onChange={(e) =>
                          handleSkuChange(index, 'netWeightG', parseInt(e.target.value) || 0)
                        }
                        className="flex-1"
                      />
                      <Select
                        value={String(sku.netWeightG)}
                        onValueChange={(val) => handleSkuChange(index, 'netWeightG', parseInt(val))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Quick" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_WEIGHTS.map((w) => (
                            <SelectItem key={w} value={String(w)}>
                              {w >= 1000 ? `${w / 1000}kg` : `${w}g`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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

      {/* Step 2: Pricing */}
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
                            parseInt(e.target.value) || 1
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
                        value={tier.pricePerUnit || ''}
                        onChange={(e) =>
                          handlePriceTierChange(
                            skuIndex,
                            tierIndex,
                            'pricePerUnit',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0.00"
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

      {/* Step 3: Inventory */}
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
                          parseInt(e.target.value) || 0
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

      {/* Step 4: Review */}
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
                {product.description && (
                  <p><strong>Description:</strong> {product.description}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">SKUs ({skus.length})</h3>
              <div className="space-y-2">
                {skus.map((sku, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">{sku.name} <span className="text-gray-500">({sku.sku})</span></p>
                    <p className="text-sm text-gray-600">
                      {sku.packagingType} • {sku.netWeightG}g • Stock: {sku.inventory.availableQty}
                    </p>
                    <p className="text-sm text-gray-600">
                      {sku.priceTiers.length} price tier{sku.priceTiers.length !== 1 ? 's' : ''} •
                      Starting at ${sku.priceTiers[0]?.pricePerUnit.toFixed(2)}/unit
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
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active (visible in marketplace)</SelectItem>
                  <SelectItem value="DRAFT">Draft (not visible to buyers)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Active products will appear in the marketplace immediately
              </p>
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
