'use client';

import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();

  const getDashboardContent = () => {
    switch (user?.role) {
      case 'BUYER':
        return <BuyerDashboard />;
      case 'SELLER':
        return <SellerDashboard />;
      case 'ADMIN':
        return <AdminDashboard />;
      default:
        return null;
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Welcome back, {user?.name?.split(' ')[0]}!
      </h1>
      {getDashboardContent()}
    </div>
  );
}

function BuyerDashboard() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active RFQs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">0</div>
          <p className="text-sm text-gray-500">Pending responses</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quotes Received</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">0</div>
          <p className="text-sm text-gray-500">Awaiting review</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">0</div>
          <p className="text-sm text-gray-500">In progress</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <a
              href="/dashboard/marketplace"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-medium">Browse Products</div>
              <div className="text-sm text-gray-500">Find matcha suppliers</div>
            </a>
            <a
              href="/dashboard/rfqs/new"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-medium">Create RFQ</div>
              <div className="text-sm text-gray-500">Request quotes</div>
            </a>
            <a
              href="/dashboard/orders"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="font-medium">View Orders</div>
              <div className="text-sm text-gray-500">Track shipments</div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SellerDashboard() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">0</div>
          <p className="text-sm text-gray-500">Listed for sale</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">RFQs Received</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">0</div>
          <p className="text-sm text-gray-500">Awaiting response</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">0</div>
          <p className="text-sm text-gray-500">To fulfill</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <a
              href="/dashboard/products/new"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">➕</div>
              <div className="font-medium">Add Product</div>
              <div className="text-sm text-gray-500">List new matcha</div>
            </a>
            <a
              href="/dashboard/quotes"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">💬</div>
              <div className="font-medium">View RFQs</div>
              <div className="text-sm text-gray-500">Respond to requests</div>
            </a>
            <a
              href="/dashboard/orders"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="font-medium">Manage Orders</div>
              <div className="text-sm text-gray-500">Fulfill orders</div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="grid md:grid-cols-4 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">3</div>
          <p className="text-sm text-gray-500">Registered accounts</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">0</div>
          <p className="text-sm text-gray-500">Sellers to review</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">0</div>
          <p className="text-sm text-gray-500">Products live</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compliance Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-matcha-600">0</div>
          <p className="text-sm text-gray-500">Active rules</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <a
              href="/dashboard/users"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-gray-500">Verify sellers</div>
            </a>
            <a
              href="/dashboard/compliance"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium">Compliance Rules</div>
              <div className="text-sm text-gray-500">Edit regulations</div>
            </a>
            <a
              href="/dashboard/insights"
              className="flex-1 p-4 border rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">Insights</div>
              <div className="text-sm text-gray-500">Manage content</div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
