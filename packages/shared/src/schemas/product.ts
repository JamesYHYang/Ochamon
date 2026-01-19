import { z } from 'zod';

// ==================== ENUMS ====================

export const ProductStatus = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof ProductStatus>;

export const DocumentType = z.enum([
  'COA', 'COO', 'ORGANIC_CERT', 'JAS_CERT', 'USDA_CERT',
  'EU_CERT', 'PHYTOSANITARY', 'SPEC_SHEET', 'SDS', 'OTHER'
]);
export type DocumentType = z.infer<typeof DocumentType>;

// ==================== ENTITY SCHEMAS ====================

export const RegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
});
export type Region = z.infer<typeof RegionSchema>;

export const GradeTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
});
export type GradeType = z.infer<typeof GradeTypeSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  shortDesc: z.string().nullable(),
  leadTimeDays: z.number(),
  moqKg: z.number(),
  certifications: z.array(z.string()),
  status: ProductStatus,
  isFeatured: z.boolean(),
  sellerId: z.string(),
  regionId: z.string(),
  gradeTypeId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Product = z.infer<typeof ProductSchema>;

export const SkuSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  packagingType: z.string(),
  netWeightG: z.number(),
  lengthCm: z.number().nullable(),
  widthCm: z.number().nullable(),
  heightCm: z.number().nullable(),
  grossWeightG: z.number().nullable(),
  hsCode: z.string().nullable(),
  originCountry: z.string(),
  currency: z.string(),
  isActive: z.boolean(),
  productId: z.string(),
});
export type Sku = z.infer<typeof SkuSchema>;

export const PriceTierSchema = z.object({
  id: z.string(),
  minQty: z.number(),
  maxQty: z.number().nullable(),
  unit: z.string(),
  pricePerUnit: z.number(),
  skuId: z.string(),
});
export type PriceTier = z.infer<typeof PriceTierSchema>;

export const InventorySchema = z.object({
  id: z.string(),
  availableQty: z.number(),
  reservedQty: z.number(),
  unit: z.string(),
  warehouseLocation: z.string().nullable(),
  skuId: z.string(),
});
export type Inventory = z.infer<typeof InventorySchema>;

export const ProductImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  altText: z.string().nullable(),
  sortOrder: z.number(),
  isPrimary: z.boolean(),
  productId: z.string(),
});
export type ProductImage = z.infer<typeof ProductImageSchema>;

export const ProductDocumentSchema = z.object({
  id: z.string(),
  type: DocumentType,
  name: z.string(),
  url: z.string(),
  fileSize: z.number().nullable(),
  productId: z.string(),
});
export type ProductDocument = z.infer<typeof ProductDocumentSchema>;

// ==================== COMPANY INPUT SCHEMAS ====================

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  description: z.string().optional(),
});
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;

// ==================== SELLER PROFILE INPUT SCHEMAS ====================

export const UpdateSellerProfileSchema = z.object({
  company: UpdateCompanySchema.optional(),
  yearsInBusiness: z.number().int().min(0).optional(),
  annualCapacityKg: z.number().int().min(0).optional(),
  exportLicenseNo: z.string().optional(),
  isOrganic: z.boolean().optional(),
  isJasCertified: z.boolean().optional(),
  isUsdaCertified: z.boolean().optional(),
  isEuCertified: z.boolean().optional(),
  bio: z.string().optional(),
});
export type UpdateSellerProfileInput = z.infer<typeof UpdateSellerProfileSchema>;

// ==================== INVENTORY INPUT SCHEMAS ====================

export const CreateInventorySchema = z.object({
  availableQty: z.number().int().min(0),
  reservedQty: z.number().int().min(0).optional().default(0),
  unit: z.string().optional().default('unit'),
  warehouseLocation: z.string().optional(),
});
export type CreateInventoryInput = z.infer<typeof CreateInventorySchema>;

// ==================== PRICE TIER INPUT SCHEMAS ====================

export const CreatePriceTierSchema = z.object({
  minQty: z.number().int().positive(),
  maxQty: z.number().int().positive().optional(),
  unit: z.string().optional().default('kg'),
  pricePerUnit: z.number().positive(),
});
export type CreatePriceTierInput = z.infer<typeof CreatePriceTierSchema>;

// ==================== SKU INPUT SCHEMAS ====================

export const CreateSkuSchema = z.object({
  sku: z.string().min(1, 'SKU code is required'),
  name: z.string().min(1, 'SKU name is required'),
  packagingType: z.string().min(1, 'Packaging type is required'),
  netWeightG: z.number().int().positive('Net weight must be positive'),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  grossWeightG: z.number().int().positive().optional(),
  hsCode: z.string().optional(),
  originCountry: z.string().optional().default('JP'),
  currency: z.string().optional().default('USD'),
  priceTiers: z.array(CreatePriceTierSchema).optional(),
  inventory: CreateInventorySchema.optional(),
});
export type CreateSkuInput = z.infer<typeof CreateSkuSchema>;

export const UpdateSkuSchema = z.object({
  name: z.string().min(1).optional(),
  packagingType: z.string().optional(),
  netWeightG: z.number().int().positive().optional(),
  lengthCm: z.number().positive().optional().nullable(),
  widthCm: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  grossWeightG: z.number().int().positive().optional().nullable(),
  hsCode: z.string().optional().nullable(),
  originCountry: z.string().optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSkuInput = z.infer<typeof UpdateSkuSchema>;

// ==================== PRODUCT INPUT SCHEMAS ====================

export const CreateProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  leadTimeDays: z.number().int().positive().optional().default(14),
  moqKg: z.number().positive('MOQ must be positive'),
  certifications: z.array(z.string()).optional().default([]),
  status: ProductStatus.optional().default('DRAFT'),
  regionId: z.string().min(1, 'Region is required'),
  gradeTypeId: z.string().min(1, 'Grade type is required'),
  skus: z.array(CreateSkuSchema).optional(),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  shortDesc: z.string().optional().nullable(),
  leadTimeDays: z.number().int().positive().optional(),
  moqKg: z.number().positive().optional(),
  certifications: z.array(z.string()).optional(),
  status: ProductStatus.optional(),
  regionId: z.string().optional(),
  gradeTypeId: z.string().optional(),
});
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// ==================== SHORTLIST SCHEMAS ====================

export const AddToShortlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  notes: z.string().optional(),
});
export type AddToShortlistInput = z.infer<typeof AddToShortlistSchema>;

// ==================== MARKETPLACE QUERY SCHEMAS ====================

export const MarketplaceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  regionId: z.string().optional(),
  gradeTypeId: z.string().optional(),
  certification: z.string().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  moqMax: z.coerce.number().min(0).optional(),
  leadTimeMax: z.coerce.number().min(0).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  q: z.string().optional(),
  sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'moq_asc', 'lead_time', 'name', 'moq']).optional().default('newest'),
});
export type MarketplaceQueryInput = z.infer<typeof MarketplaceQuerySchema>;

// ==================== QUERY SCHEMAS ====================

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().optional(),
  status: ProductStatus.optional(),
  gradeTypeId: z.string().optional(),
  regionId: z.string().optional(),
});
export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;
