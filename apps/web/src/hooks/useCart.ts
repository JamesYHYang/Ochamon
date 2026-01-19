'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { cartApi, Cart, CheckoutResult, RfqConvertResult } from '@/lib/api';

const CART_QUERY_KEY = ['cart'];

/**
 * Hook to fetch the user's active cart
 */
export function useCart() {
  const { accessToken, isAuthenticated, user } = useAuth();
  const isBuyer = user?.role === 'BUYER';

  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => {
      if (!accessToken) throw new Error('Not authenticated');
      return cartApi.getCart(accessToken);
    },
    enabled: isAuthenticated && isBuyer && !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to add an item to the cart
 */
export function useAddToCart() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { skuId: string; qty: number; unit?: string; notes?: string }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return cartApi.addItem(accessToken, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
  });
}

/**
 * Hook to update a cart item's quantity
 */
export function useUpdateCartItem() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: { qty?: number; notes?: string } }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return cartApi.updateItem(accessToken, itemId, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
  });
}

/**
 * Hook to remove an item from the cart
 */
export function useRemoveCartItem() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => {
      if (!accessToken) throw new Error('Not authenticated');
      return cartApi.removeItem(accessToken, itemId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
  });
}

/**
 * Hook to clear all items from the cart
 */
export function useClearCart() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!accessToken) throw new Error('Not authenticated');
      return cartApi.clearCart(accessToken);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
  });
}

/**
 * Hook for B2C direct checkout
 */
export function useCheckout() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      shipToName: string;
      shipToLine1: string;
      shipToLine2?: string;
      shipToCity: string;
      shipToState?: string;
      shipToPostal: string;
      shipToCountry: string;
      buyerNotes?: string;
    }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return cartApi.checkout(accessToken, data);
    },
    onSuccess: () => {
      // Invalidate cart query to fetch fresh empty cart
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

/**
 * Hook to convert cart to RFQ (B2B flow)
 */
export function useConvertToRfq() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      notes?: string;
      destinationCountry: string;
      destinationCity?: string;
      incoterm?: string;
      neededByDate?: string;
    }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return cartApi.convertToRfq(accessToken, data);
    },
    onSuccess: () => {
      // Invalidate cart query to fetch fresh empty cart
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

/**
 * Hook to get cart item count (for cart icon badge)
 */
export function useCartItemCount(): number {
  const { data: cart } = useCart();
  return cart?.itemCount ?? 0;
}
