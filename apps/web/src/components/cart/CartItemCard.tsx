'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from './QuantitySelector';
import { useUpdateCartItem, useRemoveCartItem } from '@/hooks/useCart';
import type { CartItem } from '@/lib/api';

interface CartItemCardProps {
  item: CartItem;
}

export function CartItemCard({ item }: CartItemCardProps) {
  const [qty, setQty] = useState(item.qty);
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const handleQtyChange = async (newQty: number) => {
    setQty(newQty);
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        data: { qty: newQty },
      });
    } catch (error) {
      setQty(item.qty); // Revert on error
    }
  };

  const handleRemove = async () => {
    try {
      await removeItem.mutateAsync(item.id);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const isLoading = updateItem.isPending || removeItem.isPending;

  return (
    <div className="bg-white rounded-lg shadow p-4 flex gap-4">
      {/* Product Image */}
      <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-green-100 to-green-200 rounded-lg overflow-hidden">
        {item.sku.product.primaryImage ? (
          <img
            src={item.sku.product.primaryImage}
            alt={item.sku.product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            <span role="img" aria-label="Matcha">
              🍵
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div>
            <Link
              href={`/marketplace/products/${item.sku.product.id}`}
              className="font-semibold text-gray-900 hover:text-green-700 line-clamp-1"
            >
              {item.sku.product.name}
            </Link>
            <p className="text-sm text-gray-500">
              SKU: {item.sku.sku} • {item.sku.packagingType} • {item.sku.netWeightG}g
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{item.sku.product.seller.companyName}</span>
              {item.sku.product.seller.isVerified && (
                <span className="text-xs text-blue-600">✓ Verified</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-red-500"
            onClick={handleRemove}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </div>

        <div className="flex items-end justify-between mt-4">
          <QuantitySelector
            value={qty}
            onChange={handleQtyChange}
            min={item.sku.product.moqKg}
            max={item.sku.inventory?.availableQty}
            unit={item.unit}
            disabled={isLoading}
          />

          <div className="text-right">
            <p className="text-sm text-gray-500">
              ${item.unitPrice.toFixed(2)} / {item.unit}
            </p>
            <p className="text-lg font-semibold text-green-700">
              ${item.totalPrice.toFixed(2)} {item.currency}
            </p>
          </div>
        </div>

        {item.notes && (
          <p className="text-sm text-gray-500 mt-2 italic">Note: {item.notes}</p>
        )}

        {item.sku.inventory && item.sku.inventory.availableQty < 10 && (
          <p className="text-sm text-orange-600 mt-2">
            Only {item.sku.inventory.availableQty} {item.sku.inventory.unit} left
          </p>
        )}
      </div>
    </div>
  );
}
