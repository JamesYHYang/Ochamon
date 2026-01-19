'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { quoteApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Package,
  Clock,
  MapPin,
  Truck,
  FileText,
  User,
  CheckCircle,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACCEPTED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
  WITHDRAWN: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function SellerQuoteDetailPage() {
  const params = useParams();
  const { accessToken } = useAuth();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!accessToken || !params.id) return;
      try {
        const data = await quoteApi.getSellerQuoteDetail(accessToken, params.id as string);
        setQuote(data);
      } catch (error) {
        console.error('Failed to fetch quote:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [accessToken, params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Quote not found</p>
        <Link href="/seller/quotes">
          <Button variant="outline" className="mt-4">
            Back to Quotes
          </Button>
        </Link>
      </div>
    );
  }

  const isExpired = new Date(quote.validUntil) < new Date() && quote.status === 'PENDING';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/seller/quotes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Quote #{quote.quoteNumber}</h1>
            <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[quote.status]}`}>
              {isExpired ? 'EXPIRED' : quote.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Created {new Date(quote.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Related RFQ */}
          {quote.rfq && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Related RFQ
                </h2>
              </CardHeader>
              <CardContent>
                <Link href={`/seller/rfqs/${quote.rfq.id}`} className="block hover:bg-gray-50 p-4 -m-4 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{quote.rfq.title}</p>
                      <p className="text-sm text-gray-500">RFQ #{quote.rfq.rfqNumber}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      quote.rfq.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      quote.rfq.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quote.rfq.status}
                    </span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Buyer Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Buyer
              </h2>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{quote.rfq?.buyer?.name || 'Unknown Buyer'}</p>
              <p className="text-sm text-gray-500">{quote.rfq?.buyer?.companyName || ''}</p>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Quote Items ({quote.lineItems?.length || 0})
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quote.lineItems?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.sku?.product?.name || 'Product'}</p>
                      <p className="text-sm text-gray-500">{item.sku?.name || 'SKU'}</p>
                      <p className="text-sm text-gray-500">
                        {Number(item.qty)} {item.unit} × ${Number(item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                    <p className="font-medium">${Number(item.lineTotal).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resulting Order */}
          {quote.order && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Order Created
                </h2>
              </CardHeader>
              <CardContent>
                <Link href={`/seller/orders/${quote.order.id}`} className="block">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium">Order #{quote.order.orderNumber}</p>
                      <p className="text-sm text-gray-500">
                        Created {new Date(quote.order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${Number(quote.order.totalAmount).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        quote.order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {quote.order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Quote Summary</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>${Number(quote.subtotal).toFixed(2)}</span>
              </div>
              {quote.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span>${Number(quote.shippingCost).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span>${Number(quote.totalAmount).toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">Currency: {quote.currency}</p>
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Details</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Incoterm:</span>
                <span>{quote.incoterm}</span>
              </div>
              {quote.estimatedLeadDays && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Lead Time:</span>
                  <span>{quote.estimatedLeadDays} days</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Valid Until:</span>
                <span className={isExpired ? 'text-red-600' : ''}>
                  {new Date(quote.validUntil).toLocaleDateString()}
                  {isExpired && ' (Expired)'}
                </span>
              </div>
              {quote.rfq?.destinationCountry && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Destination:</span>
                  <span>{quote.rfq.destinationCountry}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Notes</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Terms */}
          {quote.termsConditions && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Terms & Conditions</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.termsConditions}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
