'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClearCart, useConvertToRfq } from '@/hooks/useCart';
import type { Cart } from '@/lib/api';

interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  const router = useRouter();
  const clearCart = useClearCart();
  const convertToRfq = useConvertToRfq();

  const [showRfqForm, setShowRfqForm] = useState(false);
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqCountry, setRfqCountry] = useState('');

  const handleCheckout = () => {
    router.push('/checkout');
  };

  const handleClearCart = async () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      await clearCart.mutateAsync();
    }
  };

  const handleConvertToRfq = async () => {
    if (!rfqTitle || !rfqCountry) {
      alert('Please fill in the required fields');
      return;
    }

    try {
      const result = await convertToRfq.mutateAsync({
        title: rfqTitle,
        destinationCountry: rfqCountry,
      });

      alert(`RFQ created successfully! RFQ Number: ${result.rfq.rfqNumber}`);
      router.push('/buyer/rfqs');
    } catch (error: any) {
      alert(error.message || 'Failed to create RFQ');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-4">
      <h2 className="text-xl font-bold mb-4">Order Summary</h2>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>Items ({cart.itemCount})</span>
          <span>${cart.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span>Calculated at checkout</span>
        </div>
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-semibold">
            <span>Subtotal</span>
            <span className="text-green-700">${cart.subtotal.toFixed(2)} {cart.currency}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
          onClick={handleCheckout}
          disabled={cart.itemCount === 0}
        >
          Proceed to Checkout
        </Button>

        <Button
          variant="outline"
          className="w-full border-green-600 text-green-600 hover:bg-green-50"
          size="lg"
          onClick={() => setShowRfqForm(!showRfqForm)}
          disabled={cart.itemCount === 0}
        >
          Request Quote (B2B)
        </Button>

        {showRfqForm && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold">Convert to RFQ</h3>
            <div>
              <Label htmlFor="rfqTitle">RFQ Title *</Label>
              <Input
                id="rfqTitle"
                value={rfqTitle}
                onChange={(e) => setRfqTitle(e.target.value)}
                placeholder="e.g., Bulk Ceremonial Grade Order"
              />
            </div>
            <div>
              <Label htmlFor="rfqCountry">Destination Country *</Label>
              <Input
                id="rfqCountry"
                value={rfqCountry}
                onChange={(e) => setRfqCountry(e.target.value)}
                placeholder="e.g., United States"
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleConvertToRfq}
              disabled={convertToRfq.isPending}
            >
              {convertToRfq.isPending ? 'Creating RFQ...' : 'Submit RFQ Request'}
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleClearCart}
          disabled={cart.itemCount === 0 || clearCart.isPending}
        >
          {clearCart.isPending ? 'Clearing...' : 'Clear Cart'}
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        All prices are in {cart.currency}. Shipping and taxes will be calculated at checkout.
      </p>
    </div>
  );
}
