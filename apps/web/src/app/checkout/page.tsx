'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { useCart, useCheckout } from '@/hooks/useCart';
import { CartIcon } from '@/components/cart';

interface ShippingForm {
  shipToName: string;
  shipToLine1: string;
  shipToLine2: string;
  shipToCity: string;
  shipToState: string;
  shipToPostal: string;
  shipToCountry: string;
  buyerNotes: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const isBuyer = user?.role === 'BUYER';
  const { data: cart, isLoading: cartLoading } = useCart();
  const checkout = useCheckout();

  const [form, setForm] = useState<ShippingForm>({
    shipToName: '',
    shipToLine1: '',
    shipToLine2: '',
    shipToCity: '',
    shipToState: '',
    shipToPostal: '',
    shipToCountry: '',
    buyerNotes: '',
  });

  const [errors, setErrors] = useState<Partial<ShippingForm>>({});

  // Redirect if not authenticated or not a buyer
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && cart && cart.items.length === 0) {
      router.push('/cart');
    }
  }, [cartLoading, cart, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name as keyof ShippingForm]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingForm> = {};

    if (!form.shipToName.trim()) newErrors.shipToName = 'Name is required';
    if (!form.shipToLine1.trim()) newErrors.shipToLine1 = 'Address is required';
    if (!form.shipToCity.trim()) newErrors.shipToCity = 'City is required';
    if (!form.shipToPostal.trim()) newErrors.shipToPostal = 'Postal code is required';
    if (!form.shipToCountry.trim()) newErrors.shipToCountry = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const result = await checkout.mutateAsync({
        shipToName: form.shipToName,
        shipToLine1: form.shipToLine1,
        shipToLine2: form.shipToLine2 || undefined,
        shipToCity: form.shipToCity,
        shipToState: form.shipToState || undefined,
        shipToPostal: form.shipToPostal,
        shipToCountry: form.shipToCountry,
        buyerNotes: form.buyerNotes || undefined,
      });

      // Redirect to confirmation page
      router.push(`/checkout/confirmation?orders=${result.orders.map((o) => o.orderNumber).join(',')}`);
    } catch (error: any) {
      alert(error.message || 'Checkout failed. Please try again.');
    }
  };

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

  if (!isAuthenticated || !isBuyer) {
    return null; // Will redirect
  }

  if (!cart || cart.items.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/cart" className="text-green-700 hover:underline">
            ← Back to Cart
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shipping Address Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Shipping Address</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="shipToName">Full Name *</Label>
                    <Input
                      id="shipToName"
                      name="shipToName"
                      value={form.shipToName}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className={errors.shipToName ? 'border-red-500' : ''}
                    />
                    {errors.shipToName && (
                      <p className="text-red-500 text-sm mt-1">{errors.shipToName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="shipToLine1">Address Line 1 *</Label>
                    <Input
                      id="shipToLine1"
                      name="shipToLine1"
                      value={form.shipToLine1}
                      onChange={handleChange}
                      placeholder="123 Main Street"
                      className={errors.shipToLine1 ? 'border-red-500' : ''}
                    />
                    {errors.shipToLine1 && (
                      <p className="text-red-500 text-sm mt-1">{errors.shipToLine1}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="shipToLine2">Address Line 2</Label>
                    <Input
                      id="shipToLine2"
                      name="shipToLine2"
                      value={form.shipToLine2}
                      onChange={handleChange}
                      placeholder="Apt, Suite, Unit, etc. (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shipToCity">City *</Label>
                      <Input
                        id="shipToCity"
                        name="shipToCity"
                        value={form.shipToCity}
                        onChange={handleChange}
                        placeholder="New York"
                        className={errors.shipToCity ? 'border-red-500' : ''}
                      />
                      {errors.shipToCity && (
                        <p className="text-red-500 text-sm mt-1">{errors.shipToCity}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="shipToState">State / Province</Label>
                      <Input
                        id="shipToState"
                        name="shipToState"
                        value={form.shipToState}
                        onChange={handleChange}
                        placeholder="NY"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shipToPostal">Postal Code *</Label>
                      <Input
                        id="shipToPostal"
                        name="shipToPostal"
                        value={form.shipToPostal}
                        onChange={handleChange}
                        placeholder="10001"
                        className={errors.shipToPostal ? 'border-red-500' : ''}
                      />
                      {errors.shipToPostal && (
                        <p className="text-red-500 text-sm mt-1">{errors.shipToPostal}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="shipToCountry">Country *</Label>
                      <Input
                        id="shipToCountry"
                        name="shipToCountry"
                        value={form.shipToCountry}
                        onChange={handleChange}
                        placeholder="United States"
                        className={errors.shipToCountry ? 'border-red-500' : ''}
                      />
                      {errors.shipToCountry && (
                        <p className="text-red-500 text-sm mt-1">{errors.shipToCountry}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="buyerNotes">Order Notes</Label>
                    <textarea
                      id="buyerNotes"
                      name="buyerNotes"
                      value={form.buyerNotes}
                      onChange={handleChange}
                      placeholder="Special instructions for your order (optional)"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <h2 className="text-xl font-semibold">Order Summary</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items Preview */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-green-100 to-green-200 rounded overflow-hidden">
                          {item.sku.product.primaryImage ? (
                            <img
                              src={item.sku.product.primaryImage}
                              alt={item.sku.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">
                              🍵
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.sku.product.name}</p>
                          <p className="text-xs text-gray-500">{item.qty} {item.unit}</p>
                        </div>
                        <p className="text-sm font-semibold">${item.totalPrice.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({cart.itemCount} items)</span>
                      <span>${cart.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span>Calculated later</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span className="text-green-700">${cart.subtotal.toFixed(2)} {cart.currency}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    disabled={checkout.isPending}
                  >
                    {checkout.isPending ? 'Processing...' : 'Place Order'}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By placing your order, you agree to our terms and conditions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
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
