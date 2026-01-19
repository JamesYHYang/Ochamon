'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { rfqApi, orderApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BuyerDashboard() {
  const { accessToken } = useAuth();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;
      try {
        const [rfqData, orderData] = await Promise.all([
          rfqApi.getBuyerRfqs(accessToken),
          orderApi.getBuyerOrders(accessToken),
        ]);
        setRfqs(rfqData);
        setOrders(orderData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  const activeRfqs = rfqs.filter((r) => ['SUBMITTED', 'QUOTED', 'PARTIALLY_QUOTED'].includes(r.status));
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Buyer Dashboard</h1>
        <Link href="/buyer/rfqs/new">
          <Button className="bg-green-600 hover:bg-green-700">Create RFQ</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Active RFQs</p>
            <p className="text-3xl font-bold text-green-700">{activeRfqs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Pending Orders</p>
            <p className="text-3xl font-bold text-blue-700">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-3xl font-bold text-gray-700">{orders.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent RFQs</h2>
              <Link href="/buyer/rfqs" className="text-sm text-green-600 hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {rfqs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No RFQs yet</p>
            ) : (
              <div className="space-y-3">
                {rfqs.slice(0, 5).map((rfq) => (
                  <Link
                    key={rfq.id}
                    href={`/buyer/rfqs/${rfq.id}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{rfq.title}</p>
                        <p className="text-sm text-gray-500">{rfq.rfqNumber}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        rfq.status === 'QUOTED' ? 'bg-green-100 text-green-800' :
                        rfq.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rfq.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <Link href="/buyer/orders" className="text-sm text-green-600 hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    href={`/buyer/orders/${order.id}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">${order.totalAmount.toFixed(2)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
