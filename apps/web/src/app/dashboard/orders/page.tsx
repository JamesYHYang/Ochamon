'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  shipToName: string;
  shipToCity: string;
  shipToCountry: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Get tokens from correct localStorage key
        const tokensStr = localStorage.getItem('matcha_tokens');
        if (!tokensStr) {
          throw new Error('Not authenticated. Please log in.');
        }

        const tokens = JSON.parse(tokensStr);
        const accessToken = tokens.accessToken;

        if (!accessToken) {
          throw new Error('No access token found. Please log in again.');
        }

        // Decode JWT to get user role
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const role = payload.role;

        const endpoint = role === 'SELLER' 
          ? `${process.env.NEXT_PUBLIC_API_URL}/order/seller`
          : `${process.env.NEXT_PUBLIC_API_URL}/order/buyer`;

        const res = await fetch(endpoint, {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch orders');
        }

        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return <div className="p-8">Loading orders...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Orders</h2>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border p-4 rounded-lg">
              <p className="font-semibold">{order.orderNumber}</p>
              <p>Status: {order.status}</p>
              <p>Total: ${order.totalAmount} {order.currency}</p>
              <p>Ship to: {order.shipToCity}, {order.shipToCountry}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}