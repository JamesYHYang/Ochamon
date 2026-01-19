'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/hooks/useCart';
import { CartItemCard, CartSummary, CartEmptyState, CartIcon } from '@/components/cart';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const isBuyer = user?.role === 'BUYER';
  const { data: cart, isLoading: cartLoading, error } = useCart();

  // Redirect if not authenticated or not a buyer
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/cart');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (!isBuyer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only buyers can access the shopping cart.</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Cart</h1>
          <p className="text-gray-600 mb-6">
            {(error as any)?.message || 'Something went wrong. Please try again.'}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/marketplace" className="text-green-700 hover:underline">
            ← Continue Shopping
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {!cart || cart.items.length === 0 ? (
          <CartEmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <CartItemCard key={item.id} item={item} />
              ))}
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <CartSummary cart={cart} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-green-700">
          🍵 Matcha Trade
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/marketplace">
            <Button variant="ghost">Marketplace</Button>
          </Link>
          <CartIcon />
          {user && (
            <>
              <Link href={user.role === 'BUYER' ? '/buyer' : '/seller'}>
                <Button variant="outline">Dashboard</Button>
              </Link>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
