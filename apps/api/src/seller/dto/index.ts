/**
 * Seller Module DTOs
 * 
 * This module re-exports Zod schemas and their inferred types from @matcha/shared.
 * All validation is handled by the ZodValidationPipe using these schemas.
 * 
 * Benefits:
 * - Single source of truth for validation (shared between frontend and backend)
 * - Type-safe DTOs inferred from Zod schemas
 * - Consistent validation error messages
 */

// Re-export all input schemas from shared package
export {
  // Product schemas
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
  
  // SKU schemas
  CreateSkuSchema,
  UpdateSkuSchema,
  
  // Price tier schemas
  CreatePriceTierSchema,
  
  // Inventory schemas
  CreateInventorySchema,
  
  // Seller profile schemas
  UpdateSellerProfileSchema,
  UpdateCompanySchema,
  
  // Product status enum
  ProductStatus,
} from '@matcha/shared';

// Re-export all input types
export type {
  // Product types
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
  
  // SKU types
  CreateSkuInput,
  UpdateSkuInput,
  
  // Price tier types
  CreatePriceTierInput,
  
  // Inventory types
  CreateInventoryInput,
  
  // Seller profile types
  UpdateSellerProfileInput,
  UpdateCompanyInput,
} from '@matcha/shared';

// Type aliases for backward compatibility with existing code
// These maintain the same names used in the controller
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
  CreateSkuInput,
  UpdateSkuInput,
  UpdateSellerProfileInput,
} from '@matcha/shared';

export type CreateProductDto = CreateProductInput;
export type UpdateProductDto = UpdateProductInput;
export type ProductQueryDto = ProductQueryInput;
export type CreateSkuDto = CreateSkuInput;
export type UpdateSkuDto = UpdateSkuInput;
export type UpdateSellerProfileDto = UpdateSellerProfileInput;
