'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">🍵</span>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-2xl">🍵</span>
                <span className="text-xl font-bold text-matcha-800">
                  Matcha Trade
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                {user?.role === 'BUYER' && (
                  <>
                    <Link
                      href="/dashboard/marketplace"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Marketplace
                    </Link>
                    <Link
                      href="/dashboard/rfqs"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      My RFQs
                    </Link>
                  </>
                )}
                {user?.role === 'SELLER' && (
                  <>
                    <Link
                      href="/dashboard/products"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Products
                    </Link>
                    <Link
                      href="/dashboard/quotes"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Quotes
                    </Link>
                  </>
                )}
                {user?.role === 'ADMIN' && (
                  <>
                    <Link
                      href="/dashboard/users"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Users
                    </Link>
                    <Link
                      href="/dashboard/compliance"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Compliance
                    </Link>
                    <Link
                      href="/dashboard/insights"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Insights
                    </Link>
                    <Link
                      href="/dashboard/trends"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Trends
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-600">Signed in as </span>
                <span className="font-medium">{user?.name}</span>
                <span className="ml-2 px-2 py-0.5 bg-matcha-100 text-matcha-800 rounded text-xs">
                  {user?.role}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
