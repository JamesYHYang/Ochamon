import { z } from 'zod';

export const Incoterm = z.enum(['EXW', 'FOB', 'CIF', 'DDP', 'DAP']);
export type Incoterm = z.infer<typeof Incoterm>;

export const RfqStatus = z.enum([
  'DRAFT', 'SUBMITTED', 'QUOTED', 'PARTIALLY_QUOTED', 'ACCEPTED', 'EXPIRED', 'CANCELLED'
]);
export type RfqStatus = z.infer<typeof RfqStatus>;

export const QuoteStatus = z.enum([
  'DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'
]);
export type QuoteStatus = z.infer<typeof QuoteStatus>;

export const OrderStatus = z.enum([
  'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT',
  'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

// RFQ Schemas
export const RfqLineItemSchema = z.object({
  id: z.string(),
  qty: z.number(),
  unit: z.string(),
  notes: z.string().nullable(),
  targetPrice: z.number().nullable(),
  rfqId: z.string(),
  skuId: z.string(),
});
export type RfqLineItem = z.infer<typeof RfqLineItemSchema>;

export const RfqSchema = z.object({
  id: z.string(),
  rfqNumber: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  destinationCountry: z.string(),
  destinationCity: z.string().nullable(),
  incoterm: Incoterm,
  neededByDate: z.string().or(z.date()).nullable(),
  expiresAt: z.string().or(z.date()).nullable(),
  status: RfqStatus,
  submittedAt: z.string().or(z.date()).nullable(),
  buyerProfileId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Rfq = z.infer<typeof RfqSchema>;

// Quote Schemas
export const QuoteLineItemSchema = z.object({
  id: z.string(),
  qty: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  notes: z.string().nullable(),
  quoteId: z.string(),
  skuId: z.string(),
});
export type QuoteLineItem = z.infer<typeof QuoteLineItemSchema>;

export const QuoteSchema = z.object({
  id: z.string(),
  quoteNumber: z.string(),
  subtotal: z.number(),
  shippingCost: z.number().nullable(),
  taxAmount: z.number().nullable(),
  totalAmount: z.number(),
  currency: z.string(),
  incoterm: Incoterm,
  estimatedLeadDays: z.number().nullable(),
  notes: z.string().nullable(),
  termsConditions: z.string().nullable(),
  validUntil: z.string().or(z.date()),
  status: QuoteStatus,
  submittedAt: z.string().or(z.date()).nullable(),
  acceptedAt: z.string().or(z.date()).nullable(),
  rfqId: z.string(),
  sellerProfileId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Quote = z.infer<typeof QuoteSchema>;

// Order Schemas
export const OrderLineItemSchema = z.object({
  id: z.string(),
  qty: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  orderId: z.string(),
  skuId: z.string(),
});
export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  subtotal: z.number(),
  shippingCost: z.number().nullable(),
  taxAmount: z.number().nullable(),
  totalAmount: z.number(),
  currency: z.string(),
  status: OrderStatus,
  shipToName: z.string(),
  shipToLine1: z.string(),
  shipToLine2: z.string().nullable(),
  shipToCity: z.string(),
  shipToState: z.string().nullable(),
  shipToPostal: z.string(),
  shipToCountry: z.string(),
  trackingNumber: z.string().nullable(),
  carrier: z.string().nullable(),
  shippedAt: z.string().or(z.date()).nullable(),
  deliveredAt: z.string().or(z.date()).nullable(),
  buyerNotes: z.string().nullable(),
  sellerNotes: z.string().nullable(),
  quoteId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderStatusHistorySchema = z.object({
  id: z.string(),
  status: OrderStatus,
  notes: z.string().nullable(),
  changedBy: z.string().nullable(),
  orderId: z.string(),
  createdAt: z.string().or(z.date()),
});
export type OrderStatusHistory = z.infer<typeof OrderStatusHistorySchema>;

// Input Schemas
export const CreateRfqLineItemSchema = z.object({
  skuId: z.string(),
  qty: z.number().positive(),
  unit: z.string().default('kg'),
  notes: z.string().optional(),
  targetPrice: z.number().positive().optional(),
});
export type CreateRfqLineItemInput = z.infer<typeof CreateRfqLineItemSchema>;

export const CreateRfqSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  destinationCountry: z.string().min(2),
  destinationCity: z.string().optional(),
  incoterm: Incoterm.default('FOB'),
  neededByDate: z.string().or(z.date()).optional(),
  lineItems: z.array(CreateRfqLineItemSchema).min(1),
});
export type CreateRfqInput = z.infer<typeof CreateRfqSchema>;

export const CreateQuoteLineItemSchema = z.object({
  skuId: z.string(),
  qty: z.number().positive(),
  unit: z.string().default('kg'),
  unitPrice: z.number().positive(),
  notes: z.string().optional(),
});
export type CreateQuoteLineItemInput = z.infer<typeof CreateQuoteLineItemSchema>;

export const CreateQuoteSchema = z.object({
  rfqId: z.string(),
  incoterm: Incoterm,
  shippingCost: z.number().min(0).optional(),
  estimatedLeadDays: z.number().positive().optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  validUntil: z.string().or(z.date()),
  lineItems: z.array(CreateQuoteLineItemSchema).min(1),
});
export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;

export const AcceptQuoteSchema = z.object({
  quoteId: z.string(),
  shipToName: z.string().min(1),
  shipToLine1: z.string().min(1),
  shipToLine2: z.string().optional(),
  shipToCity: z.string().min(1),
  shipToState: z.string().optional(),
  shipToPostal: z.string().min(1),
  shipToCountry: z.string().min(2),
  buyerNotes: z.string().optional(),
});
export type AcceptQuoteInput = z.infer<typeof AcceptQuoteSchema>;
