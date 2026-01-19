'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from './QuantitySelector';
import { useAuth } from '@/lib/auth';
import { useAddToCart } from '@/hooks/useCart';

interface AddToCartButtonProps {
  skuId: string;
  productName: string;
  minQty: number;
  maxQty?: number;
  unit?: string;
  onSuccess?: () => void;
}

export function AddToCartButton({
  skuId,
  productName,
  minQty,
  maxQty,
  unit = 'kg',
  onSuccess,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const isBuyer = user?.role === 'BUYER';

  const [qty, setQty] = useState(minQty);
  const [showSuccess, setShowSuccess] = useState(false);

  const addToCart = useAddToCart();

  const handleAddToCart = async () => {
    if (!isAuthenticated || !isBuyer) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      await addToCart.mutateAsync({
        skuId,
        qty,
        unit,
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={() => router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))}
      >
        Sign in to Add to Cart
      </Button>
    );
  }

  if (!isBuyer) {
    return (
      <div className="text-sm text-gray-500 text-center py-2">
        Only buyers can add items to cart
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Quantity:</span>
        <QuantitySelector
          value={qty}
          onChange={setQty}
          min={minQty}
          max={maxQty}
          unit={unit}
          disabled={addToCart.isPending}
        />
      </div>

      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={handleAddToCart}
        disabled={addToCart.isPending || (maxQty !== undefined && maxQty <= 0)}
      >
        {addToCart.isPending ? (
          'Adding...'
        ) : showSuccess ? (
          'Added to Cart!'
        ) : maxQty !== undefined && maxQty <= 0 ? (
          'Out of Stock'
        ) : (
          'Add to Cart'
        )}
      </Button>

      {addToCart.isError && (
        <p className="text-red-500 text-sm text-center">
          {(addToCart.error as any)?.message || 'Failed to add to cart'}
        </p>
      )}
    </div>
  );
}
