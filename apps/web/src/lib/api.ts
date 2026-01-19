const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
};

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message || 'An error occurred',
      data.errors
    );
  }

  return data as T;
}

// Auth API functions
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'BUYER' | 'SELLER' | 'ADMIN';
    companyName: string | null;
    isVerified: boolean;
    createdAt: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  companyName: string | null;
  isVerified: boolean;
  createdAt: string;
}

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    role?: 'BUYER' | 'SELLER';
    companyName?: string;
  }) => api<AuthResponse>('/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: data }),

  refresh: (refreshToken: string, accessToken: string) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      token: accessToken,
    }),

  logout: (token: string) =>
    api<{ message: string }>('/auth/logout', { method: 'POST', token }),

  me: (token: string) => api<UserResponse>('/auth/me', { token }),
};

// ==================== SELLER API ====================

export interface SellerProfile {
  id: string;
  verificationStatus: string;
  yearsInBusiness: number | null;
  annualCapacityKg: number | null;
  exportLicenseNo: string | null;
  isOrganic: boolean;
  isJasCertified: boolean;
  isUsdaCertified: boolean;
  isEuCertified: boolean;
  bio: string | null;
  company: {
    id: string;
    name: string;
    legalName: string | null;
    taxId: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    description: string | null;
    addresses: Array<{
      id: string;
      label: string | null;
      line1: string;
      line2: string | null;
      city: string;
      state: string | null;
      postalCode: string;
      country: string;
    }>;
  };
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  leadTimeDays: number;
  moqKg: number;
  certifications: string[];
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isFeatured: boolean;
  region: { id: string; name: string; country: string };
  gradeType: { id: string; name: string; code: string };
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  skus: Array<{
    id: string;
    sku: string;
    name: string;
    packagingType: string;
    netWeightG: number;
    isActive: boolean;
    inventory: {
      id: string;
      availableQty: number;
      reservedQty: number;
      unit: string;
      warehouseLocation: string | null;
    } | null;
    priceTiers: Array<{
      id: string;
      minQty: number;
      maxQty: number | null;
      unit: string;
      pricePerUnit: number;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Region {
  id: string;
  name: string;
  country: string;
  description: string | null;
}

export interface GradeType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sortOrder: number;
}

async function apiFormData<T>(
  endpoint: string,
  formData: FormData,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message || 'An error occurred',
      data.errors
    );
  }

  return data as T;
}

export const sellerApi = {
  // Profile
  getProfile: (token: string) =>
    api<SellerProfile>('/seller/profile', { token }),

  updateProfile: (token: string, data: any) =>
    api<SellerProfile>('/seller/profile', { method: 'PUT', body: data, token }),

  // Lookups
  getRegions: (token: string) =>
    api<Region[]>('/seller/regions', { token }),

  getGradeTypes: (token: string) =>
    api<GradeType[]>('/seller/grade-types', { token }),

  // Products
  getProducts: (
    token: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      gradeTypeId?: string;
      regionId?: string;
    }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.gradeTypeId) searchParams.set('gradeTypeId', params.gradeTypeId);
    if (params?.regionId) searchParams.set('regionId', params.regionId);
    const query = searchParams.toString();
    return api<ProductsResponse>(`/seller/products${query ? `?${query}` : ''}`, { token });
  },

  getProduct: (token: string, id: string) =>
    api<Product>(`/seller/products/${id}`, { token }),

  createProduct: (token: string, data: any) =>
    api<Product>('/seller/products', { method: 'POST', body: data, token }),

  updateProduct: (token: string, id: string, data: any) =>
    api<Product>(`/seller/products/${id}`, { method: 'PUT', body: data, token }),

  deleteProduct: (token: string, id: string) =>
    api<{ success: boolean }>(`/seller/products/${id}`, { method: 'DELETE', token }),

  // Product Images
  uploadProductImage: (token: string, productId: string, file: File, isPrimary: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPrimary', String(isPrimary));
    return apiFormData<any>(`/seller/products/${productId}/images`, formData, token);
  },

  deleteProductImage: (token: string, productId: string, imageId: string) =>
    api<{ success: boolean }>(`/seller/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
      token,
    }),

  // SKUs
  addSku: (token: string, productId: string, data: any) =>
    api<any>(`/seller/products/${productId}/skus`, {
      method: 'POST',
      body: data,
      token,
    }),

  updateSku: (token: string, productId: string, skuId: string, data: any) =>
    api<any>(`/seller/products/${productId}/skus/${skuId}`, {
      method: 'PUT',
      body: data,
      token,
    }),

  deleteSku: (token: string, productId: string, skuId: string) =>
    api<{ success: boolean }>(`/seller/products/${productId}/skus/${skuId}`, {
      method: 'DELETE',
      token,
    }),
};

// ==================== CART API ====================

export interface CartItemSku {
  id: string;
  sku: string;
  name: string;
  packagingType: string;
  netWeightG: number;
  currency: string;
  product: {
    id: string;
    name: string;
    slug: string;
    moqKg: number;
    seller: {
      companyName: string;
      isVerified: boolean;
    };
    primaryImage: string | null;
  };
  inventory: {
    availableQty: number;
    unit: string;
  } | null;
}

export interface CartItem {
  id: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  notes: string | null;
  skuId: string;
  createdAt: string;
  updatedAt: string;
  sku: CartItemSku;
}

export interface Cart {
  id: string;
  type: 'DIRECT' | 'RFQ';
  status: 'ACTIVE' | 'CONVERTED' | 'ABANDONED';
  destinationCountry: string | null;
  incoterm: string | null;
  subtotal: number;
  currency: string;
  itemCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
}

export interface CheckoutResult {
  success: boolean;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    currency: string;
  }>;
}

export interface RfqConvertResult {
  success: boolean;
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
    status: string;
    lineItemCount: number;
  };
}

export const cartApi = {
  getCart: (token: string) =>
    api<Cart>('/cart', { token }),

  addItem: (token: string, data: { skuId: string; qty: number; unit?: string; notes?: string }) =>
    api<Cart>('/cart/items', { method: 'POST', body: data, token }),

  updateItem: (token: string, itemId: string, data: { qty?: number; notes?: string }) =>
    api<Cart>(`/cart/items/${itemId}`, { method: 'PATCH', body: data, token }),

  removeItem: (token: string, itemId: string) =>
    api<Cart>(`/cart/items/${itemId}`, { method: 'DELETE', token }),

  clearCart: (token: string) =>
    api<Cart>('/cart', { method: 'DELETE', token }),

  checkout: (token: string, data: {
    shipToName: string;
    shipToLine1: string;
    shipToLine2?: string;
    shipToCity: string;
    shipToState?: string;
    shipToPostal: string;
    shipToCountry: string;
    buyerNotes?: string;
  }) =>
    api<CheckoutResult>('/cart/checkout', { method: 'POST', body: data, token }),

  convertToRfq: (token: string, data: {
    title: string;
    notes?: string;
    destinationCountry: string;
    destinationCity?: string;
    incoterm?: string;
    neededByDate?: string;
  }) =>
    api<RfqConvertResult>('/cart/convert-to-rfq', { method: 'POST', body: data, token }),
};

// ==================== RFQ API ====================

export const rfqApi = {
  // Buyer endpoints
  createRfq: (token: string, data: {
    title: string;
    notes?: string;
    destinationCountry: string;
    destinationCity?: string;
    incoterm?: string;
    neededByDate?: string;
    lineItems: Array<{ skuId: string; qty: number; unit?: string; notes?: string; targetPrice?: number }>;
  }) =>
    api<any>('/rfq', { method: 'POST', body: data, token }),

  getBuyerRfqs: (token: string) =>
    api<any[]>('/rfq/buyer', { token }),

  getBuyerRfqDetail: (token: string, rfqId: string) =>
    api<any>(`/rfq/buyer/${rfqId}`, { token }),

  // Seller endpoints
  getSellerRfqs: (token: string) =>
    api<any[]>('/rfq/seller', { token }),

  getSellerRfqDetail: (token: string, rfqId: string) =>
    api<any>(`/rfq/seller/${rfqId}`, { token }),
};

// ==================== QUOTE API ====================

export const quoteApi = {
  // Seller endpoints
  createQuote: (token: string, data: {
    rfqId: string;
    incoterm: string;
    shippingCost?: number;
    estimatedLeadDays?: number;
    notes?: string;
    termsConditions?: string;
    validUntil: string;
    lineItems: Array<{ skuId: string; qty: number; unit?: string; unitPrice: number; notes?: string }>;
  }) =>
    api<any>('/quote', { method: 'POST', body: data, token }),

  getSellerQuotes: (token: string) =>
    api<any[]>('/quote/seller', { token }),

  getSellerQuoteDetail: (token: string, quoteId: string) =>
    api<any>(`/quote/seller/${quoteId}`, { token }),

  // Buyer endpoints
  getBuyerQuotes: (token: string) =>
    api<any[]>('/quote/buyer', { token }),

  acceptQuote: (token: string, data: {
    quoteId: string;
    shipToName: string;
    shipToLine1: string;
    shipToLine2?: string;
    shipToCity: string;
    shipToState?: string;
    shipToPostal: string;
    shipToCountry: string;
    buyerNotes?: string;
  }) =>
    api<any>('/quote/accept', { method: 'POST', body: data, token }),
};

// ==================== ORDER API ====================

export const orderApi = {
  // Buyer endpoints
  getBuyerOrders: (token: string) =>
    api<any[]>('/order/buyer', { token }),

  getBuyerOrderDetail: (token: string, orderId: string) =>
    api<any>(`/order/buyer/${orderId}`, { token }),

  // Seller endpoints
  getSellerOrders: (token: string) =>
    api<any[]>('/order/seller', { token }),

  getSellerOrderDetail: (token: string, orderId: string) =>
    api<any>(`/order/seller/${orderId}`, { token }),

  updateOrderStatus: (token: string, orderId: string, data: {
    status: string;
    notes?: string;
    trackingNumber?: string;
    carrier?: string;
  }) =>
    api<any>(`/order/seller/${orderId}/status`, { method: 'PATCH', body: data, token }),
};

// ==================== MESSAGING API ====================

export const messagingApi = {
  getMessages: (token: string, rfqId: string) =>
    api<any>(`/messaging/rfq/${rfqId}`, { token }),

  sendMessage: (token: string, rfqId: string, body: string) =>
    api<any>(`/messaging/rfq/${rfqId}`, { method: 'POST', body: { body }, token }),
};

// ==================== COMPLIANCE API ====================

export interface ComplianceRule {
  id: string;
  destinationCountry: string;
  productCategory: string;
  minDeclaredValueUsd: number | null;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  requiredCertifications: string[];
  requiredDocs: string[];
  warnings: string[];
  disclaimerText: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string;
}

export interface ComplianceEvaluationResult {
  requiredDocs: string[];
  warnings: string[];
  flags: string[];
  disclaimerText: string;
  appliedRuleIds: string[];
  complianceLevel: 'low' | 'medium' | 'high';
  missingCertifications?: string[];
  evaluationId?: string;
}

export interface ComplianceEvaluation {
  id: string;
  rfqId: string | null;
  quoteId: string | null;
  orderId: string | null;
  destinationCountry: string;
  productCategory: string;
  declaredValueUsd: number;
  weightKg: number;
  appliedRuleIds: string[];
  requiredDocs: string[];
  warnings: string[];
  flags: string[];
  disclaimerText: string;
  complianceLevel: string;
  evaluatedAt: string;
}

export interface PaginatedComplianceRules {
  data: ComplianceRule[];
  meta: {
    total: number;
    skip: number;
    take: number;
    totalPages: number;
  };
}

export interface CreateComplianceRuleData {
  destinationCountry: string;
  productCategory: string;
  minDeclaredValueUsd?: number | null;
  minWeightKg?: number | null;
  maxWeightKg?: number | null;
  requiredCertifications?: string[];
  requiredDocs: string[];
  warnings?: string[];
  disclaimerText: string;
  isActive?: boolean;
}

export interface UpdateComplianceRuleData extends Partial<CreateComplianceRuleData> {}

export interface EvaluateComplianceData {
  destinationCountry: string;
  productCategory: string;
  declaredValueUsd: number;
  weightKg: number;
  certifications?: string[];
  rfqId?: string;
  quoteId?: string;
  orderId?: string;
}

export const complianceApi = {
  // Evaluation endpoints (available to all authenticated users)
  evaluate: (token: string, data: EvaluateComplianceData) =>
    api<ComplianceEvaluationResult>('/compliance/evaluate', {
      method: 'POST',
      body: data,
      token,
    }),

  getEvaluationsByRfq: (token: string, rfqId: string) =>
    api<ComplianceEvaluation[]>(`/compliance/rfq/${rfqId}`, { token }),

  getEvaluationsByQuote: (token: string, quoteId: string) =>
    api<ComplianceEvaluation[]>(`/compliance/quote/${quoteId}`, { token }),

  getEvaluationsByOrder: (token: string, orderId: string) =>
    api<ComplianceEvaluation[]>(`/compliance/order/${orderId}`, { token }),

  // Admin endpoints (ADMIN only)
  createRule: (token: string, data: CreateComplianceRuleData) =>
    api<ComplianceRule>('/admin/compliance-rules', {
      method: 'POST',
      body: data,
      token,
    }),

  listRules: (
    token: string,
    params?: {
      destinationCountry?: string;
      productCategory?: string;
      activeOnly?: boolean;
      skip?: number;
      take?: number;
    }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.destinationCountry)
      searchParams.set('destinationCountry', params.destinationCountry);
    if (params?.productCategory)
      searchParams.set('productCategory', params.productCategory);
    if (params?.activeOnly !== undefined)
      searchParams.set('activeOnly', String(params.activeOnly));
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.take !== undefined) searchParams.set('take', String(params.take));
    const query = searchParams.toString();
    return api<PaginatedComplianceRules>(
      `/admin/compliance-rules${query ? `?${query}` : ''}`,
      { token }
    );
  },

  getRule: (token: string, id: string) =>
    api<ComplianceRule>(`/admin/compliance-rules/${id}`, { token }),

  updateRule: (token: string, id: string, data: UpdateComplianceRuleData) =>
    api<ComplianceRule>(`/admin/compliance-rules/${id}`, {
      method: 'PUT',
      body: data,
      token,
    }),

  deleteRule: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/admin/compliance-rules/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// ==================== INSIGHTS API ====================

export interface InsightsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImage: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  viewCount: number;
  authorId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  related?: InsightsPost[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface PaginatedInsights {
  data: InsightsPost[];
  meta: {
    total: number;
    skip: number;
    take: number;
    totalPages: number;
  };
}

export interface CreateInsightsPostData {
  title: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  categoryId: string;
  tagIds?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateInsightsPostData extends Partial<CreateInsightsPostData> {}

export const insightsApi = {
  // Public endpoints
  getInsights: (params?: {
    skip?: number;
    take?: number;
    categoryId?: string;
    tag?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.take !== undefined) searchParams.set('take', String(params.take));
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return api<PaginatedInsights>(`/insights${query ? `?${query}` : ''}`);
  },

  getInsightBySlug: (slug: string) =>
    api<InsightsPost & { related: InsightsPost[] }>(`/insights/${slug}`),

  getCategories: () => api<Category[]>('/insights/categories'),

  getTags: () => api<Tag[]>('/insights/tags'),

  // Admin endpoints
  adminListInsights: (
    token: string,
    params?: {
      skip?: number;
      take?: number;
      status?: 'DRAFT' | 'PUBLISHED' | 'ALL';
      categoryId?: string;
      search?: string;
    }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.take !== undefined) searchParams.set('take', String(params.take));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return api<PaginatedInsights>(`/admin/insights${query ? `?${query}` : ''}`, { token });
  },

  adminGetInsight: (token: string, id: string) =>
    api<InsightsPost>(`/admin/insights/${id}`, { token }),

  adminCreateInsight: (token: string, data: CreateInsightsPostData) =>
    api<InsightsPost>('/admin/insights', { method: 'POST', body: data, token }),

  adminUpdateInsight: (token: string, id: string, data: UpdateInsightsPostData) =>
    api<InsightsPost>(`/admin/insights/${id}`, { method: 'PUT', body: data, token }),

  adminPublishInsight: (token: string, id: string) =>
    api<InsightsPost>(`/admin/insights/${id}/publish`, { method: 'POST', token }),

  adminUnpublishInsight: (token: string, id: string) =>
    api<InsightsPost>(`/admin/insights/${id}/unpublish`, { method: 'POST', token }),

  adminDeleteInsight: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/admin/insights/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// ==================== TRENDS API ====================

export interface TrendSeries {
  id: string;
  name: string;
  description: string | null;
  type: 'PRICING' | 'WEATHER' | 'DEMAND' | 'SUPPLY';
  unit: string;
  isActive: boolean;
  regionId: string | null;
  createdAt: string;
  updatedAt: string;
  region?: {
    id: string;
    name: string;
    country: string;
  };
  dataPoints?: TrendPoint[];
  _count?: {
    dataPoints: number;
  };
}

export interface TrendPoint {
  id: string;
  date: string;
  value: number;
  unit: string;
  metadata: Record<string, unknown> | null;
  seriesId: string;
  createdAt: string;
}

export interface PaginatedTrendSeries {
  data: TrendSeries[];
  meta: {
    total: number;
    skip: number;
    take: number;
    totalPages: number;
  };
}

export interface CreateTrendSeriesData {
  name: string;
  description?: string;
  type: 'PRICING' | 'WEATHER' | 'DEMAND' | 'SUPPLY';
  unit: string;
  regionId?: string;
  isActive?: boolean;
}

export interface UpdateTrendSeriesData extends Partial<CreateTrendSeriesData> {}

export interface CreateTrendPointData {
  date: string;
  value: number;
  unit: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTrendPointData extends Partial<CreateTrendPointData> {}

export const trendsApi = {
  // Public endpoints
  getTrendSeries: (params?: {
    type?: 'PRICING' | 'WEATHER' | 'DEMAND' | 'SUPPLY';
    regionId?: string;
    skip?: number;
    take?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.regionId) searchParams.set('regionId', params.regionId);
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.take !== undefined) searchParams.set('take', String(params.take));
    const query = searchParams.toString();
    return api<PaginatedTrendSeries>(`/trends${query ? `?${query}` : ''}`);
  },

  getTrendSeriesById: (id: string, params?: { startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString();
    return api<TrendSeries & { dataPoints: TrendPoint[] }>(
      `/trends/${id}${query ? `?${query}` : ''}`
    );
  },

  getTrendTypes: () => api<string[]>('/trends/types'),

  getLatestTrends: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api<TrendSeries[]>(`/trends/latest${query}`);
  },

  // Admin endpoints
  adminListTrendSeries: (
    token: string,
    params?: {
      type?: 'PRICING' | 'WEATHER' | 'DEMAND' | 'SUPPLY';
      regionId?: string;
      isPublic?: boolean;
      skip?: number;
      take?: number;
    }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.regionId) searchParams.set('regionId', params.regionId);
    if (params?.isPublic !== undefined) searchParams.set('isPublic', String(params.isPublic));
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.take !== undefined) searchParams.set('take', String(params.take));
    const query = searchParams.toString();
    return api<PaginatedTrendSeries>(`/admin/trends${query ? `?${query}` : ''}`, { token });
  },

  adminGetTrendSeries: (token: string, id: string) =>
    api<TrendSeries & { dataPoints: TrendPoint[] }>(`/admin/trends/${id}`, { token }),

  adminCreateTrendSeries: (token: string, data: CreateTrendSeriesData) =>
    api<TrendSeries>('/admin/trends', { method: 'POST', body: data, token }),

  adminUpdateTrendSeries: (token: string, id: string, data: UpdateTrendSeriesData) =>
    api<TrendSeries>(`/admin/trends/${id}`, { method: 'PUT', body: data, token }),

  adminToggleTrendSeriesActive: (token: string, id: string) =>
    api<TrendSeries>(`/admin/trends/${id}/toggle-active`, { method: 'POST', token }),

  adminDeleteTrendSeries: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/admin/trends/${id}`, {
      method: 'DELETE',
      token,
    }),

  // Data point endpoints (admin)
  adminAddTrendPoint: (token: string, seriesId: string, data: CreateTrendPointData) =>
    api<TrendPoint>(`/admin/trends/${seriesId}/points`, {
      method: 'POST',
      body: data,
      token,
    }),

  adminBulkAddTrendPoints: (token: string, seriesId: string, points: CreateTrendPointData[]) =>
    api<{ count: number }>(`/admin/trends/${seriesId}/points/bulk`, {
      method: 'POST',
      body: { points },
      token,
    }),

  adminUpdateTrendPoint: (token: string, pointId: string, data: UpdateTrendPointData) =>
    api<TrendPoint>(`/admin/trends/points/${pointId}`, {
      method: 'PUT',
      body: data,
      token,
    }),

  adminDeleteTrendPoint: (token: string, pointId: string) =>
    api<{ success: boolean; message: string }>(`/admin/trends/points/${pointId}`, {
      method: 'DELETE',
      token,
    }),
};

// ==================== LIBRARY API ====================

export interface LibraryRegion {
  id: string;
  name: string;
  country: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
    trendSeries?: number;
  };
}

export interface LibraryGradeType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export const libraryApi = {
  // Regions
  getRegions: (withCounts?: boolean) => {
    const query = withCounts ? '?withCounts=true' : '';
    return api<LibraryRegion[]>(`/library/regions${query}`);
  },

  getRegionById: (id: string) =>
    api<LibraryRegion>(`/library/regions/${id}`),

  getCountries: () => api<string[]>('/library/regions/countries'),

  getRegionsByCountry: (country: string) =>
    api<LibraryRegion[]>(`/library/regions/country/${encodeURIComponent(country)}`),

  // Grade Types
  getGradeTypes: (withCounts?: boolean) => {
    const query = withCounts ? '?withCounts=true' : '';
    return api<LibraryGradeType[]>(`/library/grades${query}`);
  },

  getGradeTypeById: (id: string) =>
    api<LibraryGradeType>(`/library/grades/${id}`),

  getGradeTypeByCode: (code: string) =>
    api<LibraryGradeType>(`/library/grades/code/${encodeURIComponent(code)}`),
};
