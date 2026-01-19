'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { orderApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  MapPin,
  CreditCard,
  FileText,
  User,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PAID: 'bg-blue-100 text-blue-800 border-blue-200',
  PROCESSING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  DELIVERED: 'bg-teal-100 text-teal-800 border-teal-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  REFUNDED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED',
];

export default function SellerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
    trackingNumber: '',
    carrier: '',
  });

  useEffect(() => {
    const fetchOrder = async () => {
      if (!accessToken || !params.id) return;
      try {
        const data = await orderApi.getSellerOrderDetail(accessToken, params.id as string);
        setOrder(data);
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [accessToken, params.id]);

  const handleUpdateStatus = async () => {
    if (!accessToken || !order || !statusForm.status) return;
    setUpdating(true);
    try {
      const data = await orderApi.updateOrderStatus(accessToken, order.id, {
        status: statusForm.status,
        notes: statusForm.notes || undefined,
        trackingNumber: statusForm.trackingNumber || undefined,
        carrier: statusForm.carrier || undefined,
      });
      setOrder(data);
      setShowStatusModal(false);
      setStatusForm({ status: '', notes: '', trackingNumber: '', carrier: '' });
    } catch (error: any) {
      console.error('Failed to update status:', error);
      alert(error.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const openStatusModal = (newStatus: string) => {
    setStatusForm((prev) => ({ ...prev, status: newStatus }));
    setShowStatusModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
        <Link href="/seller/orders">
          <Button variant="outline" className="mt-4">
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const availableTransitions = STATUS_TRANSITIONS[order.status] || [];
  const currentStatusIndex = ORDER_STATUSES.indexOf(order.status);
  const isCancelledOrRefunded = ['CANCELLED', 'REFUNDED'].includes(order.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/seller/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
            <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[order.status]}`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Status Update Actions */}
      {availableTransitions.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Update Order Status</p>
                <p className="text-sm text-gray-500">Move the order to the next stage</p>
              </div>
              <div className="flex gap-2">
                {availableTransitions.map((status) => (
                  <Button
                    key={status}
                    onClick={() => openStatusModal(status)}
                    variant={['CANCELLED', 'REFUNDED'].includes(status) ? 'outline' : 'default'}
                    size="sm"
                    className={['CANCELLED', 'REFUNDED'].includes(status)
                      ? 'text-red-600 border-red-300'
                      : 'bg-matcha-600 hover:bg-matcha-700'}
                  >
                    Mark as {status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Progress */}
      {!isCancelledOrRefunded && (
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <div className="flex justify-between">
                {ORDER_STATUSES.slice(0, -1).map((status, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  return (
                    <div key={status} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-matcha-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        } ${isCurrent ? 'ring-4 ring-matcha-200' : ''}`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>
                      <p className={`text-xs mt-2 text-center max-w-[80px] ${
                        isCompleted ? 'text-matcha-600 font-medium' : 'text-gray-500'
                      }`}>
                        {status.replace('_', ' ')}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-0">
                <div
                  className="h-full bg-matcha-600 transition-all"
                  style={{ width: `${(currentStatusIndex / (ORDER_STATUSES.length - 2)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Buyer Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Buyer
              </h2>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.buyer?.name || 'Unknown'}</p>
              <p className="text-sm text-gray-500">{order.buyer?.email}</p>
              {order.buyer?.companyName && (
                <p className="text-sm text-gray-500">{order.buyer.companyName}</p>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({order.lineItems?.length || 0})
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.lineItems?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.sku?.product?.name || 'Product'}</p>
                      <p className="text-sm text-gray-500">{item.sku?.name || 'SKU'}</p>
                      <p className="text-sm text-gray-500">
                        {item.qty} {item.unit} × ${Number(item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                    <p className="font-medium">${Number(item.lineTotal).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Status History
              </h2>
            </CardHeader>
            <CardContent>
              {order.statusHistory?.length > 0 ? (
                <div className="space-y-4">
                  {order.statusHistory.map((history: any, index: number) => (
                    <div key={history.id} className="flex gap-4">
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full mt-1 ${
                          index === 0 ? 'bg-matcha-600' : 'bg-gray-300'
                        }`} />
                        {index < order.statusHistory.length - 1 && (
                          <div className="absolute top-3 left-1 w-1 h-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">
                          {history.fromStatus?.replace('_', ' ') || 'Created'} → {history.toStatus.replace('_', ' ')}
                        </p>
                        {history.notes && (
                          <p className="text-sm text-gray-600">{history.notes}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(history.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No status updates yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Summary
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              {order.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span>${Number(order.shippingCost).toFixed(2)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span>${Number(order.taxAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span>${Number(order.totalAmount).toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">Currency: {order.currency}</p>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </h2>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.shipToName}</p>
              <p>{order.shipToLine1}</p>
              {order.shipToLine2 && <p>{order.shipToLine2}</p>}
              <p>
                {order.shipToCity}
                {order.shipToState && `, ${order.shipToState}`} {order.shipToPostal}
              </p>
              <p>{order.shipToCountry}</p>
            </CardContent>
          </Card>

          {/* Tracking Info */}
          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Tracking
                </h2>
              </CardHeader>
              <CardContent className="text-sm">
                {order.carrier && <p className="text-gray-500">Carrier: {order.carrier}</p>}
                <p className="font-mono">{order.trackingNumber}</p>
              </CardContent>
            </Card>
          )}

          {/* Related RFQ/Quote */}
          {order.quoteId && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Related
                </h2>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {order.quote?.rfq && (
                  <Link
                    href={`/seller/rfqs/${order.quote.rfq.id}`}
                    className="text-matcha-600 hover:underline block"
                  >
                    RFQ #{order.quote.rfq.rfqNumber}
                  </Link>
                )}
                <Link
                  href={`/seller/quotes/${order.quoteId}`}
                  className="text-matcha-600 hover:underline block"
                >
                  Quote #{order.quote?.quoteNumber}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Buyer Notes */}
          {order.buyerNotes && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Buyer Notes</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{order.buyerNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Update Order Status to {statusForm.status.replace('_', ' ')}
              </h3>
              <div className="space-y-4">
                {statusForm.status === 'SHIPPED' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Carrier</label>
                      <input
                        type="text"
                        value={statusForm.carrier}
                        onChange={(e) => setStatusForm((p) => ({ ...p, carrier: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="e.g., FedEx, DHL, UPS"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tracking Number</label>
                      <input
                        type="text"
                        value={statusForm.trackingNumber}
                        onChange={(e) => setStatusForm((p) => ({ ...p, trackingNumber: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Enter tracking number"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <textarea
                    value={statusForm.notes}
                    onChange={(e) => setStatusForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={3}
                    placeholder="Additional notes about this status update..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="flex-1 bg-matcha-600 hover:bg-matcha-700"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
