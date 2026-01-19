'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Package,
  Building2,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  MessageSquare,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sidebarLinks = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/products', label: 'Products', icon: Package },
  { href: '/seller/rfqs', label: 'RFQs', icon: FileText },
  { href: '/seller/quotes', label: 'Quotes', icon: MessageSquare },
  { href: '/seller/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/seller/company-profile', label: 'Company Profile', icon: Building2 },
];

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && user.role !== 'SELLER') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'SELLER') {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/seller" className="flex items-center gap-2">
              <span className="text-xl font-bold text-matcha-600">🍵 Matcha</span>
              <span className="text-xs bg-matcha-100 text-matcha-700 px-2 py-0.5 rounded">
                Seller
              </span>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href || 
                (link.href !== '/seller' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-matcha-50 text-matcha-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-matcha-100 flex items-center justify-center">
                <span className="text-matcha-700 font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b h-16 flex items-center px-4 lg:px-6">
          <button
            className="lg:hidden p-2 hover:bg-gray-100 rounded mr-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-500">
            <Link href="/seller" className="hover:text-gray-700">
              Seller Portal
            </Link>
            {pathname !== '/seller' && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="text-gray-900 font-medium">
                  {pathname.includes('/products/new')
                    ? 'New Product'
                    : pathname.includes('/products/')
                    ? 'Edit Product'
                    : pathname.includes('/products')
                    ? 'Products'
                    : pathname.includes('/rfqs/')
                    ? 'RFQ Detail'
                    : pathname.includes('/rfqs')
                    ? 'RFQs'
                    : pathname.includes('/quotes/')
                    ? 'Quote Detail'
                    : pathname.includes('/quotes')
                    ? 'Quotes'
                    : pathname.includes('/orders/')
                    ? 'Order Detail'
                    : pathname.includes('/orders')
                    ? 'Orders'
                    : pathname.includes('/company-profile')
                    ? 'Company Profile'
                    : 'Dashboard'}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
