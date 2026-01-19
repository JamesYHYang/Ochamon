'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { orderApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Clock, Truck, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-600',
};

const STATUS_ICONS: Record<string, any> = {
  PENDING_PAYMENT: Clock,
  PAID: CheckCircle2,
  PROCESSING: Package,
  SHIPPED: Truck,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle2,
  COMPLETED: CheckCircle2,
  CANCELLED: Clock,
  REFUNDED: Clock,
};

export default function BuyerOrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!accessToken) return;
      try {
        const data = await orderApi.getBuyerOrders(accessToken);
        setOrders(data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [accessToken]);

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status);
    if (filter === 'completed') return ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status);
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          All ({orders.length})
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
          className={filter === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          Active ({orders.filter(o => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          Completed ({orders.filter(o => ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length})
        </Button>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No orders found</p>
            <p className="text-gray-500 mb-4">
              {filter === 'all'
                ? "You haven't placed any orders yet."
                : `No ${filter} orders.`}
            </p>
            <Link href="/marketplace">
              <Button className="bg-green-600 hover:bg-green-700">
                Browse Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = STATUS_ICONS[order.status] || Package;
            return (
              <Link key={order.id} href={`/buyer/orders/${order.id}`}>
                <Card className="hover:border-green-300 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${STATUS_COLORS[order.status]}`}>
                            <StatusIcon className="h-3 w-3" />
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {order.seller?.company?.name || 'Seller'} • {order._count?.lineItems || order.lineItems?.length || 0} items
                        </p>
                        {order.trackingNumber && (
                          <p className="text-sm text-blue-600">
                            Tracking: {order.trackingNumber}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${Number(order.totalAmount).toFixed(2)}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
