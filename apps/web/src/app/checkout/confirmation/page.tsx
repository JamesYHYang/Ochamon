'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const ordersParam = searchParams.get('orders');
  const orderNumbers = ordersParam ? ordersParam.split(',') : [];

  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-700">
            🍵 Matcha Trade
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/marketplace">
              <Button variant="ghost">Marketplace</Button>
            </Link>
            {user && (
              <Link href={user.role === 'BUYER' ? '/buyer' : '/seller'}>
                <Button variant="outline">Dashboard</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your order. We've received your order and will begin processing it shortly.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Order Details</h2>
            {orderNumbers.length > 0 ? (
              <div className="space-y-3">
                {orderNumbers.map((orderNumber) => (
                  <div
                    key={orderNumber}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-gray-600">Order Number:</span>
                    <span className="font-mono font-semibold text-green-700">{orderNumber}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Order numbers not available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">What's Next?</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-medium">Order Confirmation</h3>
                  <p className="text-sm text-gray-600">
                    You'll receive an email confirmation with your order details shortly.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-medium">Payment Processing</h3>
                  <p className="text-sm text-gray-600">
                    Our team will contact you with payment instructions and invoice.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-medium">Shipping</h3>
                  <p className="text-sm text-gray-600">
                    Once payment is confirmed, your order will be prepared and shipped. You'll receive tracking information via email.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/marketplace">
            <Button variant="outline" className="w-full sm:w-auto">
              Continue Shopping
            </Button>
          </Link>
          <Link href="/buyer">
            <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
              View My Orders
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
