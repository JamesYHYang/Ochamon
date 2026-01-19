import { z } from 'zod';
import { Incoterm } from './transaction';

// ==================== ENUMS ====================

export const CartType = z.enum(['DIRECT', 'RFQ']);
export type CartType = z.infer<typeof CartType>;

export const CartStatus = z.enum(['ACTIVE', 'CONVERTED', 'ABANDONED']);
export type CartStatus = z.infer<typeof CartStatus>;

// ==================== INPUT SCHEMAS ====================

export const AddToCartSchema = z.object({
  skuId: z.string().min(1, 'SKU ID is required'),
  qty: z.number().positive('Quantity must be positive'),
  unit: z.string().default('kg'),
  notes: z.string().optional(),
});
export type AddToCartInput = z.infer<typeof AddToCartSchema>;

export const UpdateCartItemSchema = z.object({
  qty: z.number().positive('Quantity must be positive').optional(),
  notes: z.string().optional(),
});
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;

export const CheckoutSchema = z.object({
  shipToName: z.string().min(1, 'Name is required'),
  shipToLine1: z.string().min(1, 'Address is required'),
  shipToLine2: z.string().optional(),
  shipToCity: z.string().min(1, 'City is required'),
  shipToState: z.string().optional(),
  shipToPostal: z.string().min(1, 'Postal code is required'),
  shipToCountry: z.string().min(2, 'Country is required'),
  buyerNotes: z.string().optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

export const ConvertToRfqSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  destinationCountry: z.string().min(2, 'Destination country is required'),
  destinationCity: z.string().optional(),
  incoterm: Incoterm.default('FOB'),
  neededByDate: z.string().or(z.date()).optional(),
});
export type ConvertToRfqInput = z.infer<typeof ConvertToRfqSchema>;

// ==================== RESPONSE SCHEMAS ====================

export const CartItemResponseSchema = z.object({
  id: z.string(),
  qty: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  currency: z.string(),
  notes: z.string().nullable(),
  skuId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  sku: z.object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
    packagingType: z.string(),
    netWeightG: z.number(),
    currency: z.string(),
    product: z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      moqKg: z.number(),
      seller: z.object({
        companyName: z.string(),
        isVerified: z.boolean(),
      }),
      primaryImage: z.string().nullable(),
    }),
    inventory: z.object({
      availableQty: z.number(),
      unit: z.string(),
    }).nullable(),
  }),
});
export type CartItemResponse = z.infer<typeof CartItemResponseSchema>;

export const CartResponseSchema = z.object({
  id: z.string(),
  type: CartType,
  status: CartStatus,
  destinationCountry: z.string().nullable(),
  incoterm: Incoterm.nullable(),
  subtotal: z.number(),
  currency: z.string(),
  itemCount: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  items: z.array(CartItemResponseSchema),
});
export type CartResponse = z.infer<typeof CartResponseSchema>;
